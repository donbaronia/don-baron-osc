import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================
// CORE ENGINE — Don Baron OS
// Nucleo central de infraestrutura. Todos os modulos comunicam-se
// exclusivamente atraves deste ponto.
// ============================================================

// ---------- DISPATCH MAP ----------
// Mapeia tipos de evento para modulos que devem ser notificados.
const DISPATCH_MAP = {
  documento_recebido: {
    targets: ['documentos', 'financeiro', 'compras', 'ia', 'logs', 'dashboard'],
    notification: { category: 'info', title: 'Documento recebido' },
  },
  compra_registrada: {
    targets: ['compras', 'financeiro', 'estoque', 'ia', 'logs'],
    notification: { category: 'info', title: 'Compra registrada' },
  },
  pagamento_realizado: {
    targets: ['financeiro', 'ia', 'logs', 'dashboard'],
    notification: { category: 'success', title: 'Pagamento realizado' },
  },
  producao_iniciada: {
    targets: ['producao', 'estoque', 'ia', 'logs'],
    notification: { category: 'info', title: 'Producao iniciada' },
  },
  producao_finalizada: {
    targets: ['producao', 'estoque', 'financeiro', 'ia', 'logs', 'dashboard'],
    notification: { category: 'success', title: 'Producao finalizada' },
  },
  produto_criado: {
    targets: ['estoque', 'compras', 'ia', 'logs'],
    notification: { category: 'info', title: 'Produto criado' },
  },
  fornecedor_atualizado: {
    targets: ['compras', 'financeiro', 'ia', 'logs'],
    notification: { category: 'info', title: 'Fornecedor atualizado' },
  },
  relatorio_importado: {
    targets: ['documentos', 'financeiro', 'ia', 'logs', 'dashboard'],
    notification: { category: 'info', title: 'Relatorio importado' },
  },
  inventario_realizado: {
    targets: ['estoque', 'ia', 'logs', 'dashboard'],
    notification: { category: 'info', title: 'Inventario realizado' },
  },
  usuario_criado: {
    targets: ['administracao', 'logs'],
    notification: { category: 'system', title: 'Usuario criado' },
  },
};

// ---------- DEFAULT PERMISSIONS ----------
// Matriz padrao de permissoes por role. Sobrescrita por registros
// na entidade Permission quando existirem.
const DEFAULT_PERMISSIONS = {
  administrador: {
    Product: ['create', 'read', 'update', 'delete'],
    Supplier: ['create', 'read', 'update', 'delete'],
    FinancialTransaction: ['create', 'read', 'update', 'delete'],
    DBDocument: ['create', 'read', 'update', 'delete'],
    Purchase: ['create', 'read', 'update', 'delete'],
    ProductionRecord: ['create', 'read', 'update', 'delete'],
    SystemTask: ['create', 'read', 'update', 'delete'],
    AuditLog: ['read'],
    SystemConfig: ['read'],
    FileRecord: ['create', 'read', 'update', 'delete'],
    SystemEvent: ['read'],
    Notification: ['create', 'read', 'update', 'delete'],
    TechLog: ['read'],
  },
  financeiro: {
    Product: ['read'],
    Supplier: ['read'],
    FinancialTransaction: ['create', 'read', 'update', 'delete'],
    DBDocument: ['create', 'read', 'update'],
    Purchase: ['read'],
    ProductionRecord: [],
    SystemTask: ['create', 'read', 'update'],
    AuditLog: [],
    SystemConfig: ['read'],
    FileRecord: ['create', 'read'],
  },
  compras: {
    Product: ['read'],
    Supplier: ['create', 'read', 'update'],
    FinancialTransaction: ['read'],
    DBDocument: ['create', 'read', 'update'],
    Purchase: ['create', 'read', 'update', 'delete'],
    ProductionRecord: [],
    SystemTask: ['create', 'read', 'update'],
    AuditLog: [],
    SystemConfig: ['read'],
    FileRecord: ['create', 'read'],
  },
  estoque: {
    Product: ['create', 'read', 'update', 'delete'],
    Supplier: ['read'],
    FinancialTransaction: [],
    DBDocument: ['read'],
    Purchase: ['read'],
    ProductionRecord: [],
    SystemTask: ['create', 'read', 'update'],
    AuditLog: [],
    SystemConfig: ['read'],
    FileRecord: ['create', 'read'],
  },
  producao: {
    Product: ['read'],
    Supplier: [],
    FinancialTransaction: [],
    DBDocument: [],
    Purchase: [],
    ProductionRecord: ['create', 'read', 'update', 'delete'],
    SystemTask: ['create', 'read', 'update'],
    AuditLog: [],
    SystemConfig: ['read'],
    FileRecord: ['create', 'read'],
  },
  gerencia: {
    Product: ['read'],
    Supplier: ['read'],
    FinancialTransaction: ['read'],
    DBDocument: ['read'],
    Purchase: ['read'],
    ProductionRecord: ['read'],
    SystemTask: ['read'],
    AuditLog: ['read'],
    SystemConfig: ['read'],
    FileRecord: ['read'],
  },
  operador: {
    Product: ['read'],
    Supplier: [],
    FinancialTransaction: [],
    DBDocument: ['read'],
    Purchase: [],
    ProductionRecord: [],
    SystemTask: ['read'],
    AuditLog: [],
    SystemConfig: ['read'],
    FileRecord: ['read'],
  },
};

// ---------- SEARCHABLE ENTITIES ----------
const SEARCHABLE_ENTITIES = {
  Product: {
    fields: ['name', 'short_name', 'internal_code', 'barcode', 'category', 'brand', 'description'],
    titleField: 'name',
  },
  Supplier: {
    fields: ['name', 'trade_name', 'document_number', 'city', 'primary_contact', 'email'],
    titleField: 'name',
  },
  FinancialTransaction: {
    fields: ['description', 'supplier', 'category'],
    titleField: 'description',
  },
  DBDocument: {
    fields: ['title', 'supplier', 'cnpj', 'document_number', 'notes'],
    titleField: 'title',
  },
  Purchase: {
    fields: ['supplier', 'description'],
    titleField: 'supplier',
  },
  ProductionRecord: {
    fields: ['item', 'responsible'],
    titleField: 'item',
  },
};

// ---------- HELPER: GET USER ROLE ----------
function getUserRole(user) {
  if (user.department) return user.department;
  if (user.role === 'admin') return 'administrador';
  return 'operador';
}

// ============================================================
// HANDLERS
// ============================================================

// ---------- EVENT BUS + DISPATCHER ----------
async function handleEmitEvent(base44, user, body) {
  const { event_type, module, entity_type, entity_id, payload, origin, message, action_url } = body;
  if (!event_type || !module) {
    return Response.json({ error: 'event_type and module are required' }, { status: 400 });
  }

  const dispatchConfig = DISPATCH_MAP[event_type] || { targets: [], notification: null };

  const event = await base44.asServiceRole.entities.SystemEvent.create({
    event_type,
    module,
    entity_type: entity_type || '',
    entity_id: entity_id || '',
    payload: payload || {},
    dispatched_to: dispatchConfig.targets,
    user_name: user.full_name || 'Sistema',
    user_email: user.email || '',
    origin: origin || 'frontend',
  });

  // Dispatcher: cria notificacao se configurada
  if (dispatchConfig.notification) {
    await base44.asServiceRole.entities.Notification.create({
      title: dispatchConfig.notification.title,
      message: message || dispatchConfig.notification.title,
      category: dispatchConfig.notification.category,
      module,
      action_url: action_url || '',
      metadata: { event_id: event.id, entity_type, entity_id, ...(payload || {}) },
      event_id: event.id,
      read: false,
    });
  }

  return Response.json({
    success: true,
    event_id: event.id,
    dispatched_to: dispatchConfig.targets,
  });
}

// ---------- NOTIFICATION CENTER ----------
async function handleNotify(base44, user, body) {
  const { title, message, category, module, target_role, target_user_id, action_url, metadata } = body;
  if (!title || !category) {
    return Response.json({ error: 'title and category are required' }, { status: 400 });
  }

  const notif = await base44.asServiceRole.entities.Notification.create({
    title,
    message: message || '',
    category,
    module: module || '',
    target_role: target_role || '',
    target_user_id: target_user_id || '',
    action_url: action_url || '',
    metadata: metadata || {},
    read: false,
  });

  return Response.json({ success: true, notification_id: notif.id });
}

async function handleListNotifications(base44, user, body) {
  const { unread_only, limit } = body;
  const role = getUserRole(user);

  let notifs = await base44.asServiceRole.entities.Notification.list('-created_date', limit || 50);

  // Usuario ve notificacoes: dirigidas a ele, ao seu role, ou broadcast (sem target)
  notifs = notifs.filter(function (n) {
    if (n.target_user_id && n.target_user_id !== user.id) return false;
    if (n.target_role && n.target_role !== role) return false;
    return true;
  });

  if (unread_only) {
    notifs = notifs.filter(function (n) { return !n.read; });
  }

  return Response.json({ notifications: notifs });
}

async function handleMarkNotificationRead(base44, user, body) {
  const { id, read } = body;
  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }
  await base44.asServiceRole.entities.Notification.update(id, { read: read !== false });
  return Response.json({ success: true });
}

// ---------- TASK MANAGER ----------
async function handleCreateTask(base44, user, body) {
  const { title, description, priority, due_date, module, related_entity_type, related_entity_id, responsible_id, responsible_name } = body;
  if (!title) {
    return Response.json({ error: 'title is required' }, { status: 400 });
  }

  const task = await base44.asServiceRole.entities.SystemTask.create({
    title,
    description: description || '',
    status: 'pendente',
    priority: priority || 'media',
    responsible_id: responsible_id || '',
    responsible_name: responsible_name || user.full_name || '',
    due_date: due_date || '',
    module: module || '',
    related_entity_type: related_entity_type || '',
    related_entity_id: related_entity_id || '',
    history: [{
      action: 'criada',
      user: user.full_name || 'Sistema',
      date: new Date().toISOString(),
      notes: 'Tarefa criada',
    }],
    created_by_name: user.full_name || 'Sistema',
  });

  return Response.json({ success: true, task_id: task.id });
}

async function handleUpdateTask(base44, user, body) {
  const { id, status, priority, responsible_id, responsible_name, due_date, action_note } = body;
  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }

  const task = await base44.asServiceRole.entities.SystemTask.get(id);
  if (!task) {
    return Response.json({ error: 'Task not found' }, { status: 404 });
  }

  const updates = {};
  if (status) updates.status = status;
  if (priority) updates.priority = priority;
  if (responsible_id !== undefined) updates.responsible_id = responsible_id;
  if (responsible_name !== undefined) updates.responsible_name = responsible_name;
  if (due_date !== undefined) updates.due_date = due_date;

  const historyEntry = {
    action: action_note || (status ? 'status alterado para ' + status : 'atualizada'),
    user: user.full_name || 'Sistema',
    date: new Date().toISOString(),
    notes: action_note || '',
  };

  updates.history = [...(task.history || []), historyEntry];

  await base44.asServiceRole.entities.SystemTask.update(id, updates);
  return Response.json({ success: true });
}

// ---------- AUDIT ENGINE ----------
async function handleAudit(base44, user, body) {
  const { module, audit_action, details, entity_type, entity_id, operation, before_value, after_value, origin, device } = body;
  if (!audit_action) {
    return Response.json({ error: 'audit_action is required' }, { status: 400 });
  }

  const log = await base44.asServiceRole.entities.AuditLog.create({
    user_name: user.full_name || 'Sistema',
    user_email: user.email || '',
    module: module || '',
    action: audit_action,
    details: details || '',
    entity_type: entity_type || '',
    entity_id: entity_id || '',
    operation: operation || 'other',
    before_value: before_value || {},
    after_value: after_value || {},
    origin: origin || 'frontend',
    device: device || '',
  });

  return Response.json({ success: true, audit_id: log.id });
}

// ---------- CONFIGURATION SERVICE ----------
async function handleGetConfig(base44, body) {
  const { key, category } = body;
  let configs;
  if (key) {
    configs = await base44.asServiceRole.entities.SystemConfig.filter({ key });
  } else if (category) {
    configs = await base44.asServiceRole.entities.SystemConfig.filter({ category });
  } else {
    configs = await base44.asServiceRole.entities.SystemConfig.list('-created_date', 200);
  }

  const result = {};
  for (const c of configs) {
    result[c.key] = c.value;
  }
  return Response.json({ configs: result, count: configs.length });
}

async function handleSetConfig(base44, user, body) {
  const role = getUserRole(user);
  if (role !== 'administrador') {
    return Response.json({ error: 'Apenas administradores podem alterar configuracoes' }, { status: 403 });
  }

  const { key, value, category, description } = body;
  if (!key) {
    return Response.json({ error: 'key is required' }, { status: 400 });
  }

  const existing = await base44.asServiceRole.entities.SystemConfig.filter({ key });
  if (existing.length > 0) {
    const updated = await base44.asServiceRole.entities.SystemConfig.update(existing[0].id, {
      value: value || {},
      updated_by_name: user.full_name || 'Sistema',
    });
    return Response.json({ success: true, config_id: updated.id, updated: true });
  }

  const config = await base44.asServiceRole.entities.SystemConfig.create({
    key,
    value: value || {},
    category: category || 'geral',
    description: description || '',
    editable: true,
    updated_by_name: user.full_name || 'Sistema',
  });

  return Response.json({ success: true, config_id: config.id, updated: false });
}

// ---------- PERMISSION ENGINE ----------
async function handleCheckPermission(base44, user, body) {
  const { module, entity_type, operation } = body;
  const role = getUserRole(user);

  // Verifica registros na entidade Permission primeiro
  const permissions = await base44.asServiceRole.entities.Permission.filter({
    role,
    module: module || '',
    entity_type,
  });

  let allowedOps;
  if (permissions.length > 0) {
    allowedOps = permissions[0].operations || [];
  } else {
    // Fall back para permissoes padrao
    const modulePerms = DEFAULT_PERMISSIONS[role];
    if (!modulePerms) {
      return Response.json({ allowed: false, role, reason: 'no_permissions_for_role' });
    }
    allowedOps = modulePerms[entity_type] || [];
  }

  const allowed = allowedOps.includes(operation);
  return Response.json({ allowed, role, operations: allowedOps });
}

// ---------- SEARCH ENGINE ----------
async function handleSearch(base44, user, body) {
  const { query, entity_types, limit } = body;
  if (!query) {
    return Response.json({ results: [] });
  }

  const q = query.toLowerCase().trim();
  const types = entity_types && entity_types.length > 0 ? entity_types : Object.keys(SEARCHABLE_ENTITIES);
  const totalLimit = limit || 50;
  const maxPerType = Math.max(5, Math.floor(totalLimit / types.length));

  const results = [];

  for (const entityType of types) {
    const config = SEARCHABLE_ENTITIES[entityType];
    if (!config) continue;

    const records = await base44.asServiceRole.entities[entityType].list('-created_date', 100);
    const matches = records
      .filter(function (r) {
        return config.fields.some(function (f) {
          const val = r[f];
          return val && String(val).toLowerCase().includes(q);
        });
      })
      .slice(0, maxPerType)
      .map(function (r) {
        const highlight = {};
        for (const f of config.fields.slice(0, 3)) {
          if (r[f]) highlight[f] = r[f];
        }
        return {
          entity_type: entityType,
          entity_id: r.id,
          title: r[config.titleField] || '—',
          fields: highlight,
        };
      });

    results.push(...matches);
  }

  return Response.json({ results, query, count: results.length });
}

// ---------- FILE SERVICE ----------
async function handleRegisterFile(base44, user, body) {
  const { file_name, file_url, file_type, file_size, module, entity_type, entity_id, thumbnail_url, is_private, file_uri, tags } = body;
  if (!file_name || !file_url) {
    return Response.json({ error: 'file_name and file_url are required' }, { status: 400 });
  }

  const record = await base44.asServiceRole.entities.FileRecord.create({
    file_name,
    file_url,
    file_type: file_type || '',
    file_size: file_size || 0,
    module: module || '',
    entity_type: entity_type || '',
    entity_id: entity_id || '',
    version: 1,
    thumbnail_url: thumbnail_url || '',
    uploaded_by_name: user.full_name || 'Sistema',
    is_private: is_private || false,
    file_uri: file_uri || '',
    tags: tags || [],
  });

  return Response.json({ success: true, file_id: record.id });
}

async function handleGetFile(base44, user, body) {
  const { file_id } = body;
  if (!file_id) {
    return Response.json({ error: 'file_id is required' }, { status: 400 });
  }

  const record = await base44.asServiceRole.entities.FileRecord.get(file_id);
  if (!record) {
    return Response.json({ error: 'File not found' }, { status: 404 });
  }

  let signed_url = null;
  if (record.is_private && record.file_uri) {
    try {
      const result = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri: record.file_uri,
      });
      signed_url = result.signed_url;
    } catch (e) {
      // signed URL falha silenciosamente — frontend trata
    }
  }

  return Response.json({ file: record, signed_url });
}

// ---------- LOG SERVICE ----------
async function handleLog(base44, user, body) {
  const { level, module, message, stack, metadata } = body;
  if (!level || !message) {
    return Response.json({ error: 'level and message are required' }, { status: 400 });
  }

  await base44.asServiceRole.entities.TechLog.create({
    level,
    module: module || '',
    message,
    stack: stack || '',
    metadata: metadata || {},
    user_name: user ? (user.full_name || '') : '',
    user_email: user ? (user.email || '') : '',
  });

  return Response.json({ success: true });
}

// ============================================================
// MAIN
// ============================================================
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'emitEvent': return await handleEmitEvent(base44, user, body);
      case 'notify': return await handleNotify(base44, user, body);
      case 'listNotifications': return await handleListNotifications(base44, user, body);
      case 'markNotificationRead': return await handleMarkNotificationRead(base44, user, body);
      case 'createTask': return await handleCreateTask(base44, user, body);
      case 'updateTask': return await handleUpdateTask(base44, user, body);
      case 'audit': return await handleAudit(base44, user, body);
      case 'getConfig': return await handleGetConfig(base44, body);
      case 'setConfig': return await handleSetConfig(base44, user, body);
      case 'checkPermission': return await handleCheckPermission(base44, user, body);
      case 'search': return await handleSearch(base44, user, body);
      case 'registerFile': return await handleRegisterFile(base44, user, body);
      case 'getFile': return await handleGetFile(base44, user, body);
      case 'log': return await handleLog(base44, user, body);
      default: return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});