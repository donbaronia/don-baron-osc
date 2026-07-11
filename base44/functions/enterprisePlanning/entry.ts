import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function safeList(sr, entityName, limit, sort) {
  try { return await sr.entities[entityName].list(sort || '-created_date', limit || 200); }
  catch (e) { return []; }
}
async function safeFilter(sr, entityName, query, sort, limit) {
  try { return await sr.entities[entityName].filter(query, sort, limit || 200); }
  catch (e) { return []; }
}

function calcKPIStatus(value, target, higherIsBetter) {
  if (!target) return 'na_meta';
  if (higherIsBetter) {
    if (value >= target) return 'acima_meta';
    if (value >= target * 0.8) return 'na_meta';
    if (value >= target * 0.5) return 'abaixo_meta';
    return 'critico';
  } else {
    if (value <= target) return 'acima_meta';
    if (value <= target * 1.2) return 'na_meta';
    if (value <= target * 1.5) return 'abaixo_meta';
    return 'critico';
  }
}

async function computeKPIs(sr) {
  const transactions = await safeList(sr, 'FinancialTransaction', 200, '-created_date');
  const productionRecords = await safeList(sr, 'ProductionRecord', 200, '-created_date');
  const employees = await safeList(sr, 'Employee', 200);
  const timeRecords = await safeFilter(sr, 'TimeRecord', {}, '-date', 200);

  const revenue = transactions.filter(t => t.type === 'a_receber' && (t.status === 'recebido' || t.status === 'pago')).reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = transactions.filter(t => t.type === 'a_pagar' && (t.status === 'pago')).reduce((s, t) => s + (t.amount || 0), 0);
  const pendingReceita = transactions.filter(t => t.type === 'a_receber' && t.status === 'pendente').reduce((s, t) => s + (t.amount || 0), 0);
  const pendingDespesa = transactions.filter(t => t.type === 'a_pagar' && t.status === 'pendente').reduce((s, t) => s + (t.amount || 0), 0);
  const profit = revenue - expenses;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
  const cashFlow = revenue - expenses;

  const totalProduced = productionRecords.reduce((s, p) => s + (p.produced_quantity || 0), 0);
  const totalLost = productionRecords.reduce((s, p) => s + (p.lost_quantity || 0), 0);
  const wastePct = totalProduced > 0 ? Math.round((totalLost / (totalProduced + totalLost)) * 100) : 0;
  const avgProdTime = productionRecords.length > 0 ? Math.round(productionRecords.reduce((s, p) => s + (p.total_time_min || 0), 0) / productionRecords.length) : 0;

  const totalEmps = employees.length;
  const terminated = employees.filter(e => e.status === 'demitido').length;
  const turnover = totalEmps > 0 ? Math.round((terminated / totalEmps) * 100) : 0;
  const lateCount = timeRecords.filter(t => t.status === 'atraso').length;
  const absenteeism = timeRecords.length > 0 ? Math.round((lateCount / timeRecords.length) * 100) : 0;

  return [
    { name: 'Lucro', category: 'financeiro', value: profit, unit: 'R$', target_value: 50000, status: calcKPIStatus(profit, 50000, true), trend: profit > 0 ? 'up' : 'down' },
    { name: 'Margem', category: 'financeiro', value: margin, unit: '%', target_value: 30, status: calcKPIStatus(margin, 30, true), trend: margin >= 30 ? 'up' : 'down' },
    { name: 'Receita', category: 'financeiro', value: revenue, unit: 'R$', target_value: 200000, status: calcKPIStatus(revenue, 200000, true), trend: 'up' },
    { name: 'Fluxo de Caixa', category: 'financeiro', value: cashFlow, unit: 'R$', target_value: 0, status: cashFlow >= 0 ? 'acima_meta' : 'critico', trend: cashFlow >= 0 ? 'up' : 'down' },
    { name: 'A Receber (Pendente)', category: 'financeiro', value: pendingReceita, unit: 'R$', target_value: 0, status: 'na_meta', trend: 'stable' },
    { name: 'A Pagar (Pendente)', category: 'financeiro', value: pendingDespesa, unit: 'R$', target_value: 0, status: 'na_meta', trend: 'stable' },
    { name: 'Desperdicio', category: 'operacional', value: wastePct, unit: '%', target_value: 5, status: calcKPIStatus(wastePct, 5, false), trend: wastePct <= 5 ? 'up' : 'down' },
    { name: 'Tempo Medio de Producao', category: 'operacional', value: avgProdTime, unit: 'min', target_value: 60, status: calcKPIStatus(avgProdTime, 60, false), trend: 'stable' },
    { name: 'Producao Total', category: 'operacional', value: totalProduced, unit: 'un', target_value: 5000, status: calcKPIStatus(totalProduced, 5000, true), trend: 'up' },
    { name: 'Turnover', category: 'pessoas', value: turnover, unit: '%', target_value: 10, status: calcKPIStatus(turnover, 10, false), trend: 'stable' },
    { name: 'Absenteismo', category: 'pessoas', value: absenteeism, unit: '%', target_value: 5, status: calcKPIStatus(absenteeism, 5, false), trend: 'stable' },
    { name: 'Colaboradores Ativos', category: 'pessoas', value: employees.filter(e => e.status === 'ativo').length, unit: '', target_value: 15, status: 'na_meta', trend: 'stable' },
  ];
}

async function handleGetDashboard(sr) {
  const plans = await safeList(sr, 'StrategicPlan', 50, '-created_date');
  const goals = await safeList(sr, 'Goal', 200, '-created_date');
  const budgetItems = await safeList(sr, 'BudgetItem', 200, '-created_date');
  const projects = await safeList(sr, 'StrategicProject', 200, '-created_date');
  const okrs = await safeList(sr, 'OKR', 200, '-created_date');
  const scenarios = await safeList(sr, 'Scenario', 200, '-created_date');
  const kpis = await computeKPIs(sr);

  const activeGoals = goals.filter(g => g.status === 'em_andamento' || g.status === 'nao_iniciada');
  const completedGoals = goals.filter(g => g.status === 'concluida');
  const overdueGoals = goals.filter(g => g.status === 'atrasada');
  const avgGoalProgress = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + (g.progress_pct || 0), 0) / goals.length) : 0;

  const budgetExpected = budgetItems.reduce((s, b) => s + (b.expected_amount || 0), 0);
  const budgetActual = budgetItems.reduce((s, b) => s + (b.actual_amount || 0), 0);
  const budgetVariance = budgetActual - budgetExpected;
  const budgetVariancePct = budgetExpected > 0 ? Math.round((budgetVariance / budgetExpected) * 100) : 0;
  const deviations = budgetItems.filter(b => Math.abs(b.variance_pct || 0) > 10);

  const activeProjects = projects.filter(p => p.status === 'em_andamento');
  const totalInvestment = projects.reduce((s, p) => s + (p.investment_amount || 0), 0);
  const totalExpectedReturn = projects.reduce((s, p) => s + (p.expected_return || 0), 0);
  const avgProjectROI = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + (p.roi_pct || 0), 0) / projects.length) : 0;

  const activeOKRs = okrs.filter(o => o.status === 'em_andamento');
  const avgOKRProgress = okrs.length > 0 ? Math.round(okrs.reduce((s, o) => s + (o.overall_progress || 0), 0) / okrs.length) : 0;

  return Response.json({
    kpis,
    plans: { total: plans.length, active: plans.filter(p => p.status === 'em_execucao').length, latest: plans[0] || null },
    goals: { total: goals.length, active: activeGoals.length, completed: completedGoals.length, overdue: overdueGoals.length, avgProgress: avgGoalProgress },
    budget: { expected: budgetExpected, actual: budgetActual, variance: budgetVariance, variancePct: budgetVariancePct, deviations: deviations.length, items: budgetItems.length },
    projects: { total: projects.length, active: activeProjects.length, totalInvestment, totalExpectedReturn, avgROI: avgProjectROI },
    okrs: { total: okrs.length, active: activeOKRs.length, avgProgress: avgOKRProgress },
    scenarios: { total: scenarios.length, simulated: scenarios.filter(s => s.status === 'simulado').length },
    deviations: deviations.map(d => ({ name: d.name, type: d.budget_type, expected: d.expected_amount, actual: d.actual_amount, variance_pct: d.variance_pct, justification: d.justification })),
  });
}

async function handleGetKPIs(sr) {
  const kpis = await computeKPIs(sr);
  const categories = { financeiro: [], operacional: [], pessoas: [], cliente: [] };
  for (const k of kpis) { (categories[k.category] || categories.financeiro).push(k); }
  return Response.json({ kpis, categories });
}

async function handleGetRoadmap(sr) {
  const items = await safeList(sr, 'RoadmapItem', 200, 'year');
  const byYear = {};
  const years = [2026, 2027, 2028, 2029, 2030];
  for (const y of years) { byYear[y] = items.filter(i => i.year === y); }
  return Response.json({ years, byYear, items });
}

async function handleInit(sr) {
  const existing = await safeList(sr, 'StrategicPlan', 1);
  if (existing.length > 0) return Response.json({ message: 'Already initialized', skipped: true });

  const plan = await sr.entities.StrategicPlan.create({
    name: 'Plano Estrategico 2026',
    description: 'Plano anual estrategico do Don Baron para 2026',
    plan_type: 'anual',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    status: 'em_execucao',
    responsible_name: 'Diretoria',
    objectives: ['Aumentar receita em 25%', 'Reduzir CMV para 35%', 'Abrir nova unidade', 'Implementar automatizacoes'],
    summary: 'Plano focado em crescimento, eficiencia operacional e expansao',
  });

  await sr.entities.Goal.bulkCreate([
    { name: 'Aumentar Receita Anual', scope_type: 'empresa', scope_name: 'Don Baron', responsible_name: 'Diretoria', indicator_name: 'Receita', expected_value: 2400000, actual_value: 1800000, unit: 'R$', progress_pct: 75, deadline: '2026-12-31', status: 'em_andamento', priority: 'critica', plan_id: plan.id, start_date: '2026-01-01' },
    { name: 'Reduzir CMV', scope_type: 'empresa', scope_name: 'Don Baron', responsible_name: 'Financeiro', indicator_name: 'CMV %', expected_value: 35, actual_value: 38, unit: '%', progress_pct: 70, deadline: '2026-12-31', status: 'em_andamento', priority: 'alta', plan_id: plan.id, start_date: '2026-01-01' },
    { name: 'Produtividade Producao', scope_type: 'departamento', scope_name: 'Producao', responsible_name: 'Lider Producao', indicator_name: 'un/dia', expected_value: 500, actual_value: 420, unit: 'un', progress_pct: 84, deadline: '2026-09-30', status: 'em_andamento', priority: 'alta', plan_id: plan.id, start_date: '2026-01-01' },
    { name: 'Satisfacao do Cliente', scope_type: 'indicador', scope_name: 'NPS', responsible_name: 'Comercial', indicator_name: 'NPS', expected_value: 80, actual_value: 72, unit: 'pts', progress_pct: 90, deadline: '2026-12-31', status: 'em_andamento', priority: 'media', plan_id: plan.id, start_date: '2026-01-01' },
    { name: 'Reduzir Turnover', scope_type: 'empresa', scope_name: 'Don Baron', responsible_name: 'RH', indicator_name: 'Turnover %', expected_value: 8, actual_value: 10, unit: '%', progress_pct: 60, deadline: '2026-12-31', status: 'em_andamento', priority: 'media', plan_id: plan.id, start_date: '2026-01-01' },
  ]);

  await sr.entities.BudgetItem.bulkCreate([
    { name: 'Receita Vendas', budget_type: 'receita', expected_amount: 200000, actual_amount: 185000, period: '2026-07', status: 'realizado', plan_id: plan.id, responsible_name: 'Comercial' },
    { name: 'Receita Delivery', budget_type: 'receita', expected_amount: 80000, actual_amount: 82000, period: '2026-07', status: 'realizado', plan_id: plan.id, responsible_name: 'Comercial' },
    { name: 'Materias-Prima', budget_type: 'despesa', expected_amount: 95000, actual_amount: 102000, period: '2026-07', status: 'desviado', variance_pct: 7, justification: 'Aumento preco fornecedor', plan_id: plan.id, responsible_name: 'Compras' },
    { name: 'Folha de Pagamento', budget_type: 'opex', expected_amount: 45000, actual_amount: 44800, period: '2026-07', status: 'realizado', plan_id: plan.id, responsible_name: 'RH' },
    { name: 'Marketing Digital', budget_type: 'opex', expected_amount: 15000, actual_amount: 18000, period: '2026-07', status: 'desviado', variance_pct: 20, justification: 'Campanha extra promocional', plan_id: plan.id, responsible_name: 'Marketing' },
    { name: 'Equipamento Cozinha', budget_type: 'capex', expected_amount: 60000, actual_amount: 0, period: '2026', status: 'previsto', plan_id: plan.id, responsible_name: 'Operacoes' },
    { name: 'Sistema de Automacao', budget_type: 'investimento', expected_amount: 40000, actual_amount: 15000, period: '2026', status: 'em_execucao', plan_id: plan.id, responsible_name: 'TI' },
  ]);

  await sr.entities.StrategicProject.bulkCreate([
    { name: 'Nova Unidade - Zona Sul', project_type: 'nova_loja', responsible_name: 'Diretoria', team: ['Comercial', 'Operacoes', 'Financeiro'], start_date: '2026-03-01', end_date: '2026-12-31', investment_amount: 250000, expected_return: 400000, roi_pct: 60, payback_months: 18, status: 'em_andamento', progress_pct: 35, priority: 'critica', plan_id: plan.id },
    { name: 'Automacao de Pedidos', project_type: 'automacao', responsible_name: 'TI', team: ['TI', 'Operacoes'], start_date: '2026-01-15', end_date: '2026-06-30', investment_amount: 40000, expected_return: 80000, roi_pct: 100, payback_months: 12, status: 'em_andamento', progress_pct: 60, priority: 'alta', plan_id: plan.id },
    { name: 'Nova Marca Premium', project_type: 'nova_marca', responsible_name: 'Marketing', team: ['Marketing', 'Producao'], start_date: '2026-07-01', end_date: '2027-06-30', investment_amount: 80000, expected_return: 200000, roi_pct: 150, payback_months: 24, status: 'planejado', progress_pct: 10, priority: 'alta', plan_id: plan.id },
  ]);

  await sr.entities.Scenario.bulkCreate([
    { name: 'Aumentar Preco +R$2,00', scenario_type: 'preco', assumptions: 'Aumento de R$2,00 por produto, mantendo volume de vendas atual. Elasticidade-preco estimada em -5%.', variables: { price_increase: 2, current_volume: 5000, current_price: 25 }, baseline_metrics: { revenue: 125000, margin: 32 }, projected_metrics: { revenue: 135000, margin: 35, volume_change: -250 }, impact_summary: 'Aumento projetado de R$10.000/mes na receita com leve reducao de volume. Margem melhora 3 p.p.', status: 'simulado' },
    { name: 'Contratar 2 Funcionarios Producao', scenario_type: 'contratacao', assumptions: 'Contratacao de 2 operadores adicionais para aumentar capacidade de producao em 30%.', variables: { new_hires: 2, monthly_cost_per_hire: 2500, capacity_increase_pct: 30 }, baseline_metrics: { production: 420, labor_cost: 45000 }, projected_metrics: { production: 546, labor_cost: 50000, revenue_increase: 20000 }, impact_summary: 'Aumento de producao de 30% com custo adicional de R$5.000/mes. Payback em 3 meses.', status: 'simulado' },
  ]);

  await sr.entities.OKR.bulkCreate([
    { objective: 'Tornar-se a maior rede da regiao', description: 'Crescimento agressivo e expansao territorial', key_results: [{ description: 'Abrir 2 novas unidades', target: 2, current: 1, unit: 'un', progress: 50 }, { description: 'Aumentar receita em 40%', target: 40, current: 25, unit: '%', progress: 62 }, { description: 'atingir 50 mil clientes ativos', target: 50000, current: 38000, unit: 'clientes', progress: 76 }], responsible_name: 'Diretoria', period: '2026', start_date: '2026-01-01', end_date: '2026-12-31', status: 'em_andamento', overall_progress: 63, alignment: 'Plano Estrategico 2026' },
    { objective: 'Excelencia Operacional', description: 'Maximizar eficiencia e reduzir desperdicios', key_results: [{ description: 'Reduzir CMV para 35%', target: 35, current: 38, unit: '%', progress: 70 }, { description: 'Reduzir desperdicio para 3%', target: 3, current: 5, unit: '%', progress: 60 }, { description: 'Aumentar produtividade em 25%', target: 25, current: 18, unit: '%', progress: 72 }], responsible_name: 'Operacoes', period: '2026', start_date: '2026-01-01', end_date: '2026-12-31', status: 'em_andamento', overall_progress: 67, alignment: 'Plano Estrategico 2026' },
  ]);

  await sr.entities.RoadmapItem.bulkCreate([
    { title: 'Abrir Nova Unidade Zona Sul', year: 2026, quarter: 'Q4', item_type: 'expansao', status: 'em_andamento', responsible_name: 'Diretoria' },
    { title: 'Implementar Automacao de Pedidos', year: 2026, quarter: 'Q2', item_type: 'investimento', status: 'em_andamento', responsible_name: 'TI' },
    { title: 'Lancar Marca Premium', year: 2026, quarter: 'Q4', item_type: 'projeto', status: 'planejado', responsible_name: 'Marketing' },
    { title: 'Atingir R$ 2.4M Receita Anual', year: 2026, quarter: 'anual', item_type: 'meta', status: 'em_andamento', responsible_name: 'Diretoria' },
    { title: 'Abrir 3a Unidade', year: 2027, quarter: 'Q2', item_type: 'expansao', status: 'planejado', responsible_name: 'Diretoria' },
    { title: 'Sistema de Gestao Integrado', year: 2027, quarter: 'Q1', item_type: 'investimento', status: 'planejado', responsible_name: 'TI' },
    { title: 'Expansao Regional', year: 2028, quarter: 'anual', item_type: 'expansao', status: 'planejado', responsible_name: 'Diretoria' },
    { title: 'Franquias', year: 2029, quarter: 'anual', item_type: 'projeto', status: 'planejado', responsible_name: 'Diretoria' },
    { title: 'Operacao Nacional', year: 2030, quarter: 'anual', item_type: 'expansao', status: 'planejado', responsible_name: 'Diretoria' },
  ]);

  return Response.json({ message: 'Initialized successfully', plan_id: plan.id });
}

async function handleAiExecutiveBriefing(sr) {
  const dash = await (await handleGetDashboard(sr)).json();
  const kpis = dash.kpis;

  const prompt = 'Voce e o Baron Brain do Don Baron OS. Prepare um briefing executivo para a reuniao da diretoria.\n\n' +
    'KPIs principais:\n' +
    kpis.map(k => '- ' + k.name + ': ' + k.value + k.unit + ' (meta: ' + k.target_value + k.unit + ', status: ' + k.status + ')').join('\n') + '\n\n' +
    'Resumo do planejamento:\n' +
    '- Metas: ' + dash.goals.total + ' totais, ' + dash.goals.active + ' ativas, ' + dash.goals.overdue + ' atrasadas, progresso medio ' + dash.goals.avgProgress + '%\n' +
    '- Orcamento: Previsto R$ ' + dash.budget.expected + ', Realizado R$ ' + dash.budget.actual + ', Desvio ' + dash.budget.variancePct + '%\n' +
    '- Projetos: ' + dash.projects.total + ' totais, ' + dash.projects.active + ' ativos, Investimento R$ ' + dash.projects.totalInvestment + ', ROI medio ' + dash.projects.avgROI + '%\n' +
    '- OKRs: ' + dash.okrs.active + ' ativos, progresso medio ' + dash.okrs.avgProgress + '%\n' +
    '- Cenarios simulados: ' + dash.scenarios.simulated + '\n\n' +
    'Forneça o briefing em JSON:\n' +
    '1. executive_summary: resumo executivo (3-4 frases)\n' +
    '2. highlights: lista de destaques positivos\n' +
    '3. concerns: lista de preocupacoes/risco\n' +
    '4. bottlenecks: gargalos identificados\n' +
    '5. priorities: prioridades para a proxima semana\n' +
    '6. action_items: lista de itens de acao recomendados\n' +
    '7. meeting_agenda: proposta de pauta para reuniao executiva';

  const llmRes = await sr.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        executive_summary: { type: 'string' },
        highlights: { type: 'array', items: { type: 'string' } },
        concerns: { type: 'array', items: { type: 'string' } },
        bottlenecks: { type: 'array', items: { type: 'string' } },
        priorities: { type: 'array', items: { type: 'string' } },
        action_items: { type: 'array', items: { type: 'string' } },
        meeting_agenda: { type: 'array', items: { type: 'string' } }
      }
    }
  });
  return Response.json({ dashboard: dash, briefing: llmRes });
}

async function handleAiCompareScenarios(sr, body) {
  const scenarios = await safeList(sr, 'Scenario', 200, '-created_date');
  const selected = body.scenario_ids?.length ? scenarios.filter(s => body.scenario_ids.includes(s.id)) : scenarios.filter(s => s.status === 'simulado');

  if (selected.length === 0) return Response.json({ error: 'No scenarios to compare' }, { status: 400 });

  const prompt = 'Voce e o Baron Brain do Don Baron OS. Compare os seguintes cenarios estrategicos e forneca analise.\n\n' +
    'Cenarios:\n' +
    selected.map(s => 'Cenario: ' + s.name + '\nTipo: ' + s.scenario_type + '\nPremissas: ' + s.assumptions + '\nImpacto: ' + (s.impact_summary || 'N/A') + '\nMetricas projetadas: ' + JSON.stringify(s.projected_metrics || {})).join('\n---\n') + '\n\n' +
    'IMPORTANTE: Nenhum investimento sera aprovado automaticamente. Apenas analise e recomendacoes.\n\n' +
    'Forneça em JSON:\n' +
    '1. comparison_summary: resumo comparativo (2-3 frases)\n' +
    '2. best_scenario: nome do melhor cenario com justificativa\n' +
    '3. best_justification: justificativa detalhada\n' +
    '4. risk_analysis: analise de riscos de cada cenario\n' +
    '5. recommendations: recomendacoes para a diretoria\n' +
    '6. priority_ranking: ranking de prioridade dos cenarios';

  const llmRes = await sr.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        comparison_summary: { type: 'string' },
        best_scenario: { type: 'string' },
        best_justification: { type: 'string' },
        risk_analysis: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
        priority_ranking: { type: 'array', items: { type: 'string' } }
      }
    }
  });
  return Response.json({ scenarios: selected, analysis: llmRes });
}

async function handleAiRiskAnalysis(sr) {
  const dash = await (await handleGetDashboard(sr)).json();
  const projects = await safeList(sr, 'StrategicProject', 200, '-created_date');
  const goals = await safeList(sr, 'Goal', 200, '-created_date');

  const prompt = 'Voce e o Baron Brain do Don Baron OS. Analise os riscos estrategicos da empresa.\n\n' +
    'Projetos:\n' + projects.map(p => '- ' + p.name + ' | Status: ' + p.status + ' | Investimento: R$' + p.investment_amount + ' | ROI: ' + p.roi_pct + '% | Progresso: ' + p.progress_pct + '%').join('\n') + '\n\n' +
    'Metas:\n' + goals.map(g => '- ' + g.name + ' | Status: ' + g.status + ' | Esperado: ' + g.expected_value + g.unit + ' | Realizado: ' + g.actual_value + g.unit + ' | Progresso: ' + g.progress_pct + '%').join('\n') + '\n\n' +
    'Desvios de orcamento: ' + dash.deviations.length + ' itens com desvios > 10%\n' +
    'KPIs criticos: ' + dash.kpis.filter(k => k.status === 'critico').map(k => k.name + ' (' + k.value + k.unit + ')').join(', ') + '\n\n' +
    'Forneça em JSON:\n' +
    '1. risk_overview: visao geral dos riscos (2-3 frases)\n' +
    '2. critical_risks: lista de riscos criticos identificados\n' +
    '3. project_risks: riscos por projeto\n' +
    '4. budget_risks: riscos orcamentarios\n' +
    '5. mitigation_actions: acoes de mitigacao recomendadas\n' +
    '6. monitoring_points: pontos de monitoramento';

  const llmRes = await sr.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        risk_overview: { type: 'string' },
        critical_risks: { type: 'array', items: { type: 'string' } },
        project_risks: { type: 'array', items: { type: 'string' } },
        budget_risks: { type: 'array', items: { type: 'string' } },
        mitigation_actions: { type: 'array', items: { type: 'string' } },
        monitoring_points: { type: 'array', items: { type: 'string' } }
      }
    }
  });
  return Response.json({ analysis: llmRes });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    switch (body.action) {
      case 'getDashboard': return await handleGetDashboard(sr);
      case 'getKPIs': return await handleGetKPIs(sr);
      case 'getRoadmap': return await handleGetRoadmap(sr);
      case 'init': return await handleInit(sr);
      case 'aiExecutiveBriefing': return await handleAiExecutiveBriefing(sr);
      case 'aiCompareScenarios': return await handleAiCompareScenarios(sr, body);
      case 'aiRiskAnalysis': return await handleAiRiskAnalysis(sr);
      default: return Response.json({ error: 'Unknown action: ' + body.action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});