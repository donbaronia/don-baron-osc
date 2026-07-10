import { base44 } from "@/api/base44Client";
import { EventBus } from "@/lib/eventBus";

/**
 * Core Engine — Sistema Operacional do Don Baron OS
 *
 * Todos os modulos devem comunicar-se exclusivamente atraves deste cliente.
 * Nenhum modulo acessa diretamente outro modulo.
 *
 * Uso:
 *   import { Core } from "@/lib/coreEngine";
 *   await Core.events.emit({ event_type: "documento_recebido", module: "documentos", ... });
 *   await Core.notifications.list({ unread_only: true });
 *   await Core.audit({ action: "create", entity_type: "Product", ... });
 */

async function invoke(action, params = {}) {
  const response = await base44.functions.invoke("coreEngine", { action, ...params });
  return response.data;
}

export const Core = {
  // ===== EVENT BUS =====
  // Delegado ao Core Event Bus Engine (Documento 028).
  // Nenhum modulo chama outro diretamente — toda comunicacao via Event Bus.
  events: {
    emit: (params) => EventBus.publish(params),
  },

  // ===== NOTIFICATION CENTER =====
  // Central unica de notificacoes. Categorias: info, warning, urgent, error, success, system.
  notifications: {
    create: (params) => invoke("notify", params),
    list: (params = {}) => invoke("listNotifications", params),
    markRead: (id, read = true) => invoke("markNotificationRead", { id, read }),
  },

  // ===== TASK MANAGER =====
  // Gerenciador interno de tarefas. Toda tarefa tem status, responsavel,
  // prioridade, data limite e historico.
  tasks: {
    create: (params) => invoke("createTask", params),
    update: (params) => invoke("updateTask", params),
  },

  // ===== AUDIT ENGINE =====
  // Registra auditoria completa: usuario, data, tabela, registro, valor anterior, valor novo.
  // Use `audit_action` para descrever a acao (ex: "Criou produto").
  audit: (params) => invoke("audit", params),

  // ===== CONFIGURATION SERVICE =====
  // Configuracoes globais do sistema (empresa, moeda, IA, alertas, etc).
  config: {
    get: (key) => invoke("getConfig", { key }),
    getByCategory: (category) => invoke("getConfig", { category }),
    getAll: () => invoke("getConfig", {}),
    set: (params) => invoke("setConfig", params),
  },

  // ===== PERMISSION ENGINE =====
  // Validacao de permissoes no backend. Nunca confiar apenas na interface.
  permissions: {
    check: (params) => invoke("checkPermission", params),
  },

  // ===== SEARCH ENGINE =====
  // Pesquisa unificada across todas as entidades.
  search: (params) => invoke("search", params),

  // ===== FILE SERVICE =====
  // Gerenciamento centralizado de arquivos. Nenhum modulo armazena arquivos diretamente.
  files: {
    register: (params) => invoke("registerFile", params),
    get: (file_id) => invoke("getFile", { file_id }),
  },

  // ===== LOG SERVICE =====
  // Logs tecnicos separados de auditoria. Niveis: error, warn, info, debug.
  log: (params) => invoke("log", params),
};

export default Core;