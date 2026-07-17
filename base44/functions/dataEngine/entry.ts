import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================
// DATA ENGINE — Don Baron OS
// Camada unica de dados. Fonte unica de verdade.
// Todo modulo consome dados exclusivamente atraves deste ponto.
// ============================================================

// ---------- DATASET CONFIG ----------
// Cada dataset mapeia para uma entidade e define como carregar
// e relacionar os dados.
const DATASETS = {
  produtos: { entity: 'Product', relations: ['Supplier'] },
  fornecedores: { entity: 'Supplier', relations: [] },
  compras: { entity: 'Purchase', relations: ['Supplier'] },
  documentos: { entity: 'DBDocument', relations: ['Supplier'] },
  financeiro: { entity: 'FinancialTransaction', relations: ['Supplier'] },
  estoque: { entity: 'Product', relations: ['Supplier'] },
  producao: { entity: 'ProductionRecord', relations: ['Product'] },
  precos: { entity: 'PriceHistory', relations: ['Product', 'Supplier'] },
  eventos: { entity: 'SystemEvent', relations: [] },
  notificacoes: { entity: 'Notification', relations: [] },
  tarefas: { entity: 'SystemTask', relations: [] },
  usuarios: { entity: 'User', relations: [] },
  auditoria: { entity: 'AuditLog', relations: [] },
  logs_tecnicos: { entity: 'TechLog', relations: [] },
  arquivos: { entity: 'FileRecord', relations: [] },
};

// ---------- CALCULATIONS ----------
// Registro de calculos disponiveis no motor.
const CALCULATIONS = {
  cmv: {
    description: 'Custo da Mercadoria Vendida',
    requires: ['Purchase', 'ProductionRecord', 'Product'],
  },
  lucro: {
    description: 'Lucro (Receita - Despesa)',
    requires: ['FinancialTransaction'],
  },
  margem: {
    description: 'Margem de Lucro (%)',
    requires: ['FinancialTransaction'],
  },
  fluxo_caixa: {
    description: 'Fluxo de Caixa Projetado',
    requires: ['FinancialTransaction'],
  },
  ticket_medio: {
    description: 'Ticket Medio de Vendas',
    requires: ['FinancialTransaction', 'DBDocument'],
  },
  estoque_valor: {
    description: 'Valor Total do Estoque',
    requires: ['Product'],
  },
  estoque_critico: {
    description: 'Produtos Abaixo do Estoque Minimo',
    requires: ['Product'],
  },
  indicadores: {
    description: 'Indicadores Consolidados',
    requires: ['FinancialTransaction', 'Product', 'Purchase', 'ProductionRecord'],
  },
};

// ---------- HELPER: GET USER ROLE ----------
function getUserRole(user) {
  if (user.department) return user.department;
  if (user.role === 'admin') return 'administrador';
  return 'operador';
}

// ---------- HELPER: FORMAT DATE ----------
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// HANDLERS
// ============================================================

// ---------- GET DATASET ----------
// Retorna os dados de um dataset com relacionamentos resolvidos.
async function handleGetDataset(base44, body) {
  const { dataset, limit, include_relations } = body;
  const config = DATASETS[dataset];
  if (!config) {
    return Response.json({ error: 'Unknown dataset: ' + dataset, available: Object.keys(DATASETS) }, { status: 400 });
  }

  const maxRecords = limit || 200;
  const records = await base44.asServiceRole.entities[config.entity].list('-created_date', maxRecords);

  // Resolve relacionamentos (apenas se solicitado)
  let relatedData = {};
  if (include_relations !== false && config.relations.length > 0) {
    for (const relEntity of config.relations) {
      try {
        relatedData[relEntity] = await base44.asServiceRole.entities[relEntity].list('-created_date', 100);
      } catch (e) {
        relatedData[relEntity] = [];
      }
    }
  }

  return Response.json({
    dataset,
    entity: config.entity,
    record_count: records.length,
    records,
    relations: relatedData,
  });
}

// ---------- LIST DATASETS ----------
async function handleListDatasets() {
  const list = Object.entries(DATASETS).map(function ([key, config]) {
    return { name: key, entity: config.entity, relations: config.relations };
  });
  return Response.json({ datasets: list, count: list.length });
}

// ---------- CALCULATE ----------
// Motor de calculo unico. Nenhum modulo implementa calculos proprios.
async function handleCalculate(base44, body) {
  const { calculation, start_date, end_date } = body;
  const calcConfig = CALCULATIONS[calculation];
  if (!calcConfig) {
    return Response.json({ error: 'Unknown calculation: ' + calculation, available: Object.keys(CALCULATIONS) }, { status: 400 });
  }

  const startDate = start_date || dateDaysAgo(30);
  const endDate = end_date || todayStr();

  let result = {};

  switch (calculation) {
    case 'cmv': {
      result = await calcCMV(base44, startDate, endDate);
      break;
    }
    case 'lucro': {
      result = await calcLucro(base44, startDate, endDate);
      break;
    }
    case 'margem': {
      result = await calcMargem(base44, startDate, endDate);
      break;
    }
    case 'fluxo_caixa': {
      result = await calcFluxoCaixa(base44, startDate, endDate);
      break;
    }
    case 'ticket_medio': {
      result = await calcTicketMedio(base44, startDate, endDate);
      break;
    }
    case 'estoque_valor': {
      result = await calcEstoqueValor(base44);
      break;
    }
    case 'estoque_critico': {
      result = await calcEstoqueCritico(base44);
      break;
    }
    case 'indicadores': {
      result = await calcIndicadores(base44, startDate, endDate);
      break;
    }
    default:
      return Response.json({ error: 'Calculation not implemented: ' + calculation }, { status: 501 });
  }

  return Response.json({
    calculation,
    description: calcConfig.description,
    period: { start_date: startDate, end_date: endDate },
    result,
    calculated_at: new Date().toISOString(),
  });
}

// ---------- CALCULATION IMPLEMENTATIONS ----------

async function calcCMV(base44, startDate, endDate) {
  // CMV real: soma o custo das ENTRADAS de estoque no periodo, a partir de
  // Movement — essa é a fonte que Baron, nota fiscal e cadastro de produto
  // realmente alimentam. Antes somava só Purchase (pedido de compra formal),
  // que fica vazio quando a entrada vem de nota fiscal/Baron/cadastro direto.
  const movements = await base44.asServiceRole.entities.Movement.filter({ deleted_at: null });
  const purchases = await base44.asServiceRole.entities.Purchase.filter({});
  const production = await base44.asServiceRole.entities.ProductionRecord.filter({});

  const periodMovements = movements.filter(function (m) {
    const d = (m.movement_date || "").slice(0, 10);
    return d && d >= startDate && d <= endDate && (m.movement_type === "entrada" || m.movement_type === "producao");
  });
  const periodPurchases = purchases.filter(function (p) {
    return p.order_date && p.order_date >= startDate && p.order_date <= endDate;
  });
  const periodProduction = production.filter(function (p) {
    return p.production_date && p.production_date >= startDate && p.production_date <= endDate;
  });

  const totalMovements = periodMovements.reduce(function (s, m) { return s + (m.total_cost || 0); }, 0);
  const totalCompras = periodPurchases.reduce(function (s, p) { return s + (p.total_amount || 0); }, 0);
  const totalProducao = periodProduction.reduce(function (s, p) { return s + (p.quantity || 0); }, 0);

  return {
    total_compras: totalCompras,
    total_movimentacoes: totalMovements,
    total_producao_unidades: totalProducao,
    cmv_estimado: totalMovements > 0 ? totalMovements : totalCompras,
    detalhe: {
      compras_no_periodo: periodPurchases.length,
      movimentacoes_no_periodo: periodMovements.length,
      producoes_no_periodo: periodProduction.length,
    },
  };
}

async function calcLucro(base44, startDate, endDate) {
  const transactions = await base44.asServiceRole.entities.FinancialTransaction.filter({});

  const inPeriod = transactions.filter(function (t) {
    if (!t.due_date) return false;
    return t.due_date >= startDate && t.due_date <= endDate;
  });

  const receita = inPeriod.filter(function (t) { return t.type === 'a_receber'; })
    .reduce(function (s, t) { return s + (t.amount || 0); }, 0);
  const despesa = inPeriod.filter(function (t) { return t.type === 'a_pagar'; })
    .reduce(function (s, t) { return s + (t.amount || 0); }, 0);

  return {
    receita: receita,
    despesa: despesa,
    lucro: receita - despesa,
    lancamentos: inPeriod.length,
  };
}

async function calcMargem(base44, startDate, endDate) {
  const lucroData = await calcLucro(base44, startDate, endDate);
  const margem = lucroData.receita > 0 ? (lucroData.lucro / lucroData.receita) * 100 : 0;

  return {
    receita: lucroData.receita,
    despesa: lucroData.despesa,
    lucro: lucroData.lucro,
    margem_percentual: Number(margem.toFixed(2)),
  };
}

async function calcFluxoCaixa(base44, startDate, endDate) {
  const transactions = await base44.asServiceRole.entities.FinancialTransaction.filter({});

  const inPeriod = transactions.filter(function (t) {
    if (!t.due_date) return false;
    return t.due_date >= startDate && t.due_date <= endDate;
  });

  const aPagar = inPeriod.filter(function (t) { return t.type === 'a_pagar'; });
  const aReceber = inPeriod.filter(function (t) { return t.type === 'a_receber'; });

  const totalPagar = aPagar.reduce(function (s, t) { return s + (t.amount || 0); }, 0);
  const totalReceber = aReceber.reduce(function (s, t) { return s + (t.amount || 0); }, 0);

  const pendentePagar = aPagar.filter(function (t) { return t.status === 'pendente' || t.status === 'vencido'; })
    .reduce(function (s, t) { return s + (t.amount || 0); }, 0);
  const pendenteReceber = aReceber.filter(function (t) { return t.status === 'pendente' || t.status === 'vencido'; })
    .reduce(function (s, t) { return s + (t.amount || 0); }, 0);

  return {
    total_a_pagar: totalPagar,
    total_a_receber: totalReceber,
    saldo_projetado: totalReceber - totalPagar,
    pendente_a_pagar: pendentePagar,
    pendente_a_receber: pendenteReceber,
    saldo_pendente: pendenteReceber - pendentePagar,
  };
}

async function calcTicketMedio(base44, startDate, endDate) {
  const transactions = await base44.asServiceRole.entities.FinancialTransaction.filter({ type: 'a_receber' });
  const iFoodDocs = await base44.asServiceRole.entities.DBDocument.filter({ category: 'relatorio_ifood' });

  const periodTx = transactions.filter(function (t) {
    if (!t.due_date) return false;
    return t.due_date >= startDate && t.due_date <= endDate;
  });

  const totalReceita = periodTx.reduce(function (s, t) { return s + (t.amount || 0); }, 0);

  // Tenta obter numero de pedidos dos relatorios iFood
  let totalPedidos = 0;
  const iFoodPeriod = iFoodDocs.filter(function (d) {
    if (!d.period_end) return false;
    return d.period_end >= startDate && d.period_end <= endDate;
  });
  for (const doc of iFoodPeriod) {
    totalPedidos += doc.order_count || 0;
  }

  const ticketMedio = totalPedidos > 0 ? totalReceita / totalPedidos : (periodTx.length > 0 ? totalReceita / periodTx.length : 0);

  return {
    receita: totalReceita,
    numero_pedidos: totalPedidos,
    numero_lancamentos: periodTx.length,
    ticket_medio: Number(ticketMedio.toFixed(2)),
  };
}

async function calcEstoqueValor(base44) {
  const products = await base44.asServiceRole.entities.Product.list('-created_date', 500);

  const valorTotal = products.reduce(function (s, p) {
    return s + ((p.stock_quantity || 0) * (p.cost_price || 0));
  }, 0);

  const totalItens = products.reduce(function (s, p) { return s + (p.stock_quantity || 0); }, 0);

  return {
    valor_total_estoque: valorTotal,
    total_itens: totalItens,
    total_produtos: products.length,
  };
}

async function calcEstoqueCritico(base44) {
  const products = await base44.asServiceRole.entities.Product.list('-created_date', 500);

  const criticos = products.filter(function (p) {
    return (p.stock_quantity || 0) <= (p.min_quantity || 0);
  });

  return {
    produtos_criticos: criticos.length,
    total_produtos: products.length,
    produtos: criticos.map(function (p) {
      return {
        id: p.id,
        name: p.name,
        stock_quantity: p.stock_quantity || 0,
        min_quantity: p.min_quantity || 0,
        supplier: p.primary_supplier_name || '',
      };
    }),
  };
}

async function calcIndicadores(base44, startDate, endDate) {
  const [lucro, margem, fluxo, cmv, estoqueValor, estoqueCritico, ticket] = await Promise.all([
    calcLucro(base44, startDate, endDate),
    calcMargem(base44, startDate, endDate),
    calcFluxoCaixa(base44, startDate, endDate),
    calcCMV(base44, startDate, endDate),
    calcEstoqueValor(base44),
    calcEstoqueCritico(base44),
    calcTicketMedio(base44, startDate, endDate),
  ]);

  return {
    financeiro: {
      receita: lucro.receita,
      despesa: lucro.despesa,
      lucro: lucro.lucro,
      margem: margem.margem_percentual,
      fluxo_caixa: fluxo.saldo_projetado,
    },
    compras: {
      cmv: cmv.cmv_estimado,
      compras_periodo: cmv.detalhe.compras_no_periodo,
    },
    estoque: {
      valor_total: estoqueValor.valor_total_estoque,
      total_itens: estoqueValor.total_itens,
      produtos_criticos: estoqueCritico.produtos_criticos,
    },
    vendas: {
      ticket_medio: ticket.ticket_medio,
      numero_pedidos: ticket.numero_pedidos,
    },
  };
}

// ---------- SNAPSHOT ----------
async function handleCreateSnapshot(base44, user, body) {
  const { dataset, period_type, period_date, triggered_by } = body;
  const config = DATASETS[dataset];
  if (!config) {
    return Response.json({ error: 'Unknown dataset: ' + dataset }, { status: 400 });
  }

  const date = period_date || todayStr();
  const pType = period_type || 'daily';

  // Carrega dados do dataset
  const records = await base44.asServiceRole.entities[config.entity].list('-created_date', 500);

  // Calcula metricas resumidas
  const metrics = {
    record_count: records.length,
    sum_fields: {},
  };

  // Soma campos numericos principais
  const numericFields = ['amount', 'total_amount', 'value', 'stock_quantity', 'cost_price', 'quantity', 'gross_sales', 'net_sales'];
  for (const field of numericFields) {
    const sum = records.reduce(function (s, r) { return s + (typeof r[field] === 'number' ? r[field] : 0); }, 0);
    if (sum > 0) metrics.sum_fields[field] = Number(sum.toFixed(2));
  }

  const snapshot = await base44.asServiceRole.entities.DataSnapshot.create({
    dataset,
    period_type: pType,
    period_date: date,
    data: { sample: records.slice(0, 10), count: records.length },
    metrics,
    record_count: records.length,
    calculated_at: new Date().toISOString(),
    triggered_by: triggered_by || 'manual',
  });

  return Response.json({ success: true, snapshot_id: snapshot.id });
}

async function handleGetSnapshot(base44, body) {
  const { dataset, period_type, period_date } = body;

  let filter = {};
  if (dataset) filter.dataset = dataset;
  if (period_type) filter.period_type = period_type;
  if (period_date) filter.period_date = period_date;

  const snapshots = await base44.asServiceRole.entities.DataSnapshot.filter(filter);
  return Response.json({ snapshots, count: snapshots.length });
}

// ---------- TIMELINE ----------
async function handleGetTimeline(base44, body) {
  const { limit, module, start_date, end_date } = body;
  let entries = await base44.asServiceRole.entities.TimelineEntry.list('-event_date', limit || 50);

  if (module) {
    entries = entries.filter(function (e) { return e.module === module; });
  }
  if (start_date) {
    entries = entries.filter(function (e) {
      return e.event_date && e.event_date >= start_date;
    });
  }
  if (end_date) {
    entries = entries.filter(function (e) {
      return e.event_date && e.event_date <= end_date + 'T23:59:59';
    });
  }

  return Response.json({ timeline: entries, count: entries.length });
}

async function handleAddTimelineEntry(base44, user, body) {
  const { title, description, event_type, module, entity_type, entity_id, relationships, severity, origin, event_date } = body;
  if (!title) {
    return Response.json({ error: 'title is required' }, { status: 400 });
  }

  const entry = await base44.asServiceRole.entities.TimelineEntry.create({
    title,
    description: description || '',
    event_date: event_date || new Date().toISOString(),
    origin: origin || 'backend',
    responsible_name: user.full_name || 'Sistema',
    module: module || '',
    entity_type: entity_type || '',
    entity_id: entity_id || '',
    relationships: relationships || [],
    event_type: event_type || '',
    severity: severity || 'info',
  });

  return Response.json({ success: true, timeline_id: entry.id });
}

// ---------- DATA QUALITY ----------
async function handleCheckDataQuality(base44, body) {
  const { entity_type, auto_create_alerts } = body;
  const issues = [];

  // Entidades para verificar
  const entitiesToCheck = entity_type ? [entity_type] : ['Product', 'Supplier', 'FinancialTransaction', 'Purchase'];

  for (const entityType of entitiesToCheck) {
    try {
      const records = await base44.asServiceRole.entities[entityType].list('-created_date', 200);

      // 1. Duplicidade por nome
      const nameCount = {};
      for (const r of records) {
        const name = r.name || r.supplier || r.description || r.title;
        if (!name) continue;
        if (!nameCount[name]) nameCount[name] = [];
        nameCount[name].push(r.id);
      }
      for (const [name, ids] of Object.entries(nameCount)) {
        if (ids.length > 1) {
          issues.push({
            issue_type: 'duplicate',
            entity_type: entityType,
            field: 'name',
            message: 'Registro duplicado: "' + name + '" (' + ids.length + ' ocorrencias)',
            severity: 'high',
            entity_ids: ids,
          });
        }
      }

      // 2. Valores negativos
      const numericFields = ['amount', 'total_amount', 'value', 'stock_quantity', 'cost_price', 'quantity'];
      for (const r of records) {
        for (const field of numericFields) {
          if (typeof r[field] === 'number' && r[field] < 0) {
            issues.push({
              issue_type: 'negative_value',
              entity_type: entityType,
              entity_id: r.id,
              field: field,
              message: 'Valor negativo em ' + field + ': ' + r[field],
              severity: 'medium',
            });
          }
        }
      }

      // 3. Campos obrigatorios vazios
      for (const r of records) {
        if (entityType === 'Product' && !r.name) {
          issues.push({ issue_type: 'missing_required', entity_type: entityType, entity_id: r.id, field: 'name', message: 'Produto sem nome', severity: 'high' });
        }
        if (entityType === 'Supplier' && !r.name) {
          issues.push({ issue_type: 'missing_required', entity_type: entityType, entity_id: r.id, field: 'name', message: 'Fornecedor sem nome', severity: 'high' });
        }
        if (entityType === 'FinancialTransaction' && (!r.description || !r.amount)) {
          issues.push({ issue_type: 'missing_required', entity_type: entityType, entity_id: r.id, field: 'description/amount', message: 'Lancamento financeiro incompleto', severity: 'medium' });
        }
      }
    } catch (e) {
      // Entidade pode nao existir — pular
    }
  }

  // Criar alertas automaticamente se solicitado
  if (auto_create_alerts) {
    for (const issue of issues) {
      await base44.asServiceRole.entities.DataQualityAlert.create({
        severity: issue.severity || 'medium',
        issue_type: issue.issue_type,
        entity_type: issue.entity_type,
        entity_id: issue.entity_id || '',
        field: issue.field || '',
        message: issue.message,
        status: 'open',
        detected_at: new Date().toISOString(),
      });
    }
  }

  return Response.json({
    issues,
    issue_count: issues.length,
    entities_checked: entitiesToCheck.length,
    checked_at: new Date().toISOString(),
  });
}

async function handleGetQualityAlerts(base44, body) {
  const { status } = body;
  let alerts = await base44.asServiceRole.entities.DataQualityAlert.list('-created_date', 100);
  if (status) {
    alerts = alerts.filter(function (a) { return a.status === status; });
  }
  return Response.json({ alerts, count: alerts.length });
}

async function handleResolveAlert(base44, user, body) {
  const { alert_id } = body;
  if (!alert_id) {
    return Response.json({ error: 'alert_id is required' }, { status: 400 });
  }
  await base44.asServiceRole.entities.DataQualityAlert.update(alert_id, {
    status: 'resolved',
    resolved_at: new Date().toISOString(),
    resolved_by: user.full_name || 'Sistema',
  });
  return Response.json({ success: true });
}

// ---------- EXPORT ----------
async function handleExportDataset(base44, body) {
  const { dataset, format } = body;
  const config = DATASETS[dataset];
  if (!config) {
    return Response.json({ error: 'Unknown dataset: ' + dataset }, { status: 400 });
  }

  const records = await base44.asServiceRole.entities[config.entity].list('-created_date', 500);
  const fmt = format || 'csv';

  if (fmt === 'csv') {
    if (records.length === 0) {
      return Response.json({ format: 'csv', dataset, data: '' });
    }
    const headers = Object.keys(records[0]).filter(function (k) {
      return !['_id'].includes(k);
    });
    const escape = function (v) {
      if (v === null || v === undefined) return '""';
      if (typeof v === 'object') return '"' + JSON.stringify(v).replace(/"/g, '""') + '"';
      return '"' + String(v).replace(/"/g, '""') + '"';
    };
    const csv = [headers.join(',')].concat(
      records.map(function (r) {
        return headers.map(function (h) { return escape(r[h]); }).join(',');
      })
    ).join('\n');
    return Response.json({ format: 'csv', dataset, record_count: records.length, data: csv });
  }

  // JSON (default fallback / API format)
  return Response.json({
    format: 'json',
    dataset,
    entity: config.entity,
    record_count: records.length,
    records,
    exported_at: new Date().toISOString(),
  });
}

// ---------- LIST CALCULATIONS ----------
async function handleListCalculations() {
  const list = Object.entries(CALCULATIONS).map(function ([key, config]) {
    return { name: key, description: config.description, requires: config.requires };
  });
  return Response.json({ calculations: list, count: list.length });
}

// ---------- CACHE INFO ----------
async function handleGetCacheInfo(base44) {
  // Estrutura preparada para cache. Por enquanto retorna informacao.
  const snapshots = await base44.asServiceRole.entities.DataSnapshot.list('-created_date', 10);
  return Response.json({
    cache_ready: true,
    cached_snapshots: snapshots.length,
    message: 'Estrutura de cache preparada. Snapshots servem como cache de datasets.',
    latest_snapshots: snapshots.map(function (s) {
      return { dataset: s.dataset, period_type: s.period_type, period_date: s.period_date, record_count: s.record_count };
    }),
  });
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
      case 'getDataset': return await handleGetDataset(base44, body);
      case 'listDatasets': return await handleListDatasets();
      case 'calculate': return await handleCalculate(base44, body);
      case 'listCalculations': return await handleListCalculations();
      case 'createSnapshot': return await handleCreateSnapshot(base44, user, body);
      case 'getSnapshot': return await handleGetSnapshot(base44, body);
      case 'getTimeline': return await handleGetTimeline(base44, body);
      case 'addTimelineEntry': return await handleAddTimelineEntry(base44, user, body);
      case 'checkDataQuality': return await handleCheckDataQuality(base44, body);
      case 'getQualityAlerts': return await handleGetQualityAlerts(base44, body);
      case 'resolveAlert': return await handleResolveAlert(base44, user, body);
      case 'exportDataset': return await handleExportDataset(base44, body);
      case 'getCacheInfo': return await handleGetCacheInfo(base44);
      default: return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});