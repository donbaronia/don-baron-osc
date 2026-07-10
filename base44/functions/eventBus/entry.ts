import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================
// CORE EVENT BUS ENGINE — Don Baron OS (Documento 028)
//
// O coracao da plataforma. Nenhum modulo chama outro diretamente.
// Toda comunicacao ocorre exclusivamente atraves do Event Bus.
//
// Fluxo: Modulo Origem -> Event Bus -> Event Store -> Validacao
//   -> Distribuicao -> Modulos interessados -> Workflow -> IA
//   -> Notificacoes -> BI
// ============================================================

// ---------- EVENT CATALOG ----------
const EVENT_CATALOG = {
  PurchaseCreated: { snake: "purchase_created", module: "compras", priority: "media", queue: "purchasing", subscribers: ["financeiro", "estoque", "ia"], description: "Pedido de compra criado", notification: { category: "info", title: "Compra criada" } },
  PurchaseApproved: { snake: "purchase_approved", module: "compras", priority: "alta", queue: "purchasing", subscribers: ["estoque", "financeiro", "workflow", "ia"], description: "Compra aprovada", notification: { category: "success", title: "Compra aprovada" } },
  PurchaseCancelled: { snake: "purchase_cancelled", module: "compras", priority: "media", queue: "purchasing", subscribers: ["financeiro", "ia"], description: "Compra cancelada", notification: { category: "warning", title: "Compra cancelada" } },
  InvoiceImported: { snake: "invoice_imported", module: "documentos", priority: "media", queue: "documents", subscribers: ["financeiro", "compras", "ia"], description: "Nota fiscal importada", notification: { category: "info", title: "NF importada" } },
  SupplierCreated: { snake: "supplier_created", module: "compras", priority: "baixa", queue: "purchasing", subscribers: ["ia"], description: "Fornecedor cadastrado", notification: null },
  SupplierUpdated: { snake: "supplier_updated", module: "compras", priority: "baixa", queue: "purchasing", subscribers: ["financeiro", "ia"], description: "Fornecedor atualizado", notification: null },
  InventoryEntry: { snake: "inventory_entry", module: "estoque", priority: "media", queue: "inventory", subscribers: ["compras", "financeiro", "ia"], description: "Entrada no estoque", notification: null },
  InventoryExit: { snake: "inventory_exit", module: "estoque", priority: "media", queue: "inventory", subscribers: ["producao", "financeiro", "ia"], description: "Saida do estoque", notification: null },
  InventoryAdjusted: { snake: "inventory_adjusted", module: "estoque", priority: "media", queue: "inventory", subscribers: ["ia"], description: "Ajuste de inventario", notification: null },
  StockLow: { snake: "stock_low", module: "estoque", priority: "alta", queue: "inventory", subscribers: ["compras", "producao", "ia", "notificacoes"], description: "Estoque baixo", notification: { category: "warning", title: "Estoque baixo" } },
  StockCritical: { snake: "stock_critical", module: "estoque", priority: "critica", queue: "inventory", subscribers: ["compras", "producao", "financeiro", "ia", "notificacoes"], description: "Estoque critico", notification: { category: "urgent", title: "Estoque critico" } },
  RecipeCreated: { snake: "recipe_created", module: "producao", priority: "baixa", queue: "production", subscribers: ["ia"], description: "Receita criada", notification: null },
  RecipeUpdated: { snake: "recipe_updated", module: "producao", priority: "media", queue: "production", subscribers: ["estoque", "ia"], description: "Receita atualizada", notification: null },
  ProductionStarted: { snake: "production_started", module: "producao", priority: "media", queue: "production", subscribers: ["estoque", "ia"], description: "Producao iniciada", notification: { category: "info", title: "Producao iniciada" } },
  ProductionFinished: { snake: "production_finished", module: "producao", priority: "media", queue: "production", subscribers: ["estoque", "financeiro", "ia", "analytics"], description: "Producao finalizada", notification: { category: "success", title: "Producao finalizada" } },
  ProductionCancelled: { snake: "production_cancelled", module: "producao", priority: "media", queue: "production", subscribers: ["ia"], description: "Producao cancelada", notification: { category: "warning", title: "Producao cancelada" } },
  EmployeeCreated: { snake: "employee_created", module: "rh", priority: "baixa", queue: "hr", subscribers: ["ia"], description: "Funcionario cadastrado", notification: null },
  EmployeeUpdated: { snake: "employee_updated", module: "rh", priority: "baixa", queue: "hr", subscribers: ["ia"], description: "Funcionario atualizado", notification: null },
  CourierCheckedIn: { snake: "courier_checked_in", module: "delivery", priority: "media", queue: "courier", subscribers: ["rh", "ia"], description: "Motoboy fez check-in", notification: null },
  CourierCheckedOut: { snake: "courier_checked_out", module: "delivery", priority: "baixa", queue: "courier", subscribers: ["rh", "ia"], description: "Motoboy fez check-out", notification: null },
  PayrollClosed: { snake: "payroll_closed", module: "rh", priority: "alta", queue: "hr", subscribers: ["financeiro", "ia"], description: "Folha de pagamento fechada", notification: { category: "warning", title: "Folha fechada" } },
  AdvanceRequested: { snake: "advance_requested", module: "rh", priority: "media", queue: "hr", subscribers: ["financeiro", "ia"], description: "Adiantamento solicitado", notification: { category: "info", title: "Adiantamento solicitado" } },
  AdvanceApproved: { snake: "advance_approved", module: "rh", priority: "media", queue: "hr", subscribers: ["financeiro", "ia"], description: "Adiantamento aprovado", notification: { category: "success", title: "Adiantamento aprovado" } },
  LoanCreated: { snake: "loan_created", module: "rh", priority: "media", queue: "hr", subscribers: ["financeiro", "ia"], description: "Emprestimo criado", notification: { category: "info", title: "Emprestimo criado" } },
  PaymentCreated: { snake: "payment_created", module: "financeiro", priority: "media", queue: "finance", subscribers: ["ia"], description: "Pagamento criado", notification: null },
  PaymentReceived: { snake: "payment_received", module: "financeiro", priority: "media", queue: "finance", subscribers: ["ia", "crm"], description: "Pagamento recebido", notification: { category: "success", title: "Pagamento recebido" } },
  CashFlowUpdated: { snake: "cash_flow_updated", module: "financeiro", priority: "media", queue: "finance", subscribers: ["ia", "analytics"], description: "Fluxo de caixa atualizado", notification: null },
  DocumentUploaded: { snake: "document_uploaded", module: "documentos", priority: "baixa", queue: "documents", subscribers: ["ia"], description: "Documento enviado", notification: null },
  OCRCompleted: { snake: "ocr_completed", module: "documentos", priority: "media", queue: "documents", subscribers: ["compras", "financeiro", "ia"], description: "OCR concluido", notification: null },
  WeeklyIFoodImported: { snake: "weekly_ifood_imported", module: "financeiro", priority: "media", queue: "finance", subscribers: ["ia", "analytics"], description: "Recebivel iFood importado", notification: { category: "info", title: "iFood importado" } },
  CMVCalculated: { snake: "cmv_calculated", module: "bi", priority: "media", queue: "analytics", subscribers: ["ia"], description: "CMV calculado", notification: null },
  DRECalculated: { snake: "dre_calculated", module: "bi", priority: "media", queue: "analytics", subscribers: ["ia"], description: "DRE calculado", notification: null },
  DashboardUpdated: { snake: "dashboard_updated", module: "bi", priority: "baixa", queue: "analytics", subscribers: ["ia"], description: "Dashboard atualizado", notification: null },
  AlertGenerated: { snake: "alert_generated", module: "bi", priority: "alta", queue: "notifications", subscribers: ["ia", "notificacoes"], description: "Alerta gerado", notification: { category: "urgent", title: "Alerta gerado" } },
  WorkflowStarted: { snake: "workflow_started", module: "workflow", priority: "media", queue: "notifications", subscribers: ["ia"], description: "Workflow iniciado", notification: { category: "info", title: "Workflow iniciado" } },
  WorkflowApproved: { snake: "workflow_approved", module: "workflow", priority: "media", queue: "notifications", subscribers: ["ia"], description: "Workflow aprovado", notification: { category: "success", title: "Workflow aprovado" } },
  WorkflowRejected: { snake: "workflow_rejected", module: "workflow", priority: "media", queue: "notifications", subscribers: ["ia"], description: "Workflow rejeitado", notification: { category: "warning", title: "Workflow rejeitado" } },
  AIRecommendationGenerated: { snake: "ai_recommendation_generated", module: "ia", priority: "media", queue: "ai", subscribers: ["notificacoes"], description: "Recomendacao da IA gerada", notification: { category: "info", title: "Recomendacao da IA" } },
};

// ---------- QUEUES ----------
const QUEUES = ["finance", "inventory", "production", "purchasing", "hr", "courier", "crm", "documents", "ai", "notifications", "analytics"];

const PRIORITY_ORDER = { critica: 0, alta: 1, media: 2, baixa: 3 };

// ---------- HELPERS ----------
function genUUID() {
  return crypto.randomUUID();
}

function genSignature(data) {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return "sig_" + Math.abs(hash).toString(16) + "_" + str.length;
}

function nowMinusMinutes(min) {
  return new Date(Date.now() - min * 60000).toISOString();
}

function getRole(user) {
  if (user.department) return user.department;
  if (user.role === "admin") return "administrador";
  return "operador";
}

// ---------- LOOKUP EVENT CONFIG ----------
function lookupEventConfig(eventType) {
  for (const [name, cfg] of Object.entries(EVENT_CATALOG)) {
    if (cfg.snake === eventType || name === eventType) return { name, ...cfg };
  }
  return null;
}

// ============================================================
// HANDLERS
// ============================================================

// ---------- PUBLISH ----------
async function handlePublish(base44, user, body) {
  const startTime = Date.now();
  const { event_type, event_name, module, entity_type, entity_id, payload, origin, message, action_url, priority, correlation_id, trace_id, idempotency_key, company_id } = body;

  if (!event_type && !event_name) {
    return Response.json({ error: "event_type or event_name is required" }, { status: 400 });
  }
  if (!module) {
    return Response.json({ error: "module is required" }, { status: 400 });
  }

  // Lookup no catalogo
  const config = lookupEventConfig(event_type || event_name);
  if (!config) {
    return Response.json({ error: "Event type not in catalog: " + (event_type || event_name) }, { status: 400 });
  }

  // Idempotency: se idempotency_key fornecida, checa se ja existe
  const idemKey = idempotency_key || (entity_id ? config.snake + ":" + entity_id : null);
  if (idemKey) {
    const existing = await base44.asServiceRole.entities.SystemEvent.filter({ idempotency_key: idemKey }, "-created_date", 1);
    if (existing.length > 0) {
      return Response.json({ success: true, event_id: existing[0].id, idempotent: true, message: "Evento ja processado" });
    }
  }

  // Enriquecimento
  const eventUuid = genUUID();
  const corrId = correlation_id || eventUuid;
  const traceId = trace_id || eventUuid;
  const eventPriority = priority || config.priority;
  const finalPayload = payload || {};

  // Assinatura interna (seguranca)
  const signature = genSignature({ event_uuid: eventUuid, event_type: config.snake, module, entity_id, payload: finalPayload });

  // Persistir no Event Store (imutavel)
  const event = await base44.asServiceRole.entities.SystemEvent.create({
    company_id: company_id || "",
    event_uuid: eventUuid,
    event_name: config.name,
    event_type: config.snake,
    module,
    origin: origin || "frontend",
    user_name: user.full_name || "Sistema",
    user_email: user.email || "",
    entity_type: entity_type || "",
    entity_id: entity_id || "",
    payload: finalPayload,
    priority: eventPriority,
    queue: config.queue,
    event_status: "dispatched",
    correlation_id: corrId,
    trace_id: traceId,
    idempotency_key: idemKey || eventUuid,
    signature,
    dispatched_to: config.subscribers,
    subscribers: config.subscribers.map(m => ({ module: m, status: "pending", attempts: 0 })),
    processing_time_ms: Date.now() - startTime,
    ai_processed: false,
  });

  // Distribuicao: criar notificacao se configurada
  if (config.notification) {
    await base44.asServiceRole.entities.Notification.create({
      title: config.notification.title,
      message: message || config.description,
      category: config.notification.category,
      module,
      action_url: action_url || "",
      metadata: { event_id: event.id, event_uuid: eventUuid, entity_type, entity_id, ...finalPayload },
      event_id: event.id,
      read: false,
    });
  }

  // Registrar na memoria da IA (BARON AI escuta TODOS os eventos)
  try {
    await base44.asServiceRole.entities.AIMemory.create({
      memory_type: "contexto",
      question: config.description,
      answer: "",
      context: { event_uuid: eventUuid, event_name: config.name, module, entity_type, entity_id, payload: finalPayload },
      data_sources: [module],
      tags: ["event_bus", config.snake, module],
      confidence_score: 0,
      user_name: user.full_name || "Sistema",
      user_email: user.email || "",
    });
    await base44.asServiceRole.entities.SystemEvent.update(event.id, { ai_processed: true });
  } catch (e) {
    // IA falha silenciosamente - evento nao perdido
  }

  return Response.json({
    success: true,
    event_id: event.id,
    event_uuid: eventUuid,
    event_name: config.name,
    queue: config.queue,
    priority: eventPriority,
    dispatched_to: config.subscribers,
    processing_time_ms: Date.now() - startTime,
  });
}

// ---------- DASHBOARD METRICS ----------
async function handleGetDashboard(base44, user, body) {
  const role = getRole(user);
  if (role === "operador") {
    return Response.json({ error: "Acesso restrito" }, { status: 403 });
  }

  // Eventos recentes (ultima hora para metricas)
  const oneMinAgo = nowMinusMinutes(1);
  const fiveMinAgo = nowMinusMinutes(5);
  const oneHourAgo = nowMinusMinutes(60);

  const [recent, pending, failed, recent1h] = await Promise.all([
    base44.asServiceRole.entities.SystemEvent.list("-created_date", 200),
    base44.asServiceRole.entities.SystemEvent.filter({ event_status: "pending" }, "-created_date", 100),
    base44.asServiceRole.entities.SystemEvent.filter({ event_status: "failed" }, "-created_date", 100),
    base44.asServiceRole.entities.SystemEvent.list("-created_date", 100),
  ]);

  // Eventos por minuto (ultima hora)
  const eventsLastMin = recent.filter(e => e.created_date && e.created_date >= oneMinAgo).length;
  const eventsLast5Min = recent.filter(e => e.created_date && e.created_date >= fiveMinAgo).length;
  const eventsLastHour = recent1h.filter(e => e.created_date && e.created_date >= oneHourAgo).length;

  // Tempo medio de processamento
  const completed = recent.filter(e => e.processing_time_ms > 0);
  const avgProcessingTime = completed.length > 0
    ? completed.reduce((s, e) => s + (e.processing_time_ms || 0), 0) / completed.length
    : 0;

  // Modulos ativos
  const activeModules = [...new Set(recent.map(e => e.module))];

  // Filas
  const queueStats = {};
  for (const q of QUEUES) {
    const qEvents = recent.filter(e => e.queue === q);
    queueStats[q] = {
      total: qEvents.length,
      pending: qEvents.filter(e => e.event_status === "pending").length,
      processing: qEvents.filter(e => e.event_status === "processing").length,
      dispatched: qEvents.filter(e => e.event_status === "dispatched").length,
      completed: qEvents.filter(e => e.event_status === "completed").length,
      failed: qEvents.filter(e => e.event_status === "failed").length,
    };
  }

  // Erros e retentativas
  const totalRetries = recent.reduce((s, e) => s + (e.retry_count || 0), 0);
  const errorRate = recent.length > 0 ? (failed.length / recent.length) * 100 : 0;

  // Saude do sistema
  let healthScore = 100;
  if (errorRate > 10) healthScore -= 30;
  else if (errorRate > 5) healthScore -= 20;
  else if (errorRate > 2) healthScore -= 10;
  if (pending.length > 50) healthScore -= 20;
  else if (pending.length > 20) healthScore -= 10;
  if (avgProcessingTime > 5000) healthScore -= 15;
  else if (avgProcessingTime > 2000) healthScore -= 8;
  const totalQueueBacklog = Object.values(queueStats).reduce((s, q) => s + q.pending, 0);
  if (totalQueueBacklog > 100) healthScore -= 15;
  healthScore = Math.max(0, Math.min(100, healthScore));

  let healthStatus = "excelente";
  if (healthScore < 50) healthStatus = "critica";
  else if (healthScore < 70) healthStatus = "atencao";
  else if (healthScore < 85) healthStatus = "boa";

  // Eventos por tipo (top 10)
  const eventTypeCounts = {};
  recent.forEach(e => {
    const key = e.event_name || e.event_type;
    eventTypeCounts[key] = (eventTypeCounts[key] || 0) + 1;
  });
  const topEvents = Object.entries(eventTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return Response.json({
    metrics: {
      events_per_minute: eventsLastMin,
      events_last_5_min: eventsLast5Min,
      events_last_hour: eventsLastHour,
      total_recent: recent.length,
      pending: pending.length,
      failed: failed.length,
      avg_processing_time_ms: Math.round(avgProcessingTime),
      active_modules: activeModules.length,
      active_module_list: activeModules,
      total_retries: totalRetries,
      error_rate: Math.round(errorRate * 100) / 100,
      total_queue_backlog: totalQueueBacklog,
    },
    health: {
      score: healthScore,
      status: healthStatus,
    },
    queues: queueStats,
    top_events: topEvents,
    recent_events: recent.slice(0, 20).map(e => ({
      id: e.id,
      event_uuid: e.event_uuid,
      event_name: e.event_name,
      event_type: e.event_type,
      module: e.module,
      origin: e.origin,
      priority: e.priority,
      queue: e.queue,
      event_status: e.event_status,
      processing_time_ms: e.processing_time_ms,
      retry_count: e.retry_count,
      created_date: e.created_date,
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      user_name: e.user_name,
    })),
  });
}

// ---------- EVENT CATALOG ----------
function handleGetCatalog() {
  const catalog = Object.entries(EVENT_CATALOG).map(([name, cfg]) => ({
    name,
    event_type: cfg.snake,
    module: cfg.module,
    priority: cfg.priority,
    queue: cfg.queue,
    subscribers: cfg.subscribers,
    description: cfg.description,
    has_notification: !!cfg.notification,
  }));
  return Response.json({ catalog, count: catalog.length });
}

// ---------- SUBSCRIPTIONS ----------
function handleGetSubscriptions() {
  const subs = {};
  for (const [eventName, cfg] of Object.entries(EVENT_CATALOG)) {
    for (const subModule of cfg.subscribers) {
      if (!subs[subModule]) subs[subModule] = [];
      subs[subModule].push({ event: eventName, event_type: cfg.snake, priority: cfg.priority, queue: cfg.queue });
    }
  }
  return Response.json({ subscriptions: subs, modules: Object.keys(subs) });
}

// ---------- EVENT STREAM ----------
async function handleGetStream(base44, user, body) {
  const { event_type, module, event_status, queue, limit } = body;
  const lim = limit || 50;

  let events = await base44.asServiceRole.entities.SystemEvent.list("-created_date", Math.min(lim * 2, 200));

  if (event_type) events = events.filter(e => e.event_type === event_type || e.event_name === event_type);
  if (module) events = events.filter(e => e.module === module);
  if (event_status) events = events.filter(e => e.event_status === event_status);
  if (queue) events = events.filter(e => e.queue === queue);

  return Response.json({
    events: events.slice(0, lim).map(e => ({
      id: e.id,
      event_uuid: e.event_uuid,
      event_name: e.event_name,
      event_type: e.event_type,
      module: e.module,
      origin: e.origin,
      user_name: e.user_name,
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      priority: e.priority,
      queue: e.queue,
      event_status: e.event_status,
      correlation_id: e.correlation_id,
      trace_id: e.trace_id,
      processing_time_ms: e.processing_time_ms,
      retry_count: e.retry_count,
      ai_processed: e.ai_processed,
      dispatched_to: e.dispatched_to,
      created_date: e.created_date,
    })),
    count: events.length,
  });
}

// ---------- QUEUE STATUS ----------
async function handleGetQueues(base44, user, body) {
  const recent = await base44.asServiceRole.entities.SystemEvent.list("-created_date", 200);

  const queues = QUEUES.map(q => {
    const qEvents = recent.filter(e => e.queue === q);
    return {
      name: q,
      total: qEvents.length,
      pending: qEvents.filter(e => e.event_status === "pending").length,
      processing: qEvents.filter(e => e.event_status === "processing").length,
      dispatched: qEvents.filter(e => e.event_status === "dispatched").length,
      completed: qEvents.filter(e => e.event_status === "completed").length,
      failed: qEvents.filter(e => e.event_status === "failed").length,
      retrying: qEvents.filter(e => e.event_status === "retrying").length,
      avg_processing_time: qEvents.filter(e => e.processing_time_ms > 0).reduce((s, e) => s + e.processing_time_ms, 0) / Math.max(qEvents.filter(e => e.processing_time_ms > 0).length, 1),
    };
  });

  return Response.json({ queues });
}

// ---------- RETRY ----------
async function handleRetry(base44, user, body) {
  const { event_id } = body;
  if (!event_id) return Response.json({ error: "event_id is required" }, { status: 400 });

  const event = await base44.asServiceRole.entities.SystemEvent.get(event_id);
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });

  const newRetryCount = (event.retry_count || 0) + 1;
  if (newRetryCount > (event.max_retries || 3)) {
    await base44.asServiceRole.entities.SystemEvent.update(event_id, {
      event_status: "failed",
      error_message: "Max retries exceeded",
    });
    return Response.json({ success: false, message: "Max retries exceeded" });
  }

  await base44.asServiceRole.entities.SystemEvent.update(event_id, {
    event_status: "dispatched",
    retry_count: newRetryCount,
    last_retry_at: new Date().toISOString(),
    error_message: "",
  });

  // Notificar administrador
  await base44.asServiceRole.entities.Notification.create({
    title: "Evento em retentativa",
    message: `Evento ${event.event_name} (${event.event_uuid}) em retentativa ${newRetryCount}/${event.max_retries}`,
    category: "warning",
    module: event.module,
    metadata: { event_id, retry_count: newRetryCount },
    read: false,
  });

  return Response.json({ success: true, retry_count: newRetryCount });
}

// ---------- REPLAY ----------
async function handleReplay(base44, user, body) {
  const { event_id } = body;
  if (!event_id) return Response.json({ error: "event_id is required" }, { status: 400 });

  const event = await base44.asServiceRole.entities.SystemEvent.get(event_id);
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });

  // Criar novo evento baseado no original (replay)
  const replayUuid = genUUID();
  const replay = await base44.asServiceRole.entities.SystemEvent.create({
    company_id: event.company_id || "",
    event_uuid: replayUuid,
    event_name: event.event_name,
    event_type: event.event_type,
    module: event.module,
    origin: "replay",
    user_name: user.full_name || "Sistema",
    user_email: user.email || "",
    entity_type: event.entity_type,
    entity_id: event.entity_id,
    payload: event.payload || {},
    priority: event.priority,
    queue: event.queue,
    event_status: "dispatched",
    correlation_id: event.correlation_id || replayUuid,
    trace_id: replayUuid,
    idempotency_key: replayUuid,
    signature: genSignature({ event_uuid: replayUuid, replay_of: event_id }),
    dispatched_to: event.dispatched_to || [],
    subscribers: (event.dispatched_to || []).map(m => ({ module: m, status: "pending", attempts: 0 })),
    ai_processed: false,
  });

  return Response.json({ success: true, replay_event_id: replay.id, replay_uuid: replayUuid });
}

// ============================================================
// MAIN
// ============================================================
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "publish": return await handlePublish(base44, user, body);
      case "getDashboard": return await handleGetDashboard(base44, user, body);
      case "getCatalog": return handleGetCatalog();
      case "getSubscriptions": return handleGetSubscriptions();
      case "getStream": return await handleGetStream(base44, user, body);
      case "getQueues": return await handleGetQueues(base44, user, body);
      case "retry": return await handleRetry(base44, user, body);
      case "replay": return await handleReplay(base44, user, body);
      default: return Response.json({ error: "Unknown action: " + action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});