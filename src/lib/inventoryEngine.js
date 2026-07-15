import { AppService } from "@/services";
import { Core } from "@/lib/coreEngine";
import { EventBus } from "@/lib/eventBus";

const brl = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const todayStr = () => new Date().toISOString().slice(0, 10);
const daysBetween = (d1, d2) => Math.ceil((new Date(d2) - new Date(d1)) / 86400000);

const INBOUND_TYPES = ["entrada", "compra", "producao", "bonificacao", "doacao", "ajuste"];
const OUTBOUND_TYPES = ["saida", "perda", "quebra", "vencimento", "consumo", "venda"];
const TRANSFER_TYPES = ["transferencia"];

/**
 * InventoryEngine — motor central do Centro de Estoque Inteligente.
 *
 * UNICO responsavel por alterar estoque. Nenhum outro modulo altera estoque diretamente.
 * DON BARON CORE 3.0: toda gravação/leitura passa por AppService (validação →
 * PersistenceEngine → RecoveryEngine → read-back → EventBus → auditoria → sync).
 * Erros são propagados (nunca silenciados).
 *
 * Toda movimentacao passa por processMovement(), que:
 * 1. Registra o movimento (com read-back + recovery + auditoria via AppService)
 * 2. Atualiza o Stock (quantidade, custo medio, valor total)
 * 3. Atualiza lotes (se aplicavel)
 * 4. Recalcula cobertura, ABC, giro
 * 5. Emite alertas automaticos + evento de domínio (stock_entry/exit_created)
 */

export const IE = {
  // ===== PROCESS MOVEMENT (Core) =====
  async processMovement(data) {
    const {
      product_id, product_name, movement_type, quantity, unit,
      unit_cost = 0, reason = "", batch_number = "", expiry_date = "",
      document_id = "", document_number = "", supplier_id = "", supplier_name = "",
      from_stock_type = "", to_stock_type = "", photos = [], notes = "",
      responsible_name = "Sistema", origin_type = "", origin_id = "",
    } = data;

    if (!product_id || !movement_type || quantity === undefined) {
      throw new Error("product_id, movement_type e quantity sao obrigatorios");
    }

    const movementDate = new Date().toISOString();
    const totalCost = (unit_cost || 0) * quantity;

    // 1. Criar movimento (via AppService — read-back + recovery + evento movement_created + auditoria)
    const count = await AppService.find("Movement", {}, "-created_date", 1);
    const seq = (count[0]?.movement_code?.match(/(\d+)$/)?.[1] || 0) + 1;
    const movement_code = `MOV-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;

    const movement = await AppService.create("Movement", {
      movement_code,
      movement_type,
      product_id, product_name,
      quantity, unit,
      unit_cost, total_cost: totalCost,
      reason, batch_number, expiry_date,
      document_id, document_number,
      supplier_id, supplier_name,
      from_stock_type, to_stock_type,
      photos, notes,
      responsible_name,
      origin_type, origin_id,
      movement_date: movementDate,
      status: "ativo",
    }, { module: "estoque", validate: false });

    // 2. Atualizar Stock
    await this._updateStock(product_id, product_name, movement_type, quantity, unit_cost, to_stock_type, batch_number, expiry_date, supplier_id, supplier_name, movementDate);

    // 3. Auditoria (Core — complementar à auditoria automática do AppService)
    await Core.audit({
      audit_action: movement_type === "perda" || movement_type === "quebra" ? "delete" : movement_type === "entrada" || movement_type === "compra" ? "create" : "update",
      module: "estoque",
      entity_type: "Movement",
      entity_id: movement.id,
      details: `${movement_type.toUpperCase()}: ${product_name} — ${quantity} ${unit || ""} ${totalCost > 0 ? brl(totalCost) : ""} ${reason ? `(${reason})` : ""}`,
    });

    // 4. Event Bus corporativo — evento de domínio específico (entrada/saída)
    const isInbound = INBOUND_TYPES.includes(movement_type);
    EventBus.publish({
      event_type: isInbound ? "stock_entry_created" : "stock_exit_created",
      module: "estoque",
      entity_type: "Movement",
      entity_id: movement.id,
      payload: { movement_id: movement.id, movement_code, product_id, product_name, movement_type, quantity, unit, unit_cost, total_cost: totalCost, reason, supplier_id, supplier_name, document_id, responsible_name },
    }).catch(() => {});

    return movement;
  },

  // ===== INTERNAL: Update Stock =====
  async _updateStock(productId, productName, movementType, quantity, unitCost, stockType, batchNumber, expiryDate, supplierId, supplierName, movementDate) {
    // Buscar ou criar Stock
    let stocks = await AppService.find("Stock", { product_id: productId, deleted_at: null }, "-created_date", 10);
    const effectiveStockType = stockType || (stocks[0]?.stock_type || "materia_prima");
    let stock = stocks.find(s => s.stock_type === effectiveStockType);

    if (!stock) {
      // Buscar product para herdar min/ideal/max
      const product = await AppService.findOne("Product", productId);
      stock = await AppService.create("Stock", {
        product_id: productId,
        product_name: productName || product?.name,
        stock_type: effectiveStockType,
        quantity: 0,
        unit: product?.unit || "un",
        min_quantity: product?.min_quantity || 0,
        ideal_quantity: product?.ideal_quantity || 0,
        max_quantity: product?.max_quantity || 0,
        average_cost: 0,
        total_value: 0,
        last_cost: 0,
        status: "ativo",
      }, { module: "estoque", validate: false });
    }

    const oldQty = stock.quantity || 0;
    const oldAvgCost = stock.average_cost || 0;
    let newQty = oldQty;
    let newAvgCost = oldAvgCost;

    if (INBOUND_TYPES.includes(movementType)) {
      // Entrada: recalcula custo medio ponderado
      const totalOldValue = oldQty * oldAvgCost;
      const totalNewValue = quantity * (unitCost || 0);
      const combinedQty = oldQty + quantity;
      newQty = combinedQty;
      newAvgCost = combinedQty > 0 ? (totalOldValue + totalNewValue) / combinedQty : 0;
    } else if (OUTBOUND_TYPES.includes(movementType)) {
      // Saida: diminui quantidade, mantem custo medio
      newQty = Math.max(0, oldQty - quantity);
    } else if (TRANSFER_TYPES.includes(movementType)) {
      // Transferencia: remove do stock atual, cria/atualiza stock destino
      newQty = Math.max(0, oldQty - quantity);

      if (stockType && stockType !== effectiveStockType) {
        let destStock = stocks.find(s => s.stock_type === stockType);
        if (!destStock) {
          destStock = await AppService.create("Stock", {
            product_id: productId,
            product_name: productName,
            stock_type: stockType,
            quantity: 0,
            unit: stock.unit,
            min_quantity: stock.min_quantity,
            ideal_quantity: stock.ideal_quantity,
            max_quantity: stock.max_quantity,
            average_cost: oldAvgCost,
            total_value: 0,
            status: "ativo",
          }, { module: "estoque", validate: false });
        }
        await AppService.update("Stock", destStock.id, {
          quantity: (destStock.quantity || 0) + quantity,
          total_value: ((destStock.quantity || 0) + quantity) * (destStock.average_cost || oldAvgCost),
          last_movement_date: movementDate,
          last_movement_type: movementType,
          version: (destStock.version || 1) + 1,
        }, { module: "estoque", validate: false });
      }
    }

    const newTotalValue = newQty * newAvgCost;

    // Atualizar lotes
    let batches = stock.batches || [];
    if (batchNumber && (INBOUND_TYPES.includes(movementType))) {
      const existingBatch = batches.find(b => b.batch_number === batchNumber);
      if (existingBatch) {
        existingBatch.quantity += quantity;
      } else {
        batches.push({
          batch_number: batchNumber,
          supplier_id: supplierId,
          supplier_name: supplierName,
          nf_number: "",
          manufacture_date: "",
          expiry_date: expiryDate,
          quantity,
          unit_cost: unitCost,
          location: stock.physical_location || "",
          status: "ativo",
          history: [{ action: "criacao", date: movementDate, quantity }],
        });
      }
    } else if (batchNumber && OUTBOUND_TYPES.includes(movementType)) {
      const batch = batches.find(b => b.batch_number === batchNumber);
      if (batch) {
        batch.quantity = Math.max(0, (batch.quantity || 0) - quantity);
        if (batch.quantity === 0) batch.status = "encerrado";
        batch.history = batch.history || [];
        batch.history.push({ action: movementType, date: movementDate, quantity });
      }
    } else if (OUTBOUND_TYPES.includes(movementType) && batches.length > 0) {
      // FEFO: saida do lote mais proximo de vencimento
      const sortedBatches = [...batches].filter(b => (b.quantity || 0) > 0 && b.expiry_date).sort((a, b) => (a.expiry_date || "").localeCompare(b.expiry_date || ""));
      let remaining = quantity;
      for (const batch of sortedBatches) {
        if (remaining <= 0) break;
        const taken = Math.min(batch.quantity || 0, remaining);
        batch.quantity = Math.max(0, (batch.quantity || 0) - taken);
        if (batch.quantity === 0) batch.status = "encerrado";
        batch.history = batch.history || [];
        batch.history.push({ action: movementType, date: movementDate, quantity: taken });
        remaining -= taken;
      }
    }

    // Calcular cobertura
    const coverage = await this._calculateCoverage(productId, newQty, stock.id);

    // Calcular alerta de validade
    const expiryAlert = this._calculateExpiryAlert(batches);

    await AppService.update("Stock", stock.id, {
      quantity: newQty,
      average_cost: newAvgCost,
      last_cost: INBOUND_TYPES.includes(movementType) ? (unitCost || stock.last_cost) : stock.last_cost,
      total_value: newTotalValue,
      batches,
      coverage_days: coverage,
      average_daily_consumption: coverage > 0 ? newQty / coverage : stock.average_daily_consumption,
      expiry_alert_level: expiryAlert,
      last_movement_date: movementDate,
      last_movement_type: movementType,
      version: (stock.version || 1) + 1,
    }, { module: "estoque", validate: false });

    // Atualizar Product.stock_quantity
    await AppService.update("Product", productId, {
      stock_quantity: newQty,
      cost_price: newAvgCost,
      coverage_days: coverage,
    }, { module: "estoque", validate: false });

    return { stock_id: stock.id, new_quantity: newQty, average_cost: newAvgCost };
  },

  // ===== COVERAGE CALCULATION =====
  async _calculateCoverage(productId, currentQty, stockId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const movements = await AppService.find("Movement", {
      product_id: productId,
      movement_type: { $in: ["saida", "perda", "quebra", "vencimento", "consumo", "venda"] },
      movement_date: { $gte: thirtyDaysAgo.toISOString() },
      deleted_at: null,
    }, "-movement_date", 500);

    const totalConsumption = movements.reduce((s, m) => s + (m.quantity || 0), 0);
    const avgDaily = totalConsumption / 30;

    if (avgDaily <= 0) return 0;
    return Math.round((currentQty / avgDaily) * 10) / 10;
  },

  // ===== EXPIRY ALERT =====
  _calculateExpiryAlert(batches) {
    if (!batches || batches.length === 0) return "normal";
    const today = new Date();
    let worstLevel = "normal";
    const levels = ["normal", "alerta_60", "alerta_30", "alerta_15", "alerta_7", "alerta_3", "alerta_1", "vencido"];

    for (const batch of batches) {
      if (!batch.expiry_date || (batch.quantity || 0) <= 0) continue;
      const days = daysBetween(today, batch.expiry_date);
      let level = "normal";
      if (days < 0) level = "vencido";
      else if (days <= 1) level = "alerta_1";
      else if (days <= 3) level = "alerta_3";
      else if (days <= 7) level = "alerta_7";
      else if (days <= 15) level = "alerta_15";
      else if (days <= 30) level = "alerta_30";
      else if (days <= 60) level = "alerta_60";

      if (levels.indexOf(level) > levels.indexOf(worstLevel)) worstLevel = level;
    }
    return worstLevel;
  },

  // ===== OPERATIONAL DASHBOARD =====
  async getOperationalDashboard() {
    const [stocks, movements, products] = await Promise.all([
      AppService.find("Stock", { deleted_at: null }, "-created_date", 500),
      AppService.find("Movement", { deleted_at: null }, "-movement_date", 500),
      AppService.find("Product", { active: true }, "name", 500),
    ]);

    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const monthAgo = new Date(today.getTime() - 30 * 86400000);

    const totalStockValue = stocks.reduce((s, st) => s + (st.total_value || 0), 0);
    const criticalItems = stocks.filter(st => (st.quantity || 0) <= (st.min_quantity || 0) && st.min_quantity > 0);
    const expiringSoon = stocks.filter(st => st.expiry_alert_level && st.expiry_alert_level !== "normal");
    const expired = stocks.filter(st => st.expiry_alert_level === "vencido");

    const stoppedItems = stocks.filter(st => {
      if (!st.last_movement_date) return true;
      const lastDate = new Date(st.last_movement_date);
      return (today - lastDate) > 30 * 86400000;
    });

    const weekLosses = movements.filter(m =>
      ["perda", "quebra", "vencimento"].includes(m.movement_type) &&
      new Date(m.movement_date) >= weekAgo
    );
    const monthLosses = movements.filter(m =>
      ["perda", "quebra", "vencimento"].includes(m.movement_type) &&
      new Date(m.movement_date) >= monthAgo
    );
    const weekLossValue = weekLosses.reduce((s, m) => s + (m.total_cost || 0), 0);
    const monthLossValue = monthLosses.reduce((s, m) => s + (m.total_cost || 0), 0);

    const weekConsumption = movements.filter(m =>
      ["saida", "consumo", "producao"].includes(m.movement_type) &&
      new Date(m.movement_date) >= weekAgo
    );
    const weekConsumptionValue = weekConsumption.reduce((s, m) => s + (m.total_cost || 0), 0);

    const usageStats = {};
    for (const m of movements) {
      if (!["saida", "consumo", "producao", "venda"].includes(m.movement_type)) continue;
      const name = m.product_name;
      if (!usageStats[name]) usageStats[name] = { name, count: 0, totalQty: 0, totalValue: 0 };
      usageStats[name].count++;
      usageStats[name].totalQty += m.quantity || 0;
      usageStats[name].totalValue += m.total_cost || 0;
    }
    const mostUsed = Object.values(usageStats).sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);
    const leastUsed = Object.values(usageStats).sort((a, b) => a.totalValue - b.totalValue).slice(0, 10);

    const suggestedPurchases = await this._getSuggestedPurchases(stocks, products);

    const alerts = [];
    for (const item of criticalItems.slice(0, 5)) {
      alerts.push({ severity: "urgent", message: `Estoque crítico: ${item.product_name} — ${item.quantity} ${item.unit || ""} (mín: ${item.min_quantity})` });
    }
    for (const item of expired.slice(0, 5)) {
      alerts.push({ severity: "urgent", message: `Produto vencido: ${item.product_name}` });
    }
    for (const item of expiringSoon.filter(s => s.expiry_alert_level !== "vencido").slice(0, 3)) {
      alerts.push({ severity: "warning", message: `Vencendo: ${item.product_name} (${item.expiry_alert_level.replace("alerta_", "")} dias)` });
    }
    if (stoppedItems.length > 0) {
      alerts.push({ severity: "info", message: `${stoppedItems.length} produto(s) sem movimentação há mais de 30 dias` });
    }

    return {
      summary: {
        totalStockValue,
        totalItems: stocks.length,
        criticalCount: criticalItems.length,
        expiringCount: expiringSoon.length,
        expiredCount: expired.length,
        stoppedCount: stoppedItems.length,
        weekLossValue,
        monthLossValue,
        weekConsumptionValue,
        suggestedPurchasesCount: suggestedPurchases.length,
      },
      criticalItems,
      expiringSoon,
      expired,
      stoppedItems,
      mostUsed,
      leastUsed,
      suggestedPurchases,
      alerts,
    };
  },

  // ===== SMART PURCHASE SUGGESTIONS =====
  async _getSuggestedPurchases(stocks, products) {
    const suggestions = [];

    for (const stock of stocks) {
      if (stock.quantity === undefined || stock.quantity === null) continue;

      const coverage = stock.coverage_days || 0;
      const minQty = stock.min_quantity || 0;
      const idealQty = stock.ideal_quantity || 0;
      const avgDaily = stock.average_daily_consumption || 0;

      const product = products.find(p => p.id === stock.product_id);
      const leadTime = 3;

      const needsReplenish = (coverage > 0 && coverage < leadTime + 2) || (stock.quantity <= minQty && minQty > 0);

      if (needsReplenish && (avgDaily > 0 || minQty > 0)) {
        const targetQty = idealQty > 0 ? idealQty : (avgDaily > 0 ? Math.ceil(avgDaily * 14) : minQty * 2);
        const suggestedQty = Math.max(0, targetQty - stock.quantity);
        const urgency = coverage === 0 ? "critica" : coverage <= 1 ? "alta" : coverage <= leadTime ? "media" : "baixa";

        if (suggestedQty > 0) {
          suggestions.push({
            product_id: stock.product_id,
            product_name: stock.product_name,
            current_qty: stock.quantity,
            unit: stock.unit,
            coverage_days: coverage,
            avg_daily_consumption: avgDaily,
            min_qty: minQty,
            ideal_qty: idealQty,
            lead_time_days: leadTime,
            suggested_qty: suggestedQty,
            estimated_cost: suggestedQty * (stock.last_cost || stock.average_cost || 0),
            urgency,
            supplier_name: product?.primary_supplier_name || "",
            reason: coverage <= 1
              ? `Cobertura de apenas ${coverage} dia(s). Consumo médio: ${avgDaily.toFixed(1)}/dia. Lead time: ${leadTime} dias.`
              : `Abaixo do estoque mínimo (${minQty}). Cobertura: ${coverage} dias.`,
          });
        }
      }
    }

    return suggestions.sort((a, b) => {
      const urgencyOrder = { critica: 0, alta: 1, media: 2, baixa: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  },

  // ===== ABC CURVE =====
  async getABCCurve(criteria = "valor") {
    const stocks = await AppService.find("Stock", { deleted_at: null }, "name", 500);
    const movements = await AppService.find("Movement", { deleted_at: null }, "-movement_date", 1000);

    const items = stocks.map(stock => {
      let metric = 0;
      if (criteria === "valor") {
        metric = stock.total_value || 0;
      } else if (criteria === "quantidade") {
        metric = stock.quantity || 0;
      } else if (criteria === "consumo") {
        const productMovements = movements.filter(m => m.product_id === stock.product_id && ["saida", "consumo", "producao", "venda"].includes(m.movement_type));
        metric = productMovements.reduce((s, m) => s + (m.total_cost || 0), 0);
      }

      return {
        product_id: stock.product_id,
        product_name: stock.product_name,
        stock_id: stock.id,
        quantity: stock.quantity || 0,
        total_value: stock.total_value || 0,
        consumption_value: metric,
        metric,
      };
    });

    const sorted = items.sort((a, b) => b.metric - a.metric);
    const totalMetric = sorted.reduce((s, i) => s + i.metric, 0);

    let cumulative = 0;
    const classified = sorted.map(item => {
      cumulative += item.metric;
      const cumulativePct = totalMetric > 0 ? (cumulative / totalMetric) * 100 : 0;
      let abcClass = "C";
      if (cumulativePct <= 80) abcClass = "A";
      else if (cumulativePct <= 95) abcClass = "B";
      return { ...item, cumulative_pct: cumulativePct, abc_class: abcClass };
    });

    const classA = classified.filter(i => i.abc_class === "A");
    const classB = classified.filter(i => i.abc_class === "B");
    const classC = classified.filter(i => i.abc_class === "C");

    // Atualizar stocks com ABC
    for (const item of classified) {
      const stock = stocks.find(s => s.id === item.stock_id);
      if (stock && stock.abc_class !== item.abc_class) {
        await AppService.update("Stock", stock.id, { abc_class: item.abc_class, abc_criteria: criteria }, { module: "estoque", validate: false });
      }
    }

    return {
      criteria,
      totalItems: classified.length,
      classA: { count: classA.length, items: classA, totalMetric: classA.reduce((s, i) => s + i.metric, 0) },
      classB: { count: classB.length, items: classB, totalMetric: classB.reduce((s, i) => s + i.metric, 0) },
      classC: { count: classC.length, items: classC, totalMetric: classC.reduce((s, i) => s + i.metric, 0) },
      allItems: classified,
    };
  },

  // ===== EXPIRY ALERTS =====
  async getExpiryAlerts() {
    const stocks = await AppService.find("Stock", { deleted_at: null, expiry_alert_level: { $ne: "normal" } }, "product_name", 500);

    const categories = {
      alerta_60: [],
      alerta_30: [],
      alerta_15: [],
      alerta_7: [],
      alerta_3: [],
      alerta_1: [],
      vencido: [],
    };

    for (const stock of stocks) {
      const batches = (stock.batches || []).filter(b => b.expiry_date && (b.quantity || 0) > 0);
      for (const batch of batches) {
        const days = daysBetween(new Date(), batch.expiry_date);
        let category = null;
        if (days < 0) category = "vencido";
        else if (days <= 1) category = "alerta_1";
        else if (days <= 3) category = "alerta_3";
        else if (days <= 7) category = "alerta_7";
        else if (days <= 15) category = "alerta_15";
        else if (days <= 30) category = "alerta_30";
        else if (days <= 60) category = "alerta_60";

        if (category) {
          categories[category].push({
            stock_id: stock.id,
            product_id: stock.product_id,
            product_name: stock.product_name,
            batch_number: batch.batch_number,
            expiry_date: batch.expiry_date,
            days_until_expiry: days,
            quantity: batch.quantity,
            unit: stock.unit,
            unit_cost: batch.unit_cost || stock.average_cost,
            total_value: (batch.quantity || 0) * (batch.unit_cost || stock.average_cost || 0),
            supplier_name: batch.supplier_name,
          });
        }
      }
    }

    return categories;
  },

  // ===== FORECAST =====
  async getForecast(productId, productName) {
    const movements = await AppService.find("Movement", {
      product_id: productId,
      movement_type: { $in: ["saida", "consumo", "producao", "venda"] },
      deleted_at: null,
    }, "-movement_date", 500);

    if (movements.length === 0) return null;

    const dayOfWeekConsumption = [0, 0, 0, 0, 0, 0, 0];
    const dailyConsumption = {};

    for (const m of movements) {
      const date = new Date(m.movement_date);
      const dayKey = date.toISOString().slice(0, 10);
      dayOfWeekConsumption[date.getDay()] += m.quantity || 0;
      dailyConsumption[dayKey] = (dailyConsumption[dayKey] || 0) + (m.quantity || 0);
    }

    const now = new Date();
    const calcAvg = (days) => {
      const limit = new Date(now.getTime() - days * 86400000);
      const recent = movements.filter(m => new Date(m.movement_date) >= limit);
      const total = recent.reduce((s, m) => s + (m.quantity || 0), 0);
      return total / days;
    };

    const avg7 = calcAvg(7);
    const avg14 = calcAvg(14);
    const avg30 = calcAvg(30);

    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
    const recentWeek = movements.filter(m => new Date(m.movement_date) >= weekAgo).reduce((s, m) => s + (m.quantity || 0), 0);
    const previousWeek = movements.filter(m => {
      const d = new Date(m.movement_date);
      return d >= twoWeeksAgo && d < weekAgo;
    }).reduce((s, m) => s + (m.quantity || 0), 0);

    const trend = previousWeek > 0 ? ((recentWeek - previousWeek) / previousWeek) * 100 : 0;

    const weightedAvg = (avg7 * 0.5) + (avg14 * 0.3) + (avg30 * 0.2);
    const tomorrowForecast = weightedAvg;
    const weekForecast = weightedAvg * 7;
    const monthForecast = weightedAvg * 30;

    return {
      avg7: Math.round(avg7 * 10) / 10,
      avg14: Math.round(avg14 * 10) / 10,
      avg30: Math.round(avg30 * 10) / 10,
      trend: Math.round(trend),
      tomorrow: Math.round(tomorrowForecast * 10) / 10,
      week: Math.round(weekForecast * 10) / 10,
      month: Math.round(monthForecast * 10) / 10,
      dayOfWeekConsumption,
    };
  },

  // ===== LOSSES =====
  async getLosses(startDate, endDate) {
    const filter = {
      movement_type: { $in: ["perda", "quebra", "vencimento"] },
      deleted_at: null,
    };
    if (startDate) filter.movement_date = { $gte: new Date(startDate).toISOString() };
    if (endDate) { filter.movement_date = filter.movement_date || {}; filter.movement_date.$lte = new Date(endDate).toISOString(); }

    const movements = await AppService.find("Movement", filter, "-movement_date", 500);

    const byType = { perda: 0, quebra: 0, vencimento: 0 };
    const byProduct = {};
    let totalValue = 0;

    for (const m of movements) {
      byType[m.movement_type] = (byType[m.movement_type] || 0) + (m.total_cost || 0);
      totalValue += m.total_cost || 0;
      const name = m.product_name || "—";
      if (!byProduct[name]) byProduct[name] = { name, count: 0, totalValue: 0, totalQty: 0 };
      byProduct[name].count++;
      byProduct[name].totalValue += m.total_cost || 0;
      byProduct[name].totalQty += m.quantity || 0;
    }

    return {
      totalValue,
      totalCount: movements.length,
      byType,
      byProduct: Object.values(byProduct).sort((a, b) => b.totalValue - a.totalValue),
      movements,
    };
  },
};

export { brl, todayStr };
export default IE;