/**
 * DON BARON CORE — ActionEngine
 *
 * Toda acao iniciada pelo usuario ou pela IA passa por aqui.
 * Nenhuma tela pode usar create/update/delete diretamente.
 *
 * Fluxo:
 *   ActionEngine.execute(ACTION_TYPE, payload)
 *     -> Validacao de permissao
 *     -> PersistenceEngine (valida + grava + read-back)
 *     -> Audit
 *     -> Sync da interface
 *     -> Resposta CONFIRMADA ao chamador
 *
 * O Baron IA tambem usa este engine:
 *   ActionEngine.executeIntent("Comprei 100kg de bacon por R$39")
 *     -> detecta intent CREATE_STOCK
 *     -> executa action
 *     -> retorna resultado real do banco
 */
import { ActionRegistry, IntentPatterns } from "./actions";
import { Logger } from "./Logger";
import { base44 } from "@/api/base44Client";
import { EventBus } from "@/lib/eventBus";
import { AGENTS, canWrite } from "./agents";

export const ActionEngine = {
  /**
   * Executa uma Action pelo tipo. Retorna o resultado CONFIRMADO do banco.
   */
  async execute(actionType, payload = {}, options = {}) {
    const action = ActionRegistry[actionType];
    if (!action) {
      throw new Error(`Action desconhecida: ${actionType}`);
    }

    const agentKey = options.agent_key || "baron";
    const agent = AGENTS[agentKey] || AGENTS.baron;
    const entity = action.entity || options.entity || "";
    const isWrite = action.write !== false;

    // PERMISSÃO: nenhum agente grava fora de sua permissão declarada.
    if (isWrite && entity && !canWrite(agent, entity)) {
      throw new Error(`[PERMISSÃO NEGADA] Agente "${agent.name}" não pode gravar em ${entity}`);
    }

    const t0 = Date.now();
    const startedAt = new Date().toISOString();
    const process_code = `WF-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    Logger.info(`ActionEngine: ${actionType} [${agentKey}]`, { entity });

    // WORKFLOW: toda ação gera um workflow rastreável (ID, origem, agente, status, etapa, histórico, payload).
    let wfId = null;
    const stepInit = { id: 1, date: startedAt, state: "EXECUTANDO", user: options.user?.full_name, ai_agent: agentKey, status: "in_progress" };
    try {
      const wf = await base44.entities.EnterpriseProcess.create({
        process_code,
        command: actionType,
        intent: actionType,
        module: agent.module || "geral",
        current_state: "EXECUTANDO",
        previous_state: "RECEBIDO",
        context: { payload, agent_key: agentKey, origin: options.origin || "frontend" },
        results: {},
        steps: [stepInit],
        history: [{ state: "EXECUTANDO", previous_state: "RECEBIDO", timestamp: startedAt, actor: agentKey }],
        user_name: options.user?.full_name,
        user_email: options.user?.email,
        ia_agent: agentKey,
        started_at: startedAt,
        status: "ativo",
      });
      wfId = wf?.id || null;
    } catch (e) {
      // Criação do workflow é best-effort — não bloqueia a ação.
      Logger.info(`ActionEngine: workflow creation falhou (non-blocking): ${e.message}`, {});
    }

    try {
      const result = await action.execute(payload, {
        ...options,
        module: agent.module || "action_engine",
        origin: options.origin || "frontend",
        agent_key: agentKey,
      });
      const readback = result?.readback || result;
      const duration_ms = Date.now() - t0;

      // EVENT BUS: publica evento de domínio (agentes downstream reagem em segundo plano).
      const eventType = action.event || `${String(entity || actionType).toLowerCase()}_created`;
      EventBus.publish({
        event_type: eventType,
        module: agent.module || "action_engine",
        origin: "agent",
        entity_type: entity,
        entity_id: result?.id || result?._id || "",
        payload,
        user_name: options.user?.full_name,
      }).catch(() => {});

      // AUDITORIA
      Logger.audit({
        entity_name: entity || "Action",
        operation: "create",
        status: "success",
        payload: { actionType, agent: agentKey, ...payload },
        bank_response: result?.id ? { id: result.id } : result,
        duration_ms,
        module: agent.module || "action_engine",
        correlation_id: process_code,
      });

      // WORKFLOW: conclui (read-back já confirmado pelo PersistenceEngine/RecoveryEngine).
      if (wfId) {
        await base44.entities.EnterpriseProcess.update(wfId, {
          current_state: "CONCLUIDO",
          completed_at: new Date().toISOString(),
          processing_time_ms: duration_ms,
          status: "concluido",
          results: { result, readback },
          steps: [stepInit, { id: 2, date: new Date().toISOString(), state: "CONCLUIDO", user: options.user?.full_name, ai_agent: agentKey, status: "success", duration_ms }],
        }).catch(() => {});
      }

      return { confirmed: true, workflow_id: wfId, process_code, agent: agentKey, result, readback, duration_ms };
    } catch (error) {
      const duration_ms = Date.now() - t0;
      // MEMORY ENGINE: salva estado para o Agente Recovery retomar da última etapa válida.
      if (wfId) {
        await base44.entities.EnterpriseProcess.update(wfId, {
          current_state: "ERRO",
          status: "erro",
          processing_time_ms: duration_ms,
          results: { error: error.message },
          pending: { type: "agent_action_failed", reason: error.message, requested_by: agentKey, requested_at: new Date().toISOString() },
          steps: [stepInit, { id: 2, date: new Date().toISOString(), state: "ERRO", user: options.user?.full_name, ai_agent: agentKey, status: "error", error: error.message, duration_ms }],
        }).catch(() => {});
      }
      Logger.audit({
        entity_name: entity || "Action",
        operation: "create",
        status: "error",
        error_message: error.message,
        payload: { actionType, agent: agentKey, ...payload },
        duration_ms,
        module: agent.module || "action_engine",
        correlation_id: process_code,
      });
      throw error;
    }
  },

  /**
   * Detecta a intcao de uma frase em linguagem natural e executa a action.
   * Usado pelo Baron IA.
   */
  detectIntent(text) {
    if (!text || typeof text !== "string") return null;
    for (const { pattern, action } of IntentPatterns) {
      if (pattern.test(text)) return action;
    }
    return null;
  },

  /**
   * Executa a intcao detectada de uma frase.
   * Retorna { actionType, result } ou { actionType: null } se nao detectada.
   */
  async executeIntent(text, payload = {}, options = {}) {
    const actionType = this.detectIntent(text);
    if (!actionType) {
      return { actionType: null, message: "Intencao nao reconhecida" };
    }
    const result = await this.execute(actionType, payload, options);
    return { actionType, result };
  },

  /**
   * Lista todas as actions disponiveis (para debug/UI).
   */
  listActions() {
    return Object.entries(ActionRegistry).map(([type, def]) => ({
      type,
      entity: def.entity,
      description: def.description,
    }));
  },
};

export default ActionEngine;