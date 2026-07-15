import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/coreEngine";
import { EventBus } from "@/lib/eventBus";

const brl = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const todayStr = () => new Date().toISOString().slice(0, 10);

/**
 * RecipeEngine — Motor de Receitas Inteligentes (Documento 008)
 *
 * Responsavel por:
 * - Ficha tecnica completa (com versionamento)
 * - Calculo automatico de custos (sempre baseado em estoque/preco atual)
 * - Controle de rendimento (peso bruto/liquido, perda, encolhimento)
 * - Composicao de combos
 * - Adicionais (bacon, cheddar, etc.)
 * - Simulador de alteracoes
 * - Substituicao de ingredientes
 * - Calculo de margem, markup, CMV
 * - Alertas automaticos
 * - Dashboard de rentabilidade
 * - Integracao com Core Engine, Inventory Engine, Financial Center
 */

export const RE = {
  // ===== CALCULATE RECIPE COST (Automatic) =====
  async calculateRecipeCost(recipeId) {
    const recipe = await base44.entities.Recipe.get(recipeId).catch(() => null);
    if (!recipe) return null;

    let totalCost = 0;
    const ingredients = [];

    for (const ing of (recipe.ingredients || [])) {
      // Buscar custo medio do estoque
      const stocks = await base44.entities.Stock.filter({
        product_id: ing.product_id || ing.ingredient_id,
        deleted_at: null,
      }, "-created_date", 1).catch(() => []);

      const unitCost = stocks[0]?.average_cost || stocks[0]?.last_cost || ing.unit_cost || 0;
      const correctionFactor = ing.correction_factor || 1;
      const adjustedQty = (ing.quantity || 0) * correctionFactor;
      const ingCost = adjustedQty * unitCost;
      totalCost += ingCost;

      ingredients.push({
        ...ing,
        unit_cost: unitCost,
        total_cost: ingCost,
        adjusted_quantity: adjustedQty,
      });
    }

    const yieldQty = recipe.yield_quantity || 1;
    const costPerUnit = totalCost / yieldQty;

    // Calcular margem se tem preco de venda
    const salePrice = recipe.sale_price || 0;
    const grossProfit = salePrice - totalCost;
    const marginPct = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0;
    const markup = totalCost > 0 ? (salePrice / totalCost) : 0;
    const cmvPct = salePrice > 0 ? (totalCost / salePrice) * 100 : 0;

    const history = recipe.history || [];
    history.push({
      action: "recalculo_custo",
      date: new Date().toISOString(),
      user: "Sistema",
      reason: "Recalculo automatico de custo",
      cost_total: totalCost,
      cost_per_unit: costPerUnit,
    });

    await base44.entities.Recipe.update(recipeId, {
      ingredients,
      cost_total: totalCost,
      cost_per_unit: costPerUnit,
      gross_profit: grossProfit,
      margin_pct: marginPct,
      markup,
      cmv_pct: cmvPct,
      contribution: grossProfit,
      last_calculated_at: new Date().toISOString(),
      history,
      version: (recipe.version || 1) + 1,
    });

    // Event Bus corporativo — RECIPE_UPDATED
    EventBus.publish({
      event_type: "recipe_updated",
      module: "producao",
      entity_type: "Recipe",
      entity_id: recipeId,
      payload: { recipe_id: recipeId, recipe_name: recipe.name, cost_total: totalCost, cost_per_unit: costPerUnit, margin_pct: marginPct, cmv_pct: cmvPct, gross_profit: grossProfit, user: "Sistema" },
    }).catch(() => {});

    return { totalCost, costPerUnit, ingredients, marginPct, cmvPct, grossProfit };
  },

  // ===== CALCULATE MARGIN =====
  async calculateMargin(recipeId, salePrice) {
    const recipe = await base44.entities.Recipe.get(recipeId).catch(() => null);
    if (!recipe) return null;

    const costTotal = recipe.cost_total || 0;
    const grossProfit = salePrice - costTotal;
    const marginPct = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0;
    const markup = costTotal > 0 ? (salePrice / costTotal) : 0;
    const cmvPct = salePrice > 0 ? (costTotal / salePrice) * 100 : 0;
    const netProfit = grossProfit; // Simplificado: sem despesas operacionais aqui

    const history = recipe.history || [];
    history.push({
      action: "margem_calculada",
      date: new Date().toISOString(),
      user: "Sistema",
      sale_price: salePrice,
      margin_pct: marginPct,
    });

    await base44.entities.Recipe.update(recipeId, {
      sale_price: salePrice,
      gross_profit: grossProfit,
      net_profit: netProfit,
      margin_pct: marginPct,
      markup,
      cmv_pct: cmvPct,
      contribution: grossProfit,
      history,
      version: (recipe.version || 1) + 1,
    });

    return { salePrice, grossProfit, netProfit, marginPct, markup, cmvPct };
  },

  // ===== SIMULATE CHANGE =====
  async simulateChange(recipeId, changes) {
    const recipe = await base44.entities.Recipe.get(recipeId).catch(() => null);
    if (!recipe) return null;

    // Aplicar alteracoes simuladas
    const simulatedIngredients = (recipe.ingredients || []).map(ing => {
      const change = changes.ingredients?.find(c => c.index === ing._idx || c.name === ing.name);
      if (change) {
        return {
          ...ing,
          quantity: change.quantity ?? ing.quantity,
          unit_cost: change.unit_cost ?? ing.unit_cost,
        };
      }
      return ing;
    });

    // Se mudou preco de venda
    const simulatedSalePrice = (changes.sale_price ?? recipe.sale_price) || 0;

    // Recalcular custo
    let simulatedCost = 0;
    for (const ing of simulatedIngredients) {
      simulatedCost += (ing.quantity || 0) * (ing.unit_cost || 0);
    }

    const costPerUnit = simulatedCost / (recipe.yield_quantity || 1);
    const grossProfit = simulatedSalePrice - simulatedCost;
    const marginPct = simulatedSalePrice > 0 ? (grossProfit / simulatedSalePrice) * 100 : 0;
    const cmvPct = simulatedSalePrice > 0 ? (simulatedCost / simulatedSalePrice) * 100 : 0;

    // Calcular impacto
    const currentCost = recipe.cost_total || 0;
    const currentMargin = recipe.margin_pct || 0;
    const costDiff = simulatedCost - currentCost;
    const marginDiff = marginPct - currentMargin;

    // Projetar impacto mensal/anual (assumindo volume medio)
    const productions = await base44.entities.ProductionRecord.filter({
      recipe_id: recipeId,
      status: "concluida",
      deleted_at: null,
    }, "-production_date", 500).catch(() => []);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentProds = productions.filter(p => new Date(p.production_date) >= thirtyDaysAgo);
    const monthlyVolume = recentProds.reduce((s, p) => s + (p.produced_quantity || 0), 0);
    const monthlyImpact = costDiff * monthlyVolume;
    const annualImpact = monthlyImpact * 12;

    return {
      current: {
        cost_total: currentCost,
        cost_per_unit: currentCost / (recipe.yield_quantity || 1),
        margin_pct: currentMargin,
        cmv_pct: recipe.cmv_pct || 0,
        gross_profit: recipe.gross_profit || 0,
      },
      simulated: {
        cost_total: simulatedCost,
        cost_per_unit: costPerUnit,
        margin_pct: marginPct,
        cmv_pct: cmvPct,
        gross_profit: grossProfit,
        sale_price: simulatedSalePrice,
      },
      diff: {
        cost: costDiff,
        margin: marginDiff,
        cmv: cmvPct - (recipe.cmv_pct || 0),
      },
      impact: {
        monthly_volume: monthlyVolume,
        monthly_cost_impact: monthlyImpact,
        annual_cost_impact: annualImpact,
      },
    };
  },

  // ===== SUBSTITUTE INGREDIENT =====
  async substituteIngredient(recipeId, ingredientIdx, newProductId, newProductName, newUnitCost, reason) {
    const recipe = await base44.entities.Recipe.get(recipeId).catch(() => null);
    if (!recipe) return null;

    const ingredients = [...(recipe.ingredients || [])];
    const oldIng = ingredients[ingredientIdx];
    if (!oldIng) return null;

    // Snapshot para historico
    const snapshot = { ...oldIng };

    ingredients[ingredientIdx] = {
      ...oldIng,
      product_id: newProductId,
      name: newProductName,
      unit_cost: newUnitCost,
      total_cost: (oldIng.quantity || 0) * newUnitCost,
    };

    const costTotal = ingredients.reduce((s, i) => s + (i.total_cost || 0), 0);
    const costPerUnit = costTotal / (recipe.yield_quantity || 1);

    const history = recipe.history || [];
    history.push({
      action: "substituicao",
      date: new Date().toISOString(),
      user: "Sistema",
      reason: reason || "Substituicao de ingrediente",
      before: snapshot,
      after: { ...ingredients[ingredientIdx] },
    });

    await base44.entities.Recipe.update(recipeId, {
      ingredients,
      cost_total: costTotal,
      cost_per_unit: costPerUnit,
      change_reason: reason,
      history,
      version: (recipe.version || 1) + 1,
    });

    // Recalcular margem
    if (recipe.sale_price) {
      await this.calculateMargin(recipeId, recipe.sale_price);
    }

    await Core.audit({
      audit_action: "update",
      module: "receitas",
      entity_type: "Recipe",
      entity_id: recipeId,
      details: `Substituiu ingrediente: ${oldIng.name} -> ${newProductName}`,
    });

    return { costTotal, costPerUnit };
  },

  // ===== CREATE COMBO =====
  async createCombo(data) {
    const { name, category, combo_items, sale_price, description, product_id, product_name } = data;

    if (!name || !combo_items || combo_items.length === 0) {
      throw new Error("name e combo_items sao obrigatorios");
    }

    // Buscar receitas dos itens do combo
    const items = [];
    let totalCost = 0;

    for (const item of combo_items) {
      const recipe = await base44.entities.Recipe.get(item.recipe_id).catch(() => null);
      if (!recipe) continue;

      const qty = item.quantity || 1;
      const itemCost = (recipe.cost_per_unit || 0) * qty;
      totalCost += itemCost;

      items.push({
        recipe_id: item.recipe_id,
        name: recipe.name,
        quantity: qty,
        unit_cost: recipe.cost_per_unit || 0,
        total_cost: itemCost,
      });
    }

    const grossProfit = sale_price - totalCost;
    const marginPct = sale_price > 0 ? (grossProfit / sale_price) * 100 : 0;
    const markup = totalCost > 0 ? (sale_price / totalCost) : 0;
    const cmvPct = sale_price > 0 ? (totalCost / sale_price) * 100 : 0;

    const count = await base44.entities.Recipe.filter({ is_combo: true }, "-created_date", 1).catch(() => []);
    const seq = (count[0]?.recipe_code?.match(/(\d+)$/)?.[1] || 0) + 1;
    const code = `COMBO-${String(seq).padStart(3, "0")}`;

    const combo = await base44.entities.Recipe.create({
      name,
      recipe_code: code,
      category: category || "combos",
      description,
      product_id,
      product_name: product_name || name,
      is_combo: true,
      combo_items: items,
      yield_quantity: 1,
      yield_unit: "un",
      ingredients: [],
      cost_total: totalCost,
      cost_per_unit: totalCost,
      sale_price,
      gross_profit: grossProfit,
      margin_pct: marginPct,
      markup,
      cmv_pct: cmvPct,
      contribution: grossProfit,
      history: [{ action: "criacao_combo", date: new Date().toISOString(), user: "Sistema" }],
      status: "ativo",
      active: true,
    });

    await Core.audit({
      audit_action: "create",
      module: "receitas",
      entity_type: "Recipe",
      entity_id: combo.id,
      details: `Combo criado: ${name} (${code}) — ${brl(totalCost)}`,
    });

    return combo;
  },

  // ===== ADD ADDITION =====
  async createAddition(data) {
    const { name, product_id, product_name, quantity, unit, unit_cost, addition_price, category } = data;

    if (!name) throw new Error("name e obrigatorio");

    const totalCost = (quantity || 0) * (unit_cost || 0);
    const grossProfit = (addition_price || 0) - totalCost;
    const marginPct = (addition_price || 0) > 0 ? (grossProfit / (addition_price || 0)) * 100 : 0;

    const count = await base44.entities.Recipe.filter({ is_addition: true }, "-created_date", 1).catch(() => []);
    const seq = (count[0]?.recipe_code?.match(/(\d+)$/)?.[1] || 0) + 1;
    const code = `ADC-${String(seq).padStart(3, "0")}`;

    const addition = await base44.entities.Recipe.create({
      name,
      recipe_code: code,
      category: category || "adicionais",
      product_id,
      product_name: product_name || name,
      is_addition: true,
      addition_price: addition_price || 0,
      yield_quantity: quantity || 1,
      yield_unit: unit || "un",
      ingredients: [{ product_id, name: product_name || name, quantity, unit, unit_cost, total_cost: totalCost }],
      cost_total: totalCost,
      cost_per_unit: totalCost,
      sale_price: addition_price || 0,
      gross_profit: grossProfit,
      margin_pct: marginPct,
      markup: totalCost > 0 ? (addition_price || 0) / totalCost : 0,
      cmv_pct: (addition_price || 0) > 0 ? (totalCost / (addition_price || 0)) * 100 : 0,
      contribution: grossProfit,
      history: [{ action: "criacao_adicional", date: new Date().toISOString() }],
      status: "ativo",
      active: true,
    });

    return addition;
  },

  // ===== DASHBOARD (Rentabilidade) =====
  async getDashboard() {
    const recipes = await base44.entities.Recipe.filter({ active: true, deleted_at: null }, "name", 500).catch(() => []);

    const withMargin = recipes.filter(r => !r.is_addition && r.sale_price > 0);

    // Mais lucrativas
    const mostProfitable = [...withMargin].sort((a, b) => (b.gross_profit || 0) - (a.gross_profit || 0)).slice(0, 10);

    // Menos lucrativas
    const leastProfitable = [...withMargin].sort((a, b) => (a.gross_profit || 0) - (b.gross_profit || 0)).slice(0, 10);

    // Maior CMV
    const highestCMV = [...withMargin].sort((a, b) => (b.cmv_pct || 0) - (a.cmv_pct || 0)).slice(0, 10);

    // Menor CMV
    const lowestCMV = [...withMargin].sort((a, b) => (a.cmv_pct || 0) - (b.cmv_pct || 0)).slice(0, 10);

    // Maior margem
    const highestMargin = [...withMargin].sort((a, b) => (b.margin_pct || 0) - (a.margin_pct || 0)).slice(0, 10);

    // Receitas criticas (margem < 20% ou CMV > 50%)
    const critical = withMargin.filter(r => (r.margin_pct || 0) < 20 || (r.cmv_pct || 0) > 50);

    // Sem ficha tecnica (sem ingredientes)
    const noIngredients = recipes.filter(r => !r.is_combo && !r.is_addition && (!r.ingredients || r.ingredients.length === 0));

    // Sem preco de venda
    const noPrice = recipes.filter(r => !r.is_addition && !r.sale_price);

    // Resumo
    const totalCost = recipes.reduce((s, r) => s + (r.cost_total || 0), 0);
    const totalRevenue = recipes.reduce((s, r) => s + (r.sale_price || 0), 0);
    const totalProfit = recipes.reduce((s, r) => s + (r.gross_profit || 0), 0);
    const avgMargin = withMargin.length > 0 ? withMargin.reduce((s, r) => s + (r.margin_pct || 0), 0) / withMargin.length : 0;
    const avgCMV = withMargin.length > 0 ? withMargin.reduce((s, r) => s + (r.cmv_pct || 0), 0) / withMargin.length : 0;

    const combos = recipes.filter(r => r.is_combo);
    const additions = recipes.filter(r => r.is_addition);

    return {
      summary: {
        totalRecipes: recipes.length,
        totalCombos: combos.length,
        totalAdditions: additions.length,
        totalCost,
        totalRevenue,
        totalProfit,
        avgMargin,
        avgCMV,
        criticalCount: critical.length,
        noIngredientsCount: noIngredients.length,
        noPriceCount: noPrice.length,
      },
      mostProfitable,
      leastProfitable,
      highestCMV,
      lowestCMV,
      highestMargin,
      critical,
      noIngredients,
      noPrice,
      combos,
      additions,
    };
  },

  // ===== ALERTS =====
  async getAlerts() {
    const [recipes, stocks, suppliers] = await Promise.all([
      base44.entities.Recipe.filter({ active: true, deleted_at: null }, "name", 500).catch(() => []),
      base44.entities.Stock.filter({ deleted_at: null }, "product_name", 500).catch(() => []),
      base44.entities.Supplier.filter({ active: true }, "name", 500).catch(() => []),
    ]);

    const alerts = [];

    for (const recipe of recipes) {
      // Receita sem ficha tecnica
      if (!recipe.is_combo && !recipe.is_addition && (!recipe.ingredients || recipe.ingredients.length === 0)) {
        alerts.push({ severity: "high", type: "sem_ficha", recipe_id: recipe.id, recipe_name: recipe.name, message: `Receita "${recipe.name}" sem ficha técnica (sem ingredientes)` });
      }

      // Ingrediente sem custo
      for (const ing of (recipe.ingredients || [])) {
        if (!ing.unit_cost || ing.unit_cost === 0) {
          alerts.push({ severity: "medium", type: "ingrediente_sem_custo", recipe_id: recipe.id, recipe_name: recipe.name, message: `Ingrediente "${ing.name}" sem custo na receita "${recipe.name}"` });
        }
      }

      // Margem abaixo da meta (< 20%)
      if (recipe.sale_price > 0 && (recipe.margin_pct || 0) < 20) {
        alerts.push({ severity: "high", type: "margem_baixa", recipe_id: recipe.id, recipe_name: recipe.name, message: `Margem baixa (${(recipe.margin_pct || 0).toFixed(0)}%) na receita "${recipe.name}"` });
      }

      // CMV elevado (> 50%)
      if (recipe.sale_price > 0 && (recipe.cmv_pct || 0) > 50) {
        alerts.push({ severity: "high", type: "cmv_elevado", recipe_id: recipe.id, recipe_name: recipe.name, message: `CMV elevado (${(recipe.cmv_pct || 0).toFixed(0)}%) na receita "${recipe.name}"` });
      }

      // Sem preco de venda
      if (!recipe.is_addition && !recipe.sale_price) {
        alerts.push({ severity: "medium", type: "sem_preco", recipe_id: recipe.id, recipe_name: recipe.name, message: `Receita "${recipe.name}" sem preço de venda` });
      }

      // Receita desatualizada (nao recalculada ha mais de 7 dias)
      if (recipe.last_calculated_at) {
        const daysSince = Math.floor((Date.now() - new Date(recipe.last_calculated_at).getTime()) / 86400000);
        if (daysSince > 7) {
          alerts.push({ severity: "low", type: "desatualizada", recipe_id: recipe.id, recipe_name: recipe.name, message: `Receita "${recipe.name}" sem recálculo há ${daysSince} dias` });
        }
      }
    }

    // Fornecedor sem preco atualizado
    for (const supplier of suppliers) {
      if (supplier.active && !supplier.last_purchase_date) {
        // Simplificado: apenas alerta se nao tem ultima compra
      }
    }

    // Ingredientes descontinuados (produto inativo vinculado)
    for (const recipe of recipes) {
      for (const ing of (recipe.ingredients || [])) {
        if (ing.product_id) {
          const product = await base44.entities.Product.get(ing.product_id).catch(() => null);
          if (product && !product.active) {
            alerts.push({ severity: "high", type: "ingrediente_descontinuado", recipe_id: recipe.id, recipe_name: recipe.name, message: `Ingrediente "${ing.name}" descontinuado na receita "${recipe.name}"` });
          }
        }
      }
    }

    return alerts.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    });
  },

  // ===== RECALCULATE ALL COSTS =====
  async recalculateAllCosts() {
    const recipes = await base44.entities.Recipe.filter({ active: true, deleted_at: null }, "name", 500).catch(() => []);
    const results = [];

    for (const recipe of recipes) {
      try {
        const result = await this.calculateRecipeCost(recipe.id);
        results.push({ recipe_id: recipe.id, name: recipe.name, success: true, ...result });
      } catch (e) {
        results.push({ recipe_id: recipe.id, name: recipe.name, success: false, error: e.message });
      }
    }

    return { total: recipes.length, recalculated: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length };
  },

  // ===== AI INSIGHTS =====
  async getAIInsights() {
    const [recipes, stocks, productions] = await Promise.all([
      base44.entities.Recipe.filter({ active: true, deleted_at: null }, "name", 500).catch(() => []),
      base44.entities.Stock.filter({ deleted_at: null }, "product_name", 500).catch(() => []),
      base44.entities.ProductionRecord.filter({ status: "concluida", deleted_at: null }, "-production_date", 500).catch(() => []),
    ]);

    const insights = [];

    // Receitas caras (custo acima da media)
    const avgCost = recipes.filter(r => !r.is_addition).reduce((s, r) => s + (r.cost_total || 0), 0) / (recipes.length || 1);
    const expensiveRecipes = recipes.filter(r => !r.is_addition && (r.cost_total || 0) > avgCost * 1.5);
    for (const r of expensiveRecipes.slice(0, 5)) {
      insights.push({
        type: "receita_cara",
        severity: "warning",
        recipe_id: r.id,
        recipe_name: r.name,
        message: `"${r.name}" custa ${brl(r.cost_total)} — ${( ((r.cost_total / avgCost - 1) * 100)).toFixed(0)}% acima da média. Considere substituir ingredientes ou renegociar preços.`,
      });
    }

    // Sugerir reducao de custo
    for (const recipe of recipes.filter(r => !r.is_addition && r.ingredients?.length > 0).slice(0, 20)) {
      const expensiveIngs = (recipe.ingredients || []).filter(ing => (ing.unit_cost || 0) > 0).sort((a, b) => (b.total_cost || 0) - (a.total_cost || 0));
      if (expensiveIngs[0] && (expensiveIngs[0].total_cost || 0) > (recipe.cost_total || 0) * 0.3) {
        insights.push({
          type: "reducao_custo",
          severity: "info",
          recipe_id: recipe.id,
          recipe_name: recipe.name,
          message: `"${recipe.name}": ingrediente "${expensiveIngs[0].name}" representa ${(((expensiveIngs[0].total_cost || 0) / (recipe.cost_total || 1)) * 100).toFixed(0)}% do custo. Buscar alternativas pode reduzir o custo total.`,
        });
      }
    }

    // Comparar margens
    const lowMargin = recipes.filter(r => r.sale_price > 0 && (r.margin_pct || 0) < 30 && !r.is_addition);
    for (const r of lowMargin.slice(0, 5)) {
      insights.push({
        type: "margem_baixa",
        severity: "warning",
        recipe_id: r.id,
        recipe_name: r.name,
        message: `"${r.name}" tem margem de ${(r.margin_pct || 0).toFixed(0)}%. Considere aumentar o preço (atual: ${brl(r.sale_price)}) ou reduzir custo (${brl(r.cost_total)}).`,
      });
    }

    // Receitas mais produzidas
    const productionCount = {};
    for (const p of productions) {
      const key = p.recipe_id || p.item;
      productionCount[key] = (productionCount[key] || 0) + (p.produced_quantity || 1);
    }

    return insights;
  },

  // ===== RECIPE HISTORY =====
  async getHistory(recipeId) {
    const recipe = await base44.entities.Recipe.get(recipeId).catch(() => null);
    if (!recipe) return null;
    return recipe.history || [];
  },
};

export { brl, todayStr };
export default RE;