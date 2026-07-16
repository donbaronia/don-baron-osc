import { base44 } from "@/api/base44Client";
import { DataEngine } from "@/lib/dataEngine";

export const brl = (n = 0) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const todayStr = () => new Date().toISOString().slice(0, 10);

export function weekRange() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
}

export function monthRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

export const FinancialCenter = {
  async getDashboardData() {
    const [accounts, payments, receipts, ifoodReceipts, indicators] = await Promise.all([
      base44.entities.FinancialAccount.list("-created_date", 100).catch(() => []),
      base44.entities.Payment.list("-due_date", 300).catch(() => []),
      base44.entities.Receipt.list("-expected_date", 300).catch(() => []),
      base44.entities.IFoodReceipt.list("-created_date", 100).catch(() => []),
      DataEngine.calculate("indicadores").catch(() => ({ result: {} })),
    ]);

    const today = todayStr();
    const week = weekRange();
    const month = monthRange();

    const saldoCaixa = accounts.filter(a => a.account_type === "dinheiro").reduce((s, a) => s + (a.current_balance || 0), 0);
    const saldoBancario = accounts.filter(a => ["conta_corrente", "poupanca"].includes(a.account_type)).reduce((s, a) => s + (a.current_balance || 0), 0);
    const saldoTotal = saldoCaixa + saldoBancario;

    const pagarHoje = payments.filter(p => p.due_date === today && p.status === "pendente").reduce((s, p) => s + (p.amount || 0), 0);
    const receberHoje = receipts.filter(r => r.expected_date === today && r.status === "pendente").reduce((s, r) => s + (r.amount || 0), 0);
    const ifoodPrevisto = ifoodReceipts.filter(r => r.status === "pendente").reduce((s, r) => s + (r.net_value || 0), 0);

    const despesasSemana = payments.filter(p => p.due_date >= week.start && p.due_date <= week.end).reduce((s, p) => s + (p.amount || 0), 0);
    const receitasSemana = receipts.filter(r => r.expected_date >= week.start && r.expected_date <= week.end).reduce((s, r) => s + (r.amount || 0), 0);

    const despesasMes = payments.filter(p => p.due_date >= month.start && p.due_date <= month.end).reduce((s, p) => s + (p.amount || 0), 0);
    const receitasMes = receipts.filter(r => r.expected_date >= month.start && r.expected_date <= month.end).reduce((s, r) => s + (r.amount || 0), 0);

    const ind = indicators.result || {};
    const financeiro = ind.financeiro || {};
    const lucroBruto = financeiro.lucro || (receitasMes - despesasMes);
    const margem = financeiro.margem || (receitasMes > 0 ? ((receitasMes - despesasMes) / receitasMes) * 100 : 0);
    const cmv = (ind.compras || {}).cmv || 0;
    const fluxoProjetado = financeiro.fluxo_caixa || (receitasMes - despesasMes);

    const pagarPendente = payments.filter(p => p.status === "pendente").reduce((s, p) => s + (p.amount || 0), 0);
    const capitalGiro = saldoTotal - pagarPendente;

    const alerts = [];
    payments.filter(p => p.status === "pendente" && p.due_date).forEach(p => {
      const diff = Math.ceil((new Date(p.due_date) - new Date(today)) / (1000 * 60 * 60 * 24));
      if (diff < 0) alerts.push({ severity: "urgent", message: `Pagamento atrasado: ${p.description || p.supplier_name} — ${brl(p.amount)} (${p.due_date})` });
      else if (diff <= 3) alerts.push({ severity: "warning", message: `Boleto vencendo: ${p.description || p.supplier_name} — ${brl(p.amount)} (${p.due_date})` });
    });
    receipts.filter(r => r.status === "pendente" && r.expected_date && r.expected_date < today)
      .forEach(r => alerts.push({ severity: "warning", message: `Recebimento atrasado: ${r.description || r.customer_name} — ${brl(r.amount)}` }));

    if (margem < 20 && receitasMes > 0) alerts.push({ severity: "warning", message: `Margem atual (${margem.toFixed(1)}%) abaixo da meta (20%)` });
    if (cmv > 0 && receitasMes > 0 && (cmv / receitasMes) * 100 > 40) alerts.push({ severity: "urgent", message: `CMV (${((cmv / receitasMes) * 100).toFixed(1)}%) acima da meta (40%)` });
    if (capitalGiro < 0) alerts.push({ severity: "urgent", message: `Capital de giro negativo: ${brl(capitalGiro)}` });

    return {
      saldos: { caixa: saldoCaixa, bancario: saldoBancario, total: saldoTotal },
      hoje: { pagar: pagarHoje, receber: receberHoje, ifood: ifoodPrevisto },
      semana: { despesas: despesasSemana, receitas: receitasSemana },
      mes: { despesas: despesasMes, receitas: receitasMes, resultado: receitasMes - despesasMes },
      indicadores: { lucroBruto, margem, cmv, fluxoProjetado, capitalGiro },
      alerts,
    };
  },

  async getProjection(days) {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const targetStr = target.toISOString().slice(0, 10);
    const today = todayStr();

    const [payments, receipts] = await Promise.all([
      base44.entities.Payment.list("-due_date", 500).catch(() => []),
      base44.entities.Receipt.list("-expected_date", 500).catch(() => []),
    ]);

    const periodPagar = payments.filter(p => p.due_date >= today && p.due_date <= targetStr && p.status === "pendente");
    const periodReceber = receipts.filter(r => r.expected_date >= today && r.expected_date <= targetStr && r.status === "pendente");

    return {
      days,
      period_end: targetStr,
      a_pagar: periodPagar.reduce((s, p) => s + (p.amount || 0), 0),
      a_receber: periodReceber.reduce((s, r) => s + (r.amount || 0), 0),
      saldo_projetado: periodReceber.reduce((s, r) => s + (r.amount || 0), 0) - periodPagar.reduce((s, p) => s + (p.amount || 0), 0),
      count_pagar: periodPagar.length,
      count_receber: periodReceber.length,
    };
  },

  async getDRE(startDate, endDate) {
    const [receipts, payments, ifoodReceipts, cmvResult] = await Promise.all([
      base44.entities.Receipt.list("-expected_date", 500).catch(() => []),
      base44.entities.Payment.list("-due_date", 500).catch(() => []),
      base44.entities.IFoodReceipt.list("-expected_date", 200).catch(() => []),
      DataEngine.calculate("cmv", { start_date: startDate, end_date: endDate }).catch(() => ({ result: { cmv_estimado: 0 } })),
    ]);

    const inPeriod = (date) => date && date >= startDate && date <= endDate;
    const periodReceipts = receipts.filter(r => inPeriod(r.expected_date));
    const periodPayments = payments.filter(p => inPeriod(p.due_date));
    // iFood grava em entidade própria (IFoodReceipt) — precisa entrar no DRE
    // junto com os recebimentos genéricos, senão a receita do iFood nunca aparece.
    const periodIfood = ifoodReceipts.filter(r => r.status !== "cancelado" && inPeriod(r.expected_date));

    const receitaBrutaGenerica = periodReceipts.reduce((s, r) => s + (r.amount || 0), 0);
    const receitaBrutaIfood = periodIfood.reduce((s, r) => s + (r.gross_value || 0), 0);
    const receitaBruta = receitaBrutaGenerica + receitaBrutaIfood;
    const descontosGenericos = periodReceipts.reduce((s, r) => s + (r.discounts || 0), 0);
    const descontosIfood = periodIfood.reduce((s, r) => s + (r.fees || 0) + (r.commissions || 0) + (r.campaigns || 0) + (r.chargebacks || 0) + (r.refunds || 0) + (r.cancellations || 0), 0);
    const descontos = descontosGenericos + descontosIfood;
    const receitaLiquida = receitaBruta - descontos;
    const cmv = (cmvResult.result || {}).cmv_estimado || 0;
    const lucroBruto = receitaLiquida - cmv;

    const despesasOperacionais = periodPayments
      .filter(p => !["imposto", "juro", "multa"].includes(p.category))
      .reduce((s, p) => s + (p.amount || 0), 0);
    const ebitda = lucroBruto - despesasOperacionais;
    const impostosJuros = periodPayments
      .filter(p => ["imposto", "juro", "multa"].includes(p.category))
      .reduce((s, p) => s + (p.amount || 0), 0);
    const resultadoFinal = ebitda - impostosJuros;

    return {
      receita_bruta: receitaBruta,
      receita_bruta_ifood: receitaBrutaIfood,
      descontos,
      receita_liquida: receitaLiquida,
      cmv,
      lucro_bruto: lucroBruto,
      despesas_operacionais: despesasOperacionais,
      ebitda,
      impostos_juros: impostosJuros,
      resultado_final: resultadoFinal,
      margem_bruta: receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0,
      margem_liquida: receitaLiquida > 0 ? (resultadoFinal / receitaLiquida) * 100 : 0,
    };
  },
};

export default FinancialCenter;