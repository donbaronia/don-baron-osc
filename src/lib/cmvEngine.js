import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/coreEngine";
import { EventBus } from "@/lib/eventBus";
import { brl, todayStr, weekRange, monthRange } from "@/lib/financialCenter";

/**
 * CMVEngine — Motor de CMV Inteligente (Documento 009)
 *
 * UNICO responsavel pelo calculo oficial do CMV.
 * Todos os modulos enviam dados para este motor.
 *
 * Fontes: Financeiro, Compras, Estoque, Producao, Receitas, iFood, Delivery, Balcao
 * Tipos: Diario, Semanal, Mensal, Anual
 * Breakdowns: Produto, Categoria, Canal, Fornecedor, Receita, Combo, Ingrediente
 */

export const CMV = {
  // ===== CALCULATE CMV (Core) =====
  async calculate(periodType = "monthly", customRange = null, triggeredBy = "manual") {
    const range = this._getRange(periodType, customRange);
    if (!range) throw new Error("Periodo invalido");

    // Buscar todas as fontes de dados
    const [sales, productions, movements, recipes, ifoodReceipts, goals] = await Promise.all([
      base44.entities.Sale.filter({ deleted_at: null }, "-sale_date", 500).catch(() => []),
      base44.entities.ProductionRecord.filter({ status: "concluida", deleted_at: null }, "-production_date", 500).catch(() => []),
      base44.entities.Movement.filter({ deleted_at: null }, "-movement_date", 1000).catch(() => []),
      base44.entities.Recipe.filter({ active: true, deleted_at: null }, "name", 500).catch(() => []),
      base44.entities.IFoodReceipt.filter({ deleted_at: null }, "-created_date", 500).catch(() => []),
      base44.entities.CMVGoal.filter({ active: true, period_type: periodType, deleted_at: null }, "name", 50).catch(() => []),
    ]);

    // Filtrar por periodo
    const inPeriod = (dateStr) => {
      if (!dateStr) return false;
      const d = typeof dateStr === "string" ? dateStr.slice(0, 10) : "";
      return d >= range.start && d <= range.end;
    };

    const periodSales = sales.filter(s => inPeriod(s.sale_date) && s.status !== "cancelada");
    const periodProductions = productions.filter(p => inPeriod(p.production_date));
    const periodMovements = movements.filter(m => inPeriod((m.movement_date || "").slice(0, 10)));
    const periodIfood = ifoodReceipts.filter(r => {
      const ref = r.period_end || r.expected_date || r.week;
      return ref && inPeriod(ref);
    });

    // ===== RECEITA =====
    let revenueGross = 0;
    let fees = 0;
    let discounts = 0;
    let campaigns = 0;
    let orderCount = 0;

    // Vendas diretas (balcao, delivery, whatsapp)
    for (const s of periodSales) {
      revenueGross += s.gross_total || 0;
      fees += s.fees || 0;
      discounts += s.discount || 0;
      orderCount += 1;
    }

    // iFood
    for (const r of periodIfood) {
      revenueGross += r.gross_value || 0;
      fees += (r.fees || 0) + (r.commissions || 0);
      campaigns += r.campaigns || 0;
      orderCount += r.order_count || 0;
    }

    const revenueNet = revenueGross - fees - discounts + campaigns - periodIfood.reduce((s, r) => s + (r.chargebacks || 0) + (r.refunds || 0) + (r.cancellations || 0), 0);

    // ===== CUSTO (CMV) =====
    // Metodo: somar custo dos ingredientes consumidos em producoes do periodo
    let costGoodsSold = 0;
    let lossesValue = 0;
    let wasteValue = 0;
    let bonificationsValue = 0;

    // Custo de producoes
    for (const p of periodProductions) {
      costGoodsSold += p.cost_ingredients || p.cost_total || 0;
      // Perdas de producao
      if (p.lost_quantity > 0) {
        const lossCost = (p.cost_per_unit || 0) * p.lost_quantity;
        lossesValue += lossCost;
        wasteValue += lossCost;
      }
    }

    // Perdas/quebras de estoque (movimentos)
    const lossMovements = periodMovements.filter(m => ["perda", "quebra", "vencimento"].includes(m.movement_type));
    for (const m of lossMovements) {
      lossesValue += m.total_cost || 0;
    }

    // Bonificacoes (entradas sem custo)
    const bonusMovements = periodMovements.filter(m => m.movement_type === "bonificacao");
    bonificationsValue = bonusMovements.reduce((s, m) => s + (m.total_cost || 0), 0);

    // ===== BREAKDOWNS =====
    const byProduct = this._breakdownByProduct(periodSales, periodProductions, recipes);
    const byCategory = this._breakdownByCategory(byProduct);
    const byChannel = this._breakdownByChannel(periodSales, periodIfood);
    const bySupplier = this._breakdownBySupplier(periodMovements);
    const byRecipe = this._breakdownByRecipe(periodProductions);
    const byIngredient = this._breakdownByIngredient(periodProductions, recipes, periodMovements);
    const lossesByType = this._breakdownLosses(periodMovements, periodProductions);

    // ===== METRICS =====
    const cmvPct = revenueNet > 0 ? (costGoodsSold / revenueNet) * 100 : 0;
    const grossProfit = revenueNet - costGoodsSold;
    const marginPct = revenueNet > 0 ? (grossProfit / revenueNet) * 100 : 0;
    const netProfit = grossProfit - lossesValue;
    const averageTicket = orderCount > 0 ? revenueNet / orderCount : 0;

    // ===== COMPARATIVO =====
    const previous = await this._getPreviousPeriod(periodType, range).catch(() => null);
    const comparison = previous ? {
      cmv_diff: cmvPct - (previous.cmv_pct || 0),
      revenue_diff: revenueNet - (previous.revenue_net || 0),
      margin_diff: marginPct - (previous.margin_pct || 0),
      profit_diff: grossProfit - (previous.gross_profit || 0),
    } : null;

    // ===== META =====
    const goal = goals[0];
    const goalStatus = goal ? {
      max_cmv: goal.max_cmv_pct,
      target_margin: goal.target_margin_pct,
      cmv_above_goal: cmvPct > goal.max_cmv_pct,
      margin_below_goal: marginPct < goal.target_margin_pct,
    } : null;

    // ===== ALERTAS =====
    const alerts = this._generateAlerts(cmvPct, marginPct, goal, byProduct, byIngredient, lossesValue, revenueNet);

    // ===== SALVAR =====
    const count = await base44.entities.CMVRecord.filter({}, "-created_date", 1).catch(() => []);
    const seq = (count[0]?.calculation_code?.match(/(\d+)$/)?.[1] || 0) + 1;
    const calculation_code = `CMV-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;

    const record = await base44.entities.CMVRecord.create({
      calculation_code,
      period_type: periodType,
      period_date: range.end,
      period_start: range.start,
      period_end: range.end,
      revenue_gross: revenueGross,
      revenue_net: revenueNet,
      fees,
      discounts,
      campaigns,
      cost_goods_sold: costGoodsSold,
      cmv_pct: cmvPct,
      gross_profit: grossProfit,
      net_profit: netProfit,
      margin_pct: marginPct,
      losses_value: lossesValue,
      waste_value: wasteValue,
      bonifications_value: bonificationsValue,
      breakdown_by_product: byProduct,
      breakdown_by_category: byCategory,
      breakdown_by_channel: byChannel,
      breakdown_by_supplier: bySupplier,
      breakdown_by_recipe: byRecipe,
      breakdown_by_ingredient: byIngredient,
      losses_by_type: lossesByType,
      data_sources: ["financeiro", "compras", "estoque", "producao", "receitas", "ifood", "delivery", "balcao"],
      order_count: orderCount,
      average_ticket: averageTicket,
      calculated_at: new Date().toISOString(),
      triggered_by: triggeredBy,
      comparison,
      goal_status: goalStatus,
      alerts,
      history: [{
        version: 1,
        date: new Date().toISOString(),
        reason: `Calculo ${periodType} inicial`,
        cmv_pct: cmvPct,
        gross_profit: grossProfit,
        triggered_by: triggeredBy,
      }],
      status: "ativo",
    });

    // Event Bus corporativo — CMV_UPDATED
    EventBus.publish({
      event_type: "cmv_updated",
      module: "bi",
      entity_type: "CMVRecord",
      entity_id: record.id,
      payload: { cmv_pct: cmvPct, gross_profit: grossProfit, net_profit: netProfit, margin_pct: marginPct, period_type: periodType, range: { start: range.start, end: range.end }, triggered_by: triggeredBy },
    }).catch(() => {});

    return record;
  },

  // ===== RANGE HELPER =====
  _getRange(periodType, custom) {
    if (custom) return { start: custom.start, end: custom.end };
    const today = todayStr();
    if (periodType === "daily") return { start: today, end: today };
    if (periodType === "weekly") return weekRange();
    if (periodType === "monthly") return monthRange();
    if (periodType === "annual") return { start: `${today.slice(0, 4)}-01-01`, end: `${today.slice(0, 4)}-12-31` };
    return null;
  },

  async _getPreviousPeriod(periodType, currentRange) {
    const records = await base44.entities.CMVRecord.filter({
      period_type: periodType,
      deleted_at: null,
    }, "-period_date", 500).catch(() => []);
    const previous = records.find(r => r.period_end < currentRange.start);
    return previous || null;
  },

  // ===== BREAKDOWNS =====
  _breakdownByProduct(sales, productions, recipes) {
    const productMap = {};

    // Receita por produto (das vendas)
    for (const s of sales) {
      for (const item of (s.items || [])) {
        const id = item.product_id || item.name;
        if (!productMap[id]) productMap[id] = { product_id: id, name: item.name, revenue: 0, quantity: 0, cost: 0 };
        productMap[id].revenue += item.total || 0;
        productMap[id].quantity += item.quantity || 0;
      }
    }

    // Custo por produto (das producoes)
    for (const p of productions) {
      const id = p.product_id || p.item;
      const recipe = recipes.find(r => r.id === p.recipe_id);
      if (!productMap[id]) productMap[id] = { product_id: id, name: p.item || recipe?.name, revenue: 0, quantity: 0, cost: 0 };
      productMap[id].cost += p.cost_ingredients || p.cost_total || 0;
    }

    // Calcular metrics
    const totalRevenue = Object.values(productMap).reduce((s, p) => s + p.revenue, 0);
    const totalProfit = Object.values(productMap).reduce((s, p) => s + (p.revenue - p.cost), 0);

    return Object.values(productMap).map(p => ({
      ...p,
      cmv_pct: p.revenue > 0 ? (p.cost / p.revenue) * 100 : 0,
      margin_pct: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
      profit: p.revenue - p.cost,
      revenue_share: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0,
      profit_share: totalProfit > 0 ? ((p.revenue - p.cost) / totalProfit) * 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  },

  _breakdownByCategory(byProduct) {
    const catMap = {};
    for (const p of byProduct) {
      // Categoria derivada do nome do produto (simplificado)
      const cat = p.name?.split(" ")[0] || "outros";
      if (!catMap[cat]) catMap[cat] = { category: cat, revenue: 0, cost: 0, quantity: 0 };
      catMap[cat].revenue += p.revenue || 0;
      catMap[cat].cost += p.cost || 0;
      catMap[cat].quantity += p.quantity || 0;
    }
    return Object.values(catMap).map(c => ({
      ...c,
      cmv_pct: c.revenue > 0 ? (c.cost / c.revenue) * 100 : 0,
      margin_pct: c.revenue > 0 ? ((c.revenue - c.cost) / c.revenue) * 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  },

  _breakdownByChannel(sales, ifoodReceipts) {
    const channelMap = {};
    for (const s of sales) {
      const ch = s.channel || "balcao";
      if (!channelMap[ch]) channelMap[ch] = { channel: ch, revenue: 0, fees: 0, cost: 0, orders: 0 };
      channelMap[ch].revenue += s.gross_total || 0;
      channelMap[ch].fees += s.fees || 0;
      channelMap[ch].orders += 1;
    }
    // iFood
    for (const r of ifoodReceipts) {
      if (!channelMap["ifood"]) channelMap["ifood"] = { channel: "ifood", revenue: 0, fees: 0, cost: 0, orders: 0 };
      channelMap["ifood"].revenue += r.gross_value || 0;
      channelMap["ifood"].fees += (r.fees || 0) + (r.commissions || 0);
      channelMap["ifood"].orders += r.order_count || 0;
    }
    return Object.values(channelMap).map(c => ({
      ...c,
      net_revenue: c.revenue - c.fees,
      cmv_pct: c.net_revenue > 0 ? (c.cost / c.net_revenue) * 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  },

  _breakdownBySupplier(movements) {
    const supplierMap = {};
    for (const m of movements) {
      if (m.movement_type !== "compra" && m.movement_type !== "entrada") continue;
      const id = m.supplier_id || m.supplier_name || "outros";
      if (!supplierMap[id]) supplierMap[id] = { supplier_id: id, name: m.supplier_name || "—", total_value: 0, count: 0 };
      supplierMap[id].total_value += m.total_cost || 0;
      supplierMap[id].count += 1;
    }
    return Object.values(supplierMap).sort((a, b) => b.total_value - a.total_value);
  },

  _breakdownByRecipe(productions) {
    const recipeMap = {};
    for (const p of productions) {
      const id = p.recipe_id || p.item;
      if (!recipeMap[id]) recipeMap[id] = { recipe_id: id, name: p.recipe_name || p.item, quantity: 0, cost: 0, count: 0 };
      recipeMap[id].quantity += p.produced_quantity || 0;
      recipeMap[id].cost += p.cost_ingredients || p.cost_total || 0;
      recipeMap[id].count += 1;
    }
    return Object.values(recipeMap).map(r => ({
      ...r,
      cost_per_unit: r.quantity > 0 ? r.cost / r.quantity : 0,
    })).sort((a, b) => b.cost - a.cost);
  },

  _breakdownByIngredient(productions, recipes, movements) {
    const ingMap = {};
    for (const p of productions) {
      const recipe = recipes.find(r => r.id === p.recipe_id);
      if (!recipe?.ingredients) continue;
      const ratio = p.planned_quantity > 0 ? p.produced_quantity / p.planned_quantity : 1;
      for (const ing of recipe.ingredients) {
        const id = ing.product_id || ing.ingredient_id || ing.name;
        if (!ingMap[id]) ingMap[id] = { ingredient_id: id, name: ing.name, consumed_qty: 0, purchased_qty: 0, losses: 0, avg_price: 0, financial_impact: 0 };
        ingMap[id].consumed_qty += (ing.quantity || 0) * ratio;
        ingMap[id].avg_price = ing.unit_cost || ingMap[id].avg_price;
      }
    }
    // Compras
    for (const m of movements) {
      if (m.movement_type !== "compra") continue;
      const id = m.product_id;
      if (ingMap[id]) {
        ingMap[id].purchased_qty += m.quantity || 0;
      }
    }
    // Perdas
    for (const m of movements) {
      if (!["perda", "quebra", "vencimento"].includes(m.movement_type)) continue;
      const id = m.product_id;
      if (ingMap[id]) {
        ingMap[id].losses += m.quantity || 0;
      }
    }
    // Impacto financeiro
    return Object.values(ingMap).map(i => ({
      ...i,
      financial_impact: i.consumed_qty * (i.avg_price || 0),
    })).sort((a, b) => b.financial_impact - a.financial_impact);
  },

  _breakdownLosses(movements, productions) {
    const losses = { producao: 0, estoque: 0, validade: 0, erro_operacional: 0, treinamento: 0, manipulacao: 0, furto: 0, quebra: 0, outros: 0 };

    // Perdas de producao
    for (const p of productions) {
      if (p.lost_quantity > 0) {
        const cost = (p.cost_per_unit || 0) * p.lost_quantity;
        losses.producao += cost;
      }
    }

    // Perdas de estoque
    for (const m of movements) {
      if (!["perda", "quebra", "vencimento"].includes(m.movement_type)) continue;
      const cost = m.total_cost || 0;
      if (m.movement_type === "vencimento") losses.validade += cost;
      else if (m.movement_type === "quebra") losses.quebra += cost;
      else losses.estoque += cost;
    }

    return losses;
  },

  // ===== ALERTS =====
  _generateAlerts(cmvPct, marginPct, goal, byProduct, byIngredient, lossesValue, revenueNet) {
    const alerts = [];
    if (goal) {
      if (cmvPct > goal.max_cmv_pct) {
        alerts.push({ severity: "urgent", type: "cmv_acima_meta", message: `CMV (${cmvPct.toFixed(1)}%) acima da meta (${goal.max_cmv_pct}%)` });
      }
      if (marginPct < goal.target_margin_pct) {
        alerts.push({ severity: "warning", type: "margem_abaixo_meta", message: `Margem (${marginPct.toFixed(1)}%) abaixo da meta (${goal.target_margin_pct}%)` });
      }
    }
    // Produtos sem margem
    const noMarginProducts = byProduct.filter(p => p.revenue > 0 && p.margin_pct < 0);
    for (const p of noMarginProducts.slice(0, 3)) {
      alerts.push({ severity: "high", type: "produto_sem_margem", message: `"${p.name}" com margem negativa (${p.margin_pct.toFixed(0)}%)` });
    }
    // Perdas excessivas
    if (revenueNet > 0 && (lossesValue / revenueNet) * 100 > 5) {
      alerts.push({ severity: "warning", type: "perdas_excessivas", message: `Perdas (${brl(lossesValue)}) representam ${((lossesValue / revenueNet) * 100).toFixed(1)}% da receita` });
    }
    return alerts;
  },

  // ===== SIMULATE =====
  async simulate(ingredientName, priceChangePct) {
    const [recipes, productions, lastCMV] = await Promise.all([
      base44.entities.Recipe.filter({ active: true, deleted_at: null }, "name", 500).catch(() => []),
      base44.entities.ProductionRecord.filter({ status: "concluida", deleted_at: null }, "-production_date", 500).catch(() => []),
      base44.entities.CMVRecord.filter({ status: "ativo", deleted_at: null }, "-calculated_at", 1).catch(() => []),
    ]);

    if (!lastCMV[0]) return null;
    const current = lastCMV[0];
    const currentCMV = current.cost_goods_sold || 0;
    const revenueNet = current.revenue_net || 0;

    // Calcular quanto o ingrediente impacta no custo total
    let affectedCost = 0;
    for (const r of recipes) {
      for (const ing of (r.ingredients || [])) {
        if (ing.name?.toLowerCase().includes(ingredientName.toLowerCase())) {
          const recipeProductions = productions.filter(p => p.recipe_id === r.id);
          for (const p of recipeProductions) {
            const ratio = p.planned_quantity > 0 ? p.produced_quantity / p.planned_quantity : 1;
            affectedCost += (ing.quantity || 0) * ratio * (ing.unit_cost || 0);
          }
        }
      }
    }

    const costIncrease = affectedCost * (priceChangePct / 100);
    const newCost = currentCMV + costIncrease;
    const newCMVPct = revenueNet > 0 ? (newCost / revenueNet) * 100 : 0;
    const newGrossProfit = revenueNet - newCost;
    const newMarginPct = revenueNet > 0 ? (newGrossProfit / revenueNet) * 100 : 0;

    // Projetar impacto
    const monthlyVolume = revenueNet;
    const weeklyImpact = costIncrease / 4;
    const monthlyImpact = costIncrease;
    const annualImpact = costIncrease * 12;

    return {
      current: {
        cmv_pct: current.cmv_pct || 0,
        cost: currentCMV,
        gross_profit: current.gross_profit || 0,
        margin_pct: current.margin_pct || 0,
      },
      simulated: {
        cmv_pct: newCMVPct,
        cost: newCost,
        gross_profit: newGrossProfit,
        margin_pct: newMarginPct,
      },
      diff: {
        cmv: newCMVPct - (current.cmv_pct || 0),
        cost: costIncrease,
        margin: newMarginPct - (current.margin_pct || 0),
        profit: -costIncrease,
      },
      impact: {
        weekly: weeklyImpact,
        monthly: monthlyImpact,
        annual: annualImpact,
      },
      ingredient_name: ingredientName,
      price_change_pct: priceChangePct,
      affected_cost: affectedCost,
    };
  },

  // ===== IFOOD IMPORT =====
  async importIFood(data) {
    const { week, period_start, period_end, gross_value, fees, commissions, campaigns, chargebacks, refunds, cancellations, order_count, file_url, file_type } = data;

    if (!week) throw new Error("week e obrigatorio");

    const net_value = (gross_value || 0) - (fees || 0) - (commissions || 0) - (chargebacks || 0) - (refunds || 0) - (cancellations || 0) + (campaigns || 0);
    const average_ticket = (order_count || 0) > 0 ? net_value / order_count : 0;

    const record = await base44.entities.IFoodReceipt.create({
      week,
      period_start,
      period_end,
      gross_value: gross_value || 0,
      fees: fees || 0,
      commissions: commissions || 0,
      campaigns: campaigns || 0,
      chargebacks: chargebacks || 0,
      refunds: refunds || 0,
      cancellations: cancellations || 0,
      net_value,
      order_count: order_count || 0,
      average_ticket,
      file_url,
      file_type,
      status: "importado",
      confirmed: false,
      version: 1,
    });

    await Core.audit({
      audit_action: "import",
      module: "cmv",
      entity_type: "IFoodReceipt",
      entity_id: record.id,
      details: `Importação iFood semana ${week}: ${brl(gross_value)} bruto, ${brl(net_value)} líquido`,
    });

    return record;
  },

  async confirmIFood(id, confirmedBy) {
    const record = await base44.entities.IFoodReceipt.get(id).catch(() => null);
    if (!record) throw new Error("Registro nao encontrado");

    await base44.entities.IFoodReceipt.update(id, {
      confirmed: true,
      confirmed_by: confirmedBy || "Sistema",
      confirmed_at: new Date().toISOString(),
      status: "recebido",
      version: (record.version || 1) + 1,
    });

    // Recalcular CMV apos confirmacao
    await this.calculate("monthly", null, "ifood_import");

    return { id, confirmed: true };
  },

  // ===== GOALS =====
  async setGoal(data) {
    const { name, period_type = "monthly", max_cmv_pct, target_margin_pct, category, channel, created_by_name } = data;
    if (!name || max_cmv_pct === undefined) throw new Error("name e max_cmv_pct sao obrigatorios");

    const goal = await base44.entities.CMVGoal.create({
      name,
      period_type,
      max_cmv_pct,
      target_margin_pct: target_margin_pct || 30,
      category: category || "",
      channel: channel || "",
      active: true,
      created_by_name: created_by_name || "Sistema",
    });

    await Core.audit({
      audit_action: "create",
      module: "cmv",
      entity_type: "CMVGoal",
      entity_id: goal.id,
      details: `Meta CMV criada: ${name} — max ${max_cmv_pct}%`,
    });

    return goal;
  },

  // ===== GET LATEST =====
  async getLatest(periodType = null) {
    const filter = { status: "ativo", deleted_at: null };
    if (periodType) filter.period_type = periodType;
    const records = await base44.entities.CMVRecord.filter(filter, "-calculated_at", 10).catch(() => []);
    return records[0] || null;
  },

  // ===== HISTORY =====
  async getHistory(limit = 30) {
    return await base44.entities.CMVRecord.filter({ status: "ativo", deleted_at: null }, "-calculated_at", limit).catch(() => []);
  },
};

export { brl, todayStr };
export default CMV;