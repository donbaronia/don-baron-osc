import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/coreEngine";
import { brl, todayStr, weekRange, monthRange } from "@/lib/financialCenter";

/**
 * BIEngine — Motor de Inteligencia de Negocios (Documento 010)
 *
 * UNICA fonte de indicadores para todos os dashboards.
 * Nenhum dashboard consulta diretamente tabelas operacionais.
 *
 * Arquitetura:
 *  1. Coleta dados de todos os modulos
 *  2. Consolida em KPIs
 *  3. Gera snapshots (diario, semanal, mensal, trimestral, anual)
 *  4. Executa previsoes e deteccao de anomalias
 *  5. Alimenta a BARON AI
 */

const _safe = (arr) => (Array.isArray(arr) ? arr : []);

function _inPeriod(dateStr, start, end) {
  if (!dateStr) return false;
  const d = typeof dateStr === "string" ? dateStr.slice(0, 10) : "";
  return d >= start && d <= end;
}

function _prevRange(range, type) {
  const start = new Date(range.start + "T00:00:00");
  const end = new Date(range.end + "T00:00:00");
  const diffDays = Math.round((end - start) / 86400000) + 1;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - diffDays + 1);
  return {
    start: prevStart.toISOString().slice(0, 10),
    end: prevEnd.toISOString().slice(0, 10),
  };
}

export const BI = {
  // ===== COLLECT ALL DATA =====
  async _collectAll(range) {
    const [sales, tx, products, purchases, productions, movements, stocks, recipes, customers, ifood, payments, receipts] = await Promise.all([
      base44.entities.Sale.filter({ deleted_at: { $exists: false } }, "-sale_date", 500).catch(() => []),
      base44.entities.FinancialTransaction.list("-created_date", 500).catch(() => []),
      base44.entities.Product.filter({ deleted_at: { $exists: false } }, "name", 500).catch(() => []),
      base44.entities.Purchase.filter({ deleted_at: { $exists: false } }, "-order_date", 500).catch(() => []),
      base44.entities.ProductionRecord.filter({ deleted_at: { $exists: false } }, "-production_date", 500).catch(() => []),
      base44.entities.Movement.filter({ deleted_at: { $exists: false } }, "-movement_date", 1000).catch(() => []),
      base44.entities.Stock.filter({ deleted_at: { $exists: false } }, "product_name", 500).catch(() => []),
      base44.entities.Recipe.filter({ active: true, deleted_at: { $exists: false } }, "name", 500).catch(() => []),
      base44.entities.Customer.filter({ deleted_at: { $exists: false } }, "name", 500).catch(() => []),
      base44.entities.IFoodReceipt.filter({ deleted_at: { $exists: false } }, "-created_date", 200).catch(() => []),
      base44.entities.Payment.list("-due_date", 300).catch(() => []),
      base44.entities.Receipt.list("-expected_date", 300).catch(() => []),
    ]);

    return {
      sales: _safe(sales).filter(s => _inPeriod(s.sale_date, range.start, range.end) && s.status !== "cancelada"),
      transactions: _safe(tx).filter(t => _inPeriod((t.created_date || "").slice(0, 10), range.start, range.end)),
      products: _safe(products),
      purchases: _safe(purchases),
      productions: _safe(productions),
      movements: _safe(movements),
      stocks: _safe(stocks),
      recipes: _safe(recipes),
      customers: _safe(customers),
      ifood: _safe(ifood).filter(r => _inPeriod(r.period_end || r.expected_date || r.week, range.start, range.end)),
      payments: _safe(payments).filter(p => _inPeriod(p.due_date, range.start, range.end)),
      receipts: _safe(receipts).filter(r => _inPeriod(r.expected_date, range.start, range.end)),
      allSales: _safe(sales),
      allTx: _safe(tx),
    };
  },

  _getRange(periodType, custom) {
    if (custom) return { start: custom.start, end: custom.end };
    const today = todayStr();
    if (periodType === "daily") return { start: today, end: today };
    if (periodType === "weekly") return weekRange();
    if (periodType === "monthly") return monthRange();
    if (periodType === "quarterly") {
      const q = Math.floor(new Date().getMonth() / 3);
      return { start: `${today.slice(0, 4)}-${String(q * 3 + 1).padStart(2, "0")}-01`, end: today };
    }
    if (periodType === "annual") return { start: `${today.slice(0, 4)}-01-01`, end: `${today.slice(0, 4)}-12-31` };
    return null;
  },

  // ===== MAIN KPI CALCULATION =====
  async getKPIs(periodType = "monthly", customRange = null) {
    const range = this._getRange(periodType, customRange);
    if (!range) throw new Error("Periodo invalido");
    const data = await this._collectAll(range);

    // Receita
    const revenueGross = data.sales.reduce((s, x) => s + (x.gross_total || 0), 0);
    const fees = data.sales.reduce((s, x) => s + (x.fees || 0), 0);
    const discounts = data.sales.reduce((s, x) => s + (x.discount || 0), 0);
    const ifoodGross = data.ifood.reduce((s, r) => s + (r.gross_value || 0), 0);
    const ifoodFees = data.ifood.reduce((s, r) => s + (r.fees || 0) + (r.commissions || 0), 0);
    const ifoodOrders = data.ifood.reduce((s, r) => s + (r.order_count || 0), 0);
    const totalGross = revenueGross + ifoodGross;
    const totalFees = fees + ifoodFees;
    const revenueNet = totalGross - totalFees - discounts;

    // Custo
    const costGoods = data.productions
      .filter(p => p.status === "concluida")
      .reduce((s, p) => s + (p.cost_ingredients || p.cost_total || 0), 0);
    const losses = data.productions.reduce((s, p) => s + (p.cost_total || 0) * ((p.lost_quantity || 0) / Math.max(p.produced_quantity || p.planned_quantity || 1, 1)), 0);

    // Financeiro
    const totalPagar = data.payments.filter(p => p.status === "pendente").reduce((s, p) => s + (p.amount || 0), 0);
    const totalReceber = data.receipts.filter(r => r.status === "pendente").reduce((s, r) => s + (r.amount || 0), 0);
    const cashFlow = totalReceber - totalPagar;

    // Lucro
    const grossProfit = revenueNet - costGoods;
    const cmvPct = revenueNet > 0 ? (costGoods / revenueNet) * 100 : 0;
    const marginPct = revenueNet > 0 ? (grossProfit / revenueNet) * 100 : 0;

    // Pedidos
    const orderCount = data.sales.length + ifoodOrders;
    const averageTicket = orderCount > 0 ? revenueNet / orderCount : 0;

    // Clientes
    const customerIds = new Set([...data.sales.map(s => s.customer_id), ...data.sales.map(s => s.customer_name)].filter(Boolean));
    const activeCustomers = data.customers.filter(c => c.status === "ativo").length;

    // Estoque
    const stockValue = data.stocks.reduce((s, x) => s + (x.total_value || 0), 0);
    const stockCritical = data.stocks.filter(s => (s.quantity || 0) <= (s.min_quantity || 0)).length;

    // Compras
    const purchasesUrgent = data.purchases.filter(p => ["pendente_aprovacao", "enviada"].includes(p.status)).length;
    const purchasesTotal = data.purchases.reduce((s, p) => s + (p.total_amount || 0), 0);

    // Produção
    const productionsPending = data.productions.filter(p => ["planejada", "liberada", "em_producao", "pausada"].includes(p.status)).length;
    const productionsDone = data.productions.filter(p => p.status === "concluida");
    const avgEfficiency = productionsDone.length > 0
      ? productionsDone.reduce((s, p) => s + (p.efficiency_pct || 0), 0) / productionsDone.length
      : 0;

    // Perdas
    const totalLosses = data.movements.filter(m => ["perda", "quebra", "vencimento"].includes(m.movement_type)).reduce((s, m) => s + (m.total_cost || 0), 0);
    const wastePct = revenueNet > 0 ? (totalLosses / revenueNet) * 100 : 0;

    return {
      period: range,
      period_type: periodType,
      kpis: {
        faturamento_bruto: totalGross,
        receita_liquida: revenueNet,
        lucro_bruto: grossProfit,
        cmv_pct: cmvPct,
        margem_pct: marginPct,
        fluxo_caixa: cashFlow,
        contas_pagar: totalPagar,
        contas_receber: totalReceber,
        ticket_medio: averageTicket,
        pedidos: orderCount,
        clientes: customerIds.size,
        clientes_ativos: activeCustomers,
        desperdicio_pct: wastePct,
        perdas: totalLosses,
        compras: purchasesTotal,
        estoque_valor: stockValue,
        estoque_critico: stockCritical,
        compras_urgentes: purchasesUrgent,
        producoes_pendentes: productionsPending,
        eficiencia: avgEfficiency,
      },
      generated_at: new Date().toISOString(),
      data_sources: ["financeiro", "compras", "estoque", "producao", "receitas", "ifood", "documentos", "workflow"],
    };
  },

  // ===== EXECUTIVE DASHBOARD =====
  async getExecutiveDashboard() {
    const today = todayStr();
    const week = weekRange();
    const month = monthRange();

    const [dayKpis, weekKpis, monthKpis, data] = await Promise.all([
      this.getKPIs("daily"),
      this.getKPIs("weekly"),
      this.getKPIs("monthly"),
      this._collectAll(month),
    ]);

    // Itens especificos do dashboard executivo
    const boletosDia = data.payments.filter(p => p.due_date === today && p.status === "pendente").length;
    const ifoodRecebimento = data.receipts.filter(r => r.status === "pendente" && r.source === "ifood").reduce((s, r) => s + (r.amount || 0), 0);
    const alertasIA = data.purchases.filter(p => p.priority === "critica" && p.status === "pendente_aprovacao").length;

    return {
      receita_dia: dayKpis.kpis.receita_liquida,
      receita_semana: weekKpis.kpis.receita_liquida,
      receita_mes: monthKpis.kpis.receita_liquida,
      lucro: monthKpis.kpis.lucro_bruto,
      cmv: monthKpis.kpis.cmv_pct,
      fluxo_caixa: monthKpis.kpis.fluxo_caixa,
      meta_percentual: 0,
      boletos_dia: boletosDia,
      ifood_recebimento: ifoodRecebimento,
      estoque_critico: monthKpis.kpis.estoque_critico,
      compras_urgentes: monthKpis.kpis.compras_urgentes,
      producoes_pendentes: monthKpis.kpis.producoes_pendentes,
      alertas_ia: alertasIA,
      day: dayKpis,
      week: weekKpis,
      month: monthKpis,
    };
  },

  // ===== FINANCIAL DASHBOARD =====
  async getFinancialDashboard() {
    const range = monthRange();
    const data = await this._collectAll(range);
    const prevRange = _prevRange(range, "monthly");
    const prevData = await this._collectAll(prevRange);

    const revenue = data.sales.reduce((s, x) => s + (x.net_total || x.gross_total || 0), 0);
    const prevRevenue = prevData.sales.reduce((s, x) => s + (x.net_total || x.gross_total || 0), 0);
    const expenses = data.transactions.filter(t => t.type === "a_pagar").reduce((s, t) => s + (t.amount || 0), 0);
    const prevExpenses = prevData.transactions.filter(t => t.type === "a_pagar").reduce((s, t) => s + (t.amount || 0), 0);
    const profit = revenue - expenses;
    const prevProfit = prevRevenue - prevExpenses;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const costGoods = data.productions.filter(p => p.status === "concluida").reduce((s, p) => s + (p.cost_ingredients || 0), 0);
    const cmv = revenue > 0 ? (costGoods / revenue) * 100 : 0;

    return {
      fluxo_caixa: profit,
      dre: { receita: revenue, despesas: expenses, lucro: profit, margem: margin, cmv, custo_produtos: costGoods },
      cmv,
      lucro: profit,
      margem: margin,
      recebimentos: data.receipts.filter(r => r.status === "pendente").reduce((s, r) => s + (r.amount || 0), 0),
      pagamentos: data.payments.filter(p => p.status === "pendente").reduce((s, p) => s + (p.amount || 0), 0),
      comparativo: {
        receita_atual: revenue,
        receita_anterior: prevRevenue,
        receita_variacao: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0,
        despesa_atual: expenses,
        despesa_anterior: prevExpenses,
        despesa_variacao: prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0,
        lucro_atual: profit,
        lucro_anterior: prevProfit,
        lucro_variacao: prevProfit !== 0 ? ((profit - prevProfit) / Math.abs(prevProfit)) * 100 : 0,
      },
    };
  },

  // ===== STOCK DASHBOARD =====
  async getStockDashboard() {
    const range = monthRange();
    const data = await this._collectAll(range);

    const totalValue = data.stocks.reduce((s, x) => s + (x.total_value || 0), 0);
    const critical = data.stocks.filter(s => (s.quantity || 0) <= (s.min_quantity || 0));
    const stopped = data.stocks.filter(s => {
      if (!s.last_movement_date) return true;
      const days = (Date.now() - new Date(s.last_movement_date).getTime()) / 86400000;
      return days > 30;
    });
    const expiring = data.stocks.filter(s => s.expiry_alert_level && !["normal"].includes(s.expiry_alert_level));
    const abcA = data.stocks.filter(s => s.abc_class === "A");
    const losses = data.movements.filter(m => ["perda", "quebra", "vencimento"].includes(m.movement_type)).reduce((s, m) => s + (m.total_cost || 0), 0);

    const suggested = critical.map(s => ({
      product_name: s.product_name,
      current: s.quantity || 0,
      min: s.min_quantity || 0,
      suggested: (s.ideal_quantity || s.max_quantity || (s.min_quantity || 0) * 2) - (s.quantity || 0),
      coverage_days: s.coverage_days || 0,
    }));

    return {
      valor_total: totalValue,
      itens_criticos: critical.length,
      itens_parados: stopped.length,
      validades: expiring.length,
      cobertura_media: data.stocks.reduce((s, x) => s + (x.coverage_days || 0), 0) / Math.max(data.stocks.length, 1),
      curva_abc: { A: abcA.length, B: data.stocks.filter(s => s.abc_class === "B").length, C: data.stocks.filter(s => s.abc_class === "C").length },
      perdas: losses,
      compras_sugeridas: suggested,
      critical_items: critical,
      stopped_items: stopped,
    };
  },

  // ===== PRODUCTION DASHBOARD =====
  async getProductionDashboard() {
    const range = monthRange();
    const data = await this._collectAll(range);

    const done = data.productions.filter(p => p.status === "concluida");
    const pending = data.productions.filter(p => ["planejada", "liberada", "em_producao", "pausada"].includes(p.status));
    const avgEfficiency = done.length > 0 ? done.reduce((s, p) => s + (p.efficiency_pct || 0), 0) / done.length : 0;
    const avgTime = done.length > 0 ? done.reduce((s, p) => s + (p.total_time_min || 0), 0) / done.length : 0;
    const totalLosses = done.reduce((s, p) => s + (p.lost_quantity || 0), 0);
    const avgYield = done.length > 0 ? done.reduce((s, p) => s + (p.actual_yield || 0), 0) / done.length : 0;
    const recipes = data.recipes.length;
    const teamMembers = new Set();
    data.productions.forEach(p => (p.team || []).forEach(t => teamMembers.add(t)));

    return {
      ordens_total: data.productions.length,
      ordens_concluidas: done.length,
      ordens_pendentes: pending.length,
      eficiencia: avgEfficiency,
      tempo_medio: avgTime,
      perdas: totalLosses,
      rendimento: avgYield,
      receitas: recipes,
      funcionarios: teamMembers.size,
      produtividade: done.length > 0 && teamMembers.size > 0 ? done.length / teamMembers.size : 0,
    };
  },

  // ===== CRM DASHBOARD =====
  async getCRMDashboard() {
    const range = monthRange();
    const data = await this._collectAll(range);

    const active = data.customers.filter(c => c.status === "ativo");
    const inactive = data.customers.filter(c => c.status === "inativo");
    const today = todayStr();

    const salesByCustomer = {};
    data.sales.forEach(s => {
      const id = s.customer_id || s.customer_name;
      if (!id) return;
      if (!salesByCustomer[id]) salesByCustomer[id] = { name: s.customer_name || id, orders: 0, total: 0, last_date: null };
      salesByCustomer[id].orders++;
      salesByCustomer[id].total += s.gross_total || 0;
      if (!salesByCustomer[id].last_date || s.sale_date > salesByCustomer[id].last_date) salesByCustomer[id].last_date = s.sale_date;
    });

    const customerList = Object.values(salesByCustomer);
    const ltv = customerList.length > 0 ? customerList.reduce((s, c) => s + c.total, 0) / customerList.length : 0;
    const recurring = customerList.filter(c => c.orders > 1).length;
    const retention = customerList.length > 0 ? (recurring / customerList.length) * 100 : 0;
    const avgFrequency = customerList.length > 0 ? customerList.reduce((s, c) => s + c.orders, 0) / customerList.length : 0;

    const birthdays = data.customers.filter(c => {
      if (!c.birthday) return false;
      const bm = c.birthday.slice(5, 7);
      return bm === today.slice(5, 7);
    });

    const inactiveCustomers = customerList.filter(c => {
      if (!c.last_date) return false;
      const days = (new Date(today) - new Date(c.last_date)) / 86400000;
      return days > 30;
    });

    return {
      ativos: active.length,
      inativos: inactive.length,
      frequencia: avgFrequency,
      ticket_medio: customerList.length > 0 ? customerList.reduce((s, c) => s + c.total / c.orders, 0) / customerList.length : 0,
      ltv,
      retencao: retention,
      recorrentes: recurring,
      aniversariantes: birthdays.length,
      sem_comprar: inactiveCustomers.length,
      top_customers: customerList.sort((a, b) => b.total - a.total).slice(0, 10),
    };
  },

  // ===== TEMPORAL ANALYSIS =====
  async getTemporalAnalysis() {
    const today = todayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const week = weekRange();
    const month = monthRange();
    const prevWeek = _prevRange(week, "weekly");
    const prevMonth = _prevRange(month, "monthly");

    const [d, y, w, pw, m, pm] = await Promise.all([
      this.getKPIs("daily", { start: today, end: today }),
      this.getKPIs("daily", { start: yesterday, end: yesterday }),
      this.getKPIs("weekly"),
      this.getKPIs("weekly", prevWeek),
      this.getKPIs("monthly"),
      this.getKPIs("monthly", prevMonth),
    ]);

    const calc = (curr, prev) => ({
      atual: curr.kpis.receita_liquida,
      anterior: prev.kpis.receita_liquida,
      variacao: prev.kpis.receita_liquida > 0 ? ((curr.kpis.receita_liquida - prev.kpis.receita_liquida) / prev.kpis.receita_liquida) * 100 : 0,
    });

    return {
      hoje_vs_ontem: calc(d, y),
      semana_vs_anterior: calc(w, pw),
      mes_vs_anterior: calc(m, pm),
      detalhe: {
        hoje: d.kpis,
        ontem: y.kpis,
        semana: w.kpis,
        semana_passada: pw.kpis,
        mes: m.kpis,
        mes_passado: pm.kpis,
      },
    };
  },

  // ===== FORECASTS =====
  async getForecasts() {
    const month = monthRange();
    const prevMonth = _prevRange(month, "monthly");
    const prevPrevMonth = _prevRange(prevMonth, "monthly");

    const [m, pm, ppm] = await Promise.all([
      this.getKPIs("monthly", month),
      this.getKPIs("monthly", prevMonth),
      this.getKPIs("monthly", prevPrevMonth),
    ]);

    const revenues = [ppm.kpis.receita_liquida, pm.kpis.receita_liquida, m.kpis.receita_liquida].filter(r => r > 0);
    const expenses = [ppm.kpis.contas_pagar, pm.kpis.contas_pagar, m.kpis.contas_pagar].filter(e => e > 0);

    // Media movel ponderada (pesos: 0.5, 0.3, 0.2)
    const weights = [0.5, 0.3, 0.2];
    const forecastRevenue = revenues.length === 3 ? revenues.reduce((s, r, i) => s + r * weights[i], 0) : revenues[0] || 0;
    const forecastExpenses = expenses.length === 3 ? expenses.reduce((s, e, i) => s + e * weights[i], 0) : expenses[0] || 0;
    const trend = revenues.length >= 2 ? ((revenues[revenues.length - 1] - revenues[0]) / Math.max(revenues[0], 1)) * 100 : 0;

    return {
      vendas: { previsto: forecastRevenue, tendencia: trend },
      caixa: { previsto: forecastRevenue - forecastExpenses },
      despesas: { previsto: forecastExpenses },
      lucro: { previsto: forecastRevenue - m.kpis.cmv_pct / 100 * forecastRevenue - forecastExpenses },
      estoque: { cobertura_dias: m.kpis.estoque_valor > 0 ? (m.kpis.estoque_valor / Math.max(m.kpis.receita_liquida / 30, 1)) : 0 },
      producao: { previsto: Math.ceil(m.kpis.pedidos * (1 + trend / 100)) },
      ifood: { previsto: forecastRevenue * 0.3 },
      compras: { previsto: m.kpis.compras * (1 + trend / 100) },
    };
  },

  // ===== ANOMALY DETECTION =====
  async detectAnomalies() {
    const month = monthRange();
    const prevMonth = _prevRange(month, "monthly");
    const [m, pm] = await Promise.all([
      this.getKPIs("monthly", month),
      this.getKPIs("monthly", prevMonth),
    ]);

    const anomalies = [];

    // Queda brusca de vendas
    const revVar = pm.kpis.receita_liquida > 0 ? ((m.kpis.receita_liquida - pm.kpis.receita_liquida) / pm.kpis.receita_liquida) * 100 : 0;
    if (revVar < -15) anomalies.push({ type: "queda_vendas", severity: "critical", message: `Queda de ${Math.abs(revVar).toFixed(1)}% na receita`, impact: m.kpis.receita_liquida - pm.kpis.receita_liquida });

    // Aumento de custos
    const costVar = pm.kpis.cmv_pct > 0 ? ((m.kpis.cmv_pct - pm.kpis.cmv_pct) / pm.kpis.cmv_pct) * 100 : 0;
    if (costVar > 10) anomalies.push({ type: "aumento_custo", severity: "high", message: `CMV aumentou ${costVar.toFixed(1)}%`, impact: m.kpis.receita_liquida * m.kpis.cmv_pct / 100 - m.kpis.receita_liquida * pm.kpis.cmv_pct / 100 });

    // CMV elevado
    if (m.kpis.cmv_pct > 35) anomalies.push({ type: "cmv_elevado", severity: "high", message: `CMV em ${m.kpis.cmv_pct.toFixed(1)}% (acima da meta)`, impact: m.kpis.receita_liquida * (m.kpis.cmv_pct - 35) / 100 });

    // Desperdicio anormal
    if (m.kpis.desperdicio_pct > 3) anomalies.push({ type: "desperdicio", severity: "medium", message: `Desperdício em ${m.kpis.desperdicio_pct.toFixed(1)}%`, impact: m.kpis.perdas });

    // Fluxo negativo
    if (m.kpis.fluxo_caixa < 0) anomalies.push({ type: "fluxo_negativo", severity: "critical", message: `Fluxo de caixa negativo: ${brl(m.kpis.fluxo_caixa)}`, impact: m.kpis.fluxo_caixa });

    // Ticket medio abaixo da media
    if (pm.kpis.ticket_medio > 0 && m.kpis.ticket_medio < pm.kpis.ticket_medio * 0.85) anomalies.push({ type: "ticket_baixo", severity: "medium", message: `Ticket médio caiu ${(((pm.kpis.ticket_medio - m.kpis.ticket_medio) / pm.kpis.ticket_medio) * 100).toFixed(1)}%`, impact: 0 });

    // Margem abaixo da meta
    if (m.kpis.margem_pct < 20) anomalies.push({ type: "margem_baixa", severity: "high", message: `Margem em ${m.kpis.margem_pct.toFixed(1)}% (abaixo de 20%)`, impact: m.kpis.receita_liquida * (20 - m.kpis.margem_pct) / 100 });

    // Estoque inconsistente
    if (m.kpis.estoque_critico > 5) anomalies.push({ type: "estoque_critico", severity: "high", message: `${m.kpis.estoque_critico} itens em nível crítico`, impact: 0 });

    return anomalies;
  },

  // ===== ALERT CENTER =====
  async getAlerts() {
    const [anomalies, executive] = await Promise.all([
      this.detectAnomalies(),
      this.getExecutiveDashboard(),
    ]);

    const alerts = anomalies.map(a => ({
      ...a,
      origin: "bi_engine",
      date: new Date().toISOString(),
      responsible: "Gestor",
      suggestion: this._suggestFor(a.type),
      status: "open",
    }));

    // Alertas operacionais
    if (executive.estoque_critico > 0) alerts.push({ type: "estoque_critico", severity: "high", origin: "estoque", message: `${executive.estoque_critico} itens em estoque crítico`, suggestion: "Reabastecer urgentemente", status: "open", date: new Date().toISOString(), responsible: "Estoque" });
    if (executive.compras_urgentes > 0) alerts.push({ type: "compras_urgentes", severity: "medium", origin: "compras", message: `${executive.compras_urgentes} compras aguardando aprovação`, suggestion: "Revisar e aprovar pedidos", status: "open", date: new Date().toISOString(), responsible: "Compras" });
    if (executive.producoes_pendentes > 0) alerts.push({ type: "producao_pendente", severity: "medium", origin: "producao", message: `${executive.producoes_pendentes} produções pendentes`, suggestion: "Concluir produções em andamento", status: "open", date: new Date().toISOString(), responsible: "Produção" });
    if (executive.boletos_dia > 0) alerts.push({ type: "boletos_vencendo", severity: "high", origin: "financeiro", message: `${executive.boletos_dia} boleto(s) vencendo hoje`, suggestion: "Programar pagamento", status: "open", date: new Date().toISOString(), responsible: "Financeiro" });

    return alerts.sort((a, b) => {
      const sev = { critical: 0, high: 1, medium: 2, low: 3 };
      return (sev[a.severity] || 3) - (sev[b.severity] || 3);
    });
  },

  _suggestFor(type) {
    const map = {
      queda_vendas: "Investigar causa da queda e criar campanha promocional",
      aumento_custo: "Renegociar com fornecedores ou buscar alternativas",
      cmv_elevado: "Revisar receitas e custos de ingredientes",
      desperdicio: "Implementar controle de porcionamento e treinar equipe",
      fluxo_negativo: "Acelerar recebimentos e postergar pagamentos não urgentes",
      ticket_baixo: "Criar combos e upsell para aumentar ticket médio",
      margem_baixa: "Reajustar preços de venda ou reduzir custos",
      estoque_critico: "Reabastecer itens críticos imediatamente",
    };
    return map[type] || "Investigar e tomar ação corretiva";
  },

  // ===== SNAPSHOT =====
  async generateSnapshot(periodType = "daily", triggeredBy = "schedule") {
    const range = this._getRange(periodType);
    if (!range) throw new Error("Periodo invalido");
    const kpis = await this.getKPIs(periodType);

    const snapshot = await base44.entities.DataSnapshot.create({
      dataset: "bi_kpis",
      period_type: periodType,
      period_date: range.end,
      data: kpis.kpis,
      metrics: {
        receita_liquida: kpis.kpis.receita_liquida,
        lucro_bruto: kpis.kpis.lucro_bruto,
        cmv_pct: kpis.kpis.cmv_pct,
        margem_pct: kpis.kpis.margem_pct,
      },
      record_count: kpis.kpis.pedidos,
      calculated_at: new Date().toISOString(),
      triggered_by: triggeredBy,
    });

    await Core.events.emit({
      event_type: "bi_snapshot_generated",
      module: "bi",
      description: `Snapshot ${periodType} gerado para ${range.end}`,
      metadata: { period_type: periodType, period_date: range.end },
    });

    return snapshot;
  },

  // ===== GET SNAPSHOTS =====
  async getSnapshots(periodType = null, limit = 30) {
    const query = { dataset: "bi_kpis", deleted_at: { $exists: false } };
    if (periodType) query.period_type = periodType;
    return base44.entities.DataSnapshot.filter(query, "-period_date", limit).catch(() => []);
  },

  // ===== EXPORT =====
  async exportData(dataset, format = "csv") {
    const kpis = await this.getKPIs("monthly");
    if (format === "json") return JSON.stringify(kpis, null, 2);

    // CSV
    const rows = Object.entries(kpis.kpis).map(([key, val]) => ({ indicador: key, valor: val, periodo: kpis.period_type, data: kpis.generated_at }));
    const headers = Object.keys(rows[0] || {});
    const lines = [headers.join(","), ...rows.map(r => headers.map(h => r[h]).join(","))];
    return lines.join("\n");
  },
};

export default BI;