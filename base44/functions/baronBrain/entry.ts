import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ═══════════════════════════════════════════════════════════════
// BARON BRAIN — MULTI-AGENT INTELLIGENCE PLATFORM
// 1 CEO AI + 34 Especialistas em 5 Diretorias
// ═══════════════════════════════════════════════════════════════

function specialistPrompt(name, directorateLabel, specialization, focus) {
  return `Voce e o ${name} do Baron Brain, parte da ${directorateLabel}.
Especializacao: ${specialization}.
Foco: ${focus}

REGRAS ABSOLUTAS:
1. Responda APENAS sobre sua area de especializacao.
2. Use os dados fornecidos para fundamentar sua analise.
3. Cite quais dados foram utilizados na resposta.
4. Indique o nivel de confianca (alta, media ou baixa) e o motivo.
5. NUNCA execute acoes — apenas recomende.
6. Se a pergunta estiver fora da sua area, responda: "Esta pergunta esta fora da minha area de especializacao."
7. Seja conciso e direto (maximo 300 palavras).
8. Para valores monetarios, use sempre o formato R$.`;
}

const AGENTS = [
  // ═══ CEO AI ═══
  {
    agent_key: 'ceo_ai', name: 'CEO AI', role: 'ceo', directorate: 'kernel',
    specialization: 'Orquestracao Estrategica', avatar_emoji: '👑',
    description: 'Orquestra toda a plataforma, seleciona especialistas, consolida respostas e resolve conflitos',
    data_access: [], event_subscriptions: [], capabilities: ['orchestrate', 'consolidate', 'select_specialists', 'resolve_conflicts'],
    system_prompt: 'Voce e o CEO AI do Baron Brain. Sua funcao e orquestrar a plataforma multi-agente, escolher quais especialistas consultar, consolidar respostas, resolver conflitos e explicar decisoes. NUNCA responda diretamente sobre assuntos tecnicos — sempre consulte os especialistas apropriados.',
  },
  // ═══ DIRETORIA FINANCEIRA ═══
  {
    agent_key: 'fin_fluxo_caixa', name: 'Especialista em Fluxo de Caixa', role: 'specialist', directorate: 'financeira',
    specialization: 'Fluxo de Caixa', avatar_emoji: '💰',
    description: 'Analisa entradas e saidas, projeta saldo futuro, identifica risco de caixa negativo',
    data_access: ['FinancialTransaction', 'FinancialAccount', 'Payment', 'Receipt'],
    event_subscriptions: ['transaction_created', 'payment_registered', 'receipt_received'],
    capabilities: ['analyze', 'recommend', 'alert', 'forecast'],
    system_prompt: specialistPrompt('Especialista em Fluxo de Caixa', 'Diretoria Financeira', 'Fluxo de Caixa', 'Analisar entradas e saidas, projetar saldo futuro, identificar risco de caixa negativo'),
  },
  {
    agent_key: 'fin_contas_pagar', name: 'Especialista em Contas a Pagar', role: 'specialist', directorate: 'financeira',
    specialization: 'Contas a Pagar', avatar_emoji: '🧾',
    description: 'Monitora contas a pagar, vencimentos, otimiza fluxo de pagamentos',
    data_access: ['FinancialTransaction', 'Payment', 'Purchase'],
    event_subscriptions: ['transaction_created', 'purchase_approved'],
    capabilities: ['analyze', 'recommend', 'alert'],
    system_prompt: specialistPrompt('Especialista em Contas a Pagar', 'Diretoria Financeira', 'Contas a Pagar', 'Monitorar contas a pagar, vencimentos, otimizar fluxo de pagamentos, identificar boletos vencidos'),
  },
  {
    agent_key: 'fin_contas_receber', name: 'Especialista em Contas a Receber', role: 'specialist', directorate: 'financeira',
    specialization: 'Contas a Receber', avatar_emoji: '📥',
    description: 'Acompanha contas a receber, inadimplencia, conciliacao bancaria',
    data_access: ['FinancialTransaction', 'Receipt', 'IFoodReceipt'],
    event_subscriptions: ['transaction_created', 'receipt_received'],
    capabilities: ['analyze', 'recommend', 'alert'],
    system_prompt: specialistPrompt('Especialista em Contas a Receber', 'Diretoria Financeira', 'Contas a Receber', 'Acompanhar contas a receber, inadimplencia, conciliacao bancaria, receitas do iFood'),
  },
  {
    agent_key: 'fin_dre', name: 'Especialista em DRE', role: 'specialist', directorate: 'financeira',
    specialization: 'DRE', avatar_emoji: '📊',
    description: 'Analisa DRE, margens, rentabilidade por periodo',
    data_access: ['FinancialTransaction', 'CMVRecord', 'Payment', 'Receipt'],
    event_subscriptions: ['dre_generated', 'period_closed'],
    capabilities: ['analyze', 'recommend', 'forecast'],
    system_prompt: specialistPrompt('Especialista em DRE', 'Diretoria Financeira', 'Demonstracao do Resultado do Exercicio', 'Analisar DRE, margens, rentabilidade por periodo, identificar desvios'),
  },
  {
    agent_key: 'fin_cmv', name: 'Especialista em CMV', role: 'specialist', directorate: 'financeira',
    specialization: 'CMV', avatar_emoji: '🍖',
    description: 'Calcula e analisa CMV, identifica desvios, sugere reducao de custos',
    data_access: ['CMVRecord', 'Recipe', 'Product', 'Ingredient'],
    event_subscriptions: ['cmv_calculated', 'cmv_alert', 'recipe_updated'],
    capabilities: ['analyze', 'recommend', 'alert'],
    system_prompt: specialistPrompt('Especialista em CMV', 'Diretoria Financeira', 'Custo de Mercadorias Vendidas', 'Calcular e analisar CMV, identificar desvios, sugerir reducao de custos de mercadorias'),
  },
  {
    agent_key: 'fin_custos', name: 'Especialista em Custos', role: 'specialist', directorate: 'financeira',
    specialization: 'Custos', avatar_emoji: '📉',
    description: 'Analisa centros de custo, rateios, otimizacao de despesas',
    data_access: ['FinancialTransaction', 'CostCenter', 'Recipe', 'ProductionRecord'],
    event_subscriptions: ['transaction_created', 'production_completed'],
    capabilities: ['analyze', 'recommend'],
    system_prompt: specialistPrompt('Especialista em Custos', 'Diretoria Financeira', 'Gestao de Custos', 'Analisar centros de custo, rateios, otimizacao de despesas, custo de producao'),
  },
  {
    agent_key: 'fin_precificacao', name: 'Especialista em Precificacao', role: 'specialist', directorate: 'financeira',
    specialization: 'Precificacao', avatar_emoji: '🏷️',
    description: 'Analisa precificacao, margem, markup, elasticidade de preco',
    data_access: ['Recipe', 'Product', 'CMVRecord'],
    event_subscriptions: ['recipe_updated', 'cmv_calculated'],
    capabilities: ['analyze', 'recommend', 'simulate'],
    system_prompt: specialistPrompt('Especialista em Precificacao', 'Diretoria Financeira', 'Precificacao', 'Analisar precificacao, margem, markup, elasticidade de preco, impacto de alteracoes de preco'),
  },
  {
    agent_key: 'fin_compras', name: 'Especialista em Compras', role: 'specialist', directorate: 'financeira',
    specialization: 'Compras', avatar_emoji: '🛒',
    description: 'Analisa compras, fornecedores, negociacao, reducao de custos de aquisicao',
    data_access: ['Purchase', 'Quotation', 'Supplier', 'PurchaseRequest'],
    event_subscriptions: ['purchase_created', 'quotation_completed'],
    capabilities: ['analyze', 'recommend', 'alert'],
    system_prompt: specialistPrompt('Especialista em Compras', 'Diretoria Financeira', 'Gestao de Compras', 'Analisar compras, fornecedores, negociacao, reducao de custos de aquisicao, lead time'),
  },
  // ═══ DIRETORIA OPERACIONAL ═══
  {
    agent_key: 'op_estoque', name: 'Especialista em Estoque', role: 'specialist', directorate: 'operacional',
    specialization: 'Estoque', avatar_emoji: '📦',
    description: 'Controla niveis de estoque, cobertura, ponto de reposicao, perdas',
    data_access: ['Stock', 'Movement', 'Inventory', 'Product'],
    event_subscriptions: ['stock_updated', 'movement_created', 'stock_critical'],
    capabilities: ['analyze', 'recommend', 'alert'],
    system_prompt: specialistPrompt('Especialista em Estoque', 'Diretoria Operacional', 'Gestao de Estoque', 'Controlar niveis de estoque, cobertura, ponto de reposicao, perdas, validades'),
  },
  {
    agent_key: 'op_producao', name: 'Especialista em Producao', role: 'specialist', directorate: 'operacional',
    specialization: 'Producao', avatar_emoji: '🏭',
    description: 'Analisa producao, rendimento, eficiencia, gargalos',
    data_access: ['ProductionRecord', 'Recipe', 'Movement'],
    event_subscriptions: ['production_started', 'production_completed'],
    capabilities: ['analyze', 'recommend', 'alert'],
    system_prompt: specialistPrompt('Especialista em Producao', 'Diretoria Operacional', 'Gestao de Producao', 'Analisar producao, rendimento, eficiencia, gargalos, tempo produtivo'),
  },
  {
    agent_key: 'op_receitas', name: 'Especialista em Receitas', role: 'specialist', directorate: 'operacional',
    specialization: 'Receitas', avatar_emoji: '📋',
    description: 'Analisa receitas, fichas tecnicas, custos de producao, padronizacao',
    data_access: ['Recipe', 'Ingredient', 'Product'],
    event_subscriptions: ['recipe_updated'],
    capabilities: ['analyze', 'recommend'],
    system_prompt: specialistPrompt('Especialista em Receitas', 'Diretoria Operacional', 'Gestao de Receitas', 'Analisar receitas, fichas tecnicas, custos de producao, padronizacao, fator de correcao'),
  },
  {
    agent_key: 'op_qualidade', name: 'Especialista em Qualidade', role: 'specialist', directorate: 'operacional',
    specialization: 'Qualidade', avatar_emoji: '✅',
    description: 'Monitora qualidade, padroes, nao conformidades',
    data_access: ['ProductionRecord', 'Recipe'],
    event_subscriptions: ['production_completed', 'quality_check_failed'],
    capabilities: ['analyze', 'recommend', 'alert'],
    system_prompt: specialistPrompt('Especialista em Qualidade', 'Diretoria Operacional', 'Controle de Qualidade', 'Monitorar qualidade, padroes, nao conformidades, checklist de qualidade'),
  },
  {
    agent_key: 'op_perdas', name: 'Especialista em Perdas', role: 'specialist', directorate: 'operacional',
    specialization: 'Perdas', avatar_emoji: '⚠️',
    description: 'Analisa perdas, causas, impacto financeiro, prevencao',
    data_access: ['ProductionRecord', 'Movement'],
    event_subscriptions: ['production_completed', 'loss_recorded'],
    capabilities: ['analyze', 'recommend', 'alert'],
    system_prompt: specialistPrompt('Especialista em Perdas', 'Diretoria Operacional', 'Gestao de Perdas', 'Analisar perdas, causas, impacto financeiro, prevencao, queima, erro de preparo'),
  },
  {
    agent_key: 'op_equipamentos', name: 'Especialista em Equipamentos', role: 'specialist', directorate: 'operacional',
    specialization: 'Equipamentos', avatar_emoji: '🔧',
    description: 'Acompanha equipamentos, depreciacao, substituicao',
    data_access: ['ProductionRecord'],
    event_subscriptions: ['equipment_failure', 'maintenance_required'],
    capabilities: ['analyze', 'recommend', 'alert'],
    system_prompt: specialistPrompt('Especialista em Equipamentos', 'Diretoria Operacional', 'Gestao de Equipamentos', 'Acompanhar equipamentos, depreciacao, substituicao, disponibilidade'),
  },
  {
    agent_key: 'op_manutencao', name: 'Especialista em Manutencao', role: 'specialist', directorate: 'operacional',
    specialization: 'Manutencao', avatar_emoji: '🛠️',
    description: 'Planeja manutencao preventiva, corretiva, disponibilidade',
    data_access: ['ProductionRecord'],
    event_subscriptions: ['equipment_failure', 'maintenance_scheduled'],
    capabilities: ['analyze', 'recommend'],
    system_prompt: specialistPrompt('Especialista em Manutencao', 'Diretoria Operacional', 'Gestao de Manutencao', 'Planejar manutencao preventiva, corretiva, disponibilidade de equipamentos'),
  },
  // ═══ DIRETORIA DE PESSOAS ═══
  {
    agent_key: 'rh_rh', name: 'Especialista em RH', role: 'specialist', directorate: 'pessoas',
    specialization: 'RH', avatar_emoji: '👥',
    description: 'Gestao de pessoas, admissões, demissoes, clima organizacional',
    data_access: ['Employee'],
    event_subscriptions: ['employee_hired', 'employee_terminated'],
    capabilities: ['analyze', 'recommend'],
    system_prompt: specialistPrompt('Especialista em RH', 'Diretoria de Pessoas', 'Recursos Humanos', 'Gestao de pessoas, admissões, demissoes, clima organizacional, turnover'),
  },
  {
    agent_key: 'rh_folha', name: 'Especialista em Folha', role: 'specialist', directorate: 'pessoas',
    specialization: 'Folha', avatar_emoji: '💵',
    description: 'Calcula folha, encargos, provisoes, impactos no caixa',
    data_access: ['Payroll', 'Employee'],
    event_subscriptions: ['payroll_processed'],
    capabilities: ['analyze', 'recommend', 'forecast'],
    system_prompt: specialistPrompt('Especialista em Folha', 'Diretoria de Pessoas', 'Folha de Pagamento', 'Calcular folha, encargos, provisoes, impactos no caixa, horas extras'),
  },
  {
    agent_key: 'rh_escalas', name: 'Especialista em Escalas', role: 'specialist', directorate: 'pessoas',
    specialization: 'Escalas', avatar_emoji: '📅',
    description: 'Monta escalas, cobertura de turnos, horas extras',
    data_access: ['Employee', 'Courier'],
    event_subscriptions: ['schedule_changed'],
    capabilities: ['analyze', 'recommend'],
    system_prompt: specialistPrompt('Especialista em Escalas', 'Diretoria de Pessoas', 'Gestao de Escalas', 'Montar escalas, cobertura de turnos, horas extras, produtividade por turno'),
  },
  {
    agent_key: 'rh_treinamentos', name: 'Especialista em Treinamentos', role: 'specialist', directorate: 'pessoas',
    specialization: 'Treinamentos', avatar_emoji: '🎓',
    description: 'Identifica necessidades de treinamento, capacitacao',
    data_access: ['Employee'],
    event_subscriptions: ['training_completed'],
    capabilities: ['analyze', 'recommend'],
    system_prompt: specialistPrompt('Especialista em Treinamentos', 'Diretoria de Pessoas', 'Treinamentos', 'Identificar necessidades de treinamento, capacitacao, onboarding'),
  },
  {
    agent_key: 'rh_desempenho', name: 'Especialista em Desempenho', role: 'specialist', directorate: 'pessoas',
    specialization: 'Desempenho', avatar_emoji: '📈',
    description: 'Avalia desempenho, metas, KPIs individuais',
    data_access: ['Employee'],
    event_subscriptions: ['performance_review'],
    capabilities: ['analyze', 'recommend'],
    system_prompt: specialistPrompt('Especialista em Desempenho', 'Diretoria de Pessoas', 'Gestao de Desempenho', 'Avaliar desempenho, metas, KPIs individuais, produtividade'),
  },
  {
    agent_key: 'rh_motoboys', name: 'Especialista em Motoboys', role: 'specialist', directorate: 'pessoas',
    specialization: 'Motoboys', avatar_emoji: '🏍️',
    description: 'Gerencia motoboys, rotas, produtividade, comissoes',
    data_access: ['Courier'],
    event_subscriptions: ['delivery_completed', 'courier_hired'],
    capabilities: ['analyze', 'recommend'],
    system_prompt: specialistPrompt('Especialista em Motoboys', 'Diretoria de Pessoas', 'Gestao de Motoboys', 'Gerenciar motoboys, rotas, produtividade, comissoes, tempo de entrega'),
  },
  // ═══ DIRETORIA COMERCIAL ═══
  {
    agent_key: 'com_crm', name: 'Especialista em CRM', role: 'specialist', directorate: 'comercial',
    specialization: 'CRM', avatar_emoji: '🤝',
    description: 'Analisa base de clientes, segmentacao, comportamento',
    data_access: ['Customer', 'Sale'],
    event_subscriptions: ['customer_created', 'sale_completed'],
    capabilities: ['analyze', 'recommend'],
    system_prompt: specialistPrompt('Especialista em CRM', 'Diretoria Comercial', 'CRM', 'Analisar base de clientes, segmentacao, comportamento de compra, perfil'),
  },
  {
    agent_key: 'com_fidelizacao', name: 'Especialista em Fidelizacao', role: 'specialist', directorate: 'comercial',
    specialization: 'Fidelizacao', avatar_emoji: '💎',
    description: 'Programas de fidelidade, retencao, churn',
    data_access: ['Customer', 'Sale'],
    event_subscriptions: ['customer_created', 'sale_completed'],
    capabilities: ['analyze', 'recommend'],
    system_prompt: specialistPrompt('Especialista em Fidelizacao', 'Diretoria Comercial', 'Fidelizacao', 'Programas de fidelidade, retencao, churn, recorrencia de clientes'),
  },
  {
    agent_key: 'com_marketing', name: 'Especialista em Marketing', role: 'specialist', directorate: 'comercial',
    specialization: 'Marketing', avatar_emoji: '📢',
    description: 'Campanhas, ROI, canais, alcance',
    data_access: ['Sale', 'IFoodReceipt'],
    event_subscriptions: ['campaign_launched', 'sale_completed'],
    capabilities: ['analyze', 'recommend', 'simulate'],
    system_prompt: specialistPrompt('Especialista em Marketing', 'Diretoria Comercial', 'Marketing', 'Campanhas, ROI, canais, alcance, impacto de promocoes nas vendas'),
  },
  {
    agent_key: 'com_promocoes', name: 'Especialista em Promocoes', role: 'specialist', directorate: 'comercial',
    specialization: 'Promocoes', avatar_emoji: '🎉',
    description: 'Promocoes, descontos, impacto na margem e volume',
    data_access: ['Sale', 'IFoodReceipt'],
    event_subscriptions: ['campaign_launched', 'sale_completed'],
    capabilities: ['analyze', 'recommend', 'simulate'],
    system_prompt: specialistPrompt('Especialista em Promocoes', 'Diretoria Comercial', 'Promocoes', 'Promocoes, descontos, impacto na margem e volume de vendas, ROI de campanhas'),
  },
  {
    agent_key: 'com_delivery', name: 'Especialista em Delivery', role: 'specialist', directorate: 'comercial',
    specialization: 'Delivery', avatar_emoji: '🛵',
    description: 'Delivery, canais, iFood, taxas, tempo de entrega',
    data_access: ['Sale', 'IFoodReceipt', 'Courier'],
    event_subscriptions: ['sale_completed', 'ifood_received'],
    capabilities: ['analyze', 'recommend', 'alert'],
    system_prompt: specialistPrompt('Especialista em Delivery', 'Diretoria Comercial', 'Delivery', 'Delivery, canais, iFood, taxas, tempo de entrega, logistica'),
  },
  {
    agent_key: 'com_ticket_medio', name: 'Especialista em Ticket Medio', role: 'specialist', directorate: 'comercial',
    specialization: 'Ticket Medio', avatar_emoji: '🎫',
    description: 'Ticket medio, composicao, formas de aumento',
    data_access: ['Sale', 'IFoodReceipt'],
    event_subscriptions: ['sale_completed'],
    capabilities: ['analyze', 'recommend'],
    system_prompt: specialistPrompt('Especialista em Ticket Medio', 'Diretoria Comercial', 'Ticket Medio', 'Ticket medio, composicao, formas de aumento, upsell, cross-sell'),
  },
  {
    agent_key: 'com_recompra', name: 'Especialista em Recompra', role: 'specialist', directorate: 'comercial',
    specialization: 'Recompra', avatar_emoji: '🔁',
    description: 'Taxa de recompra, frequencia, ciclo de vida do cliente',
    data_access: ['Customer', 'Sale'],
    event_subscriptions: ['sale_completed'],
    capabilities: ['analyze', 'recommend'],
    system_prompt: specialistPrompt('Especialista em Recompra', 'Diretoria Comercial', 'Recompra', 'Taxa de recompra, frequencia, ciclo de vida do cliente, retencao'),
  },
  // ═══ DIRETORIA DE DADOS ═══
  {
    agent_key: 'data_bi', name: 'Especialista em BI', role: 'specialist', directorate: 'dados',
    specialization: 'BI', avatar_emoji: '📐',
    description: 'Business Intelligence, dashboards executivos, visao 360 graus',
    data_access: ['FinancialTransaction', 'Sale', 'Stock', 'ProductionRecord'],
    event_subscriptions: ['event_dispatched'],
    capabilities: ['analyze', 'recommend', 'forecast'],
    system_prompt: specialistPrompt('Especialista em BI', 'Diretoria de Dados', 'Business Intelligence', 'Business Intelligence, dashboards executivos, visao 360 graus do negocio'),
  },
  {
    agent_key: 'data_dashboards', name: 'Especialista em Dashboards', role: 'specialist', directorate: 'dados',
    specialization: 'Dashboards', avatar_emoji: '🖥️',
    description: 'Construcao e analise de dashboards, visualizacoes',
    data_access: ['FinancialTransaction', 'Sale', 'Stock', 'ProductionRecord'],
    event_subscriptions: ['event_dispatched'],
    capabilities: ['analyze', 'recommend'],
    system_prompt: specialistPrompt('Especialista em Dashboards', 'Diretoria de Dados', 'Dashboards', 'Construcao e analise de dashboards, visualizacoes, KPIs visuais'),
  },
  {
    agent_key: 'data_indicadores', name: 'Especialista em Indicadores', role: 'specialist', directorate: 'dados',
    specialization: 'Indicadores', avatar_emoji: '📐',
    description: 'KPIs, metas, benchmarking, indicadores de performance',
    data_access: ['FinancialTransaction', 'Sale', 'Stock', 'ProductionRecord', 'CMVRecord'],
    event_subscriptions: ['event_dispatched'],
    capabilities: ['analyze', 'recommend'],
    system_prompt: specialistPrompt('Especialista em Indicadores', 'Diretoria de Dados', 'Indicadores', 'KPIs, metas, benchmarking, indicadores de performance do negocio'),
  },
  {
    agent_key: 'data_forecast', name: 'Especialista em Forecast', role: 'specialist', directorate: 'dados',
    specialization: 'Forecast', avatar_emoji: '🔮',
    description: 'Previsoes, tendencias, sazonalidade, projecoes',
    data_access: ['FinancialTransaction', 'Sale', 'Stock'],
    event_subscriptions: ['event_dispatched'],
    capabilities: ['analyze', 'forecast'],
    system_prompt: specialistPrompt('Especialista em Forecast', 'Diretoria de Dados', 'Forecast', 'Previsoes, tendencias, sazonalidade, projecoes de vendas e fluxo de caixa'),
  },
  {
    agent_key: 'data_auditoria', name: 'Especialista em Auditoria', role: 'specialist', directorate: 'dados',
    specialization: 'Auditoria', avatar_emoji: '🔍',
    description: 'Auditoria de dados, consistencia, integridade',
    data_access: ['FinancialTransaction', 'Movement', 'Inventory'],
    event_subscriptions: ['data_quality_alert'],
    capabilities: ['analyze', 'alert'],
    system_prompt: specialistPrompt('Especialista em Auditoria', 'Diretoria de Dados', 'Auditoria', 'Auditoria de dados, consistencia, integridade, divergencias, duplicatas'),
  },
  {
    agent_key: 'data_riscos', name: 'Especialista em Riscos', role: 'specialist', directorate: 'dados',
    specialization: 'Riscos', avatar_emoji: '⚡',
    description: 'Gestao de riscos, matriz de risco, mitigacao',
    data_access: ['FinancialTransaction', 'Stock', 'Supplier'],
    event_subscriptions: ['risk_alert', 'stock_critical'],
    capabilities: ['analyze', 'recommend', 'alert'],
    system_prompt: specialistPrompt('Especialista em Riscos', 'Diretoria de Dados', 'Gestao de Riscos', 'Gestao de riscos, matriz de risco, mitigacao, riscos financeiros e operacionais'),
  },
];

// ═══ DATA GATHERING ═══
async function gatherDataForAgent(agent, base44) {
  if (!agent.data_access || agent.data_access.length === 0) return {};
  const results = await Promise.allSettled(
    agent.data_access.map(et => base44.asServiceRole.entities[et].filter({}, '-created_date', 10))
  );
  const data = {};
  agent.data_access.forEach((et, i) => {
    data[et] = results[i].status === 'fulfilled' ? results[i].value : [];
  });
  return data;
}

async function publishEventSafe(base44, eventType, module, entityType, entityId, payload, user) {
  try {
    await base44.asServiceRole.functions.invoke('eventBus', {
      action: 'publish', event_type: eventType, module, entity_type: entityType, entity_id: entityId,
      payload, user_name: user?.full_name, user_email: user?.email,
    });
  } catch (_) { /* EventBus indisponivel nao bloqueia o Brain */ }
}

// ═══ ORCHESTRATION ═══
async function runOrchestration(base44, user, question, conversationType) {
  const startTime = Date.now();
  const isSimulation = conversationType === 'simulation';

  // 1. Create conversation
  const conversation = await base44.asServiceRole.entities.AgentConversation.create({
    company_id: user.company_id || '',
    question,
    user_name: user.full_name,
    user_email: user.email,
    status: 'active',
    conversation_type: conversationType,
    is_council: false,
    user_feedback: 'pending',
    agents_consulted: [],
    specialist_responses: [],
    conflicts: [],
    data_used: [],
    tags: [conversationType],
  });

  try {
    // 2. CEO AI selects specialists
    const agentList = AGENTS.filter(a => a.role === 'specialist').map(a =>
      `${a.agent_key}: ${a.name} (${a.directorate}) - ${a.specialization}`
    ).join('\n');

    const selectionPrompt = isSimulation
      ? `Como CEO AI do Baron Brain, o usuario quer SIMULAR um cenario. Analise o cenario e selecione quais especialistas devem calcular o impacto.\n\nCenario: "${question}"\n\nEspecialistas disponiveis:\n${agentList}\n\nSelecione de 2 a 5 especialistas que podem calcular o impacto desta simulacao. Retorne apenas os agent_keys.`
      : `Como CEO AI do Baron Brain, analise a seguinte pergunta e selecione quais especialistas devem ser consultados.\n\nPergunta: "${question}"\n\nEspecialistas disponiveis:\n${agentList}\n\nSelecione de 1 a 5 especialistas mais relevantes. Retorne apenas os agent_keys.`;

    const selectionResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: selectionPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          agents: { type: "array", items: { type: "string" } },
          reasoning: { type: "string" }
        }
      }
    });

    let selectedAgentKeys = Array.isArray(selectionResponse?.agents) ? selectionResponse.agents : [];
    // Filter to valid keys, fallback to a default if empty
    selectedAgentKeys = selectedAgentKeys.filter(k => AGENTS.find(a => a.agent_key === k));
    if (selectedAgentKeys.length === 0) {
      selectedAgentKeys = ['data_bi', 'fin_fluxo_caixa'];
    }
    const selectedAgents = selectedAgentKeys.map(k => AGENTS.find(a => a.agent_key === k));

    // 3. Each specialist analyzes (in parallel)
    const specialistPromises = selectedAgents.map(async (agent, idx) => {
      const sStart = Date.now();
      const data = await gatherDataForAgent(agent, base44);
      const dataStr = JSON.stringify(data).substring(0, 3000);

      const specialistPromptText = isSimulation
        ? `${agent.system_prompt}\n\nCENARIO DE SIMULACAO: ${question}\n\nDados disponiveis:\n${dataStr}\n\nCalcule o impacto desta simulacao na sua area. Analise:`
        : `${agent.system_prompt}\n\nPergunta: ${question}\n\nDados disponiveis:\n${dataStr}\n\nAnalise e responda:`;

      const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: specialistPromptText,
        response_json_schema: {
          type: "object",
          properties: {
            analysis: { type: "string" },
            confidence_level: { type: "string", enum: ["alta", "media", "baixa"] },
            confidence_reason: { type: "string" },
            data_used: { type: "array", items: { type: "string" } },
            recommendation: { type: "string" }
          }
        }
      });

      const responseTime = Date.now() - sStart;

      // Create agent message
      await base44.asServiceRole.entities.AgentMessage.create({
        conversation_id: conversation.id,
        agent_key: agent.agent_key,
        agent_name: agent.name,
        directorate: agent.directorate,
        role: 'specialist',
        content: response?.analysis || 'Sem resposta',
        confidence_level: response?.confidence_level || 'media',
        data_used: response?.data_used || [],
        response_time_ms: responseTime,
        position: idx,
        avatar_emoji: agent.avatar_emoji,
      });

      return {
        agent_key: agent.agent_key,
        agent_name: agent.name,
        directorate: agent.directorate,
        avatar_emoji: agent.avatar_emoji,
        content: response?.analysis || 'Sem resposta',
        confidence_level: response?.confidence_level || 'media',
        confidence_reason: response?.confidence_reason || '',
        data_used: response?.data_used || [],
        recommendation: response?.recommendation || '',
        response_time_ms: responseTime,
      };
    });

    const specialistResponses = await Promise.all(specialistPromises);

    // 4. CEO AI consolidates
    const consolidationInput = specialistResponses.map(r =>
      `${r.agent_name} (${r.directorate}, confianca: ${r.confidence_level}):\n${r.content}\nRecomendacao: ${r.recommendation || 'N/A'}`
    ).join('\n\n---\n\n');

    const consolidationPrompt = isSimulation
      ? `Como CEO AI, consolide as analises dos especialistas sobre este cenario de simulacao.\n\nCenario original: ${question}\n\nAnalises dos especialistas:\n${consolidationInput}\n\nConsolide tudo em uma resposta unica. Identifique conflitos entre especialistas. Calcule o impacto total. Forneça um nivel de confianca geral e o motivo. Apresente argumentos favoraveis, contrarios, riscos e impacto financeiro.`
      : `Como CEO AI, consolide as seguintes respostas dos especialistas em uma unica resposta coerente.\n\nPergunta original: ${question}\n\nRespostas dos especialistas:\n${consolidationInput}\n\nConsolide tudo em uma resposta. Identifique conflitos entre especialistas. Forneça um nivel de confianca geral e o motivo. Se houver conflitos, apresente argumentos favoraveis, contrarios, riscos e impacto financeiro.`;

    const consolidationResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: consolidationPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          consolidated_answer: { type: "string" },
          confidence_level: { type: "string", enum: ["alta", "media", "baixa"] },
          confidence_reason: { type: "string" },
          conflicts: { type: "array", items: { type: "object", properties: {
            topic: { type: "string" },
            position_a: { type: "string" },
            agent_a: { type: "string" },
            position_b: { type: "string" },
            agent_b: { type: "string" },
            recommendation: { type: "string" }
          } } }
        }
      }
    });

    const totalTime = Date.now() - startTime;

    // 5. Update conversation
    await base44.asServiceRole.entities.AgentConversation.update(conversation.id, {
      status: 'completed',
      is_council: selectedAgents.length > 1,
      agents_consulted: selectedAgents.map(a => ({
        agent_key: a.agent_key, agent_name: a.name, directorate: a.directorate, avatar_emoji: a.avatar_emoji,
      })),
      specialist_responses: specialistResponses,
      consolidated_response: consolidationResponse?.consolidated_answer || 'Sem consolidacao',
      confidence_level: consolidationResponse?.confidence_level || 'media',
      confidence_reason: consolidationResponse?.confidence_reason || '',
      conflicts: consolidationResponse?.conflicts || [],
      data_used: specialistResponses.map(r => ({
        agent_key: r.agent_key, entity_types: r.data_used, record_count: r.data_used.length,
      })),
      total_response_time_ms: totalTime,
    });

    // 6. Update agent activity
    for (const agent of selectedAgents) {
      try {
        const existing = await base44.asServiceRole.entities.Agent.filter({ agent_key: agent.agent_key }, '-created_date', 1);
        if (existing.length > 0) {
          await base44.asServiceRole.entities.Agent.update(existing[0].id, {
            last_active_at: new Date().toISOString(),
            conversations_count: (existing[0].conversations_count || 0) + 1,
          });
        }
      } catch (_) {}
    }

    // 7. Publish event
    await publishEventSafe(base44, isSimulation ? 'brain_simulation_completed' : 'brain_question_answered', 'ia',
      'AgentConversation', conversation.id, {
        question, agents_count: selectedAgents.length,
        confidence: consolidationResponse?.confidence_level || 'media',
        response_time_ms: totalTime,
      }, user);

    return {
      conversation_id: conversation.id,
      question,
      is_council: selectedAgents.length > 1,
      conversation_type: conversationType,
      agents_consulted: selectedAgents.map(a => ({
        agent_key: a.agent_key, agent_name: a.name, directorate: a.directorate, avatar_emoji: a.avatar_emoji,
      })),
      specialist_responses: specialistResponses,
      consolidated_response: consolidationResponse?.consolidated_answer || 'Sem consolidacao',
      confidence_level: consolidationResponse?.confidence_level || 'media',
      confidence_reason: consolidationResponse?.confidence_reason || '',
      conflicts: consolidationResponse?.conflicts || [],
      total_response_time_ms: totalTime,
    };
  } catch (error) {
    await base44.asServiceRole.entities.AgentConversation.update(conversation.id, {
      status: 'failed',
    });
    throw error;
  }
}

// ═══ MAIN HANDLER ═══
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    switch (action) {
      case 'seedAgents': {
        const existing = await base44.asServiceRole.entities.Agent.filter({}, 'directorate', 100);
        const existingKeys = new Set(existing.map(a => a.agent_key));
        let created = 0;
        for (const agent of AGENTS) {
          if (!existingKeys.has(agent.agent_key)) {
            await base44.asServiceRole.entities.Agent.create({
              ...agent, company_id: '', active: true, conversations_count: 0, memory_count: 0,
            });
            created++;
          }
        }
        return Response.json({ total_agents: AGENTS.length, created, existing: existing.length });
      }

      case 'ask': {
        const { question } = body;
        if (!question?.trim()) return Response.json({ error: 'Pergunta obrigatoria' }, { status: 400 });
        const result = await runOrchestration(base44, user, question, 'question');
        return Response.json(result);
      }

      case 'simulate': {
        const { scenario } = body;
        if (!scenario?.trim()) return Response.json({ error: 'Cenario obrigatorio' }, { status: 400 });
        const result = await runOrchestration(base44, user, scenario, 'simulation');
        return Response.json(result);
      }

      case 'getDashboard': {
        const [agents, conversations, alerts, learnings, memory] = await Promise.all([
          base44.asServiceRole.entities.Agent.filter({ active: true }, 'directorate', 100),
          base44.asServiceRole.entities.AgentConversation.filter({}, '-created_date', 10),
          base44.asServiceRole.entities.AgentAlert.filter({ status: 'active' }, '-created_date', 20),
          base44.asServiceRole.entities.AgentLearning.filter({}, '-created_date', 10),
          base44.asServiceRole.entities.AgentMemory.filter({ is_valid: true }, '-created_date', 10),
        ]);

        const byDirectorate = {};
        agents.forEach(a => {
          if (!byDirectorate[a.directorate]) byDirectorate[a.directorate] = [];
          byDirectorate[a.directorate].push(a);
        });

        const totalFeedback = conversations.filter(c => c.user_feedback !== 'pending').length;
        const positiveFeedback = conversations.filter(c => c.user_feedback === 'positive').length;
        const feedbackRate = totalFeedback > 0 ? Math.round((positiveFeedback / totalFeedback) * 100) : 0;

        const confidenceDist = { alta: 0, media: 0, baixa: 0 };
        conversations.forEach(c => { if (c.confidence_level) confidenceDist[c.confidence_level]++; });

        return Response.json({
          metrics: {
            total_agents: AGENTS.length,
            active_agents: agents.length,
            total_conversations: conversations.length,
            active_alerts: alerts.length,
            critical_alerts: alerts.filter(a => a.severity === 'critica').length,
            total_learnings: learnings.length,
            total_memories: memory.length,
            positive_feedback_rate: feedbackRate,
            avg_response_time: conversations.length > 0
              ? Math.round(conversations.reduce((s, c) => s + (c.total_response_time_ms || 0), 0) / conversations.length)
              : 0,
            confidence_distribution: confidenceDist,
          },
          agents_by_directorate: byDirectorate,
          recent_conversations: conversations,
          active_alerts: alerts,
          recent_learnings: learnings,
          recent_memory: memory,
        });
      }

      case 'listAgents': {
        const items = await base44.asServiceRole.entities.Agent.filter({}, 'directorate', 100);
        const grouped = {};
        items.forEach(a => {
          if (!grouped[a.directorate]) grouped[a.directorate] = [];
          grouped[a.directorate].push(a);
        });
        return Response.json({ items, grouped });
      }

      case 'listConversations': {
        const items = await base44.asServiceRole.entities.AgentConversation.filter({}, '-created_date', 50);
        return Response.json({ items });
      }

      case 'getConversation': {
        const { id } = body;
        const conv = await base44.asServiceRole.entities.AgentConversation.get(id);
        if (!conv) return Response.json({ error: 'Not found' }, { status: 404 });
        return Response.json({ item: conv });
      }

      case 'listAlerts': {
        const items = await base44.asServiceRole.entities.AgentAlert.filter({}, '-created_date', 50);
        return Response.json({ items });
      }

      case 'generateAlerts': {
        const [transactions, stocks, products] = await Promise.all([
          base44.asServiceRole.entities.FinancialTransaction.filter({ status: 'pendente' }, '-due_date', 20),
          base44.asServiceRole.entities.Stock.filter({}, '-created_date', 20),
          base44.asServiceRole.entities.Product.filter({}, '-created_date', 20),
        ]);

        const alertResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Analise os seguintes dados da empresa Don Baron e identifique alertas proativos.\n\nDados financeiros (pendentes):\n${JSON.stringify(transactions).substring(0, 1500)}\n\nDados de estoque:\n${JSON.stringify(stocks).substring(0, 1500)}\n\nDados de produtos:\n${JSON.stringify(products).substring(0, 1500)}\n\nIdentifique problemas como: estoque critico, fluxo de caixa negativo, aumento de precos, produtos parados, etc. Para cada alerta, indique qual especialista do Baron Brain deveria ser responsavel.`,
          response_json_schema: {
            type: "object",
            properties: {
              alerts: { type: "array", items: { type: "object", properties: {
                agent_key: { type: "string" },
                alert_type: { type: "string" },
                severity: { type: "string" },
                title: { type: "string" },
                message: { type: "string" },
                action_suggested: { type: "string" }
              } } }
            }
          }
        });

        const created = [];
        for (const alert of (alertResponse?.alerts || [])) {
          const agent = AGENTS.find(a => a.agent_key === alert.agent_key) || AGENTS.find(a => a.role === 'ceo');
          const item = await base44.asServiceRole.entities.AgentAlert.create({
            agent_key: agent.agent_key, agent_name: agent.name, directorate: agent.directorate,
            alert_type: alert.alert_type || 'risk', severity: alert.severity || 'media',
            title: alert.title || 'Alerta', message: alert.message || '',
            action_suggested: alert.action_suggested || '', status: 'active',
          });
          created.push(item);
        }

        await publishEventSafe(base44, 'brain_alerts_generated', 'ia', 'AgentAlert', 'batch', {
          count: created.length,
        }, user);

        return Response.json({ created: created.length, alerts: created });
      }

      case 'acknowledgeAlert': {
        const { id, status } = body;
        const item = await base44.asServiceRole.entities.AgentAlert.update(id, {
          status: status || 'acknowledged',
          acknowledged_by: user.full_name,
          acknowledged_at: new Date().toISOString(),
        });
        return Response.json({ item });
      }

      case 'listLearnings': {
        const items = await base44.asServiceRole.entities.AgentLearning.filter({}, '-created_date', 50);
        return Response.json({ items });
      }

      case 'listMemory': {
        const { agent_key } = body;
        const filter = agent_key ? { agent_key, is_valid: true } : { is_valid: true };
        const items = await base44.asServiceRole.entities.AgentMemory.filter(filter, '-created_date', 50);
        return Response.json({ items });
      }

      case 'provideFeedback': {
        const { conversation_id, feedback, comment } = body;
        const conv = await base44.asServiceRole.entities.AgentConversation.update(conversation_id, {
          user_feedback: feedback,
          feedback_comment: comment || '',
        });

        if (feedback === 'negative' || feedback === 'positive') {
          await base44.asServiceRole.entities.AgentLearning.create({
            conversation_id,
            decision: conv.question,
            predicted_outcome: conv.consolidated_response?.substring(0, 500) || '',
            actual_outcome: feedback === 'positive' ? 'Recomendacao util para o usuario' : 'Recomendacao nao foi util',
            learned_lesson: comment || `Feedback ${feedback} do usuario`,
            feedback_positive: feedback === 'positive',
            status: 'resolved',
            resolved_at: new Date().toISOString(),
          });
        }

        return Response.json({ item: conv });
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});