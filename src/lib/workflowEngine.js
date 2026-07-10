import { base44 } from "@/api/base44Client";

/**
 * Workflow Engine — Motor de Processos do Don Baron OS
 *
 * Motor unico de automacao, aprovacoes, tarefas e notificacoes.
 * Todo processo interno passa obrigatoriamente por este ponto.
 * Nenhum modulo implementa seu proprio sistema de workflow.
 *
 * Integracoes obrigatorias (internas):
 *   - Core Engine (eventos, notificacoes, auditoria, permissoes, tarefas)
 *   - Data Engine (timeline, calculos, snapshots)
 *
 * Uso:
 *   import { Workflow } from "@/lib/workflowEngine";
 *
 *   await Workflow.trigger({ event: "documento_recebido", entity_type: "DBDocument", entity_id });
 *   await Workflow.advanceStep({ process_id, step_name });
 *   await Workflow.approve({ approval_id, result: "approved", comment });
 *   const { queue } = await Workflow.getQueue({ status: "em_andamento" });
 */

async function invoke(action, params = {}) {
  const response = await base44.functions.invoke("workflowEngine", { action, ...params });
  return response.data;
}

export const Workflow = {
  // ===== TRIGGER =====
  // Dispara um fluxo a partir de um evento. O engine encontra as definicoes
  // ativas para o evento e cria os processos com etapas, notificacoes e tarefas.
  trigger: (params) => invoke("trigger", params),

  // ===== STEP MANAGEMENT =====
  // Avanca a etapa atual do processo para a proxima.
  advanceStep: (params) => invoke("advanceStep", params),

  // ===== APPROVALS =====
  // Sistema generico de aprovacoes. Nunca permite aprovacao sem auditoria.
  approvals: {
    request: (params) => invoke("requestApproval", params),
    approve: (params) => invoke("approve", params),
    list: (params = {}) => invoke("getApprovals", params),
  },

  // ===== PROCESS QUEUE =====
  // Fila central de processos. Todos os processos passam por esta fila.
  getQueue: (params = {}) => invoke("getQueue", params),
  getProcess: (process_id) => invoke("getProcess", { process_id }),
  cancelProcess: (params) => invoke("cancelProcess", params),
  retry: (process_id) => invoke("retry", { process_id }),
  markError: (params) => invoke("markError", params),

  // ===== DEFINITIONS =====
  // Definicoes de fluxo: evento inicial -> condicoes -> etapas -> conclusao.
  definitions: {
    list: (params = {}) => invoke("listDefinitions", params),
    create: (params) => invoke("createDefinition", params),
  },
};

export default Workflow;