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

  // ===== HELPERS =====
  // Atalhos para eventos comuns (usar em vez de passar event_type manualmente)
  emitPurchaseCreated: (params) => EventBus.publish({ event_type: "purchase_created", module: "compras", ...params }),
  emitPurchaseApproved: (params) => EventBus.publish({ event_type: "purchase_approved", module: "compras", ...params }),
  emitStockLow: (params) => EventBus.publish({ event_type: "stock_low", module: "estoque", ...params }),
  emitStockCritical: (params) => EventBus.publish({ event_type: "stock_critical", module: "estoque", ...params }),
  emitProductionStarted: (params) => EventBus.publish({ event_type: "production_started", module: "producao", ...params }),
  emitProductionFinished: (params) => EventBus.publish({ event_type: "production_finished", module: "producao", ...params }),
  emitPaymentReceived: (params) => EventBus.publish({ event_type: "payment_received", module: "financeiro", ...params }),
  emitDocumentUploaded: (params) => EventBus.publish({ event_type: "document_uploaded", module: "documentos", ...params }),
  emitAlert: (params) => EventBus.publish({ event_type: "alert_generated", module: "bi", ...params }),
  emitCashFlowUpdated: (params) => EventBus.publish({ event_type: "cash_flow_updated", module: "financeiro", ...params }),
};

export default EventBus;