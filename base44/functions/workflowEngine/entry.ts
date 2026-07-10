import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================
// WORKFLOW ENGINE — Don Baron OS
// Motor unico de processos. Todo fluxo, aprovacao, automacao,
// regra de negocio e notificacao passa obrigatoriamente por aqui.
//
// Integracoes obrigatorias:
//   - Core Engine (eventos, notificacoes, auditoria, permissoes, tarefas)
//   - Data Engine (timeline, calculos, snapshots)
// Nenhum modulo acessa outro diretamente.
// ============================================================

// ---------- STEP STATUS ----------
const STEP_STATUS = ['pendente', 'em_andamento', 'aguardando_aprovacao', 'aguardando_documento', 'concluido', 'cancelado', 'erro'];

// ---------- RESPONSIBLE ROLES ----------
const ROLES = ['administrador', 'financeiro', 'compras', 'estoque', 'producao', 'gerencia', 'sistema', 'baron_ai'];

// ---------- PROCESS COUNTER (in-memory, reseta on deploy) ----------
let processCounter = 0;

function generateProcessCode() {
  processCounter++;
  const year = new Date().getFullYear();
  return 'WF-' + year + '-' + String(processCounter).padStart(4, '0');
}

// ---------- HELPER: ADD TO HISTORY ----------
function historyEntry(action, description, userName, extra) {
  return {
    action,
    description,
    user_name: userName || 'Sistema',
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

// ---------- HELPER: COMPUTE DUE DATE ----------
function computeDueDate(dueHours) {
  if (!dueHours) return null;
  const d = new Date();
  d.setHours(d.getHours() + dueHours);
  return d.toISOString();
}

// ---------- HELPER: INVOKE CORE ENGINE ----------
async function coreEmit(base44, params) {
  return await base44.functions.invoke('coreEngine', { action: 'emitEvent', ...params });
}

async function coreNotify(base44, params) {
  return await base44.functions.invoke('coreEngine', { action: 'notify', ...params });
}

async function coreAudit(base44, params) {
  const { action, ...rest } = params;
  return await base44.functions.invoke('coreEngine', { ...rest, action: 'audit', audit_action: action });
}

async function coreCreateTask(base44, params) {
  return await base44.functions.invoke('coreEngine', { action: 'createTask', ...params });
}

async function dataTimeline(base44, params) {
  return await base44.functions.invoke('dataEngine', { action: 'addTimelineEntry', ...params });
}

// ============================================================
// HANDLERS
// ============================================================

// ---------- TRIGGER WORKFLOW ----------
// Ponto de entrada principal. Recebe um evento e inicia o(s) fluxo(s)
// correspondente(s), criando etapas, notificacoes e tarefas.
async function handleTrigger(base44, user, body) {
  const { event, entity_type, entity_id, entity_description, origin, priority, ia_suggested } = body;
  if (!event) {
    return Response.json({ error: 'event is required' }, { status: 400 });
  }

  // Busca definicoes ativas para este evento
  const definitions = await base44.asServiceRole.entities.WorkflowDefinition.filter({
    trigger_event: event,
    active: true,
  });

  if (definitions.length === 0) {
    return Response.json({ success: true, message: 'No workflow definitions for event: ' + event, processes_created: 0 });
  }

  const processes = [];
  for (const def of definitions) {
    // Verifica condicoes (estrutura preparada — por enquanto aceita todas)
    // No futuro: avaliar def.conditions contra entity data

    const processCode = generateProcessCode();
    const now = new Date().toISOString();

    // Constroi etapas a partir do template
    const steps = (def.steps || []).map(function (step, idx) {
      return {
        name: step.name || ('Etapa ' + (idx + 1)),
        description: step.description || '',
        responsible_role: step.responsible_role || 'sistema',
        responsible_name: '',
        status: idx === 0 ? 'em_andamento' : 'pendente',
        created_at: now,
        due_date: computeDueDate(step.due_hours),
        priority: step.priority || 'media',
        dependencies: step.dependencies || [],
        requires_approval: step.requires_approval || false,
        notes: '',
        history: [historyEntry('created', 'Etapa criada pelo Workflow Engine', user.full_name)],
      };
    });

    const process = await base44.asServiceRole.entities.WorkflowProcess.create({
      definition_id: def.id,
      definition_name: def.name,
      process_code: processCode,
      trigger_event: event,
      origin: origin || 'backend',
      status: steps.length > 0 ? 'em_andamento' : 'pendente',
      priority: priority || 'media',
      entity_type: entity_type || '',
      entity_id: entity_id || '',
      entity_description: entity_description || '',
      steps,
      current_step: steps.length > 0 ? steps[0].name : '',
      history: [historyEntry('triggered', 'Processo iniciado pelo evento: ' + event, user.full_name, { event, definition: def.name })],
      started_at: now,
      initiated_by_name: user.full_name || 'Sistema',
      initiated_by_email: user.email || '',
      ia_suggested: ia_suggested || false,
    });

    // Notificacao automatica para etapas humanas
    if (def.auto_notify !== false && steps.length > 0) {
      const firstStep = steps[0];
      if (firstStep.responsible_role !== 'sistema') {
        await coreNotify(base44, {
          title: 'Nova tarefa: ' + firstStep.name,
          message: 'Processo ' + processCode + ' requer acao do setor ' + firstStep.responsible_role,
          category: 'info',
          module: 'workflow',
          target_role: firstStep.responsible_role,
          action_url: '/workflow/' + process.id,
        });
      }
    }

    // Cria tarefa no Core Engine
    if (steps.length > 0 && steps[0].responsible_role !== 'sistema') {
      await coreCreateTask(base44, {
        title: firstStepName(steps),
        description: 'Processo ' + processCode + ' - ' + (steps[0].description || ''),
        priority: steps[0].priority || 'media',
        module: 'workflow',
        related_entity_type: 'WorkflowProcess',
        related_entity_id: process.id,
        created_by_name: user.full_name || 'Sistema',
      });
    }

    // Registra na timeline do Data Engine
    await dataTimeline(base44, {
      title: 'Processo iniciado: ' + processCode,
      description: def.name + ' - Evento: ' + event,
      module: 'workflow',
      event_type: event,
      entity_type: 'WorkflowProcess',
      entity_id: process.id,
      relationships: entity_id ? [{ entity_type: entity_type, entity_id }] : [],
      severity: 'info',
      origin: origin || 'backend',
    });

    // Emite evento no Core Engine
    await coreEmit(base44, {
      event_type: 'workflow_iniciado',
      module: 'workflow',
      entity_type: 'WorkflowProcess',
      entity_id: process.id,
      payload: { process_code: processCode, definition: def.name, trigger_event: event },
      user_name: user.full_name,
      user_email: user.email,
      origin: origin || 'backend',
    });

    processes.push({ id: process.id, process_code: processCode, definition: def.name });
  }

  return Response.json({ success: true, processes_created: processes.length, processes });
}

function firstStepName(steps) {
  return steps.length > 0 ? steps[0].name : 'Processo';
}

// ---------- ADVANCE STEP ----------
// Marca a etapa atual como concluida e avanca para a proxima.
async function handleAdvanceStep(base44, user, body) {
  const { process_id, step_name, notes, result } = body;
  if (!process_id) {
    return Response.json({ error: 'process_id is required' }, { status: 400 });
  }

  const process = await base44.asServiceRole.entities.WorkflowProcess.get(process_id);
  if (!process) {
    return Response.json({ error: 'Process not found' }, { status: 404 });
  }

  const steps = process.steps || [];
  const currentIdx = steps.findIndex(function (s) { return s.name === step_name; });
  if (currentIdx === -1) {
    return Response.json({ error: 'Step not found: ' + step_name }, { status: 404 });
  }

  const now = new Date().toISOString();
  steps[currentIdx].status = 'concluido';
  steps[currentIdx].completed_at = now;
  steps[currentIdx].notes = notes || steps[currentIdx].notes;
  steps[currentIdx].history = (steps[currentIdx].history || []).concat([
    historyEntry('completed', 'Etapa concluida por ' + (user.full_name || 'Sistema'), user.full_name, { result }),
  ]);

  // Encontra proxima etapa pendente
  let nextStep = null;
  let newStatus = 'em_andamento';
  for (let i = currentIdx + 1; i < steps.length; i++) {
    if (steps[i].status === 'pendente') {
      // Verifica dependencias
      const depsMet = (steps[i].dependencies || []).every(function (dep) {
        const depStep = steps.find(function (s) { return s.name === dep; });
        return depStep && depStep.status === 'concluido';
      });
      if (depsMet) {
        nextStep = steps[i];
        break;
      }
    }
  }

  if (nextStep) {
    nextStep.status = 'em_andamento';
    nextStep.history = (nextStep.history || []).concat([
      historyEntry('started', 'Etapa iniciada', user.full_name),
    ]);

    // Notificacao para etapas humanas
    if (nextStep.responsible_role !== 'sistema') {
      await coreNotify(base44, {
        title: 'Tarefa: ' + nextStep.name,
        message: 'Processo ' + process.process_code + ' requer acao do setor ' + nextStep.responsible_role,
        category: 'info',
        module: 'workflow',
        target_role: nextStep.responsible_role,
        action_url: '/workflow/' + process.id,
      });
    }
    newStatus = nextStep.requires_approval ? 'aguardando_aprovacao' : 'em_andamento';
  } else {
    // Nenhuma proxima etapa — processo concluido
    newStatus = 'concluido';
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].status === 'pendente') {
        steps[i].status = 'cancelado';
      }
    }
  }

  const updateData = {
    steps,
    current_step: nextStep ? nextStep.name : '',
    status: newStatus,
    history: (process.history || []).concat([
      historyEntry('step_completed', 'Etapa "' + step_name + '" concluida', user.full_name, { next_step: nextStep ? nextStep.name : null }),
    ]),
  };

  if (newStatus === 'concluido') {
    updateData.completed_at = now;
    updateData.result = result || 'Processo concluido';
    updateData.processing_time_ms = process.started_at ? new Date(now).getTime() - new Date(process.started_at).getTime() : 0;
  }

  await base44.asServiceRole.entities.WorkflowProcess.update(process_id, updateData);

  // Auditoria
  await coreAudit(base44, {
    action: 'workflow_step_completed',
    module: 'workflow',
    entity_type: 'WorkflowProcess',
    entity_id: process_id,
    operation: 'update',
    details: 'Etapa "' + step_name + '" concluida no processo ' + process.process_code,
    user_name: user.full_name,
    user_email: user.email,
    origin: 'backend',
  });

  return Response.json({ success: true, process_id, status: newStatus, current_step: nextStep ? nextStep.name : null });
}

// ---------- REQUEST APPROVAL ----------
// Marca uma etapa como aguardando aprovacao e cria registro de aprovacao.
async function handleRequestApproval(base44, user, body) {
  const { process_id, step_name, approver_role, reason, entity_type, entity_id } = body;
  if (!process_id || !approver_role) {
    return Response.json({ error: 'process_id and approver_role are required' }, { status: 400 });
  }

  const process = await base44.asServiceRole.entities.WorkflowProcess.get(process_id);
  if (!process) {
    return Response.json({ error: 'Process not found' }, { status: 404 });
  }

  // Atualiza a etapa
  const steps = process.steps || [];
  const stepIdx = steps.findIndex(function (s) { return s.name === step_name; });
  if (stepIdx !== -1) {
    steps[stepIdx].status = 'aguardando_aprovacao';
    steps[stepIdx].history = (steps[stepIdx].history || []).concat([
      historyEntry('approval_requested', 'Aprovacao solicitada para ' + approver_role, user.full_name, { reason }),
    ]);
  }

  await base44.asServiceRole.entities.WorkflowProcess.update(process_id, {
    steps,
    status: 'aguardando_aprovacao',
    history: (process.history || []).concat([
      historyEntry('approval_requested', 'Aprovacao solicitada (' + approver_role + ')', user.full_name),
    ]),
  });

  // Cria registro de aprovacao
  const approval = await base44.asServiceRole.entities.WorkflowApproval.create({
    process_id,
    process_code: process.process_code,
    step_name: step_name || process.current_step,
    approver_role,
    result: 'pending',
    reason: reason || '',
    entity_type: entity_type || process.entity_type,
    entity_id: entity_id || process.entity_id,
  });

  // Notificacao para o setor responsavel
  await coreNotify(base44, {
    title: 'Aprovacao necessaria: ' + (step_name || process.process_code),
    message: 'Processo ' + process.process_code + ' aguarda aprovacao do setor ' + approver_role,
    category: 'urgent',
    module: 'workflow',
    target_role: approver_role,
    action_url: '/workflow/' + process_id,
  });

  return Response.json({ success: true, approval_id: approval.id, process_id });
}

// ---------- APPROVE / REJECT ----------
async function handleApprove(base44, user, body) {
  const { approval_id, result, comment } = body;
  if (!approval_id || !result) {
    return Response.json({ error: 'approval_id and result are required' }, { status: 400 });
  }
  if (!['approved', 'rejected'].includes(result)) {
    return Response.json({ error: 'result must be approved or rejected' }, { status: 400 });
  }

  const approval = await base44.asServiceRole.entities.WorkflowApproval.get(approval_id);
  if (!approval) {
    return Response.json({ error: 'Approval not found' }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Atualiza aprovacao
  await base44.asServiceRole.entities.WorkflowApproval.update(approval_id, {
    result,
    approved_by: user.full_name || 'Sistema',
    approved_at: now,
    comment: comment || '',
    audit_logged: true,
  });

  // Atualiza processo
  const process = await base44.asServiceRole.entities.WorkflowProcess.get(approval.process_id);
  if (process) {
    const steps = process.steps || [];
    const stepIdx = steps.findIndex(function (s) { return s.name === approval.step_name; });
    if (stepIdx !== -1) {
      if (result === 'approved') {
        steps[stepIdx].status = 'concluido';
        steps[stepIdx].completed_at = now;
      } else {
        steps[stepIdx].status = 'erro';
      }
      steps[stepIdx].history = (steps[stepIdx].history || []).concat([
        historyEntry(result, 'Aprovacao ' + (result === 'approved' ? 'concedida' : 'rejeitada') + ' por ' + (user.full_name || 'Sistema'), user.full_name, { comment }),
      ]);
    }

    const newStatus = result === 'approved' ? 'em_andamento' : 'cancelado';
    await base44.asServiceRole.entities.WorkflowProcess.update(approval.process_id, {
      steps,
      status: newStatus,
      history: (process.history || []).concat([
        historyEntry(result === 'approved' ? 'approved' : 'rejected', 'Processo ' + (result === 'approved' ? 'aprovado' : 'rejeitado') + ' por ' + (user.full_name || 'Sistema'), user.full_name, { comment, approver_role: approval.approver_role }),
      ]),
    });

    // Se aprovado, avanca para proxima etapa
    if (result === 'approved') {
      // Re-executar advance step internamente
      const nextStep = steps.slice(stepIdx + 1).find(function (s) { return s.status === 'pendente'; });
      if (nextStep) {
        const stepsUpdate = process.steps || [];
        const nIdx = stepsUpdate.findIndex(function (s) { return s.name === nextStep.name; });
        if (nIdx !== -1) {
          stepsUpdate[nIdx].status = 'em_andamento';
          if (nextStep.responsible_role !== 'sistema') {
            await coreNotify(base44, {
              title: 'Tarefa: ' + nextStep.name,
              message: 'Processo ' + process.process_code + ' requer acao do setor ' + nextStep.responsible_role,
              category: 'info',
              module: 'workflow',
              target_role: nextStep.responsible_role,
              action_url: '/workflow/' + approval.process_id,
            });
          }
        }
      }
    }
  }

  // Auditoria
  await coreAudit(base44, {
    action: 'workflow_' + result,
    module: 'workflow',
    entity_type: 'WorkflowApproval',
    entity_id: approval_id,
    operation: result === 'approved' ? 'confirm' : 'reject',
    details: 'Aprovacao ' + (result === 'approved' ? 'concedida' : 'rejeitada') + ' no processo ' + (process ? process.process_code : approval.process_code),
    user_name: user.full_name,
    user_email: user.email,
    origin: 'backend',
  });

  return Response.json({ success: true, approval_id, result });
}

// ---------- GET PROCESS QUEUE ----------
// Fila central de processos. Suporta filtros por status, prioridade, origem.
async function handleGetQueue(base44, body) {
  const { status, priority, origin, limit } = body;
  let filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (origin) filter.origin = origin;

  const processes = await base44.asServiceRole.entities.WorkflowProcess.filter(filter, '-created_date', limit || 50);

  return Response.json({
    queue: processes.map(function (p) {
      return {
        id: p.id,
        process_code: p.process_code,
        definition_name: p.definition_name,
        trigger_event: p.trigger_event,
        origin: p.origin,
        priority: p.priority,
        status: p.status,
        current_step: p.current_step,
        entity_description: p.entity_description,
        started_at: p.started_at,
        completed_at: p.completed_at,
        processing_time_ms: p.processing_time_ms,
        result: p.result,
        retry_count: p.retry_count,
      };
    }),
    count: processes.length,
  });
}

// ---------- GET PROCESS ----------
async function handleGetProcess(base44, body) {
  const { process_id } = body;
  if (!process_id) {
    return Response.json({ error: 'process_id is required' }, { status: 400 });
  }
  const process = await base44.asServiceRole.entities.WorkflowProcess.get(process_id);
  if (!process) {
    return Response.json({ error: 'Process not found' }, { status: 404 });
  }

  // Busca aprovacoes relacionadas
  const approvals = await base44.asServiceRole.entities.WorkflowApproval.filter({ process_id });

  return Response.json({ process, approvals, approval_count: approvals.length });
}

// ---------- CANCEL PROCESS ----------
async function handleCancelProcess(base44, user, body) {
  const { process_id, reason } = body;
  if (!process_id) {
    return Response.json({ error: 'process_id is required' }, { status: 400 });
  }

  const process = await base44.asServiceRole.entities.WorkflowProcess.get(process_id);
  if (!process) {
    return Response.json({ error: 'Process not found' }, { status: 404 });
  }

  const steps = (process.steps || []).map(function (s) {
    if (s.status === 'pendente' || s.status === 'em_andamento' || s.status === 'aguardando_aprovacao') {
      s.status = 'cancelado';
      s.history = (s.history || []).concat([historyEntry('cancelled', 'Etapa cancelada', user.full_name)]);
    }
    return s;
  });

  await base44.asServiceRole.entities.WorkflowProcess.update(process_id, {
    status: 'cancelado',
    steps,
    completed_at: new Date().toISOString(),
    result: reason || 'Processo cancelado',
    history: (process.history || []).concat([
      historyEntry('cancelled', 'Processo cancelado por ' + (user.full_name || 'Sistema') + ': ' + (reason || ''), user.full_name),
    ]),
  });

  await coreAudit(base44, {
    action: 'workflow_cancelled',
    module: 'workflow',
    entity_type: 'WorkflowProcess',
    entity_id: process_id,
    operation: 'delete',
    details: 'Processo ' + process.process_code + ' cancelado: ' + (reason || ''),
    user_name: user.full_name,
    user_email: user.email,
    origin: 'backend',
  });

  return Response.json({ success: true });
}

// ---------- RETRY FAILED ----------
// Retenta processos com erro, incrementando o contador de tentativas.
async function handleRetry(base44, user, body) {
  const { process_id } = body;
  if (!process_id) {
    return Response.json({ error: 'process_id is required' }, { status: 400 });
  }

  const process = await base44.asServiceRole.entities.WorkflowProcess.get(process_id);
  if (!process) {
    return Response.json({ error: 'Process not found' }, { status: 404 });
  }

  if (process.status !== 'erro') {
    return Response.json({ error: 'Only failed processes can be retried' }, { status: 400 });
  }

  if ((process.retry_count || 0) >= (process.max_retries || 3)) {
    return Response.json({ error: 'Max retries exceeded' }, { status: 400 });
  }

  // Reativa a etapa com erro
  const steps = process.steps || [];
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].status === 'erro') {
      steps[i].status = 'em_andamento';
      steps[i].history = (steps[i].history || []).concat([
        historyEntry('retry', 'Retentativa iniciada por ' + (user.full_name || 'Sistema'), user.full_name, { attempt: (process.retry_count || 0) + 1 }),
      ]);
      break;
    }
  }

  await base44.asServiceRole.entities.WorkflowProcess.update(process_id, {
    status: 'em_andamento',
    steps,
    retry_count: (process.retry_count || 0) + 1,
    error: '',
    history: (process.history || []).concat([
      historyEntry('retry', 'Retentativa #' + ((process.retry_count || 0) + 1), user.full_name),
    ]),
  });

  return Response.json({ success: true, retry_count: (process.retry_count || 0) + 1 });
}

// ---------- MARK ERROR ----------
async function handleMarkError(base44, user, body) {
  const { process_id, step_name, error } = body;
  if (!process_id) {
    return Response.json({ error: 'process_id is required' }, { status: 400 });
  }

  const process = await base44.asServiceRole.entities.WorkflowProcess.get(process_id);
  if (!process) {
    return Response.json({ error: 'Process not found' }, { status: 404 });
  }

  const steps = process.steps || [];
  if (step_name) {
    const idx = steps.findIndex(function (s) { return s.name === step_name; });
    if (idx !== -1) {
      steps[idx].status = 'erro';
      steps[idx].history = (steps[idx].history || []).concat([
        historyEntry('error', 'Erro: ' + (error || 'Erro nao especificado'), user.full_name),
      ]);
    }
  }

  await base44.asServiceRole.entities.WorkflowProcess.update(process_id, {
    status: 'erro',
    steps,
    error: error || 'Erro nao especificado',
    history: (process.history || []).concat([
      historyEntry('error', 'Erro registrado: ' + (error || ''), user.full_name),
    ]),
  });

  // Notificacao de erro
  await coreNotify(base44, {
    title: 'Erro no processo ' + process.process_code,
    message: error || 'Erro no processamento',
    category: 'error',
    module: 'workflow',
    target_role: 'administrador',
    action_url: '/workflow/' + process_id,
  });

  return Response.json({ success: true });
}

// ---------- LIST DEFINITIONS ----------
async function handleListDefinitions(base44, body) {
  const { trigger_event, active } = body;
  let filter = {};
  if (trigger_event) filter.trigger_event = trigger_event;
  if (active !== undefined) filter.active = active;

  const definitions = await base44.asServiceRole.entities.WorkflowDefinition.filter(filter, '-created_date', 100);
  return Response.json({ definitions, count: definitions.length });
}

// ---------- CREATE DEFINITION ----------
async function handleCreateDefinition(base44, user, body) {
  const { name, description, trigger_event, conditions, steps, auto_notify } = body;
  if (!name || !trigger_event) {
    return Response.json({ error: 'name and trigger_event are required' }, { status: 400 });
  }

  const def = await base44.asServiceRole.entities.WorkflowDefinition.create({
    name,
    description: description || '',
    trigger_event,
    conditions: conditions || [],
    steps: steps || [],
    auto_notify: auto_notify !== false,
    active: true,
    created_by_name: user.full_name || 'Sistema',
  });

  await coreAudit(base44, {
    action: 'workflow_definition_created',
    module: 'workflow',
    entity_type: 'WorkflowDefinition',
    entity_id: def.id,
    operation: 'create',
    details: 'Definicao de workflow criada: ' + name,
    user_name: user.full_name,
    user_email: user.email,
    origin: 'backend',
  });

  return Response.json({ success: true, definition_id: def.id });
}

// ---------- GET APPROVALS ----------
async function handleGetApprovals(base44, body) {
  const { process_id, result, approver_role } = body;
  let filter = {};
  if (process_id) filter.process_id = process_id;
  if (result) filter.result = result;
  if (approver_role) filter.approver_role = approver_role;

  const approvals = await base44.asServiceRole.entities.WorkflowApproval.filter(filter, '-created_date', 100);
  return Response.json({ approvals, count: approvals.length });
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
      case 'trigger': return await handleTrigger(base44, user, body);
      case 'advanceStep': return await handleAdvanceStep(base44, user, body);
      case 'requestApproval': return await handleRequestApproval(base44, user, body);
      case 'approve': return await handleApprove(base44, user, body);
      case 'getQueue': return await handleGetQueue(base44, body);
      case 'getProcess': return await handleGetProcess(base44, body);
      case 'cancelProcess': return await handleCancelProcess(base44, user, body);
      case 'retry': return await handleRetry(base44, user, body);
      case 'markError': return await handleMarkError(base44, user, body);
      case 'listDefinitions': return await handleListDefinitions(base44, body);
      case 'createDefinition': return await handleCreateDefinition(base44, user, body);
      case 'getApprovals': return await handleGetApprovals(base44, body);
      default: return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});