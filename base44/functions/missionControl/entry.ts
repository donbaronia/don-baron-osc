import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DEPT_LABELS = {
  compras: 'Compras', financeiro: 'Financeiro', producao: 'Produção',
  estoque: 'Estoque', rh: 'Recursos Humanos', logistica: 'Logística',
  comercial: 'Comercial', auditoria: 'Auditoria', estrategia: 'Estratégia'
};

function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

const SAMPLE_MISSIONS = [
  {
    name: 'Preparar Sexta-feira',
    description: 'Missão diária de preparação para o dia de maior movimento da semana',
    objective: 'Garantir que toda a operação esteja pronta para o pico de vendas de sexta-feira',
    department: 'estrategia', type: 'diaria', priority: 'critica',
    responsible_name: 'Gestão',
    team: ['Compras', 'Produção', 'RH', 'Financeiro', 'Motoboys'],
    digital_workers: ['comprador_digital', 'supervisor_producao', 'gerente_rh', 'controller_financeiro', 'supervisor_motoboys'],
    start_date: dateStr(0), end_date: dateStr(0),
    expected_result: 'Operação 100% pronta para pico de vendas sem rupturas',
    status: 'em_andamento', progress_pct: 45,
    tasks: [
      { name: 'Verificar e comprar insumos críticos', department: 'compras', checklist_type: 'automatico', depends_on_indices: [] },
      { name: 'Planejar produção para pico', department: 'producao', checklist_type: 'ia', depends_on_indices: [0] },
      { name: 'Confirmar escala de funcionários', department: 'rh', checklist_type: 'manual', depends_on_indices: [] },
      { name: 'Conferir caixa e fluxo', department: 'financeiro', checklist_type: 'automatico', depends_on_indices: [] },
      { name: 'Confirmar motoboys', department: 'logistica', checklist_type: 'manual', depends_on_indices: [2] },
      { name: 'Verificar clientes ativos', department: 'comercial', checklist_type: 'ia', depends_on_indices: [] },
      { name: 'Ativar promoção de sexta', department: 'comercial', checklist_type: 'workflow', depends_on_indices: [5] },
    ],
    checklist: [
      { title: 'Estoque de hambúrguer conferido', type: 'automatico' },
      { title: 'Escala de funcionários confirmada', type: 'manual' },
      { title: 'Promoção ativa no iFood', type: 'workflow' },
    ]
  },
  {
    name: 'Fechamento Financeiro Mensal',
    description: 'Fechamento completo do mês - DRE, conciliação e relatórios',
    objective: 'Fechar o mês com 100% das contas conferidas e DRE consolidado',
    department: 'financeiro', type: 'mensal', priority: 'alta',
    responsible_name: 'Financeiro', team: ['Financeiro'],
    digital_workers: ['controller_financeiro', 'auditor_digital'],
    start_date: dateStr(0), end_date: dateStr(5),
    expected_result: 'DRE consolidado, contas reconciliadas, relatório gerado',
    status: 'planejada', progress_pct: 0,
    tasks: [
      { name: 'Conferir todas as contas a pagar', department: 'financeiro', checklist_type: 'automatico', depends_on_indices: [] },
      { name: 'Conferir todas as contas a receber', department: 'financeiro', checklist_type: 'automatico', depends_on_indices: [] },
      { name: 'Reconciliar recebimentos do iFood', department: 'financeiro', checklist_type: 'ia', depends_on_indices: [0, 1] },
      { name: 'Fechar DRE', department: 'financeiro', checklist_type: 'ia', depends_on_indices: [2] },
      { name: 'Auditar lançamentos', department: 'auditoria', checklist_type: 'ia', depends_on_indices: [3] },
      { name: 'Gerar relatório mensal', department: 'financeiro', checklist_type: 'workflow', depends_on_indices: [4] },
    ],
    checklist: [
      { title: 'Contas a pagar conferidas', type: 'automatico' },
      { title: 'Contas a receber conferidas', type: 'automatico' },
      { title: 'iFood reconciliado', type: 'ia' },
      { title: 'DRE fechado', type: 'ia' },
      { title: 'Relatório gerado', type: 'workflow' },
    ]
  },
  {
    name: 'Recebimento Semanal do iFood',
    description: 'Conferência e reconciliação do repasse semanal do iFood',
    objective: 'Garantir que o valor recebido do iFood confere com o relatório',
    department: 'financeiro', type: 'semanal', priority: 'media',
    responsible_name: 'Financeiro', team: ['Financeiro'],
    digital_workers: ['controller_financeiro'],
    start_date: dateStr(-3), end_date: dateStr(-1),
    expected_result: 'Valor recebido conferido e reconciliado',
    status: 'concluida', progress_pct: 100,
    score: { efficiency: 92, deadline: 100, quality: 95, savings: 80, financial_impact: 85, overall: 90, note: 'A' },
    learning: 'Valor recebido conferiu com o relatório. Processo pode ser totalmente automatizado com importação direta do iFood.',
    actual_result: 'Valor recebido conferido e reconciliado em 2 horas sem divergências',
    tasks: [
      { name: 'Importar relatório do iFood', department: 'financeiro', checklist_type: 'automatico', depends_on_indices: [], status_override: 'concluida' },
      { name: 'Conferir valor líquido', department: 'financeiro', checklist_type: 'manual', depends_on_indices: [0], status_override: 'concluida' },
      { name: 'Registrar recebimento', department: 'financeiro', checklist_type: 'workflow', depends_on_indices: [1], status_override: 'concluida' },
    ],
    checklist: [
      { title: 'Relatório importado', type: 'automatico', status_override: 'concluido' },
      { title: 'Valor conferido', type: 'manual', status_override: 'concluido' },
    ]
  },
  {
    name: 'Inventário Geral',
    description: 'Inventário completo do estoque físico vs sistema',
    objective: 'Garantir que o estoque físico confere com o sistema',
    department: 'estoque', type: 'mensal', priority: 'alta',
    responsible_name: 'Estoque', team: ['Estoque', 'Produção'],
    digital_workers: ['analista_estoque', 'auditor_digital'],
    start_date: dateStr(2), end_date: dateStr(2),
    expected_result: 'Inventário conferido, divergências identificadas e corrigidas',
    status: 'planejada', progress_pct: 0,
    tasks: [
      { name: 'Preparar contagem', department: 'estoque', checklist_type: 'manual', depends_on_indices: [] },
      { name: 'Contar estoque físico', department: 'estoque', checklist_type: 'manual', depends_on_indices: [0] },
      { name: 'Comparar com sistema', department: 'estoque', checklist_type: 'automatico', depends_on_indices: [1] },
      { name: 'Identificar divergências', department: 'auditoria', checklist_type: 'ia', depends_on_indices: [2] },
      { name: 'Regularizar diferenças', department: 'estoque', checklist_type: 'manual', depends_on_indices: [3] },
    ],
    checklist: [
      { title: 'Contagem iniciada', type: 'manual' },
      { title: 'Contagem finalizada', type: 'manual' },
      { title: 'Divergências identificadas', type: 'ia' },
    ]
  },
  {
    name: 'Pagamento dos Motoboys',
    description: 'Fechamento semanal e pagamento dos motoboys',
    objective: 'Calcular e pagar corretamente todos os motoboys da semana',
    department: 'logistica', type: 'semanal', priority: 'media',
    responsible_name: 'Logística', team: ['Logística', 'Financeiro'],
    digital_workers: ['supervisor_motoboys', 'controller_financeiro'],
    start_date: dateStr(-1), end_date: dateStr(1),
    expected_result: 'Todos os motoboys pagos corretamente com comprovantes',
    status: 'em_andamento', progress_pct: 30,
    tasks: [
      { name: 'Fechar check-ins da semana', department: 'logistica', checklist_type: 'automatico', depends_on_indices: [], status_override: 'concluida' },
      { name: 'Calcular pagamentos', department: 'logistica', checklist_type: 'ia', depends_on_indices: [0], status_override: 'em_andamento' },
      { name: 'Conferir lanches consumidos', department: 'logistica', checklist_type: 'manual', depends_on_indices: [0] },
      { name: 'Aprovar pagamentos', department: 'financeiro', checklist_type: 'manual', depends_on_indices: [1, 2] },
      { name: 'Gerar comprovantes', department: 'logistica', checklist_type: 'workflow', depends_on_indices: [3] },
    ],
    checklist: [
      { title: 'Check-ins fechados', type: 'automatico', status_override: 'concluido' },
      { title: 'Pagamentos calculados', type: 'ia' },
      { title: 'Comprovantes gerados', type: 'workflow' },
    ]
  },
  {
    name: 'Black Friday',
    description: 'Preparação completa para a Black Friday - maior dia de vendas do ano',
    objective: 'Maximizar vendas na Black Friday com operação 100% preparada',
    department: 'estrategia', type: 'estrategica', priority: 'alta',
    responsible_name: 'Direção', team: ['Comercial', 'Compras', 'Produção', 'Financeiro', 'Marketing'],
    digital_workers: ['consultor_estrategico', 'analista_marketing', 'analista_crm', 'comprador_digital', 'supervisor_producao'],
    start_date: dateStr(0), end_date: dateStr(60),
    expected_result: 'Vendas maximizadas, estoque garantido, operação sem falhas',
    status: 'planejada', progress_pct: 0,
    tasks: [
      { name: 'Definir estratégia de preços', department: 'estrategia', checklist_type: 'ia', depends_on_indices: [] },
      { name: 'Preparar campanha de marketing', department: 'comercial', checklist_type: 'manual', depends_on_indices: [0] },
      { name: 'Garantir estoque de insumos', department: 'compras', checklist_type: 'manual', depends_on_indices: [0] },
      { name: 'Planejar volume de produção', department: 'producao', checklist_type: 'ia', depends_on_indices: [2] },
      { name: 'Projetar fluxo de caixa', department: 'financeiro', checklist_type: 'ia', depends_on_indices: [0] },
      { name: 'Segmentar clientes para campanha', department: 'comercial', checklist_type: 'ia', depends_on_indices: [1] },
      { name: 'Ativar promoção', department: 'comercial', checklist_type: 'workflow', depends_on_indices: [1, 5] },
    ],
    checklist: [
      { title: 'Estratégia definida', type: 'ia' },
      { title: 'Campanha preparada', type: 'manual' },
      { title: 'Estoque garantido', type: 'manual' },
      { title: 'Produção planejada', type: 'ia' },
      { title: 'Promoção ativa', type: 'workflow' },
    ]
  }
];

async function safeList(sr, entityName, limit) {
  try {
    const items = await sr.entities[entityName].list('-updated_date', limit || 50);
    return Array.isArray(items) ? items : [];
  } catch (e) { return []; }
}

async function updateDelayedMissions(sr) {
  const today = new Date().toISOString().split('T')[0];
  const all = await sr.entities.Mission.list('-created_date', 100);
  for (const m of all) {
    if ((m.status === 'em_andamento' || m.status === 'planejada') && m.end_date && m.end_date < today) {
      await sr.entities.Mission.update(m.id, { status: 'atrasada' });
    }
  }
}

async function recalcMissionProgress(sr, missionId) {
  const tasks = await sr.entities.MissionTask.filter({ mission_id: missionId });
  if (tasks.length === 0) return;
  const completed = tasks.filter(t => t.status === 'concluida').length;
  const progress = Math.round((completed / tasks.length) * 100);
  const checklists = await sr.entities.MissionChecklist.filter({ mission_id: missionId });
  const checklistCompleted = checklists.filter(c => c.status === 'concluido').length;
  let status = 'em_andamento';
  if (progress === 100) status = 'em_andamento';
  else if (progress === 0) status = 'planejada';
  await sr.entities.Mission.update(missionId, {
    progress_pct: progress,
    tasks_count: tasks.length,
    tasks_completed: completed,
    checklist_total: checklists.length,
    checklist_completed: checklistCompleted,
    status: status
  });
}

async function handleInit(base44, user) {
  const sr = base44.asServiceRole;
  const existing = await sr.entities.Mission.list('name', 10);
  if (existing && existing.length > 0) {
    return Response.json({ initialized: false, count: existing.length, message: 'Missions already seeded' });
  }
  const companyId = user.company_id || '';
  let totalTasks = 0, totalChecklists = 0;
  for (const missionData of SAMPLE_MISSIONS) {
    const tasks = missionData.tasks || [];
    const checklist = missionData.checklist || [];
    const mission = await sr.entities.Mission.create({
      name: missionData.name,
      description: missionData.description,
      objective: missionData.objective,
      department: missionData.department,
      type: missionData.type,
      priority: missionData.priority,
      responsible_name: missionData.responsible_name,
      team: missionData.team,
      digital_workers: missionData.digital_workers,
      start_date: missionData.start_date,
      end_date: missionData.end_date,
      expected_result: missionData.expected_result,
      status: missionData.status || 'planejada',
      progress_pct: missionData.progress_pct || 0,
      score: missionData.score || null,
      learning: missionData.learning || '',
      actual_result: missionData.actual_result || '',
      tasks_count: tasks.length,
      tasks_completed: tasks.filter(t => t.status_override === 'concluida').length,
      checklist_total: checklist.length,
      checklist_completed: checklist.filter(c => c.status_override === 'concluido').length,
      is_auto_created: false,
      company_id: companyId,
      version: 1
    });
    const createdTasks = [];
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const task = await sr.entities.MissionTask.create({
        mission_id: mission.id,
        mission_name: mission.name,
        name: t.name,
        description: t.description || '',
        department: t.department,
        status: t.status_override || 'pendente',
        progress_pct: t.status_override === 'concluida' ? 100 : 0,
        start_date: mission.start_date,
        due_date: mission.end_date,
        completed_date: t.status_override === 'concluida' ? mission.end_date : null,
        depends_on: [],
        depends_on_names: [],
        checklist_type: t.checklist_type,
        order: i,
        company_id: companyId,
        version: 1
      });
      createdTasks.push(task);
      totalTasks++;
    }
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (t.depends_on_indices && t.depends_on_indices.length > 0) {
        const depIds = t.depends_on_indices.map(idx => createdTasks[idx]?.id).filter(Boolean);
        const depNames = t.depends_on_indices.map(idx => createdTasks[idx]?.name).filter(Boolean);
        if (depIds.length > 0) {
          await sr.entities.MissionTask.update(createdTasks[i].id, { depends_on: depIds, depends_on_names: depNames });
        }
      }
    }
    for (let i = 0; i < checklist.length; i++) {
      const c = checklist[i];
      await sr.entities.MissionChecklist.create({
        mission_id: mission.id,
        title: c.title,
        type: c.type,
        status: c.status_override || 'pendente',
        completed_by: c.status_override === 'concluido' ? 'Sistema' : null,
        completed_at: c.status_override === 'concluido' ? new Date().toISOString() : null,
        order: i,
        company_id: companyId,
        version: 1
      });
      totalChecklists++;
    }
  }
  return Response.json({ initialized: true, missions: SAMPLE_MISSIONS.length, tasks: totalTasks, checklists: totalChecklists });
}

async function handleGetDashboard(base44, user) {
  const sr = base44.asServiceRole;
  await updateDelayedMissions(sr);
  const missions = await sr.entities.Mission.list('-created_date', 100);
  const active = missions.filter(m => m.status === 'em_andamento' || m.status === 'planejada');
  const completed = missions.filter(m => m.status === 'concluida');
  const delayed = missions.filter(m => m.status === 'atrasada');
  const critical = missions.filter(m => m.priority === 'critica' && m.status !== 'concluida' && m.status !== 'cancelada');
  const totalSavings = completed.reduce((s, m) => s + ((m.score?.savings || 0)), 0);
  const avgProgress = active.length > 0 ? Math.round(active.reduce((s, m) => s + (m.progress_pct || 0), 0) / active.length) : 0;
  const byType = {};
  for (const m of missions) { byType[m.type] = (byType[m.type] || 0) + 1; }
  const byStatus = {};
  for (const m of missions) { byStatus[m.status] = (byStatus[m.status] || 0) + 1; }
  const metrics = {
    total_missions: missions.length,
    active_missions: active.length,
    completed_missions: completed.length,
    delayed_missions: delayed.length,
    critical_missions: critical.length,
    avg_progress: avgProgress,
    total_savings: totalSavings,
    efficiency: completed.length > 0 ? Math.round(completed.reduce((s, m) => s + (m.score?.overall || 0), 0) / completed.length) : 0
  };
  return Response.json({ metrics, missions_by_type: byType, missions_by_status: byStatus, recent_missions: missions.slice(0, 8), critical_missions: critical });
}

async function handleListMissions(base44, user, body) {
  const sr = base44.asServiceRole;
  await updateDelayedMissions(sr);
  const filter = {};
  if (body.status) filter.status = body.status;
  if (body.type) filter.type = body.type;
  if (body.priority) filter.priority = body.priority;
  const items = Object.keys(filter).length > 0
    ? await sr.entities.Mission.filter(filter, '-created_date', 100)
    : await sr.entities.Mission.list('-created_date', 100);
  return Response.json({ items });
}

async function handleGetMission(base44, user, body) {
  const sr = base44.asServiceRole;
  const mission = await sr.entities.Mission.get(body.mission_id);
  if (!mission) return Response.json({ error: 'Mission not found' }, { status: 404 });
  const tasks = await sr.entities.MissionTask.filter({ mission_id: body.mission_id }, 'order', 100);
  const checklist = await sr.entities.MissionChecklist.filter({ mission_id: body.mission_id }, 'order', 100);
  const grouped = {};
  for (const t of tasks) {
    if (!grouped[t.department]) grouped[t.department] = [];
    grouped[t.department].push(t);
  }
  return Response.json({ item: mission, tasks, grouped, checklist });
}

async function handleCreateMission(base44, user, body) {
  const sr = base44.asServiceRole;
  const companyId = user.company_id || '';
  const mission = await sr.entities.Mission.create({
    name: body.name,
    description: body.description || '',
    objective: body.objective || '',
    department: body.department || 'estrategia',
    type: body.type || 'diaria',
    priority: body.priority || 'media',
    responsible_name: body.responsible_name || user.full_name || '',
    team: body.team || [],
    digital_workers: body.digital_workers || [],
    start_date: body.start_date || dateStr(0),
    end_date: body.end_date || dateStr(7),
    expected_result: body.expected_result || '',
    status: 'planejada',
    progress_pct: 0,
    is_auto_created: body.is_auto_created || false,
    created_by_worker_key: body.created_by_worker_key || '',
    tasks_count: 0, tasks_completed: 0, checklist_total: 0, checklist_completed: 0,
    company_id: companyId, version: 1
  });
  return Response.json({ item: mission });
}

async function handleUpdateMission(base44, user, body) {
  const sr = base44.asServiceRole;
  const updates = {};
  for (const k of ['name','description','objective','department','type','priority','responsible_name','team','digital_workers','start_date','end_date','expected_result','status','progress_pct']) {
    if (body[k] !== undefined) updates[k] = body[k];
  }
  await sr.entities.Mission.update(body.mission_id, updates);
  return Response.json({ success: true });
}

async function handleDecomposeMission(base44, user, body) {
  const sr = base44.asServiceRole;
  const companyId = user.company_id || '';
  const mission = await sr.entities.Mission.get(body.mission_id);
  if (!mission) return Response.json({ error: 'Mission not found' }, { status: 404 });
  const existing = await sr.entities.MissionTask.filter({ mission_id: body.mission_id });
  if (existing && existing.length > 0) {
    return Response.json({ items: existing, message: 'Mission already has tasks' });
  }
  const prompt = 'Você é o CEO AI do Don Baron OS. Decomponha a seguinte missão em tarefas por departamento.\n\n' +
    'Missão: ' + mission.name + '\n' +
    'Objetivo: ' + (mission.objective || '') + '\n' +
    'Descrição: ' + (mission.description || '') + '\n' +
    'Resultado esperado: ' + (mission.expected_result || '') + '\n\n' +
    'Departamentos disponíveis: compras, financeiro, producao, estoque, rh, logistica, comercial, auditoria, estrategia\n\n' +
    'Para cada tarefa, forneça:\n' +
    '- name: Nome da tarefa\n' +
    '- description: Descrição detalhada\n' +
    '- department: Departamento responsável\n' +
    '- checklist_type: manual, automatico, ia ou workflow\n' +
    '- depends_on_indices: Índices das tarefas que precisam ser concluídas antes (array de números, começando em 0)\n\n' +
    'Crie no máximo 8 tarefas. Também crie 3-5 checklist items para a missão.\n\n' +
    'Retorne tasks (array) e checklist (array com {title, type}).';
  const llmRes = await sr.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        tasks: { type: 'array', items: { type: 'object', properties: {
          name: { type: 'string' }, description: { type: 'string' },
          department: { type: 'string' }, checklist_type: { type: 'string' },
          depends_on_indices: { type: 'array', items: { type: 'number' } }
        }}},
        checklist: { type: 'array', items: { type: 'object', properties: {
          title: { type: 'string' }, type: { type: 'string' }
        }}}
      }
    }
  });
  const tasksData = llmRes.tasks || [];
  const checklistData = llmRes.checklist || [];
  const createdTasks = [];
  for (let i = 0; i < tasksData.length; i++) {
    const t = tasksData[i];
    const task = await sr.entities.MissionTask.create({
      mission_id: mission.id, mission_name: mission.name,
      name: t.name, description: t.description || '',
      department: t.department || 'estrategia',
      status: 'pendente', progress_pct: 0,
      start_date: mission.start_date, due_date: mission.end_date,
      depends_on: [], depends_on_names: [],
      checklist_type: t.checklist_type || 'manual',
      order: i, company_id: companyId, version: 1
    });
    createdTasks.push(task);
  }
  for (let i = 0; i < tasksData.length; i++) {
    const depIndices = tasksData[i].depends_on_indices || [];
    if (depIndices.length > 0) {
      const depIds = depIndices.map(idx => createdTasks[idx]?.id).filter(Boolean);
      const depNames = depIndices.map(idx => createdTasks[idx]?.name).filter(Boolean);
      if (depIds.length > 0) {
        await sr.entities.MissionTask.update(createdTasks[i].id, { depends_on: depIds, depends_on_names: depNames });
        createdTasks[i].depends_on = depIds;
        createdTasks[i].depends_on_names = depNames;
      }
    }
  }
  for (let i = 0; i < checklistData.length; i++) {
    const c = checklistData[i];
    await sr.entities.MissionChecklist.create({
      mission_id: mission.id, title: c.title || 'Item',
      type: c.type || 'manual', status: 'pendente',
      order: i, company_id: companyId, version: 1
    });
  }
  await recalcMissionProgress(sr, mission.id);
  return Response.json({ items: createdTasks, checklist_count: checklistData.length });
}

async function handleUpdateTask(base44, user, body) {
  const sr = base44.asServiceRole;
  const updates = {};
  for (const k of ['status','progress_pct','notes','responsible_name','assigned_worker_key']) {
    if (body[k] !== undefined) updates[k] = body[k];
  }
  if (body.status === 'concluida') {
    updates.progress_pct = 100;
    updates.completed_date = dateStr(0);
  } else if (body.status === 'pendente') {
    updates.progress_pct = 0;
    updates.completed_date = null;
  }
  await sr.entities.MissionTask.update(body.task_id, updates);
  const task = await sr.entities.MissionTask.get(body.task_id);
  if (task) await recalcMissionProgress(sr, task.mission_id);
  return Response.json({ success: true });
}

async function handleToggleChecklist(base44, user, body) {
  const sr = base44.asServiceRole;
  const item = await sr.entities.MissionChecklist.get(body.checklist_id);
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
  const newStatus = item.status === 'concluido' ? 'pendente' : 'concluido';
  await sr.entities.MissionChecklist.update(body.checklist_id, {
    status: newStatus,
    completed_by: newStatus === 'concluido' ? (user.full_name || user.email) : null,
    completed_at: newStatus === 'concluido' ? new Date().toISOString() : null
  });
  const checklists = await sr.entities.MissionChecklist.filter({ mission_id: item.mission_id });
  const completed = checklists.filter(c => c.status === 'concluido').length;
  await sr.entities.Mission.update(item.mission_id, {
    checklist_total: checklists.length,
    checklist_completed: completed
  });
  return Response.json({ success: true, new_status: newStatus });
}

async function handleAutoCreate(base44, user) {
  const sr = base44.asServiceRole;
  const companyId = user.company_id || '';
  let created = 0;

  try {
    const products = await safeList(sr, 'Product', 100);
    for (const p of products) {
      if (p.controls_stock && p.min_quantity > 0 && p.stock_quantity <= p.min_quantity) {
        const missionName = 'Reposição de Estoque: ' + p.name;
        const existing = await sr.entities.Mission.filter({ name: missionName });
        const hasActive = existing && existing.some(m => m.status !== 'concluida' && m.status !== 'cancelada');
        if (!hasActive) {
          const mission = await sr.entities.Mission.create({
            name: missionName,
            description: 'Estoque crítico detectado para ' + p.name + ' (' + p.stock_quantity + ' ' + (p.unit || 'un') + ' / mínimo ' + p.min_quantity + ')',
            objective: 'Repor estoque de ' + p.name + ' urgentemente',
            department: 'compras', type: 'emergencial', priority: 'critica',
            responsible_name: 'Compras', team: ['Compras'],
            digital_workers: ['comprador_digital'],
            start_date: dateStr(0), end_date: dateStr(2),
            expected_result: 'Estoque regularizado acima do mínimo',
            status: 'planejada', progress_pct: 0,
            is_auto_created: true, created_by_worker_key: 'analista_estoque',
            tasks_count: 0, tasks_completed: 0, checklist_total: 0, checklist_completed: 0,
            company_id: companyId, version: 1
          });
          await sr.entities.MissionTask.create({
            mission_id: mission.id, mission_name: mission.name,
            name: 'Solicitar cotação de ' + p.name,
            description: 'Buscar melhor preço e prazo para ' + p.name,
            department: 'compras', status: 'pendente', progress_pct: 0,
            start_date: dateStr(0), due_date: dateStr(1),
            depends_on: [], depends_on_names: [],
            checklist_type: 'ia', order: 0, company_id: companyId, version: 1
          });
          await sr.entities.MissionTask.create({
            mission_id: mission.id, mission_name: mission.name,
            name: 'Aprovar e enviar pedido',
            description: 'Aprovar cotação e enviar pedido ao fornecedor',
            department: 'compras', status: 'pendente', progress_pct: 0,
            start_date: dateStr(0), due_date: dateStr(2),
            depends_on: [], depends_on_names: [],
            checklist_type: 'manual', order: 1, company_id: companyId, version: 1
          });
          await recalcMissionProgress(sr, mission.id);
          created++;
        }
      }
    }
  } catch (e) {}

  try {
    const transactions = await safeList(sr, 'FinancialTransaction', 100);
    const today = dateStr(0);
    for (const t of transactions) {
      if (t.status === 'pendente' && t.type === 'a_pagar' && t.due_date && t.due_date < today) {
        const missionName = 'Regularizar Conta Vencida: ' + (t.description || '').substring(0, 40);
        const existing = await sr.entities.Mission.filter({ name: missionName });
        const hasActive = existing && existing.some(m => m.status !== 'concluida' && m.status !== 'cancelada');
        if (!hasActive) {
          const mission = await sr.entities.Mission.create({
            name: missionName,
            description: 'Conta vencida em ' + t.due_date + ' no valor de R$ ' + (t.amount || 0),
            objective: 'Regularizar pagamento de conta vencida',
            department: 'financeiro', type: 'emergencial', priority: 'alta',
            responsible_name: 'Financeiro', team: ['Financeiro'],
            digital_workers: ['controller_financeiro'],
            start_date: dateStr(0), end_date: dateStr(3),
            expected_result: 'Conta paga ou renegociada',
            status: 'planejada', progress_pct: 0,
            is_auto_created: true, created_by_worker_key: 'controller_financeiro',
            tasks_count: 0, tasks_completed: 0, checklist_total: 0, checklist_completed: 0,
            company_id: companyId, version: 1
          });
          await sr.entities.MissionTask.create({
            mission_id: mission.id, mission_name: mission.name,
            name: 'Verificar status do pagamento',
            description: 'Verificar se a conta foi paga ou precisa de renegociação',
            department: 'financeiro', status: 'pendente', progress_pct: 0,
            start_date: dateStr(0), due_date: dateStr(1),
            depends_on: [], depends_on_names: [],
            checklist_type: 'automatico', order: 0, company_id: companyId, version: 1
          });
          await recalcMissionProgress(sr, mission.id);
          created++;
        }
      }
    }
  } catch (e) {}

  return Response.json({ created, message: created + ' missão(ões) criada(s) automaticamente' });
}

async function handleCompleteMission(base44, user, body) {
  const sr = base44.asServiceRole;
  const mission = await sr.entities.Mission.get(body.mission_id);
  if (!mission) return Response.json({ error: 'Mission not found' }, { status: 404 });
  const tasks = await sr.entities.MissionTask.filter({ mission_id: body.mission_id });
  const completedTasks = tasks.filter(t => t.status === 'concluida');
  const taskList = tasks.map(t => '- [' + t.status + '] ' + t.name + ' (' + (DEPT_LABELS[t.department] || t.department) + ')').join('\n');

  const prompt = 'Você é o CEO AI do Don Baron OS. A missão abaixo foi concluída. Analise e gere o score.\n\n' +
    'Missão: ' + mission.name + '\n' +
    'Objetivo: ' + (mission.objective || '') + '\n' +
    'Resultado esperado: ' + (mission.expected_result || '') + '\n' +
    'Tarefas (' + completedTasks.length + '/' + tasks.length + ' concluídas):\n' + taskList + '\n' +
    'Progresso: ' + (mission.progress_pct || 0) + '%\n\n' +
    'Gere:\n' +
    '1. learning: Lições aprendidas comparando planejado vs resultado (2-3 frases)\n' +
    '2. actual_result: Descrição concisa do resultado obtido\n' +
    '3. score: { efficiency: 0-100, deadline: 0-100, quality: 0-100, savings: 0-100, financial_impact: 0-100, overall: 0-100, note: A a F }';

  const llmRes = await sr.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        learning: { type: 'string' },
        actual_result: { type: 'string' },
        score: { type: 'object', properties: {
          efficiency: { type: 'number' }, deadline: { type: 'number' },
          quality: { type: 'number' }, savings: { type: 'number' },
          financial_impact: { type: 'number' }, overall: { type: 'number' },
          note: { type: 'string' }
        }}
      }
    }
  });

  for (const t of tasks) {
    if (t.status !== 'concluida' && t.status !== 'cancelada') {
      await sr.entities.MissionTask.update(t.id, { status: 'concluida', progress_pct: 100, completed_date: dateStr(0) });
    }
  }

  await sr.entities.Mission.update(body.mission_id, {
    status: 'concluida',
    progress_pct: 100,
    score: llmRes.score || { overall: 80, note: 'B' },
    learning: llmRes.learning || '',
    actual_result: llmRes.actual_result || '',
    tasks_completed: tasks.length
  });

  return Response.json({ success: true, score: llmRes.score, learning: llmRes.learning, actual_result: llmRes.actual_result });
}

async function handleGetWarRoom(base44, user) {
  const sr = base44.asServiceRole;
  await updateDelayedMissions(sr);
  const all = await sr.entities.Mission.list('-created_date', 100);
  const critical = all.filter(m => m.priority === 'critica' && m.status !== 'concluida' && m.status !== 'cancelada');
  const delayed = all.filter(m => m.status === 'atrasada');
  let alerts = [];
  try { alerts = await sr.entities.WorkerAlert.filter({ status: 'active' }, '-created_date', 20); } catch (e) {}
  let blockedTasks = [];
  try { blockedTasks = await sr.entities.MissionTask.filter({ status: 'bloqueada' }, '-created_date', 20); } catch (e) {}
  const totalFinancialImpact = critical.reduce((s, m) => s + ((m.score?.financial_impact || 0)), 0);
  const pendingTasks = await sr.entities.MissionTask.filter({ status: 'pendente' }, '-created_date', 20);
  return Response.json({ critical_missions: critical, delayed_missions: delayed, active_alerts: alerts, blocked_tasks: blockedTasks, pending_tasks: pendingTasks, total_financial_impact: totalFinancialImpact });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    switch (body.action) {
      case 'init': return await handleInit(base44, user);
      case 'getDashboard': return await handleGetDashboard(base44, user);
      case 'listMissions': return await handleListMissions(base44, user, body);
      case 'getMission': return await handleGetMission(base44, user, body);
      case 'createMission': return await handleCreateMission(base44, user, body);
      case 'updateMission': return await handleUpdateMission(base44, user, body);
      case 'decomposeMission': return await handleDecomposeMission(base44, user, body);
      case 'updateTask': return await handleUpdateTask(base44, user, body);
      case 'toggleChecklist': return await handleToggleChecklist(base44, user, body);
      case 'autoCreate': return await handleAutoCreate(base44, user);
      case 'completeMission': return await handleCompleteMission(base44, user, body);
      case 'getWarRoom': return await handleGetWarRoom(base44, user);
      default: return Response.json({ error: 'Unknown action: ' + body.action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});