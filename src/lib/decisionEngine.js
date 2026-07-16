import { base44 } from "@/api/base44Client";
import { BI } from "@/lib/biEngine";
import { brl } from "@/lib/financialCenter";

/**
 * Decision Engine (Documento 026)
 *
 * Nao executa tarefas. Ajuda o gestor a decidir.
 * Compara indicadores, encontra oportunidades, simula cenarios,
 * calcula riscos, prioriza acoes, explica impactos.
 *
 * Nunca executa decisoes automaticamente.
 */

const RISK_WEIGHTS = { baixo: 1, medio: 2, alto: 3, muito_alto: 4 };

function _clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

export const DecisionEngine = {
  // ===== COLLECT CONTEXT =====
  async _getContext() {
    const cc = await BI.getCommandCenter().catch(() => null);
    const forecasts = await BI.getForecasts().catch(() => null);
    const temporal = await BI.getTemporalAnalysis().catch(() => null);
    const [suppliers, products, stocks, recipes, priceHistories] = await Promise.all([
      base44.entities.Supplier.filter({ deleted_at: null }, "name", 200).catch(() => []),
      base44.entities.Product.filter({ deleted_at: null }, "name", 500).catch(() => []),
      base44.entities.Stock.filter({ deleted_at: null }, "product_name", 500).catch(() => []),
      base44.entities.Recipe.filter({ active: true, deleted_at: null }, "name", 500).catch(() => []),
      base44.entities.PriceHistory.filter({ deleted_at: null }, "-created_date", 500).catch(() => []),
    ]);
    return { cc, forecasts, temporal, suppliers, products, stocks, recipes, priceHistories };
  },

  // ===== GENERATE ALL RECOMMENDATIONS =====
  async getRecommendations() {
    const ctx = await this._getContext();
    if (!ctx.cc) return [];
    const recs = [];

    // 1. Comprar agora? (estoque critico)
    const criticalStocks = (ctx.stocks || []).filter(s => (s.quantity || 0) <= (s.min_quantity || 0));
    for (const s of criticalStocks.slice(0, 3)) {
      const supplier = (ctx.suppliers || []).find(sup => sup.id === s.ingredient_id || sup.name === s.product_name);
      const coverage = s.coverage_days || 0;
      const score = _clamp(95 - coverage * 5, 50, 99);
      recs.push({
        title: `Comprar ${s.product_name || "item"} agora`,
        decision_type: "comprar_agora",
        question: "Vale comprar agora?",
        score,
        recommendation: score >= 80 ? "recomendado" : "recomendado_com_reservas",
        risk_level: coverage <= 1 ? "alto" : "medio",
        probability: score,
        financial_impact: s.average_cost ? s.average_cost * (s.ideal_quantity || s.max_quantity || 0) : 0,
        operational_impact: "negativo",
        commercial_impact: coverage <= 1 ? "negativo" : "neutro",
        reasoning: [
          `Estoque atual: ${s.quantity || 0} (mínimo: ${s.min_quantity || 0})`,
          `Cobertura: apenas ${coverage.toFixed(0)} dia(s)`,
          supplier ? `Fornecedor: ${supplier.name}` : "Fornecedor não identificado",
          coverage <= 1 ? "Risco de ruptura iminente" : "Reposição necessária",
        ],
        data_sources: ["estoque", "compras", "fornecedores"],
        risks: [
          coverage <= 1 ? "Ruptura de estoque pode parar a produção" : "Estoque baixo",
          supplier ? "Dependência de fornecedor único" : "Sem fornecedor cadastrado",
        ],
        alternatives: [
          "Buscar cotação com fornecedor alternativo",
          "Negociar prazo de pagamento estendido",
          coverage > 2 ? "Adiar compra por 1-2 dias" : "Compra emergencial imediata",
        ],
        calculations: { stock: s.quantity, min: s.min_quantity, coverage_days: coverage, avg_cost: s.average_cost },
        status: "pendente",
      });
    }

    // 2. Trocar fornecedor? (preco acima da media)
    const priceBySupplier = {};
    for (const ph of (ctx.priceHistories || [])) {
      const key = ph.product_name || ph.product_id;
      if (!priceBySupplier[key]) priceBySupplier[key] = [];
      priceBySupplier[key].push(ph);
    }
    for (const [product, histories] of Object.entries(priceBySupplier)) {
      if (histories.length < 2) continue;
      const sorted = [...histories].sort((a, b) => (a.unit_price || 0) - (b.unit_price || 0));
      const cheapest = sorted[0];
      const current = sorted[sorted.length - 1];
      if (current.supplier_name === cheapest.supplier_name) continue;
      const priceDiff = cheapest.unit_price > 0 ? ((current.unit_price - cheapest.unit_price) / cheapest.unit_price) * 100 : 0;
      if (priceDiff > 8) {
        const score = _clamp(60 + priceDiff * 2, 60, 92);
        recs.push({
          title: `Trocar fornecedor de ${product}`,
          decision_type: "trocar_fornecedor",
          question: "Vale trocar fornecedor?",
          score,
          recommendation: score >= 75 ? "recomendado" : "recomendado_com_reservas",
          risk_level: priceDiff > 15 ? "baixo" : "medio",
          probability: score,
          financial_impact: (current.unit_price - cheapest.unit_price) * (current.quantity || 100),
          operational_impact: "neutro",
          commercial_impact: "neutro",
          reasoning: [
            `${current.supplier_name} custa ${priceDiff.toFixed(1)}% mais que ${cheapest.supplier_name}`,
            `Preço atual: ${brl(current.unit_price)} vs ${brl(cheapest.unit_price)}`,
            `Economia potencial por unidade: ${brl(current.unit_price - cheapest.unit_price)}`,
          ],
          data_sources: ["compras", "fornecedores", "historico_precos"],
          risks: [
            "Qualidade do novo fornecedor não validada",
            "Pode haver prazo de entrega diferente",
            "Relacionamento com fornecedor atual pode ser prejudicado",
          ],
          alternatives: [
            "Renegociar preço com fornecedor atual",
            "Fazer pedido piloto com novo fornecedor",
            "Dividir compras entre os dois fornecedores",
          ],
          calculations: { current_price: current.unit_price, cheapest_price: cheapest.unit_price, price_diff_pct: priceDiff },
          status: "pendente",
        });
      }
    }

    // 3. Aumentar preco? (margem baixa)
    if (ctx.cc.financeiro.margem < 20 && ctx.cc.financeiro.receita_mes > 0) {
      const targetMargin = 25;
      const neededIncrease = ((targetMargin - ctx.cc.financeiro.margem) / 100) * ctx.cc.financeiro.receita_mes;
      const score = _clamp(70 + (20 - ctx.cc.financeiro.margem) * 1.5, 65, 90);
      recs.push({
        title: "Reajustar preços de venda",
        decision_type: "aumentar_preco",
        question: "Vale aumentar preço?",
        score,
        recommendation: "recomendado_com_reservas",
        risk_level: "medio",
        probability: score,
        financial_impact: neededIncrease,
        operational_impact: "neutro",
        commercial_impact: "negativo",
        reasoning: [
          `Margem atual: ${ctx.cc.financeiro.margem.toFixed(1)}% (abaixo da meta de 20%)`,
          `Receita mensal: ${brl(ctx.cc.financeiro.receita_mes)}`,
          `Aumento de ~${((neededIncrease / ctx.cc.financeiro.receita_mes) * 100).toFixed(1)}% recupera a margem para ${targetMargin}%`,
        ],
        data_sources: ["financeiro", "cmv", "bi"],
        risks: [
          "Pode reduzir volume de vendas",
          "Concorrentes podem não seguir o reajuste",
          "Cliente sensível a preço pode migrar",
        ],
        alternatives: [
          "Aumentar apenas produtos com margem mais crítica",
          "Criar combos para diluir o aumento",
          "Aumentar gradualmente (2-3% por mês)",
        ],
        calculations: { current_margin: ctx.cc.financeiro.margem, target_margin: targetMargin, needed_increase: neededIncrease },
        status: "pendente",
      });
    }

    // 4. Fazer promocao? (vendas caindo)
    const revVar = ctx.temporal?.mes_vs_anterior?.variacao || 0;
    if (revVar < -10 && ctx.cc.financeiro.receita_mes > 0) {
      const projectedLoss = ctx.cc.financeiro.receita_mes * Math.abs(revVar) / 100;
      const score = _clamp(72 + Math.abs(revVar) * 0.5, 70, 88);
      recs.push({
        title: "Criar campanha promocional",
        decision_type: "fazer_promocao",
        question: "Vale fazer promoção?",
        score,
        recommendation: "recomendado",
        risk_level: "medio",
        probability: score,
        financial_impact: projectedLoss * 0.5,
        operational_impact: "positivo",
        commercial_impact: "positivo",
        reasoning: [
          `Receita caiu ${Math.abs(revVar).toFixed(1)}% vs mês anterior`,
          `Perda projetada: ${brl(projectedLoss)}`,
          `Promoção pode recuperar 40-60% da perda`,
        ],
        data_sources: ["bi", "financeiro", "crm"],
        risks: [
          "Margem pode ser comprometida",
          "Pode treinar cliente a esperar promoções",
          "Custo de marketing adicional",
        ],
        alternatives: [
          "Combo com produtos de alto giro",
          "Cupom para clientes inativos",
          "Frete grátis em horários de baixa procura",
        ],
        calculations: { revenue_drop_pct: revVar, projected_loss: projectedLoss, recovery_estimate: projectedLoss * 0.5 },
        status: "pendente",
      });
    }

    // 5. Reduzir producao? (perdas altas ou eficiencia baixa)
    if (ctx.cc.producao.perdas > 0 || ctx.cc.producao.eficiencia < 70) {
      const lossCost = ctx.cc.producao.perdas * (ctx.cc.financeiro.cmv / 100) * (ctx.cc.financeiro.receita_mes / Math.max(ctx.cc.producao.ordens_abertas, 1));
      const score = _clamp(68 + (100 - ctx.cc.producao.eficiencia) * 0.3, 60, 85);
      recs.push({
        title: "Revisar volume de produção",
        decision_type: "reduzir_producao",
        question: "Vale reduzir produção?",
        score,
        recommendation: score >= 75 ? "recomendado" : "recomendado_com_reservas",
        risk_level: "medio",
        probability: score,
        financial_impact: lossCost,
        operational_impact: "positivo",
        commercial_impact: "neutro",
        reasoning: [
          `Eficiência: ${ctx.cc.producao.eficiencia.toFixed(1)}%`,
          `Perdas registradas: ${ctx.cc.producao.perdas.toFixed(1)} unidades`,
          `Reduzir 10-15% do volume pode cortar perdas`,
        ],
        data_sources: ["producao", "bi"],
        risks: [
          "Pode gerar ruptura de estoque",
          "Equipe pode ficar ociosa",
        ],
        alternatives: [
          "Manter volume mas melhorar processo",
          "Treinar equipe para reduzir perdas",
          "Reduzir apenas produtos com mais perdas",
        ],
        calculations: { efficiency: ctx.cc.producao.eficiencia, losses: ctx.cc.producao.perdas, loss_cost: lossCost },
        status: "pendente",
      });
    }

    // 6. Aumentar estoque? (compras economizando)
    const prevRev = ctx.temporal?.mes_vs_anterior?.anterior || 0;
    if (prevRev > 0 && ctx.cc.financeiro.receita_mes > prevRev && ctx.cc.estoque.cobertura < 7) {
      const score = _clamp(75 + (7 - ctx.cc.estoque.cobertura) * 3, 70, 90);
      recs.push({
        title: "Aumentar estoque estratégico",
        decision_type: "aumentar_estoque",
        question: "Vale aumentar estoque?",
        score,
        recommendation: "recomendado",
        risk_level: "baixo",
        probability: score,
        financial_impact: ctx.cc.estoque.valor * 0.1,
        operational_impact: "positivo",
        commercial_impact: "positivo",
        reasoning: [
          `Vendas crescendo (${((ctx.cc.financeiro.receita_mes - prevRev) / prevRev * 100).toFixed(1)}% vs mês anterior)`,
          `Cobertura média: ${ctx.cc.estoque.cobertura.toFixed(0)} dias`,
          `Aumentar estoque evita ruptura no crescimento`,
        ],
        data_sources: ["estoque", "bi", "financeiro"],
        risks: ["Capital imobilizado", "Risco de validade"],
        alternatives: ["Aumentar apenas itens classe A", "Negociar prazo maior com fornecedor"],
        calculations: { coverage: ctx.cc.estoque.cobertura, growth_pct: ((ctx.cc.financeiro.receita_mes - prevRev) / prevRev * 100) },
        status: "pendente",
      });
    }

    return recs.sort((a, b) => b.score - a.score);
  },

  // ===== SIMULATOR =====
  async simulate(params) {
    const { scenario, ...data } = params;
    const ctx = await this._getContext();

    if (scenario === "fornecedor_aumenta_preco") {
      return this._simSupplierPriceIncrease(ctx, data);
    }
    if (scenario === "aumentar_preco") {
      return this._simPriceIncrease(ctx, data);
    }
    if (scenario === "contratar") {
      return this._simHiring(ctx, data);
    }
    if (scenario === "abrir_unidade") {
      return this._simNewUnit(ctx, data);
    }
    if (scenario === "promocao") {
      return this._simPromotion(ctx, data);
    }
    throw new Error("Cenário desconhecido: " + scenario);
  },

  _simSupplierPriceIncrease(ctx, { product_name, increase_pct }) {
    const pct = (increase_pct || 10) / 100;
    const recipe = (ctx.recipes || []).find(r => r.name === product_name || r.product_name === product_name);
    const monthlyRevenue = ctx.cc?.financeiro.receita_mes || 0;
    const baseCost = recipe?.cost_total || (monthlyRevenue * (ctx.cc?.financeiro.cmv || 30) / 100) * 0.3;
    const costIncrease = baseCost * pct;
    const newCost = baseCost + costIncrease;
    const newCMV = monthlyRevenue > 0 ? (newCost / monthlyRevenue) * 100 : 0;
    const profitImpact = -costIncrease * 30;
    const annualImpact = profitImpact * 12;

    return {
      scenario: "Fornecedor aumenta preço",
      params: { product: product_name, increase_pct: increase_pct || 10 },
      results: {
        custo_atual: baseCost,
        custo_novo: newCost,
        aumento_custo: costIncrease,
        novo_cmv: newCMV,
        impacto_lucro_mensal: profitImpact,
        impacto_lucro_anual: annualImpact,
      },
      risk: { level: pct > 0.15 ? "alto" : "medio", probability: 70, impact: annualImpact },
      recommendation: annualImpact < -5000 ? "recomendado_com_reservas" : "neutro",
      suggestion: `Repasse ${increase_pct || 10}% do aumento ao preço de venda ou busque fornecedor alternativo. Impacto anual estimado: ${brl(annualImpact)}.`,
    };
  },

  _simPriceIncrease(ctx, { product_name, increase_pct }) {
    const pct = (increase_pct || 5) / 100;
    const recipe = (ctx.recipes || []).find(r => r.name === product_name || r.product_name === product_name);
    const basePrice = recipe?.sale_price || 50;
    const newPrice = basePrice * (1 + pct);
    const cost = recipe?.cost_total || basePrice * 0.3;
    const oldProfit = basePrice - cost;
    const newProfit = newPrice - cost;
    const monthlyVolume = 500;
    const monthlyRevenueOld = basePrice * monthlyVolume;
    const monthlyRevenueNew = newPrice * monthlyVolume * 0.95;
    const monthlyProfitOld = oldProfit * monthlyVolume;
    const monthlyProfitNew = newProfit * monthlyVolume * 0.95;
    const oldCMV = basePrice > 0 ? (cost / basePrice) * 100 : 0;
    const newCMV = newPrice > 0 ? (cost / newPrice) * 100 : 0;
    const oldMargin = basePrice > 0 ? ((basePrice - cost) / basePrice) * 100 : 0;
    const newMargin = newPrice > 0 ? ((newPrice - cost) / newPrice) * 100 : 0;
    const annualImpact = (monthlyProfitNew - monthlyProfitOld) * 12;

    return {
      scenario: "Aumentar preço de venda",
      params: { product: product_name, increase_pct: increase_pct || 5, base_price: basePrice, new_price: newPrice },
      results: {
        preco_atual: basePrice,
        preco_novo: newPrice,
        lucro_unitario_atual: oldProfit,
        lucro_unitario_novo: newProfit,
        cmv_atual: oldCMV,
        cmv_novo: newCMV,
        margem_atual: oldMargin,
        margem_nova: newMargin,
        faturamento_mensal_atual: monthlyRevenueOld,
        faturamento_mensal_novo: monthlyRevenueNew,
        lucro_mensal_atual: monthlyProfitOld,
        lucro_mensal_novo: monthlyProfitNew,
        impacto_anual: annualImpact,
      },
      risk: { level: pct > 0.1 ? "alto" : "medio", probability: 65, impact: annualImpact },
      recommendation: annualImpact > 0 ? "recomendado" : "nao_recomendado",
      suggestion: `Aumento de ${increase_pct || 5}% ${annualImpact > 0 ? "aumenta lucro anual em" : "reduz lucro anual em"} ${brl(Math.abs(annualImpact))}. Considere elasticidade da demanda.`,
    };
  },

  _simHiring(ctx, { count, avg_salary }) {
    const n = count || 2;
    const salary = avg_salary || 2200;
    const monthlyCost = n * salary * 1.8;
    const annualCost = monthlyCost * 12;
    const currentCash = ctx.cc?.financeiro.saldo || 0;
    const currentRevenue = ctx.cc?.financeiro.receita_mes || 0;
    const productivityGain = currentRevenue * 0.05 * n;
    const monthsToROI = productivityGain > 0 ? Math.ceil(monthlyCost / productivityGain) : 0;
    const cashImpact = currentCash - monthlyCost;

    return {
      scenario: "Contratar funcionários",
      params: { count: n, avg_salary: salary },
      results: {
        custo_mensal_folha: monthlyCost,
        custo_anual: annualCost,
        ganho_produtividade_mensal: productivityGain,
        impacto_caixa: cashImpact,
        prazo_retorno_meses: monthsToROI,
      },
      risk: { level: monthsToROI > 12 ? "alto" : "medio", probability: 55, impact: -monthlyCost },
      recommendation: monthsToROI <= 6 && cashImpact > 0 ? "recomendado" : monthsToROI <= 12 ? "recomendado_com_reservas" : "nao_recomendado",
      suggestion: `${n} contratação(ões) custam ${brl(monthlyCost)}/mês. Retorno estimado em ${monthsToROI} meses. ${cashImpact < 0 ? "Atenção: impacto negativo no caixa." : ""}`,
    };
  },

  _simNewUnit(ctx, { estimated_revenue, estimated_investment }) {
    const rev = estimated_revenue || 80000;
    const invest = estimated_investment || 200000;
    const monthlyCost = rev * 0.75;
    const monthlyProfit = rev - monthlyCost;
    const monthsToROI = monthlyProfit > 0 ? Math.ceil(invest / monthlyProfit) : 0;
    const annualProfit = monthlyProfit * 12;
    const currentCash = ctx.cc?.financeiro.saldo || 0;
    const canFund = currentCash >= invest;

    return {
      scenario: "Abrir nova unidade",
      params: { estimated_revenue: rev, estimated_investment: invest },
      results: {
        capital_necessario: invest,
        faturamento_mensal_previsto: rev,
        custo_mensal_estimado: monthlyCost,
        lucro_mensal_previsto: monthlyProfit,
        lucro_anual_previsto: annualProfit,
        prazo_retorno_meses: monthsToROI,
        saldo_atual: currentCash,
        pode_financiar: canFund,
      },
      risk: { level: monthsToROI > 24 ? "muito_alto" : monthsToROI > 18 ? "alto" : "medio", probability: 45, impact: -invest },
      recommendation: monthsToROI <= 18 && canFund ? "recomendado_com_reservas" : "nao_recomendado",
      suggestion: `Nova unidade requer ${brl(invest)}. Retorno em ${monthsToROI} meses. ${canFund ? "Capital disponível." : "Capital insuficiente — considere financiamento."}`,
    };
  },

  _simPromotion(ctx, { discount_pct, expected_volume_increase }) {
    const disc = (discount_pct || 10) / 100;
    const volInc = (expected_volume_increase || 20) / 100;
    const baseRevenue = ctx.cc?.financeiro.receita_mes || 0;
    const baseCMV = ctx.cc?.financeiro.cmv || 30;
    const avgTicket = baseRevenue / 500;
    const newTicket = avgTicket * (1 - disc);
    const newVolume = 500 * (1 + volInc);
    const oldRevenue = avgTicket * 500;
    const newRevenue = newTicket * newVolume;
    const oldCost = oldRevenue * (baseCMV / 100);
    const newCost = newRevenue * (baseCMV / 100);
    const oldProfit = oldRevenue - oldCost;
    const newProfit = newRevenue - newCost;

    return {
      scenario: "Campanha promocional",
      params: { discount_pct: discount_pct || 10, expected_volume_increase: expected_volume_increase || 20 },
      results: {
        ticket_atual: avgTicket,
        ticket_promocional: newTicket,
        volume_atual: 500,
        volume_previsto: newVolume,
        faturamento_atual: oldRevenue,
        faturamento_previsto: newRevenue,
        lucro_atual: oldProfit,
        lucro_previsto: newProfit,
        variacao_lucro: newProfit - oldProfit,
      },
      risk: { level: "medio", probability: 60, impact: newProfit - oldProfit },
      recommendation: newProfit > oldProfit ? "recomendado" : "nao_recomendado",
      suggestion: `Promoção de ${discount_pct || 10}% com aumento de volume de ${expected_volume_increase || 20}% ${newProfit > oldProfit ? "aumenta lucro em" : "reduz lucro em"} ${brl(Math.abs(newProfit - oldProfit))}.`,
    };
  },

  // ===== RISK MATRIX =====
  async getRiskMatrix() {
    const recs = await this.getRecommendations();
    const matrix = { baixo: [], medio: [], alto: [], muito_alto: [] };
    for (const r of recs) {
      (matrix[r.risk_level] || matrix.medio).push(r);
    }
    return matrix;
  },

  // ===== AI EXPLANATION =====
  async getAIExplanation(recommendation) {
    const prompt = `Você é a BARON AI, analista de decisões da empresa Don Baron. Explique a seguinte recomendação em português.

RECOMENDAÇÃO:
- Título: ${recommendation.title}
- Pergunta: ${recommendation.question}
- Nota: ${recommendation.score}/100
- Risco: ${recommendation.risk_level}
- Probabilidade de sucesso: ${recommendation.probability}%
- Impacto financeiro: ${brl(recommendation.financial_impact)}
- Impacto operacional: ${recommendation.operational_impact}
- Impacto comercial: ${recommendation.commercial_impact}

MOTIVOS:
${(recommendation.reasoning || []).map(r => `- ${r}`).join("\n")}

DADOS UTILIZADOS:
${(recommendation.data_sources || []).join(", ")}

RISCOS:
${(recommendation.risks || []).map(r => `- ${r}`).join("\n")}

ALTERNATIVAS:
${(recommendation.alternatives || []).map(a => `- ${a}`).join("\n")}

INSTRUÇÕES:
- Explique por que sugeriu esta recomendação
- Quais dados foram utilizados
- Quais riscos existem
- Quais alternativas existem
- Nunca esconder os cálculos
- Seja direto e objetivo
- Máximo 4 parágrafos curtos`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      return typeof res === "string" ? res : String(res || "");
    } catch {
      return `Esta recomendação recebeu nota ${recommendation.score}/100. ` +
        `Os dados de ${recommendation.data_sources?.join(", ")} indicam que ${recommendation.reasoning?.[0] || "há uma oportunidade de decisão"}. ` +
        `Riscos: ${(recommendation.risks || []).join("; ")}. ` +
        `Alternativas: ${(recommendation.alternatives || []).join("; ")}.`;
    }
  },

  // ===== SAVE DECISION =====
  async saveRecommendation(rec, aiExplanation = "") {
    return base44.entities.Decision.create({
      ...rec,
      ai_explanation: aiExplanation,
      status: rec.status || "pendente",
    });
  },

  async decide(decisionId, status, decidedBy, resultPredicted = null) {
    return base44.entities.Decision.update(decisionId, {
      status,
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
      result_predicted: resultPredicted,
    });
  },

  // ===== HISTORY =====
  async getHistory(limit = 50) {
    return base44.entities.Decision.filter({ deleted_at: null }, "-created_date", limit).catch(() => []);
  },

  async measureResult(decisionId, resultActual, accuracyScore) {
    return base44.entities.Decision.update(decisionId, {
      result_actual: resultActual,
      result_measured_at: new Date().toISOString().slice(0, 10),
      accuracy_score: accuracyScore,
    });
  },
};

export default DecisionEngine;