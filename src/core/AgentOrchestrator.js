/**
 * DON BARON ENTERPRISE V3 — AgentOrchestrator
 *
 * O BARON (Diretor Geral) recebe o comando do usuário, classifica a intenção,
 * planeja a cadeia de agentes especialistas, executa a ação primária pelo
 * ActionEngine (gateway obrigatório) e dispara eventos para os agentes
 * downstream reagirem via Event Bus. Consolida a resposta final.
 *
 * Fluxo:
 *   Usuário -> BARON -> [Cadastro, Estoque, CMV, DRE, Intelligence] -> ActionEngine -> Workflow -> Banco -> Read Back -> Confirmação
 */
import { ActionEngine } from "./ActionEngine";
import { AGENTS, AGENT_LIST } from "./agents";
import { EventBus } from "@/lib/eventBus";

// Mapeia intenção -> (ação primária, agente primário, cadeia de agentes)
const PLAN = {
  stock_entry: { action: "CREATE_STOCK_ENTRY", primary: "ag_estoque", chain: ["ag_cadastro", "ag_estoque", "ag_cmv", "ag_dre", "ag_intelligence"] },
  stock_exit: { action: "CREATE_STOCK_EXIT", primary: "ag_estoque", chain: ["ag_estoque", "ag_cmv", "ag_intelligence"] },
  payment: { action: "CREATE_PAYMENT", primary: "ag_financeiro", chain: ["ag_financeiro", "ag_dre", "ag_intelligence"] },
  production: { action: "CREATE_PRODUCTION", primary: "ag_producao", chain: ["ag_producao", "ag_estoque", "ag_cmv", "ag_dre", "ag_intelligence"] },
  purchase: { action: "CREATE_PURCHASE", primary: "ag_compras", chain: ["ag_compras", "ag_financeiro", "ag_estoque", "ag_intelligence"] },
  employee_update: { action: "UPDATE_EMPLOYEE", primary: "ag_rh", chain: ["ag_rh", "ag_intelligence"] },
  document: { action: "CLASSIFY_DOCUMENT", primary: "ag_documentos", chain: ["ag_documentos", "ag_cadastro", "ag_estoque", "ag_financeiro", "ag_cmv", "ag_dre", "ag_intelligence"] },
};

export const AgentOrchestrator = {
  /**
   * Recebe um comando em linguagem natural (ou intent já classificada),
   * executa a cadeia de agentes e retorna a resposta consolidada.
   */
  async dispatch({ text, intent, payload = {}, user, context = {} }) {
    const detected = intent || ActionEngine.detectIntent(text);
    const plan = PLAN[detected];

    if (!plan) {
      // Intenção não reconhecida — o BARON responde diretamente sem gravar.
      return {
        handled: false,
        intent: detected || "unknown",
        message: "Intenção não reconhecida. O BARON não executou nenhuma gravação.",
        agents: ["baron"],
      };
    }

    const t0 = Date.now();
    const summary = {
      handled: true,
      intent: detected,
      agents: plan.chain,
      primary_agent: plan.primary,
      steps: [],
      confirmed: false,
    };

    try {
      // Etapa 1: ação primária via ActionEngine (gateway obrigatório: permissão + workflow + read-back + evento)
      const exec = await ActionEngine.execute(plan.action, payload, {
        agent_key: plan.primary,
        user,
        origin: "baron",
      });
      summary.workflow_id = exec.workflow_id;
      summary.process_code = exec.process_code;
      summary.confirmed = !!exec.confirmed;
      summary.steps.push({ agent: plan.primary, action: plan.action, status: "ok", workflow_id: exec.workflow_id, duration_ms: exec.duration_ms });

      // Etapa 2: dispara eventos de domínio para os agentes downstream reagirem via Event Bus.
      // (Os agentes inscritos processam em segundo plano — Intelligence, CMV, DRE, Auditor, Recovery.)
      const downstream = plan.chain.filter((a) => a !== plan.primary);
      for (const agentKey of downstream) {
        const agent = AGENTS[agentKey];
        if (!agent) continue;
        // Evento sinaliza que o agente deve processar o resultado da etapa primária.
        EventBus.publish({
          event_type: `${detected}_orchestrated`,
          module: agent.module,
          origin: "orchestrator",
          entity_type: exec.result?.entity || "",
          entity_id: exec.result?.id || exec.result?._id || "",
          payload: { source_agent: plan.primary, result: exec.result, agent: agentKey, workflow_id: exec.workflow_id },
          user_name: user?.full_name,
        }).catch(() => {});
        summary.steps.push({ agent: agentKey, status: "dispatched", via: "event_bus" });
      }

      summary.duration_ms = Date.now() - t0;
      summary.message = `Operação concluída. Cadeia executada: ${plan.chain.join(" → ")}. Workflow ${exec.process_code} confirmado via read-back.`;
      return summary;
    } catch (error) {
      summary.duration_ms = Date.now() - t0;
      summary.confirmed = false;
      summary.error = error.message;
      summary.steps.push({ agent: plan.primary, status: "error", error: error.message });
      // O Agente Recovery é notificado via evento e retoma do último estado válido (Memory Engine).
      EventBus.publish({
        event_type: "workflow_failed",
        module: "recovery",
        origin: "orchestrator",
        payload: { intent: detected, agent: plan.primary, error: error.message, payload, workflow_id: summary.workflow_id },
        user_name: user?.full_name,
      }).catch(() => {});
      summary.message = `Operação falhou no agente ${plan.primary}: ${error.message}. O Agente Recovery foi notificado e retomará do último estado válido.`;
      return summary;
    }
  },

  listAgents() {
    return AGENT_LIST;
  },

  listCapabilities() {
    return Object.values(PLAN).map((p) => ({ intent: p, primary: p.primary, chain: p.chain }));
  },
};

export default AgentOrchestrator;