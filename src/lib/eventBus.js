import { base44 } from "@/api/base44Client";

/**
 * Core Event Bus Engine (Documento 028)
 *
 * O coracao da plataforma. Nenhum modulo chama outro diretamente.
 * Toda comunicacao entre modulos ocorre exclusivamente atraves do Event Bus.
 *
 * Fluxo:
 *   Modulo Origem -> Event Bus -> Event Store -> Validacao
 *   -> Distribuicao -> Modulos interessados -> Workflow -> IA
 *   -> Notificacoes -> BI
 *
 * Uso:
 *   import { EventBus } from "@/lib/eventBus";
 *   await EventBus.publish({ event_type: "purchase_created", module: "compras", ... });
 *   const dashboard = await EventBus.getDashboard();
 */

async function invoke(action, params = {}) {
  const response = await base44.functions.invoke("eventBus", { action, ...params });
  return response.data;
}

export const EventBus = {
  // ===== PUBLISH =====
  // Publica um evento no Event Bus. O evento e enriquecido com UUID,
  // correlation_id, trace_id, priority, queue. Idempotencia garantida.
  publish: (params) => invoke("publish", params),

  // ===== DASHBOARD =====
  // Metricas de observabilidade: eventos/min, pendentes, erros,
  // tempo medio, filas, modulos ativos, saude do sistema.
  getDashboard: () => invoke("getDashboard"),

  // ===== EVENT CATALOG =====
  // Catalogo oficial de eventos com nome, modulo, prioridade,
  // fila e subscribers.
  getCatalog: () => invoke("getCatalog"),

  // ===== SUBSCRIPTIONS =====
  // Mapa de subscricoes: quais modulos escutam quais eventos.
  getSubscriptions: () => invoke("getSubscriptions"),

  // ===== EVENT STREAM =====
  // Fluxo de eventos recentes com filtros opcionais.
  getStream: (params = {}) => invoke("getStream", params),

  // ===== QUEUE STATUS =====
  // Status de todas as filas independentes.
  getQueues: () => invoke("getQueues"),

  // ===== RETRY =====
  // Reenvia um evento que falhou (retentativa automatica).
  retry: (eventId) => invoke("retry", { event_id: eventId }),

  // ===== REPLAY =====
  // Reexecuta um evento do Event Store (para replay de eventos).
  replay: (eventId) => invoke("replay", { event_id: eventId }),

  // ===== SWEEP (auto-retry manual trigger) =====
  // Dispara a varredura de retentativas de consumers falhos.
  sweep: (limit) => invoke("sweep", { limit }),

  // ===== HELPERS =====
  // Atalhos oficiais para eventos corporativos. Usar estes em vez de
  // passar event_type manualmente. Todos os modulos publicam SOMENTE via aqui.
  emitProductCreated: (params) => EventBus.publish({ event_type: "product_created", module: "cadastro", ...params }),
  emitProductUpdated: (params) => EventBus.publish({ event_type: "product_updated", module: "cadastro", ...params }),
  emitStockEntry: (params) => EventBus.publish({ event_type: "stock_entry_created", module: "estoque", ...params }),
  emitStockExit: (params) => EventBus.publish({ event_type: "stock_exit_created", module: "estoque", ...params }),
  emitStockLow: (params) => EventBus.publish({ event_type: "stock_low", module: "estoque", ...params }),
  emitStockCritical: (params) => EventBus.publish({ event_type: "stock_critical", module: "estoque", ...params }),
  emitPurchaseCreated: (params) => EventBus.publish({ event_type: "purchase_created", module: "compras", ...params }),
  emitPurchaseConfirmed: (params) => EventBus.publish({ event_type: "purchase_confirmed", module: "compras", ...params }),
  emitPaymentCreated: (params) => EventBus.publish({ event_type: "payment_created", module: "financeiro", ...params }),
  emitPaymentConfirmed: (params) => EventBus.publish({ event_type: "payment_confirmed", module: "financeiro", ...params }),
  emitCashFlowUpdated: (params) => EventBus.publish({ event_type: "cash_flow_updated", module: "financeiro", ...params }),
  emitDocumentReceived: (params) => EventBus.publish({ event_type: "document_received", module: "documentos", ...params }),
  emitOCRCompleted: (params) => EventBus.publish({ event_type: "ocr_completed", module: "documentos", ...params }),
  emitDREUpdated: (params) => EventBus.publish({ event_type: "dre_updated", module: "bi", ...params }),
  emitCMVUpdated: (params) => EventBus.publish({ event_type: "cmv_updated", module: "bi", ...params }),
  emitRecipeUpdated: (params) => EventBus.publish({ event_type: "recipe_updated", module: "producao", ...params }),
  emitProductionFinished: (params) => EventBus.publish({ event_type: "production_finished", module: "producao", ...params }),
  emitAlert: (params) => EventBus.publish({ event_type: "alert_generated", module: "bi", ...params }),
  emitAdvanceCreated: (params) => EventBus.publish({ event_type: "advance_created", module: "rh", ...params }),
  emitAdvanceUpdated: (params) => EventBus.publish({ event_type: "advance_updated", module: "rh", ...params }),
};

export default EventBus;