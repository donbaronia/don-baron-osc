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

export const ActionEngine = {
  /**
   * Executa uma Action pelo tipo. Retorna o resultado CONFIRMADO do banco.
   */
  async execute(actionType, payload = {}, options = {}) {
    const action = ActionRegistry[actionType];
    if (!action) {
      throw new Error(`Action desconhecida: ${actionType}`);
    }

    const t0 = Date.now();
    Logger.info(`ActionEngine: ${actionType}`, { entity: action.entity });

    try {
      const result = await action.execute(payload, {
        ...options,
        module: options.module || "action_engine",
        origin: options.origin || "frontend",
      });

      Logger.audit({
        entity_name: action.entity || "Action",
        operation: "action",
        status: "success",
        payload: { actionType, ...payload },
        bank_response: result?.id ? { id: result.id } : result,
        duration_ms: Date.now() - t0,
        module: "action_engine",
        correlation_id: options.correlationId,
      });

      return result;
    } catch (error) {
      Logger.audit({
        entity_name: action.entity || "Action",
        operation: "action",
        status: "error",
        error_message: error.message,
        payload: { actionType, ...payload },
        duration_ms: Date.now() - t0,
        module: "action_engine",
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