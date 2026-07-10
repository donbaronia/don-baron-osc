import { base44 } from "@/api/base44Client";

const brl = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const todayStr = () => new Date().toISOString().slice(0, 10);
const daysAgo = (d) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt.toISOString().slice(0, 10); };

/**
 * PurchasingCenter — inteligencia central de compras do Don Baron OS.
 *
 * Responsavel por:
 * - Dashboard de compras (KPIs, economia, lead time, rankings)
 * - Calculo automatico de scores de fornecedores
 * - Comparador de cotacoes
 * - Alertas de compras
 * - Historico de precos (ultimos 30/90/180/365 dias)
 */

export const PC = {
  // ===== DASHBOARD =====
  async getDashboardData() {
    const [purchases, requests, quotations, suppliers, priceHistory] = await Promise.all([
      base44.entities.Purchase.filter({ deleted_at: { $exists: false } }, "-order_date", 500).catch(() => []),
      base44.entities.PurchaseRequest.filter({ deleted_at: { $exists: false } }, "-created_date", 200).catch(() => []),
      base44.entities.Quotation.filter({ deleted_at: { $exists: false } }, "-created_date", 300).catch(() => []),
      base44.entities.Supplier.filter({ active: true }, "-created_date", 500).catch(() => []),
      base44.entities.PriceHistory.filter({}, "-date", 500).catch(() => []),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);

    const activePurchases = purchases.filter(p => p.status !== "cancelada");
    const monthPurchases = activePurchases.filter(p => (p.order_date || "") >= monthStart);
    const weekPurchases = activePurchases.filter(p => (p.order_date || "") >= weekStart);

    const monthTotal = monthPurchases.reduce((s, p) => s + (p.total_amount || 0), 0);
    const weekTotal = weekPurchases.reduce((s, p) => s + (p.total_amount || 0), 0);

    // Economia obtida: soma da diferenca entre a cotacao vencedora e a media das outras
    let savings = 0;
    const requestIds = [...new Set(quotations.filter(q => q.request_id).map(q => q.request_id))];
    for (const reqId of requestIds) {
      const reqQuotes = quotations.filter(q => q.request_id === reqId && q.status !== "cancelada");
      if (reqQuotes.length < 2) continue;
      const winner = reqQuotes.find(q => q.is_winner) || reqQuotes.reduce((min, q) => (q.total_price || 0) < (min.total_price || 0) ? q : min);
      if (!winner) continue;
      const others = reqQuotes.filter(q => q !== winner);
      const avgOthers = others.reduce((s, q) => s + (q.total_price || 0), 0) / others.length;
      savings += Math.max(0, avgOthers - (winner.total_price || 0));
    }

    // Rankings de fornecedores
    const supplierStats = {};
    for (const p of activePurchases) {
      if (!p.supplier) continue;
      if (!supplierStats[p.supplier]) supplierStats[p.supplier] = { name: p.supplier, count: 0, total: 0, leadTimes: [] };
      supplierStats[p.supplier].count++;
      supplierStats[p.supplier].total += p.total_amount || 0;
      if (p.lead_time_days) supplierStats[p.supplier].leadTimes.push(p.lead_time_days);
    }

    const supplierRanking = Object.values(supplierStats).sort((a, b) => b.total - a.total);
    const topSupplier = supplierRanking[0] || null;
    const mostExpensive = supplierRanking.length > 1
      ? supplierRanking.find(s => s.total > 0 && supplierRanking[0].total > 0 && s.name !== supplierRanking[0].name) || null
      : null;
    const cheapestSupplier = supplierRanking.length > 0 ? supplierRanking[supplierRanking.length - 1] : null;

    // Lead time medio
    const allLeadTimes = activePurchases.filter(p => p.lead_time_days).map(p => p.lead_time_days);
    const avgLeadTime = allLeadTimes.length > 0 ? allLeadTimes.reduce((a, b) => a + b, 0) / allLeadTimes.length : 0;

    // Produtos mais comprados
    const productStats = {};
    for (const p of activePurchases) {
      for (const item of (p.items || [])) {
        const name = item.name || "Sem nome";
        if (!productStats[name]) productStats[name] = { name, count: 0, totalQty: 0, totalValue: 0 };
        productStats[name].count++;
        productStats[name].totalQty += item.quantity || 0;
        productStats[name].totalValue += item.total || 0;
      }
    }
    const topProducts = Object.values(productStats).sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);

    // Maior aumento / reducao de preco
    const priceChanges = [];
    const productHistories = {};
    for (const ph of priceHistory) {
      const key = ph.product_name;
      if (!productHistories[key]) productHistories[key] = [];
      productHistories[key].push(ph);
    }
    for (const [name, hist] of Object.entries(productHistories)) {
      if (hist.length < 2) continue;
      const sorted = hist.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      const oldest = sorted[0];
      const newest = sorted[sorted.length - 1];
      if (oldest.price && newest.price) {
        const changePct = ((newest.price - oldest.price) / oldest.price) * 100;
        priceChanges.push({ product_name: name, old_price: oldest.price, new_price: newest.price, change_pct: changePct });
      }
    }
    priceChanges.sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));
    const biggestIncrease = priceChanges.find(c => c.change_pct > 0) || null;
    const biggestDecrease = priceChanges.find(c => c.change_pct < 0) || null;

    // Compras por categoria
    const byCategory = {};
    for (const p of activePurchases) {
      for (const item of (p.items || [])) {
        // Approximate: use supplier category or generic
        const cat = p.cost_center_name || "Geral";
        byCategory[cat] = (byCategory[cat] || 0) + (item.total || 0);
      }
    }

    // Compras por centro de custo
    const byCostCenter = {};
    for (const p of activePurchases) {
      const cc = p.cost_center_name || "Sem Centro";
      byCostCenter[cc] = (byCostCenter[cc] || 0) + (p.total_amount || 0);
    }

    // Alertas
    const alerts = [];

    // Pedidos sem receber (atrasados)
    const overdueOrders = activePurchases.filter(p =>
      p.status !== "recebida" && p.status !== "conferida" && p.status !== "cancelada" &&
      p.expected_delivery_date && p.expected_delivery_date < todayStr()
    );
    for (const o of overdueOrders.slice(0, 5)) {
      alerts.push({ severity: "urgent", message: `Pedido atrasado: ${o.purchase_code || o.supplier} — previsto ${new Date(o.expected_delivery_date).toLocaleDateString("pt-BR")}` });
    }

    // Cotacoes vencidas
    const expiredQuotes = quotations.filter(q => q.status === "ativa" && q.validity_date && q.validity_date < todayStr());
    if (expiredQuotes.length > 0) {
      alerts.push({ severity: "warning", message: `${expiredQuotes.length} cotacao(oes) vencida(s)` });
    }

    // Solicitacoes pendentes
    const pendingRequests = requests.filter(r => r.status === "pendente");
    if (pendingRequests.length > 0) {
      alerts.push({ severity: "info", message: `${pendingRequests.length} solicitacao(oes) pendente(s)` });
    }

    // Fornecedores bloqueados
    const blockedSuppliers = suppliers.filter(s => s.status === "bloqueado");
    if (blockedSuppliers.length > 0) {
      alerts.push({ severity: "warning", message: `${blockedSuppliers.length} fornecedor(es) bloqueado(s)` });
    }

    return {
      summary: {
        monthTotal, weekTotal, savings,
        totalOrders: activePurchases.length,
        pendingRequests: pendingRequests.length,
        avgLeadTime,
        activeSuppliers: suppliers.filter(s => s.status === "ativo").length,
      },
      topSupplier, mostExpensive, cheapestSupplier,
      topProducts, biggestIncrease, biggestDecrease,
      byCategory, byCostCenter,
      supplierRanking: supplierRanking.slice(0, 10),
      alerts,
      pendingCount: overdueOrders.length,
    };
  },

  // ===== PRICE HISTORY =====
  async getProductPriceHistory(productName, productId) {
    const filter = productId ? { product_id: productId } : { product_name: { $regex: productName, $options: "i" } };
    const history = await base44.entities.PriceHistory.filter(filter, "-date", 100).catch(() => []);
    const sorted = history.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    if (sorted.length === 0) return null;

    const prices = sorted.map(h => h.price || 0);
    const lastPurchase = sorted[sorted.length - 1];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const now = new Date();
    const inRange = (days) => {
      const limit = new Date(now.getTime() - days * 86400000);
      return sorted.filter(h => new Date(h.date || h.created_date) >= limit);
    };

    const calcAvg = (arr) => arr.length > 0 ? arr.map(h => h.price).reduce((a, b) => a + b, 0) / arr.length : 0;
    const last30 = inRange(30);
    const last90 = inRange(90);
    const last180 = inRange(180);
    const last365 = inRange(365);

    return {
      history: sorted,
      lastPurchase,
      minPrice, maxPrice, avgPrice,
      last30Avg: calcAvg(last30),
      last90Avg: calcAvg(last90),
      last180Avg: calcAvg(last180),
      last365Avg: calcAvg(last365),
      count: sorted.length,
    };
  },

  // ===== SUPPLIER SCORING =====
  async recalculateSupplierScore(supplierId) {
    const supplier = await base44.entities.Supplier.get(supplierId).catch(() => null);
    if (!supplier) return null;

    const purchases = await base44.entities.Purchase.filter(
      { supplier_id: supplierId, status: { $ne: "cancelada" }, deleted_at: { $exists: false } },
      "-order_date", 500
    ).catch(() => []);

    const totalPurchases = purchases.length;
    const totalAmount = purchases.reduce((s, p) => s + (p.total_amount || 0), 0);
    const received = purchases.filter(p => p.status === "recebida" || p.status === "conferida");

    // Pontualidade: % de entregas no prazo
    let pontualityScore = 0;
    if (received.length > 0) {
      const onTime = received.filter(p =>
        p.expected_delivery_date && p.received_date && p.received_date <= p.expected_delivery_date
      );
      pontualityScore = Math.round((onTime.length / received.length) * 100);
    }

    // Lead time medio
    const leadTimes = received.filter(p => p.lead_time_days).map(p => p.lead_time_days);
    const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;

    // Score geral: media de pontualidade + scores existentes
    const existingScores = [supplier.price_score, supplier.quality_score, supplier.reliability_score].filter(s => s > 0);
    const scoreComponents = [pontualityScore, ...existingScores];
    const overallScore = scoreComponents.length > 0
      ? Math.round(scoreComponents.reduce((a, b) => a + b, 0) / scoreComponents.length)
      : 0;

    // Nivel de risco
    let riskLevel = "baixo";
    if (overallScore < 50 || supplier.complaint_count > 3) riskLevel = "alto";
    else if (overallScore < 70 || supplier.complaint_count > 1) riskLevel = "medio";

    const lastPurchase = purchases.find(p => p.order_date);

    await base44.entities.Supplier.update(supplierId, {
      total_purchases: totalPurchases,
      total_amount_purchased: totalAmount,
      pontuality_score: pontualityScore,
      overall_score: overallScore,
      risk_level: riskLevel,
      last_purchase_date: lastPurchase?.order_date || supplier.last_purchase_date || null,
      last_evaluation_date: todayStr(),
      version: (supplier.version || 1) + 1,
    });

    return { overallScore, pontualityScore, avgLeadTime, totalPurchases, totalAmount, riskLevel };
  },

  // ===== QUOTATION COMPARATOR =====
  compareQuotations(quotations) {
    if (!quotations || quotations.length === 0) return { best: null, ranking: [] };

    const valid = quotations.filter(q => q.status !== "cancelada");
    if (valid.length === 0) return { best: null, ranking: [] };

    const sorted = [...valid].sort((a, b) => (a.total_price || 0) - (b.total_price || 0));
    const cheapest = sorted[0];

    const ranking = sorted.map((q, idx) => ({
      ...q,
      rank: idx + 1,
      is_cheapest: q === cheapest,
      savings_vs_max: sorted.length > 1 ? (sorted[sorted.length - 1].total_price || 0) - (q.total_price || 0) : 0,
      price_index: cheapest.total_price > 0 ? ((q.total_price / cheapest.total_price) * 100) : 0,
    }));

    // Melhor considerando preco + prazo + score do fornecedor
    const scored = valid.map(q => {
      let score = 0;
      // Preco: 50% peso (menor = melhor)
      const minPrice = Math.min(...valid.map(v => v.total_price || 0));
      if (q.total_price && minPrice > 0) score += (minPrice / q.total_price) * 50;
      // Prazo: 25% peso (menor = melhor)
      const minDays = Math.min(...valid.map(v => v.delivery_days || 999));
      if (q.delivery_days && minDays < 999) score += (minDays / q.delivery_days) * 25;
      // Score do fornecedor: 25% peso
      if (q.supplier_overall_score) score += (q.supplier_overall_score / 100) * 25;
      return { ...q, composite_score: score };
    }).sort((a, b) => b.composite_score - a.composite_score);

    return {
      best: scored[0],
      cheapest,
      ranking,
      compositeRanking: scored,
    };
  },

  // ===== ALERTS =====
  async getAlerts() {
    const data = await this.getDashboardData();
    return data.alerts;
  },
};

export { brl, todayStr };
export default PC;