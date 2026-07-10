import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const WORKERS = [
  {
    worker_key: 'comprador_digital',
    name: 'Comprador Digital',
    role: 'Comprador',
    department: 'compras',
    objective: 'Garantir que a empresa nunca fique sem insumos criticos, sempre pelo melhor preco',
    specialty: 'Analise de estoque, consumo, fornecedores e precificacao',
    avatar_emoji: '🛒',
    description: 'Monitora estoque, analisa consumo, compara fornecedores, detecta aumentos de preco e sugere compras. Nunca envia pedidos automaticamente.',
    indicators_monitored: ['Estoque critico', 'Cobertura de estoque', 'Variacao de precos', 'Economia em compras'],
    permissions: ['Ler estoque', 'Ler fornecedores', 'Ler produtos', 'Sugerir compras'],
    autonomy_level: 'baixo',
    capabilities: ['Analise de cobertura', 'Comparacao de fornecedores', 'Deteccao de aumento de precos', 'Calculo de economia'],
    data_access: ['Product', 'Stock', 'Supplier', 'Purchase', 'PriceHistory'],
    routines: [
      { time: '07:00', action: 'Conferir estoque', description: 'Verificar niveis de estoque e identificar itens criticos', day_of_week: 'daily' },
      { time: '09:00', action: 'Analisar consumo', description: 'Calcular consumo medio e cobertura de estoque', day_of_week: 'daily' },
      { time: '11:00', action: 'Comparar fornecedores', description: 'Comparar precos e prazos entre fornecedores', day_of_week: 'daily' },
      { time: '14:00', action: 'Detectar aumento de precos', description: 'Identificar variacoes de preco nos ultimos 30 dias', day_of_week: 'daily' },
      { time: '16:00', action: 'Preparar sugestoes de compra', description: 'Gerar lista de compras sugeridas com justificativa', day_of_week: 'daily' }
    ]
  },
  {
    worker_key: 'controller_financeiro',
    name: 'Controller Financeiro',
    role: 'Controller',
    department: 'financeiro',
    objective: 'Manter a saude financeira da empresa sob controle permanente',
    specialty: 'Conferencia de contas, fluxo de caixa, margem e deteccao de despesas anormais',
    avatar_emoji: '📊',
    description: 'Conferir contas, fechar DRE, analisar fluxo de caixa, detectar despesas anormais, monitorar margem e preparar relatorios.',
    indicators_monitored: ['Fluxo de caixa', 'Margem', 'Contas vencidas', 'Despesas anormais'],
    permissions: ['Ler transacoes', 'Ler contas', 'Ler recebimentos iFood', 'Sugerir acoes financeiras'],
    autonomy_level: 'baixo',
    capabilities: ['Conferencia de contas', 'Analise de fluxo de caixa', 'Deteccao de anomalias', 'Fechamento de DRE'],
    data_access: ['FinancialTransaction', 'FinancialAccount', 'IFoodReceipt', 'Conciliation', 'Payment'],
    routines: [
      { time: '08:00', action: 'Conferir contas', description: 'Verificar contas a pagar e a receber do dia', day_of_week: 'daily' },
      { time: '10:00', action: 'Analisar fluxo de caixa', description: 'Projetar fluxo de caixa dos proximos 7 dias', day_of_week: 'daily' },
      { time: '12:00', action: 'Detectar despesas anormais', description: 'Identificar lancamentos fora do padrao', day_of_week: 'daily' },
      { time: '15:00', action: 'Monitorar margem', description: 'Calcular margem atual e comparar com metas', day_of_week: 'daily' },
      { time: '18:00', action: 'Preparar fechamento', description: 'Consolidar dados do dia para fechamento', day_of_week: 'daily' }
    ]
  },
  {
    worker_key: 'supervisor_producao',
    name: 'Supervisor de Producao',
    role: 'Supervisor de Producao',
    department: 'producao',
    objective: 'Garantir que a producao atenda a demanda com minimo desperdicio',
    specialty: 'Calculo de producao ideal, analise de vendas e sazonalidade',
    avatar_emoji: '🏭',
    description: 'Calcula producao ideal, analisa vendas historicas, considera sazonalidade e feriados, identifica desperdicios e gera plano diario de producao.',
    indicators_monitored: ['Producao vs planejado', 'Desperdicio', 'Rendimento', 'Tempo de producao'],
    permissions: ['Ler producao', 'Ler receitas', 'Ler vendas', 'Ler estoque', 'Sugerir plano de producao'],
    autonomy_level: 'baixo',
    capabilities: ['Calculo de producao ideal', 'Analise de sazonalidade', 'Identificacao de desperdicios', 'Plano diario de producao'],
    data_access: ['ProductionRecord', 'Recipe', 'Sale', 'Stock'],
    routines: [
      { time: '06:00', action: 'Analisar vendas do dia anterior', description: 'Verificar volume de vendas do dia anterior', day_of_week: 'daily' },
      { time: '07:00', action: 'Calcular producao ideal', description: 'Determinar quantidade ideal a produzir hoje', day_of_week: 'daily' },
      { time: '09:00', action: 'Considerar sazonalidade', description: 'Ajustar producao conforme sazonalidade e feriados', day_of_week: 'daily' },
      { time: '12:00', action: 'Conferir estoque de insumos', description: 'Verificar disponibilidade de insumos para producao', day_of_week: 'daily' },
      { time: '16:00', action: 'Gerar plano diario de producao', description: 'Consolidar plano de producao para o dia seguinte', day_of_week: 'daily' }
    ]
  },
  {
    worker_key: 'analista_estoque',
    name: 'Analista de Estoque',
    role: 'Analista de Estoque',
    department: 'estoque',
    objective: 'Manter o estoque otimizado, sem faltas nem excessos',
    specialty: 'Deteccao de estoque critico, excesso e itens sem giro',
    avatar_emoji: '📦',
    description: 'Detecta estoque critico, excesso, itens sem giro, sugere inventarios, analisa perdas e controla validade.',
    indicators_monitored: ['Itens criticos', 'Itens em excesso', 'Itens sem giro', 'Perdas', 'Vencimentos'],
    permissions: ['Ler estoque', 'Ler movimentos', 'Ler produtos', 'Sugerir inventarios'],
    autonomy_level: 'baixo',
    capabilities: ['Deteccao de estoque critico', 'Deteccao de excesso', 'Analise de giro', 'Controle de validade'],
    data_access: ['Stock', 'Movement', 'Product', 'Inventory'],
    routines: [
      { time: '07:00', action: 'Detectar estoque critico', description: 'Identificar produtos abaixo do estoque minimo', day_of_week: 'daily' },
      { time: '09:00', action: 'Detectar excesso', description: 'Identificar produtos acima do estoque maximo', day_of_week: 'daily' },
      { time: '11:00', action: 'Detectar itens sem giro', description: 'Identificar produtos sem movimentacao recente', day_of_week: 'daily' },
      { time: '14:00', action: 'Controlar validade', description: 'Verificar produtos proximos ao vencimento', day_of_week: 'daily' },
      { time: '16:00', action: 'Sugerir inventarios', description: 'Sugerir realizacao de inventarios fisicos', day_of_week: 'daily' }
    ]
  },
  {
    worker_key: 'gerente_rh',
    name: 'Gerente de RH',
    role: 'Gerente de RH',
    department: 'rh',
    objective: 'Manter a equipe humana organizada e motivada',
    specialty: 'Controle de presenca, escalas, banco de horas e treinamentos',
    avatar_emoji: '👥',
    description: 'Controla presenca, escalas, folgas, banco de horas, adiantamentos, treinamentos e avaliacoes. Alerta gestores sobre problemas.',
    indicators_monitored: ['Presenca', 'Banco de horas', 'Turnover', 'Treinamentos pendentes'],
    permissions: ['Ler funcionarios', 'Ler folha', 'Sugerir escalas', 'Alertar gestores'],
    autonomy_level: 'baixo',
    capabilities: ['Controle de presenca', 'Gestao de escalas', 'Banco de horas', 'Alertas de RH'],
    data_access: ['Employee', 'Payroll'],
    routines: [
      { time: '07:00', action: 'Controlar presenca', description: 'Verificar presenca dos funcionarios do dia', day_of_week: 'daily' },
      { time: '09:00', action: 'Verificar escalas', description: 'Conferir escalas e folgas da semana', day_of_week: 'daily' },
      { time: '11:00', action: 'Banco de horas', description: 'Atualizar e conferir banco de horas', day_of_week: 'daily' },
      { time: '14:00', action: 'Verificar adiantamentos', description: 'Verificar solicitacoes de adiantamento', day_of_week: 'daily' },
      { time: '16:00', action: 'Treinamentos', description: 'Verificar treinamentos pendentes e avaliacoes', day_of_week: 'daily' },
      { time: '18:00', action: 'Alertar gestores', description: 'Enviar alertas sobre problemas de RH', day_of_week: 'daily' }
    ]
  },
  {
    worker_key: 'supervisor_motoboys',
    name: 'Supervisor de Motoboys',
    role: 'Supervisor de Motoboys',
    department: 'logistica',
    objective: 'Garantir entrega eficiente e pagamento correto dos motoboys',
    specialty: 'Monitoramento de check-ins, fechamento semanal e calculo de pagamentos',
    avatar_emoji: '🏍️',
    description: 'Monitora check-ins, fecha semana, calcula pagamentos, controla lanches, detecta inconsistencias e gera comprovantes.',
    indicators_monitored: ['Check-ins', 'Pagamentos', 'Inconsistencias', 'Lanches'],
    permissions: ['Ler motoboys', 'Ler vendas', 'Sugerir pagamentos', 'Gerar comprovantes'],
    autonomy_level: 'baixo',
    capabilities: ['Monitoramento de check-ins', 'Fechamento semanal', 'Calculo de pagamentos', 'Deteccao de inconsistencias'],
    data_access: ['Courier', 'Sale'],
    routines: [
      { time: '07:00', action: 'Monitorar check-ins', description: 'Verificar check-ins dos motoboys do dia', day_of_week: 'daily' },
      { time: '12:00', action: 'Controlar lanches', description: 'Verificar lanches consumidos pelos motoboys', day_of_week: 'daily' },
      { time: '18:00', action: 'Fechar semana', description: 'Preparar fechamento semanal de motoboys', day_of_week: 'daily' },
      { time: '19:00', action: 'Calcular pagamentos', description: 'Calcular pagamentos devidos aos motoboys', day_of_week: 'daily' },
      { time: '20:00', action: 'Gerar comprovantes', description: 'Gerar comprovantes de pagamento', day_of_week: 'daily' }
    ]
  },
  {
    worker_key: 'analista_crm',
    name: 'Analista de CRM',
    role: 'Analista de CRM',
    department: 'comercial',
    objective: 'Maximizar retencao e fidelizacao de clientes',
    specialty: 'Deteccao de clientes inativos, ticket medio, recompra e fidelizacao',
    avatar_emoji: '🤝',
    description: 'Detecta clientes inativos, sugere campanhas, analisa ticket medio, calcula recompra, avalia fidelizacao e cria segmentos.',
    indicators_monitored: ['Clientes inativos', 'Ticket medio', 'Taxa de recompra', 'Fidelizacao'],
    permissions: ['Ler clientes', 'Ler vendas', 'Sugerir campanhas', 'Criar segmentos'],
    autonomy_level: 'baixo',
    capabilities: ['Deteccao de inativos', 'Analise de ticket medio', 'Calculo de recompra', 'Segmentacao'],
    data_access: ['Customer', 'Sale'],
    routines: [
      { time: '08:00', action: 'Detectar clientes inativos', description: 'Identificar clientes sem compra ha mais de 30 dias', day_of_week: 'daily' },
      { time: '10:00', action: 'Analisar ticket medio', description: 'Calcular e comparar ticket medio', day_of_week: 'daily' },
      { time: '12:00', action: 'Calcular recompra', description: 'Calcular taxa de recompra por cliente', day_of_week: 'daily' },
      { time: '14:00', action: 'Avaliar fidelizacao', description: 'Avaliar indicadores de fidelizacao', day_of_week: 'daily' },
      { time: '16:00', action: 'Criar segmentos', description: 'Atualizar segmentos de clientes', day_of_week: 'daily' },
      { time: '18:00', action: 'Sugerir campanhas', description: 'Sugerir campanhas para clientes inativos', day_of_week: 'daily' }
    ]
  },
  {
    worker_key: 'analista_marketing',
    name: 'Analista de Marketing',
    role: 'Analista de Marketing',
    department: 'comercial',
    objective: 'Otimizar promocoes e campanhas para maximizar ROI',
    specialty: 'Analise de promocoes, comparacao de campanhas e calculo de ROI',
    avatar_emoji: '📣',
    description: 'Analisa promocoes, compara campanhas, calcula ROI, sugere acoes, monitora sazonalidade e avalia desempenho.',
    indicators_monitored: ['ROI de campanhas', 'Sazonalidade', 'Desempenho de promocoes'],
    permissions: ['Ler vendas', 'Ler recebimentos iFood', 'Sugerir acoes de marketing'],
    autonomy_level: 'baixo',
    capabilities: ['Analise de promocoes', 'Comparacao de campanhas', 'Calculo de ROI', 'Monitoramento de sazonalidade'],
    data_access: ['Sale', 'IFoodReceipt', 'Customer'],
    routines: [
      { time: '09:00', action: 'Analisar promocoes', description: 'Avaliar desempenho de promocoes ativas', day_of_week: 'daily' },
      { time: '11:00', action: 'Comparar campanhas', description: 'Comparar resultados entre campanhas', day_of_week: 'daily' },
      { time: '13:00', action: 'Calcular ROI', description: 'Calcular retorno sobre investimento das acoes', day_of_week: 'daily' },
      { time: '15:00', action: 'Monitorar sazonalidade', description: 'Identificar padroes sazonais de venda', day_of_week: 'daily' },
      { time: '17:00', action: 'Sugerir acoes', description: 'Sugerir proximas acoes de marketing', day_of_week: 'daily' }
    ]
  },
  {
    worker_key: 'auditor_digital',
    name: 'Auditor Digital',
    role: 'Auditor',
    department: 'auditoria',
    objective: 'Garantir integridade, consistencia e conformidade dos dados',
    specialty: 'Revisao de dados, deteccao de inconsistencias e fraudes',
    avatar_emoji: '🔍',
    description: 'Revisa dados, encontra inconsistencias, detecta fraudes, compara documentos, audita processos e gera relatorios.',
    indicators_monitored: ['Inconsistencias', 'Fraudes detectadas', 'Processos auditados', 'Documentos divergentes'],
    permissions: ['Ler auditoria', 'Ler transacoes', 'Ler documentos', 'Gerar relatorios de auditoria'],
    autonomy_level: 'baixo',
    capabilities: ['Revisao de dados', 'Deteccao de inconsistencias', 'Deteccao de fraudes', 'Auditoria de processos'],
    data_access: ['AuditLog', 'FinancialTransaction', 'DBDocument'],
    routines: [
      { time: '08:00', action: 'Revisar dados', description: 'Revisar integridade dos dados do sistema', day_of_week: 'daily' },
      { time: '10:00', action: 'Encontrar inconsistencias', description: 'Buscar inconsistencias entre registros', day_of_week: 'daily' },
      { time: '12:00', action: 'Comparar documentos', description: 'Comparar documentos com registros do sistema', day_of_week: 'daily' },
      { time: '14:00', action: 'Auditar processos', description: 'Auditar processos de compra, venda e producao', day_of_week: 'daily' },
      { time: '16:00', action: 'Gerar relatorios', description: 'Gerar relatorios de auditoria', day_of_week: 'daily' },
      { time: '18:00', action: 'Detectar fraudes', description: 'Verificar padroes suspeitos de fraude', day_of_week: 'daily' }
    ]
  },
  {
    worker_key: 'consultor_estrategico',
    name: 'Consultor Estrategico',
    role: 'Consultor Estrategico',
    department: 'estrategia',
    objective: 'Cruzar dados de todos os departamentos para encontrar oportunidades',
    specialty: 'Analise cruzada, simulacao de cenarios e definicao de metas',
    avatar_emoji: '🎯',
    description: 'Cruza dados de todos os departamentos, encontra oportunidades, simula cenarios, prepara reunioes e sugere metas.',
    indicators_monitored: ['Oportunidades identificadas', 'Cenarios simulados', 'Metas sugeridas'],
    permissions: ['Ler todos os dados', 'Sugerir metas', 'Simular cenarios', 'Preparar reunioes'],
    autonomy_level: 'medio',
    capabilities: ['Analise cruzada', 'Simulacao de cenarios', 'Definicao de metas', 'Preparo de reunioes'],
    data_access: ['Sale', 'FinancialTransaction', 'Stock', 'ProductionRecord', 'Product', 'Customer'],
    routines: [
      { time: '07:00', action: 'Cruzar dados de todos os departamentos', description: 'Consolidar dados de todos os setores', day_of_week: 'daily' },
      { time: '10:00', action: 'Encontrar oportunidades', description: 'Identificar oportunidades de melhoria', day_of_week: 'daily' },
      { time: '13:00', action: 'Simular cenarios', description: 'Simular cenarios de negocio', day_of_week: 'daily' },
      { time: '15:00', action: 'Preparar reunioes', description: 'Preparar pautas para reunioes gerenciais', day_of_week: 'daily' },
      { time: '17:00', action: 'Sugerir metas', description: 'Sugerir metas baseadas em dados', day_of_week: 'daily' },
      { time: '23:30', action: 'Gerar resumo diario', description: 'Consolidar resumo executivo do dia', day_of_week: 'daily' }
    ]
  }
];

const DEPT_LABELS = {
  compras: 'Compras', financeiro: 'Financeiro', producao: 'Producao',
  estoque: 'Estoque', rh: 'Recursos Humanos', logistica: 'Logistica',
  comercial: 'Comercial', auditoria: 'Auditoria', estrategia: 'Estrategia'
};

async function safeList(base44, entityName, limit) {
  try {
    const items = await base44.asServiceRole.entities[entityName].list('-updated_date', limit || 30);
    return Array.isArray(items) ? items : [];
  } catch (e) { return []; }
}

async function gatherWorkerData(base44, worker) {
  const dataAccess = worker.data_access || [];
  const data = {};
  await Promise.all(dataAccess.map(async (entityName) => {
    data[entityName] = await safeList(base44, entityName, 30);
  }));
  let summary = '';
  for (const [entityName, items] of Object.entries(data)) {
    if (items.length === 0) {
      summary += '\n' + entityName + ': Nenhum registro encontrado.\n';
    } else {
      summary += '\n' + entityName + ': ' + items.length + ' registro(s).\n';
      const skipKeys = ['id', 'created_date', 'updated_date', 'created_by_id', 'company_id', 'version', 'deleted_at', 'deleted_by', 'version_number', 'history', 'subscribers', 'payload', 'before_value', 'after_value', 'extracted_data', 'ia_analysis', 'classification_flow', 'related_entities', 'alerts', 'quality_checklist', 'losses', 'pauses', 'received_items', 'missing_items', 'divergences', 'items', 'ingredients', 'combo_items', 'yield_history', 'routines', 'stock_movement_ids', 'photos', 'videos'];
      items.slice(0, 8).forEach((item, i) => {
        const keys = Object.keys(item).filter(k => !skipKeys.includes(k) && item[k] !== null && item[k] !== undefined && item[k] !== '').slice(0, 6);
        const fields = keys.map(k => {
          let v = item[k];
          if (typeof v === 'object') v = JSON.stringify(v).substring(0, 80);
          if (typeof v === 'string' && v.length > 80) v = v.substring(0, 80) + '...';
          return k + '=' + v;
        }).join(', ');
        summary += '  ' + (i + 1) + '. ' + fields + '\n';
      });
      if (items.length > 8) summary += '  ... e mais ' + (items.length - 8) + ' registro(s).\n';
    }
  }
  return summary || 'Nenhum dado disponivel no momento.';
}

function buildPrompt(worker, dataSummary, routineAction) {
  const deptLabel = DEPT_LABELS[worker.department] || worker.department;
  return 'Voce e ' + worker.name + ', ' + worker.role + ' do departamento de ' + deptLabel + ' no Don Baron OS.\n\n' +
    'OBJETIVO: ' + worker.objective + '\n' +
    'ESPECIALIDADE: ' + worker.specialty + '\n\n' +
    'ROTINA A EXECUTAR: ' + routineAction + '\n\n' +
    'INDICADORES MONITORADOS: ' + (worker.indicators_monitored || []).join(', ') + '\n\n' +
    'DADOS COLETADOS DO SISTEMA:\n' + dataSummary + '\n\n' +
    'Como ' + worker.name + ', execute a rotina "' + routineAction + '".\n' +
    'Analise os dados acima com foco na sua especialidade.\n\n' +
    'REGRAS:\n' +
    '- Voce NAO pode executar acoes, apenas recomendar.\n' +
    '- Toda acao critica requer aprovacao humana.\n' +
    '- Identifique problemas, oportunidades e riscos.\n' +
    '- Se houver dados insuficientes, indique na confianca como "baixa".\n' +
    '- Calcule economia estimada e tempo economizado quando aplicavel.\n\n' +
    'Forneca:\n' +
    '1. summary: Resumo da analise executada\n' +
    '2. findings: Lista de principais descobertas\n' +
    '3. alerts: Lista de alertas urgentes (se houver), cada um com severity (critica/alta/media/baixa), title, message, action_suggested\n' +
    '4. recommendations: Lista de recomendacoes acionaveis\n' +
    '5. confidence_level: alta, media ou baixa\n' +
    '6. savings_identified: Economia identificada em R$ (numero)\n' +
    '7. time_saved_min: Tempo economizado em minutos (numero)';
}

async function executeRoutineInternal(base44, user, worker, routineAction) {
  const sr = base44.asServiceRole;
  const companyId = user.company_id || '';

  await sr.entities.DigitalWorker.update(worker.id, { status: 'working', current_task: routineAction });

  const dataSummary = await gatherWorkerData(base44, worker);
  const prompt = buildPrompt(worker, dataSummary, routineAction);

  const llmResponse = await sr.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        findings: { type: 'array', items: { type: 'string' } },
        alerts: { type: 'array', items: { type: 'object', properties: {
          severity: { type: 'string' }, title: { type: 'string' },
          message: { type: 'string' }, action_suggested: { type: 'string' }
        }}},
        recommendations: { type: 'array', items: { type: 'string' } },
        confidence_level: { type: 'string' },
        savings_identified: { type: 'number' },
        time_saved_min: { type: 'number' }
      }
    }
  });

  const activity = await sr.entities.WorkerActivity.create({
    worker_key: worker.worker_key,
    worker_name: worker.name,
    activity_type: 'analysis',
    title: routineAction + ' — ' + worker.name,
    description: (worker.routines || []).find(r => r.action === routineAction)?.description || routineAction,
    summary: llmResponse.summary || '',
    findings: llmResponse.findings || [],
    recommendations: llmResponse.recommendations || [],
    confidence_level: llmResponse.confidence_level || 'media',
    entities_used: worker.data_access || [],
    savings_identified: llmResponse.savings_identified || 0,
    time_saved_min: llmResponse.time_saved_min || 0,
    status: 'completed',
    routine_action: routineAction,
    company_id: companyId
  });

  const createdAlerts = [];
  if (llmResponse.alerts && llmResponse.alerts.length > 0) {
    for (const alert of llmResponse.alerts) {
      const created = await sr.entities.WorkerAlert.create({
        worker_key: worker.worker_key,
        worker_name: worker.name,
        alert_type: routineAction,
        severity: alert.severity || 'media',
        title: alert.title || 'Alerta',
        message: alert.message || '',
        action_suggested: alert.action_suggested || '',
        data_used: worker.data_access || [],
        status: 'active',
        activity_id: activity.id,
        company_id: companyId
      });
      createdAlerts.push(created);
    }
  }

  const newAnalyses = (worker.analyses_count || 0) + 1;
  const newSuggestions = (worker.suggestions_count || 0) + (llmResponse.recommendations?.length || 0);
  const newSavings = (worker.savings_generated || 0) + (llmResponse.savings_identified || 0);
  const newTimeSaved = (worker.time_saved_hours || 0) + ((llmResponse.time_saved_min || 0) / 60);

  const updatedRoutines = (worker.routines || []).map(r => {
    if (r.action === routineAction) {
      return { ...r, last_executed_at: new Date().toISOString(), last_result: (llmResponse.summary || '').substring(0, 200), execution_count: (r.execution_count || 0) + 1 };
    }
    return r;
  });

  await sr.entities.DigitalWorker.update(worker.id, {
    analyses_count: newAnalyses, suggestions_count: newSuggestions,
    savings_generated: newSavings, time_saved_hours: newTimeSaved,
    status: 'idle', current_task: '',
    last_activity_at: new Date().toISOString(), routines: updatedRoutines
  });

  return { activity, alerts: createdAlerts, worker: { ...worker, analyses_count: newAnalyses, suggestions_count: newSuggestions, savings_generated: newSavings, time_saved_hours: newTimeSaved } };
}

async function handleInit(base44, user) {
  const sr = base44.asServiceRole;
  const existing = await sr.entities.DigitalWorker.list('worker_key', 100);
  if (existing && existing.length > 0) {
    return Response.json({ initialized: false, count: existing.length, message: 'Workers already seeded' });
  }
  const companyId = user.company_id || '';
  for (const worker of WORKERS) {
    await sr.entities.DigitalWorker.create({
      ...worker, company_id: companyId, active: true, status: 'idle',
      analyses_count: 0, suggestions_count: 0, approvals_count: 0, rejections_count: 0,
      precision_pct: 0, savings_generated: 0, time_saved_hours: 0, version: 1
    });
  }
  return Response.json({ initialized: true, count: WORKERS.length });
}

async function handleGetDashboard(base44, user) {
  const sr = base44.asServiceRole;
  const workers = await sr.entities.DigitalWorker.list('department', 100);
  const activeAlerts = await sr.entities.WorkerAlert.filter({ status: 'active' }, '-created_date', 50);
  const recentActivities = await sr.entities.WorkerActivity.list('-created_date', 10);
  const metrics = {
    total_workers: workers.length,
    active_workers: workers.filter(w => w.active).length,
    total_analyses: workers.reduce((s, w) => s + (w.analyses_count || 0), 0),
    total_suggestions: workers.reduce((s, w) => s + (w.suggestions_count || 0), 0),
    total_approvals: workers.reduce((s, w) => s + (w.approvals_count || 0), 0),
    total_rejections: workers.reduce((s, w) => s + (w.rejections_count || 0), 0),
    total_savings: workers.reduce((s, w) => s + (w.savings_generated || 0), 0),
    total_time_saved_hours: workers.reduce((s, w) => s + (w.time_saved_hours || 0), 0),
    average_precision: workers.length > 0 ? Math.round(workers.reduce((s, w) => s + (w.precision_pct || 0), 0) / workers.length) : 0,
    active_alerts: activeAlerts.length,
    critical_alerts: activeAlerts.filter(a => a.severity === 'critica').length
  };
  return Response.json({ workers, metrics, recent_activities: recentActivities, recent_alerts: activeAlerts.slice(0, 5) });
}

async function handleListWorkers(base44, user) {
  const sr = base44.asServiceRole;
  const workers = await sr.entities.DigitalWorker.list('department', 100);
  const grouped = {};
  for (const w of workers) { if (!grouped[w.department]) grouped[w.department] = []; grouped[w.department].push(w); }
  return Response.json({ items: workers, grouped });
}

async function handleGetWorker(base44, user, body) {
  const sr = base44.asServiceRole;
  const workers = await sr.entities.DigitalWorker.filter({ worker_key: body.worker_key });
  if (!workers || workers.length === 0) return Response.json({ error: 'Worker not found' }, { status: 404 });
  const worker = workers[0];
  const activities = await sr.entities.WorkerActivity.filter({ worker_key: body.worker_key }, '-created_date', 20);
  const alerts = await sr.entities.WorkerAlert.filter({ worker_key: body.worker_key, status: 'active' }, '-created_date', 20);
  return Response.json({ item: worker, activities, alerts });
}

async function handleExecuteRoutine(base44, user, body) {
  const sr = base44.asServiceRole;
  const workers = await sr.entities.DigitalWorker.filter({ worker_key: body.worker_key });
  if (!workers || workers.length === 0) return Response.json({ error: 'Worker not found' }, { status: 404 });
  const result = await executeRoutineInternal(base44, user, workers[0], body.routine_action);
  return Response.json(result);
}

async function handleGenerateAlerts(base44, user) {
  const sr = base44.asServiceRole;
  const companyId = user.company_id || '';
  let created = 0;

  try {
    const products = await safeList(base44, 'Product', 100);
    for (const p of products) {
      if (p.controls_stock && p.min_quantity > 0 && p.stock_quantity <= p.min_quantity) {
        const exists = await sr.entities.WorkerAlert.filter({ worker_key: 'analista_estoque', title: 'Estoque critico: ' + p.name, status: 'active' }, '-created_date', 1);
        if (!exists || exists.length === 0) {
          await sr.entities.WorkerAlert.create({
            worker_key: 'analista_estoque', worker_name: 'Analista de Estoque',
            alert_type: 'estoque_critico', severity: 'critica',
            title: 'Estoque critico: ' + p.name,
            message: 'O produto ' + p.name + ' esta com ' + p.stock_quantity + ' ' + (p.unit || 'un') + ' em estoque, abaixo do minimo de ' + p.min_quantity + '.',
            action_suggested: 'Verificar necessidade de compra urgente.', data_used: ['Product'], status: 'active', company_id: companyId
          });
          created++;
        }
      }
    }
  } catch (e) {}

  try {
    const transactions = await safeList(base44, 'FinancialTransaction', 100);
    const today = new Date().toISOString().split('T')[0];
    for (const t of transactions) {
      if (t.status === 'pendente' && t.due_date && t.due_date < today) {
        const exists = await sr.entities.WorkerAlert.filter({ worker_key: 'controller_financeiro', title: 'Conta vencida: ' + (t.description || '').substring(0, 50), status: 'active' }, '-created_date', 1);
        if (!exists || exists.length === 0) {
          await sr.entities.WorkerAlert.create({
            worker_key: 'controller_financeiro', worker_name: 'Controller Financeiro',
            alert_type: 'conta_vencida', severity: 'alta',
            title: 'Conta vencida: ' + (t.description || '').substring(0, 50),
            message: 'A conta "' + (t.description || '') + '" no valor de R$ ' + (t.amount || 0) + ' venceu em ' + t.due_date + '.',
            action_suggested: 'Verificar pagamento ou renegociar prazo.', data_used: ['FinancialTransaction'], status: 'active', company_id: companyId
          });
          created++;
        }
      }
    }
  } catch (e) {}

  return Response.json({ created, message: created + ' alerta(s) gerado(s)' });
}

async function handleListActivities(base44, user, body) {
  const sr = base44.asServiceRole;
  const filter = body.worker_key ? { worker_key: body.worker_key } : {};
  const items = await sr.entities.WorkerActivity.filter(filter, '-created_date', body.limit || 50);
  return Response.json({ items });
}

async function handleListAlerts(base44, user, body) {
  const sr = base44.asServiceRole;
  const filter = body.status ? { status: body.status } : {};
  const items = await sr.entities.WorkerAlert.filter(filter, '-created_date', body.limit || 50);
  return Response.json({ items });
}

async function handleAcknowledgeAlert(base44, user, body) {
  const sr = base44.asServiceRole;
  await sr.entities.WorkerAlert.update(body.alert_id, {
    status: body.status, acknowledged_by: user.full_name || user.email,
    acknowledged_at: new Date().toISOString()
  });
  return Response.json({ success: true });
}

async function handleApproveActivity(base44, user, body) {
  const sr = base44.asServiceRole;
  const activity = await sr.entities.WorkerActivity.get(body.activity_id);
  if (!activity) return Response.json({ error: 'Activity not found' }, { status: 404 });
  const updateData = body.approved ? {
    status: 'approved', approved_by: user.full_name || user.email, approved_at: new Date().toISOString()
  } : {
    status: 'rejected', rejected_by: user.full_name || user.email, rejected_at: new Date().toISOString()
  };
  await sr.entities.WorkerActivity.update(body.activity_id, updateData);
  const workers = await sr.entities.DigitalWorker.filter({ worker_key: activity.worker_key });
  if (workers && workers.length > 0) {
    const worker = workers[0];
    const newApprovals = (worker.approvals_count || 0) + (body.approved ? 1 : 0);
    const newRejections = (worker.rejections_count || 0) + (body.approved ? 0 : 1);
    const total = newApprovals + newRejections;
    const precision = total > 0 ? Math.round((newApprovals / total) * 100) : 0;
    await sr.entities.DigitalWorker.update(worker.id, { approvals_count: newApprovals, rejections_count: newRejections, precision_pct: precision });
  }
  return Response.json({ success: true });
}

async function handleExecuteAll(base44, user, body) {
  const sr = base44.asServiceRole;
  const maxWorkers = body.max_workers || 3;
  const workers = await sr.entities.DigitalWorker.filter({ active: true });
  const results = [];
  for (let i = 0; i < Math.min(workers.length, maxWorkers); i++) {
    const worker = workers[i];
    const routines = worker.routines || [];
    if (routines.length === 0) continue;
    const sorted = [...routines].sort((a, b) => {
      const aT = a.last_executed_at ? new Date(a.last_executed_at).getTime() : 0;
      const bT = b.last_executed_at ? new Date(b.last_executed_at).getTime() : 0;
      return aT - bT;
    });
    const routine = sorted[0];
    try {
      const result = await executeRoutineInternal(base44, user, worker, routine.action);
      results.push({ worker_key: worker.worker_key, worker_name: worker.name, routine: routine.action, success: true, activity_id: result.activity?.id });
    } catch (e) {
      results.push({ worker_key: worker.worker_key, worker_name: worker.name, routine: routine.action, success: false, error: e.message });
    }
  }
  return Response.json({ results, executed: results.length });
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
      case 'listWorkers': return await handleListWorkers(base44, user);
      case 'getWorker': return await handleGetWorker(base44, user, body);
      case 'executeRoutine': return await handleExecuteRoutine(base44, user, body);
      case 'generateAlerts': return await handleGenerateAlerts(base44, user);
      case 'listActivities': return await handleListActivities(base44, user, body);
      case 'listAlerts': return await handleListAlerts(base44, user, body);
      case 'acknowledgeAlert': return await handleAcknowledgeAlert(base44, user, body);
      case 'approveActivity': return await handleApproveActivity(base44, user, body);
      case 'executeAll': return await handleExecuteAll(base44, user, body);
      default: return Response.json({ error: 'Unknown action: ' + body.action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});