import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/coreEngine";
import { IE, brl } from "@/lib/inventoryEngine";

const todayStr = () => new Date().toISOString().slice(0, 10);
const minutesBetween = (s, e) => Math.round((new Date(e) - new Date(s)) / 60000);

/**
 * ProductionEngine — motor central do Centro de Produção Inteligente.
 *
 * Responsavel por:
 * - Ordens de producao (lifecycle completo)
 * - Baixa automatica de ingredientes no estoque ao concluir
 * - Calculo de rendimento, eficiencia, custos
 * - Painel operacional (producoes em andamento, atrasadas, perdas, eficiencia)
 * - Sugestoes de producao baseadas em historico e estoque
 * - Integracao com Inventory Engine, Core Engine, Data Engine
 */

export const PE = {
  // ===== CREATE PRODUCTION ORDER =====
  async createProductionOrder(data) {
    const {
      recipe_id, recipe_name, item, product_id, production_center,
      planned_quantity, unit = "un", responsible = "Sistema", team = [],
      priority = "media", production_date = todayStr(), expected_time_min = 0, notes = "",
    } = data;

    if (!item || !planned_quantity) throw new Error("item e planned_quantity sao obrigatorios");

    // Buscar recipe para herdar campos
    let recipe = null;
    if (recipe_id) {
      recipe = await base44.entities.Recipe.get(recipe_id).catch(() => null);
    }

    const count = await base44.entities.ProductionRecord.filter({}, "-created_date", 1).catch(() => []);
    const seq = (count[0]?.production_code?.match(/(\d+)$/)?.[1] || 0) + 1;
    const production_code = `PROD-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;

    const expectedYield = recipe?.yield_quantity || planned_quantity;
    const expectedTime = expected_time_min || recipe?.preparation_time || 0;

    const record = await base44.entities.ProductionRecord.create({
      production_code,
      production_center: production_center || recipe?.production_center || "geral",
      recipe_id: recipe_id || recipe?.id,
      recipe_name: recipe_name || recipe?.name,
      item,
      product_id: product_id || recipe?.product_id,
      planned_quantity,
      produced_quantity: 0,
      lost_quantity: 0,
      reused_quantity: 0,
      expected_yield: expectedYield,
      unit,
      production_date,
      expected_time_min: expectedTime,
      responsible,
      team,
      team_size: team.length || 1,
      priority,
      notes,
      status: "planejada",
      history: [{ action: "criacao", date: new Date().toISOString(), user: responsible, status: "planejada" }],
    });

    await Core.audit({
      audit_action: "create",
      module: "producao",
      entity_type: "ProductionRecord",
      entity_id: record.id,
      details: `Ordem de produção criada: ${production_code} — ${item} (${planned_quantity} ${unit})`,
    });

    return record;
  },

  // ===== STATUS TRANSITIONS =====
  async updateStatus(id, status, extra = {}) {
    const record = await base44.entities.ProductionRecord.get(id).catch(() => null);
    if (!record) throw new Error("Produção não encontrada");

    const updates = { status, ...extra };
    const now = new Date().toISOString();
    const history = record.history || [];

    if (status === "liberada") {
      history.push({ action: "liberacao", date: now, status });
    } else if (status === "em_producao") {
      updates.start_time = now;
      history.push({ action: "inicio", date: now, status, user: extra.responsible });
    } else if (status === "pausada") {
      const pauseStart = now;
      const pauses = record.pauses || [];
      pauses.push({ start: pauseStart, reason: extra.pause_reason || "", duration_min: 0 });
      updates.pauses = pauses;
      history.push({ action: "pausa", date: now, status, reason: extra.pause_reason });
    } else if (status === "em_producao" && record.status === "pausada") {
      // Retomar de pausa
      const pauses = record.pauses || [];
      const lastPause = pauses[pauses.length - 1];
      if (lastPause && !lastPause.end) {
        lastPause.end = now;
        lastPause.duration_min = minutesBetween(lastPause.start, now);
      }
      updates.pauses = pauses;
      history.push({ action: "retomada", date: now, status });
    } else if (status === "concluida") {
      updates.end_time = now;
      if (record.start_time) {
        const totalMin = minutesBetween(record.start_time, now);
        const pauses = record.pauses || [];
        const pauseTotal = pauses.reduce((s, p) => s + (p.duration_min || 0), 0);
        updates.total_time_min = totalMin;
        updates.productive_time_min = totalMin - pauseTotal;
        updates.unproductive_time_min = pauseTotal;
      }
      history.push({ action: "conclusao", date: now, status, user: extra.responsible });
    } else if (status === "cancelada" || status === "reprovada") {
      history.push({ action: status, date: now, status, reason: extra.reason });
    }

    updates.history = history;
    updates.version = (record.version || 1) + 1;

    await base44.entities.ProductionRecord.update(id, updates);

    await Core.audit({
      audit_action: status === "concluida" ? "confirm" : status === "cancelada" ? "delete" : "update",
      module: "producao",
      entity_type: "ProductionRecord",
      entity_id: id,
      details: `Produção ${record.production_code}: ${status}`,
    });

    return { id, status };
  },

  // ===== FINALIZE PRODUCTION (Auto stock deduction) =====
  async finalizeProduction(id, data) {
    const {
      produced_quantity, lost_quantity = 0, reused_quantity = 0,
      loss_type, loss_reason, quality_checklist, photos = [], notes, responsible = "Sistema",
    } = data;

    const record = await base44.entities.ProductionRecord.get(id).catch(() => null);
    if (!record) throw new Error("Produção não encontrada");

    let recipe = null;
    if (record.recipe_id) {
      recipe = await base44.entities.Recipe.get(record.recipe_id).catch(() => null);
    }

    // Calcular rendimento
    const expectedYield = record.expected_yield || record.planned_quantity || 0;
    const actualYield = produced_quantity;
    const yieldDiff = expectedYield > 0 ? ((actualYield - expectedYield) / expectedYield) * 100 : 0;
    const efficiency = record.planned_quantity > 0 ? (produced_quantity / record.planned_quantity) * 100 : 0;

    // Calcular custo dos ingredientes
    let costIngredients = 0;
    const movementIds = [];
    const ingredients = recipe?.ingredients || [];

    // Proporcao: produziu X do planejado
    const ratio = record.planned_quantity > 0 ? produced_quantity / record.planned_quantity : 1;

    for (const ing of ingredients) {
      const consumedQty = (ing.quantity || 0) * ratio;
      const unitCost = ing.unit_cost || ing.cost || 0;
      const totalCost = consumedQty * unitCost;
      costIngredients += totalCost;

      // Baixa automatica no estoque via Inventory Engine
      if (ing.product_id || ing.ingredient_id) {
        try {
          const movement = await IE.processMovement({
            product_id: ing.product_id || ing.ingredient_id,
            product_name: ing.name,
            movement_type: "producao",
            quantity: consumedQty,
            unit: ing.unit || record.unit || "un",
            unit_cost: unitCost,
            reason: `Produção ${record.production_code}`,
            responsible_name: responsible,
            origin_type: "ProductionRecord",
            origin_id: id,
          });
          if (movement?.id) movementIds.push(movement.id);
        } catch (e) { console.error("Erro baixa estoque:", e); }
      }
    }

    // Registrar perdas como movimento de perda
    if (lost_quantity > 0 && loss_type) {
      const lossCostPerUnit = costIngredients / (produced_quantity || 1);
      const lossTotalCost = lost_quantity * lossCostPerUnit;
      const losses = [{
        type: loss_type,
        quantity: lost_quantity,
        unit_cost: lossCostPerUnit,
        total_cost: lossTotalCost,
        reason: loss_reason || "",
        photos: [],
      }];

      await base44.entities.ProductionRecord.update(id, { losses });
    }

    const costTotal = costIngredients;
    const costPerUnit = produced_quantity > 0 ? costTotal / produced_quantity : 0;

    // Atualizar producao como concluida
    await this.updateStatus(id, "concluida", {
      produced_quantity,
      lost_quantity,
      reused_quantity,
      actual_yield: actualYield,
      yield_difference: yieldDiff,
      yield_reason: data.yield_reason || "",
      cost_ingredients: costIngredients,
      cost_total: costTotal,
      cost_per_unit: costPerUnit,
      efficiency_pct: efficiency,
      loss_type,
      loss_reason,
      quality_checklist,
      photos,
      notes,
      stock_movement_ids: movementIds,
      responsible,
    });

    // Entrada do produto acabado no estoque
    if (record.product_id && produced_quantity > 0) {
      try {
        await IE.processMovement({
          product_id: record.product_id,
          product_name: record.item,
          movement_type: "producao",
          quantity: produced_quantity,
          unit: record.unit || "un",
          unit_cost: costPerUnit,
          reason: `Produção ${record.production_code}`,
          responsible_name: responsible,
          origin_type: "ProductionRecord",
          origin_id: id,
          to_stock_type: "produto_acabado",
        });
      } catch (e) { console.error("Erro entrada produto:", e); }
    }

    return {
      production_code: record.production_code,
      produced_quantity,
      efficiency,
      cost_total: costTotal,
      cost_per_unit: costPerUnit,
      stock_movements: movementIds.length,
    };
  },

  // ===== OPERATIONAL DASHBOARD =====
  async getOperationalDashboard() {
    const [productions, recipes] = await Promise.all([
      base44.entities.ProductionRecord.filter({ deleted_at: { $exists: false } }, "-production_date", 500).catch(() => []),
      base44.entities.Recipe.filter({ active: true }, "name", 500).catch(() => []),
    ]);

    const today = todayStr();
    const todayProductions = productions.filter(p => (p.production_date || "").slice(0, 10) === today);

    // Em andamento
    const inProgress = productions.filter(p => p.status === "em_producao" || p.status === "liberada");
    const pending = productions.filter(p => p.status === "planejada");
    const paused = productions.filter(p => p.status === "pausada");

    // Atrasadas: planejadas/liberadas com data passada
    const overdue = productions.filter(p =>
      ["planejada", "liberada", "em_producao"].includes(p.status) &&
      p.production_date && p.production_date < today
    );

    // Concluidas hoje
    const completedToday = todayProductions.filter(p => p.status === "concluida");

    // Rendimento medio
    const withYield = productions.filter(p => p.status === "concluida" && p.expected_yield > 0);
    const avgYield = withYield.length > 0
      ? withYield.reduce((s, p) => s + (p.actual_yield || 0) / (p.expected_yield || 1) * 100, 0) / withYield.length
      : 0;

    // Perdas do dia
    const todayLosses = todayProductions.filter(p => (p.lost_quantity || 0) > 0);
    const todayLossQty = todayLosses.reduce((s, p) => s + (p.lost_quantity || 0), 0);

    // Eficiencia media
    const withEfficiency = productions.filter(p => p.status === "concluida" && p.efficiency_pct > 0);
    const avgEfficiency = withEfficiency.length > 0
      ? withEfficiency.reduce((s, p) => s + p.efficiency_pct, 0) / withEfficiency.length
      : 0;

    // Tempo medio
    const withTime = productions.filter(p => p.status === "concluida" && p.total_time_min > 0);
    const avgTime = withTime.length > 0
      ? withTime.reduce((s, p) => s + p.total_time_min, 0) / withTime.length
      : 0;

    // Custo total do dia
    const todayCost = completedToday.reduce((s, p) => s + (p.cost_total || 0), 0);

    // Perdas por tipo
    const lossesByType = {};
    for (const p of productions.filter(p => p.loss_type)) {
      lossesByType[p.loss_type] = (lossesByType[p.loss_type] || 0) + (p.lost_quantity || 0);
    }

    // Produtividade por funcionario
    const workerStats = {};
    for (const p of productions.filter(p => p.status === "concluida")) {
      const team = [p.responsible, ...(p.team || [])].filter(Boolean);
      for (const w of team) {
        if (!workerStats[w]) workerStats[w] = { name: w, count: 0, totalQty: 0, totalTime: 0 };
        workerStats[w].count++;
        workerStats[w].totalQty += p.produced_quantity || 0;
        workerStats[w].totalTime += p.total_time_min || 0;
      }
    }
    const workerRanking = Object.values(workerStats).map(w => ({
      ...w,
      avgTime: w.count > 0 ? w.totalTime / w.count : 0,
      perHour: w.totalTime > 0 ? w.totalQty / (w.totalTime / 60) : 0,
    })).sort((a, b) => b.totalQty - a.totalQty);

    // Alertas
    const alerts = [];
    for (const p of overdue.slice(0, 5)) {
      alerts.push({ severity: "urgent", message: `Produção atrasada: ${p.production_code} — ${p.item} (${p.production_date})` });
    }
    if (paused.length > 0) {
      alerts.push({ severity: "warning", message: `${paused.length} produção(ões) pausada(s)` });
    }
    if (todayLossQty > 0) {
      alerts.push({ severity: "warning", message: `Perdas hoje: ${todayLossQty} ${productions[0]?.unit || "un"}` });
    }

    return {
      summary: {
        inProgress: inProgress.length,
        pending: pending.length,
        overdue: overdue.length,
        completedToday: completedToday.length,
        avgYield,
        avgEfficiency,
        avgTime,
        todayLossQty,
        todayCost,
        totalRecipes: recipes.length,
      },
      inProgress,
      pending,
      overdue,
      completedToday,
      lossesByType,
      workerRanking,
      alerts,
      productionCenters: this._getProductionCenters(productions),
    };
  },

  _getProductionCenters(productions) {
    const centers = {};
    for (const p of productions) {
      const c = p.production_center || "geral";
      if (!centers[c]) centers[c] = { name: c, count: 0, completed: 0, totalQty: 0 };
      centers[c].count++;
      if (p.status === "concluida") centers[c].completed++;
      centers[c].totalQty += p.produced_quantity || 0;
    }
    return Object.values(centers);
  },

  // ===== SMART PRODUCTION SUGGESTIONS =====
  async getSuggestions() {
    const [productions, stocks, recipes] = await Promise.all([
      base44.entities.ProductionRecord.filter({ status: "concluida", deleted_at: { $exists: false } }, "-production_date", 500).catch(() => []),
      base44.entities.Stock.filter({ deleted_at: { $exists: false } }, "product_name", 500).catch(() => []),
      base44.entities.Recipe.filter({ active: true }, "name", 500).catch(() => []),
    ]);

    const suggestions = [];

    for (const recipe of recipes) {
      // Consumo medio diario (ultimos 30 dias)
      const recipeProductions = productions.filter(p => p.recipe_id === recipe.id);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recent = recipeProductions.filter(p => new Date(p.production_date) >= thirtyDaysAgo);
      const totalProduced = recent.reduce((s, p) => s + (p.produced_quantity || 0), 0);
      const avgDaily = totalProduced / 30;

      // Estoque atual do produto resultante
      const productStock = stocks.find(s => s.product_id === recipe.product_id);
      const currentStock = productStock?.quantity || 0;
      const coverageDays = productStock?.coverage_days || 0;

      // Verificar se tem ingredientes suficientes
      let canProduce = true;
      let missingIngredients = [];
      for (const ing of (recipe.ingredients || [])) {
        const ingStock = stocks.find(s => s.product_id === ing.product_id || s.product_id === ing.ingredient_id);
        const available = ingStock?.quantity || 0;
        if (available < (ing.quantity || 0)) {
          canProduce = false;
          missingIngredients.push({ name: ing.name, needed: ing.quantity, available });
        }
      }

      // Sugerir se cobertura baixa OU consumo medio alto
      if ((coverageDays > 0 && coverageDays < 3) || (avgDaily > 0 && currentStock < avgDaily * 2)) {
        const suggestedQty = avgDaily > 0 ? Math.ceil(avgDaily * 3) : (recipe.yield_quantity || 1);
        suggestions.push({
          recipe_id: recipe.id,
          recipe_name: recipe.name,
          product_name: recipe.product_name,
          production_center: recipe.production_center,
          avg_daily_consumption: avgDaily,
          current_stock: currentStock,
          coverage_days: coverageDays,
          suggested_qty: suggestedQty,
          unit: recipe.yield_unit || "un",
          can_produce: canProduce,
          missing_ingredients: missingIngredients,
          urgency: coverageDays <= 1 ? "critica" : coverageDays <= 2 ? "alta" : "media",
          estimated_cost: suggestedQty * (recipe.cost_per_unit || 0),
        });
      }
    }

    return suggestions.sort((a, b) => {
      const order = { critica: 0, alta: 1, media: 2 };
      return order[a.urgency] - order[b.urgency];
    });
  },

  // ===== RECIPE COST CALCULATION =====
  async calculateRecipeCost(recipeId) {
    const recipe = await base44.entities.Recipe.get(recipeId).catch(() => null);
    if (!recipe) return null;

    let totalCost = 0;
    const ingredients = [];

    for (const ing of (recipe.ingredients || [])) {
      // Buscar custo medio do estoque
      const stock = await base44.entities.Stock.filter({
        product_id: ing.product_id || ing.ingredient_id,
        deleted_at: { $exists: false },
      }, "-created_date", 1).catch(() => []);

      const unitCost = stock[0]?.average_cost || ing.unit_cost || ing.cost || 0;
      const ingCost = (ing.quantity || 0) * unitCost;
      totalCost += ingCost;

      ingredients.push({ ...ing, unit_cost: unitCost, total_cost: ingCost });
    }

    const yieldQty = recipe.yield_quantity || 1;
    const costPerUnit = totalCost / yieldQty;

    // Atualizar receita
    await base44.entities.Recipe.update(recipeId, {
      ingredients,
      cost_total: totalCost,
      cost_per_unit: costPerUnit,
      version: (recipe.version || 1) + 1,
    });

    return { totalCost, costPerUnit, ingredients };
  },
};

export { brl, todayStr };
export default PE;