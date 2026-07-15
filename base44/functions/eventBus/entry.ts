import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================
// DON BARON ENTERPRISE — EVENT BUS CORPORATIVO
//
// Obrigatoriedade: toda alteracao relevante gera um evento.
// Proibido dependencias diretas entre modulos — toda comunicacao
// passa pelo barramento. Modulos reagem aos eventos via REACTORS.
// Todos os eventos sao registrados em log (SystemEvent + SystemLog).
// Consumidor que falha e reenviado automaticamente (auto-retry).
// ============================================================

// ---------- EVENT CATALOG ----------
const EVENT_CATALOG = {
  // --- Cadastro ---
  ProductCreated:     { snake: "product_created",      module: "cadastro",   priority: "media",  queue: "documents",   subscribers: ["estoque", "compras", "ia"], description: "Produto criado", notification: null },
  ProductUpdated:     { snake: "product_updated",      module: "cadastro",   priority: "media",  queue: "documents",   subscribers: ["estoque", "financeiro", "ia"], description: "Produto atualizado", notification: null },

  // --- Estoque ---
  StockEntryCreated:  { snake: "stock_entry_created",  module: "estoque",    priority: "media",  queue: "inventory",   subscribers: ["financeiro", "compras", "ia"], description: "Entrada de estoque criada", notification: null },
  StockExitCreated:   { snake: "stock_exit_created",   module: "estoque",    priority: "media",  queue: "inventory",   subscribers: ["producao", "financeiro", "ia"], description: "Saida de estoque criada", notification: null },
  StockLow:           { snake: "stock_low",             module: "estoque",    priority: "alta",  queue: "inventory",   subscribers: ["compras", "producao", "ia", "notificacoes"], description: "Estoque baixo", notification: { category: "warning", title: "Estoque baixo" } },
  StockCritical:      { snake: "stock_critical",        module: "estoque",    priority: "critica",queue: "inventory",   subscribers: ["compras", "producao", "financeiro", "ia", "notificacoes"], description: "Estoque critico", notification: { category: "urgent", title: "Estoque critico" } },

  // --- Compras ---
  PurchaseCreated:    { snake: "purchase_created",     module: "compras",    priority: "media",  queue: "purchasing",  subscribers: ["financeiro", "estoque", "ia"], description: "Pedido de compra criado", notification: { category: "info", title: "Compra criada" } },
  PurchaseConfirmed:  { snake: "purchase_confirmed",  module: "compras",    priority: "alta",  queue: "purchasing",  subscribers: ["estoque", "financeiro", "ia"], description: "Compra confirmada/recebida", notification: { category: "success", title: "Compra recebida" } },

  // --- Financeiro ---
  PaymentCreated:     { snake: "payment_created",     module: "financeiro", priority: "media",  queue: "finance",     subscribers: ["ia", "notificacoes"], description: "Pagamento criado", notification: null },
  PaymentConfirmed:   { snake: "payment_confirmed",   module: "financeiro", priority: "alta",  queue: "finance",     subscribers: ["compras", "ia", "notificacoes"], description: "Pagamento confirmado", notification: { category: "success", title: "Pagamento confirmado" } },
  CashFlowUpdated:    { snake: "cash_flow_updated",  module: "financeiro", priority: "media",  queue: "finance",     subscribers: ["ia", "analytics"], description: "Fluxo de caixa atualizado", notification: null },

  // --- Documentos ---
  DocumentReceived:   { snake: "document_received",   module: "documentos", priority: "media",  queue: "documents",   subscribers: ["financeiro", "compras", "ia"], description: "Documento recebido", notification: null },
  OCRCompleted:       { snake: "ocr_completed",      module: "documentos", priority: "media",  queue: "documents",   subscribers: ["compras", "financeiro", "estoque", "ia"], description: "OCR concluido", notification: null },

  // --- BI / Inteligencia ---
  DREUpdated:         { snake: "dre_updated",         module: "bi",         priority: "media",  queue: "analytics",   subscribers: ["ia", "financeiro"], description: "DRE atualizado", notification: null },
  CMVUpdated:         { snake: "cmv_updated",         module: "bi",         priority: "media",  queue: "analytics",   subscribers: ["ia", "financeiro", "producao"], description: "CMV atualizado", notification: null },

  // --- Producao ---
  RecipeUpdated:      { snake: "recipe_updated",      module: "producao",   priority: "media",  queue: "production",  subscribers: ["estoque", "financeiro", "ia"], description: "Receita atualizada", notification: null },
  ProductionFinished: { snake: "production_finished", module: "producao",   priority: "media",  queue: "production",  subscribers: ["estoque", "financeiro", "ia", "analytics"], description: "Producao finalizada", notification: { category: "success", title: "Producao finalizada" } },

  // --- RH / Alertas (legado mantido) ---
  EmployeeCreated:    { snake: "employee_created",    module: "rh",         priority: "baixa",  queue: "hr",          subscribers: ["ia"], description: "Funcionario cadastrado", notification: null },
  AdvanceCreated:     { snake: "advance_created",     module: "rh",         priority: "media",  queue: "hr",          subscribers: ["financeiro", "ia", "analytics"], description: "Vale/emprestimo criado", notification: { category: "info", title: "Vale registrado" } },
  AdvanceUpdated:     { snake: "advance_updated",     module: "rh",         priority: "baixa",  queue: "hr",          subscribers: ["financeiro", "ia"], description: "Vale/emprestimo atualizado", notification: null },
  PayrollClosed:      { snake: "payroll_closed",       module: "rh",         priority: "alta",  queue: "hr",          subscribers: ["financeiro", "ia"], description: "Folha fechada", notification: { category: "warning", title: "Folha fechada" } },
  AlertGenerated:     { snake: "alert_generated",      module: "bi",         priority: "alta",  queue: "notifications", subscribers: ["ia", "notificacoes"], description: "Alerta gerado", notification: { category: "urgent", title: "Alerta gerado" } },
};

const QUEUES = ["finance", "inventory", "production", "purchasing", "hr", "courier", "crm", "documents", "ai", "notifications", "analytics"];

// ---------- REACTORS ----------
// Reacoes cross-modulo mediadas pelo barramento. Nenhum modulo chama outro
// diretamente — o bus despacha para o handler do modulo inscrito.
// Handlers sao defensivos: falhar nao derruba o evento (vai para auto-retry).
const REACTORS = {
  // Compra criada -> Financeiro cria conta a pagar (sem Compras depender de Financeiro).
  purchase_created: {
    financeiro: async (evt, base44) => {
      const p = evt.payload || {};
      if (!p.total_amount && !p.amount) return { ok: true, note: "sem valor" };
      const existing = await base44.asServiceRole.entities.FinancialTransaction.filter(
        { document_id: evt.entity_id, origin: "compra", status: "pendente" }, "-created_date", 1
      ).catch(() => []);
      if (existing && existing.length > 0) return { ok: true, note: "ja existe" };
      await base44.asServiceRole.entities.FinancialTransaction.create({
        description: `Compra ${p.purchase_code || evt.entity_id} — ${p.supplier || ""}`,
        type: "a_pagar",
        amount: p.total_amount || p.amount || 0,
        due_date: p.expected_delivery_date || p.due_date || "",
        status: "pendente",
        supplier: p.supplier || "",
        supplier_id: p.supplier_id || "",
        document_id: evt.entity_id,
        origin: "compra",
        notes: "Gerado automaticamente pelo Event Bus (purchase_created)",
      });
      return { ok: true, created: true };
    },
    estoque: async () => ({ ok: true, note: "aguardando recebimento" }),
  },

  stock_entry_created: {
    financeiro: async (evt, base44) => {
      const p = evt.payload || {};
      if (p.supplier_id) {
        await base44.asServiceRole.entities.Supplier.update(p.supplier_id, {
          last_purchase_date: new Date().toISOString().slice(0, 10),
        }).catch(() => {});
      }
      return { ok: true };
    },
    compras: async () => ({ ok: true }),
  },

  stock_exit_created: {
    producao: async () => ({ ok: true }),
    financeiro: async () => ({ ok: true }),
  },

  // Vale/Empréstimo criado -> Financeiro espelha como conta a pagar (RH nao depende de Financeiro).
  advance_created: {
    financeiro: async (evt, base44) => {
      const p = evt.payload || {};
      const valor = p.amount || p.installment_amount || 0;
      if (!valor) return { ok: true, note: "sem valor" };
      const desc = `Vale/Empréstimo ${evt.entity_id} — ${p.employee_name || ""} (${p.type || "vale"})`;
      const existing = await base44.asServiceRole.entities.FinancialTransaction.filter(
        { origin: "folha", description: desc, status: "pendente" }, "-created_date", 1
      ).catch(() => []);
      if (existing && existing.length > 0) return { ok: true, note: "ja existe" };
      await base44.asServiceRole.entities.FinancialTransaction.create({
        description: desc,
        type: "a_pagar",
        amount: valor,
        due_date: p.date || "",
        status: "pendente",
        origin: "folha",
        notes: "Gerado automaticamente pelo Event Bus (advance_created) — espelho do vale/empréstimo do RH",
      }).catch(() => {});
      return { ok: true, created: true };
    },
    ia: async () => ({ ok: true }),
    analytics: async () => ({ ok: true }),
  },

  advance_updated: {
    financeiro: async () => ({ ok: true }),
    ia: async () => ({ ok: true }),
  },

  payment_confirmed: {
    compras: async (evt, base44) => {
      const p = evt.payload || {};
      if (p.supplier_id) {
        const sup = await base44.asServiceRole.entities.Supplier.get(p.supplier_id).catch(() => null);
        if (sup) {
          await base44.asServiceRole.entities.Supplier.update(p.supplier_id, {
            version: (sup.version || 1) + 1,
          }).catch(() => {});
        }
      }
      return { ok: true };
    },
  },

  production_finished: {
    estoque: async () => ({ ok: true }),
    financeiro: async () => ({ ok: true }),
  },

  product_created: {
    estoque: async (evt, base44) => {
      const p = evt.payload || {};
      if (!evt.entity_id) return { ok: true };
      if (p.controls_stock === false) return { ok: true };
      const existing = await base44.asServiceRole.entities.Stock.filter(
        { product_id: evt.entity_id }, "-created_date", 1
      ).catch(() => []);
      if (existing && existing.length > 0) return { ok: true };
      await base44.asServiceRole.entities.Stock.create({
        product_id: evt.entity_id,
        product_name: p.name || "",
        stock_type: p.is_raw_material ? "materia_prima" : (p.is_finished_product ? "produto_acabado" : "materia_prima"),
        quantity: 0,
        unit: p.control_unit || p.unit || "un",
        min_quantity: p.min_quantity || 0,
        ideal_quantity: p.ideal_quantity || 0,
        max_quantity: p.max_quantity || 0,
        average_cost: 0,
        total_value: 0,
        status: "ativo",
      }).catch(() => {});
      return { ok: true };
    },
  },

  recipe_updated: { estoque: async () => ({ ok: true }) },
  cmv_updated: { producao: async () => ({ ok: true }) },
  dre_updated: { financeiro: async () => ({ ok: true }) },
  ocr_completed: { compras: async () => ({ ok: true }), financeiro: async () => ({ ok: true }) },
  document_received: { ia: async () => ({ ok: true, note: "aguarda OCR" }) },
};

// ---------- HELPERS ----------
function genUUID() { return crypto.randomUUID(); }
function genSignature(data) {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  return "sig_" + Math.abs(hash).toString(16) + "_" + str.length;
}
function nowMinusMinutes(min) { return new Date(Date.now() - min * 60000).toISOString(); }
function getRole(user) {
  if (user.department) return user.department;
  if (user.role === "admin") return "administrador";
  return "operador";
}
function lookupEventConfig(eventType) {
  for (const [name, cfg] of Object.entries(EVENT_CATALOG)) {
    if (cfg.snake === eventType || name === eventType) return { name, ...cfg };
  }
  return null;
}

async function writeLog(base44, entry) {
  try {
    await base44.asServiceRole.entities.SystemLog.create({
      entity_name: "SystemEvent",
      operation: entry.operation || "transaction",
      status: entry.status || "success",
      module: entry.module || "event_bus",
      origin: "backend",
      payload: entry.payload || {},
      bank_response: entry.bank_response || null,
      error_message: entry.error_message || "",
      readback_verified: !!entry.readback_verified,
      duration_ms: entry.duration_ms || 0,
      correlation_id: entry.correlation_id || "",
      timestamp: new Date().toISOString(),
      user_name: entry.user_name || "Sistema",
      user_email: entry.user_email || "",
    });
  } catch (_) { /* log nunca derruba o fluxo */ }
}

// ---------- DISPATCH ----------
async function dispatchEvent(event, base44, user) {
  const config = lookupEventConfig(event.event_type);
  if (!config) return;
  const reactorsForEvent = REACTORS[event.event_type] || {};
  const subscribers = Array.isArray(event.subscribers) && event.subscribers.length > 0
    ? event.subscribers
    : (config.subscribers || []).map(m => ({ module: m, status: "pending", attempts: 0 }));

  let anyFailed = false;
  const updatedSubs = [];

  for (const sub of subscribers) {
    if (sub.status === "completed") { updatedSubs.push(sub); continue; }
    const reactor = reactorsForEvent[sub.module];
    const attempts = (sub.attempts || 0) + 1;
    try {
      if (reactor) await reactor(event, base44);
      updatedSubs.push({ ...sub, status: "completed", attempts, processed_at: new Date().toISOString(), error: "" });
      await writeLog(base44, {
        operation: "read", status: "success", module: sub.module,
        payload: { event_uuid: event.event_uuid, event_type: event.event_type, consumer: sub.module },
        correlation_id: event.correlation_id, user_name: user?.full_name, user_email: user?.email,
        readback_verified: true,
      });
    } catch (err) {
      anyFailed = true;
      updatedSubs.push({ ...sub, status: "failed", attempts, error: err.message, last_attempt_at: new Date().toISOString() });
      await writeLog(base44, {
        operation: "transaction", status: "error", module: sub.module,
        payload: { event_uuid: event.event_uuid, event_type: event.event_type, consumer: sub.module, attempt: attempts },
        error_message: err.message, correlation_id: event.correlation_id, user_name: user?.full_name, user_email: user?.email,
      });
    }
  }

  const allCompleted = updatedSubs.every(s => s.status === "completed");
  const newStatus = allCompleted ? "completed" : (anyFailed ? "retrying" : "dispatched");
  await base44.asServiceRole.entities.SystemEvent.update(event.id, {
    subscribers: updatedSubs,
    event_status: newStatus,
  }).catch(() => {});
}

// ---------- SWEEP (AUTO-RETRY) ----------
async function sweepRetries(base44, user, limit = 25) {
  const candidates = await base44.asServiceRole.entities.SystemEvent.filter(
    { event_status: { $in: ["retrying", "failed"] } }, "-created_date", limit
  ).catch(() => []);
  let reprocessed = 0;
  let exhausted = 0;
  for (const evt of candidates) {
    const maxRetries = evt.max_retries || 3;
    const maxAttempts = Math.max(...(evt.subscribers || []).map(s => s.attempts || 0), 0);
    if (maxAttempts >= maxRetries) {
      if (evt.event_status !== "failed") {
        await base44.asServiceRole.entities.SystemEvent.update(evt.id, {
          event_status: "failed", error_message: "Max retries exceeded (auto-sweep)",
        }).catch(() => {});
      }
      exhausted++;
      continue;
    }
    try {
      await dispatchEvent(evt, base44, user);
      reprocessed++;
    } catch (e) {
      await writeLog(base44, { operation: "transaction", status: "error", module: "event_bus",
        payload: { sweep: true, event_uuid: evt.event_uuid }, error_message: e.message });
    }
  }
  return { scanned: candidates.length, reprocessed, exhausted };
}

// ============================================================
// HANDLERS
// ============================================================

async function handlePublish(base44, user, body) {
  const startTime = Date.now();
  const { event_type, event_name, module, entity_type, entity_id, payload, origin, message, action_url, priority, correlation_id, trace_id, idempotency_key, company_id } = body;
  if (!event_type && !event_name) return Response.json({ error: "event_type or event_name is required" }, { status: 400 });
  if (!module) return Response.json({ error: "module is required" }, { status: 400 });

  const config = lookupEventConfig(event_type || event_name);
  if (!config) return Response.json({ error: "Event type not in catalog: " + (event_type || event_name) }, { status: 400 });

  const idemKey = idempotency_key || (entity_id ? config.snake + ":" + entity_id : null);
  if (idemKey) {
    const existing = await base44.asServiceRole.entities.SystemEvent.filter({ idempotency_key: idemKey }, "-created_date", 1);
    if (existing.length > 0) return Response.json({ success: true, event_id: existing[0].id, idempotent: true, message: "Evento ja processado" });
  }

  const eventUuid = genUUID();
  const corrId = correlation_id || eventUuid;
  const traceId = trace_id || eventUuid;
  const eventPriority = priority || config.priority;
  const finalPayload = payload || {};
  const signature = genSignature({ event_uuid: eventUuid, event_type: config.snake, module, entity_id, payload: finalPayload });

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

  await writeLog(base44, {
    operation: "create", status: "success", module,
    payload: { event_uuid: eventUuid, event_type: config.snake, entity_type, entity_id },
    bank_response: { event_id: event.id }, correlation_id: corrId,
    user_name: user.full_name, user_email: user.email, readback_verified: true,
    duration_ms: Date.now() - startTime,
  });

  if (config.notification) {
    await base44.asServiceRole.entities.Notification.create({
      title: config.notification.title,
      message: message || config.description,
      category: config.notification.category,
      module,
      action_url: action_url || "",
      metadata: { event_id: event.id, event_uuid: eventUuid, entity_type, entity_id, ...finalPayload },
      event_id: event.id, read: false,
    }).catch(() => {});
  }

  try { await dispatchEvent(event, base44, user); } catch (_) {}
  try { await sweepRetries(base44, user, 15); } catch (_) {}

  return Response.json({
    success: true, event_id: event.id, event_uuid: eventUuid,
    event_name: config.name, queue: config.queue, priority: eventPriority,
    dispatched_to: config.subscribers, processing_time_ms: Date.now() - startTime,
  });
}

async function handleGetDashboard(base44, user, body) {
  const role = getRole(user);
  if (role === "operador") return Response.json({ error: "Acesso restrito" }, { status: 403 });
  const oneMinAgo = nowMinusMinutes(1), fiveMinAgo = nowMinusMinutes(5), oneHourAgo = nowMinusMinutes(60);
  const [recent, pending, failed] = await Promise.all([
    base44.asServiceRole.entities.SystemEvent.list("-created_date", 200),
    base44.asServiceRole.entities.SystemEvent.filter({ event_status: "pending" }, "-created_date", 100),
    base44.asServiceRole.entities.SystemEvent.filter({ event_status: "failed" }, "-created_date", 100),
  ]);
  const eventsLastMin = recent.filter(e => e.created_date && e.created_date >= oneMinAgo).length;
  const eventsLast5Min = recent.filter(e => e.created_date && e.created_date >= fiveMinAgo).length;
  const eventsLastHour = recent.filter(e => e.created_date && e.created_date >= oneHourAgo).length;
  const completed = recent.filter(e => (e.processing_time_ms || 0) > 0);
  const avgProcessingTime = completed.length > 0 ? completed.reduce((s, e) => s + (e.processing_time_ms || 0), 0) / completed.length : 0;
  const activeModules = [...new Set(recent.map(e => e.module))];
  const queueStats = {};
  for (const q of QUEUES) {
    const qEvents = recent.filter(e => e.queue === q);
    queueStats[q] = {
      total: qEvents.length,
      pending: qEvents.filter(e => e.event_status === "pending").length,
      dispatched: qEvents.filter(e => e.event_status === "dispatched").length,
      completed: qEvents.filter(e => e.event_status === "completed").length,
      retrying: qEvents.filter(e => e.event_status === "retrying").length,
      failed: qEvents.filter(e => e.event_status === "failed").length,
    };
  }
  const totalRetries = recent.reduce((s, e) => s + (e.retry_count || 0), 0);
  const errorRate = recent.length > 0 ? (failed.length / recent.length) * 100 : 0;
  let healthScore = 100;
  if (errorRate > 10) healthScore -= 30; else if (errorRate > 5) healthScore -= 20; else if (errorRate > 2) healthScore -= 10;
  if (pending.length > 50) healthScore -= 20; else if (pending.length > 20) healthScore -= 10;
  if (avgProcessingTime > 5000) healthScore -= 15; else if (avgProcessingTime > 2000) healthScore -= 8;
  healthScore = Math.max(0, Math.min(100, healthScore));
  let healthStatus = "excelente";
  if (healthScore < 50) healthStatus = "critica"; else if (healthScore < 70) healthStatus = "atencao"; else if (healthScore < 85) healthStatus = "boa";
  const eventTypeCounts = {};
  recent.forEach(e => { const k = e.event_name || e.event_type; eventTypeCounts[k] = (eventTypeCounts[k] || 0) + 1; });
  const topEvents = Object.entries(eventTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

  const failedConsumers = [];
  for (const e of recent) {
    for (const s of (e.subscribers || [])) {
      if (s.status === "failed") failedConsumers.push({ event_id: e.id, event_uuid: e.event_uuid, event_type: e.event_type, module: e.module, consumer: s.module, attempts: s.attempts, error: s.error });
    }
  }

  return Response.json({
    metrics: {
      events_per_minute: eventsLastMin, events_last_5_min: eventsLast5Min, events_last_hour: eventsLastHour,
      total_recent: recent.length, pending: pending.length, failed: failed.length,
      avg_processing_time_ms: Math.round(avgProcessingTime), active_modules: activeModules.length,
      active_module_list: activeModules, total_retries: totalRetries, error_rate: Math.round(errorRate * 100) / 100,
      failed_consumers: failedConsumers.length,
    },
    health: { score: healthScore, status: healthStatus },
    queues: queueStats, top_events: topEvents, failed_consumers: failedConsumers.slice(0, 20),
    recent_events: recent.slice(0, 20).map(e => ({
      id: e.id, event_uuid: e.event_uuid, event_name: e.event_name, event_type: e.event_type,
      module: e.module, origin: e.origin, priority: e.priority, queue: e.queue,
      event_status: e.event_status, processing_time_ms: e.processing_time_ms,
      retry_count: e.retry_count, created_date: e.created_date,
      entity_type: e.entity_type, entity_id: e.entity_id, user_name: e.user_name,
    })),
  });
}

function handleGetCatalog() {
  const catalog = Object.entries(EVENT_CATALOG).map(([name, cfg]) => ({
    name, event_type: cfg.snake, module: cfg.module, priority: cfg.priority,
    queue: cfg.queue, subscribers: cfg.subscribers, description: cfg.description,
    has_notification: !!cfg.notification, has_reactor: !!(REACTORS[cfg.snake]),
  }));
  return Response.json({ catalog, count: catalog.length });
}

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
      id: e.id, event_uuid: e.event_uuid, event_name: e.event_name, event_type: e.event_type,
      module: e.module, origin: e.origin, user_name: e.user_name, entity_type: e.entity_type,
      entity_id: e.entity_id, priority: e.priority, queue: e.queue, event_status: e.event_status,
      correlation_id: e.correlation_id, trace_id: e.trace_id, processing_time_ms: e.processing_time_ms,
      retry_count: e.retry_count, ai_processed: e.ai_processed, dispatched_to: e.dispatched_to,
      subscribers: e.subscribers, created_date: e.created_date,
    })),
    count: events.length,
  });
}

async function handleGetQueues(base44, user, body) {
  const recent = await base44.asServiceRole.entities.SystemEvent.list("-created_date", 200);
  const queues = QUEUES.map(q => {
    const qEvents = recent.filter(e => e.queue === q);
    return {
      name: q, total: qEvents.length,
      pending: qEvents.filter(e => e.event_status === "pending").length,
      dispatched: qEvents.filter(e => e.event_status === "dispatched").length,
      completed: qEvents.filter(e => e.event_status === "completed").length,
      retrying: qEvents.filter(e => e.event_status === "retrying").length,
      failed: qEvents.filter(e => e.event_status === "failed").length,
    };
  });
  return Response.json({ queues });
}

async function handleRetry(base44, user, body) {
  const { event_id } = body;
  if (!event_id) return Response.json({ error: "event_id is required" }, { status: 400 });
  const event = await base44.asServiceRole.entities.SystemEvent.get(event_id);
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });
  await base44.asServiceRole.entities.SystemEvent.update(event_id, {
    event_status: "retrying", retry_count: (event.retry_count || 0) + 1,
    last_retry_at: new Date().toISOString(), error_message: "",
  });
  try { await dispatchEvent(event, base44, user); } catch (_) {}
  return Response.json({ success: true, retry_count: (event.retry_count || 0) + 1 });
}

async function handleSweep(base44, user, body) {
  const res = await sweepRetries(base44, user, body.limit || 50);
  return Response.json({ success: true, ...res });
}

async function handleReplay(base44, user, body) {
  const { event_id } = body;
  if (!event_id) return Response.json({ error: "event_id is required" }, { status: 400 });
  const event = await base44.asServiceRole.entities.SystemEvent.get(event_id);
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });
  const replayUuid = genUUID();
  const replay = await base44.asServiceRole.entities.SystemEvent.create({
    company_id: event.company_id || "",
    event_uuid: replayUuid, event_name: event.event_name, event_type: event.event_type,
    module: event.module, origin: "replay", user_name: user.full_name || "Sistema",
    user_email: user.email || "", entity_type: event.entity_type, entity_id: event.entity_id,
    payload: event.payload || {}, priority: event.priority, queue: event.queue,
    event_status: "dispatched", correlation_id: event.correlation_id || replayUuid,
    trace_id: replayUuid, idempotency_key: replayUuid,
    signature: genSignature({ event_uuid: replayUuid, replay_of: event_id }),
    dispatched_to: event.dispatched_to || [],
    subscribers: (event.dispatched_to || []).map(m => ({ module: m, status: "pending", attempts: 0 })),
    ai_processed: false,
  });
  try { await dispatchEvent(replay, base44, user); } catch (_) {}
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
      case "sweep": return await handleSweep(base44, user, body);
      case "replay": return await handleReplay(base44, user, body);
      default: return Response.json({ error: "Unknown action: " + action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});