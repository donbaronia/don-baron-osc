import { base44 } from "@/api/base44Client";

export const brl = (n) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function gatherBusinessData() {
  const results = await Promise.allSettled([
    base44.entities.FinancialTransaction.list("-created_date", 500),
    base44.entities.Product.list("-created_date", 500),
    base44.entities.Purchase.list("-created_date", 200),
    base44.entities.ProductionRecord.list("-created_date", 200),
    base44.entities.DBDocument.list("-created_date", 200),
    base44.entities.PriceHistory.list("-created_date", 200),
    base44.entities.Supplier.list("-created_date", 200),
  ]);
  return {
    transactions: results[0].status === "fulfilled" ? results[0].value : [],
    products: results[1].status === "fulfilled" ? results[1].value : [],
    purchases: results[2].status === "fulfilled" ? results[2].value : [],
    production: results[3].status === "fulfilled" ? results[3].value : [],
    documents: results[4].status === "fulfilled" ? results[4].value : [],
    priceHistory: results[5].status === "fulfilled" ? results[5].value : [],
    suppliers: results[6].status === "fulfilled" ? results[6].value : [],
  };
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function generateAlerts(data) {
  const { transactions, products, documents, priceHistory } = data;
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = addDays(today, 1);
  const next7 = addDays(today, 7);
  const alerts = [];

  // 1. Products below min stock
  (products || []).forEach(p => {
    if (p.controls_stock === false) return;
    if ((p.min_quantity || 0) <= 0) return;
    if ((p.stock_quantity || 0) > (p.min_quantity || 0)) return;
    alerts.push({
      id: `stock_low_${p.id}`,
      severity: (p.stock_quantity || 0) <= 0 ? "critical" : "warning",
      title: `${p.name} abaixo do estoque mínimo`,
      description: `Estoque atual: ${p.stock_quantity || 0} ${p.unit || ""}. Mínimo: ${p.min_quantity} ${p.unit || ""}. Fornecedor: ${p.primary_supplier_name || "N/A"}.`,
      module: "estoque",
    });
  });

  // 2. Boletos overdue or due soon
  const aPagar = (transactions || []).filter(t => t.type === "a_pagar" && t.status !== "pago");
  aPagar.forEach(t => {
    if (!t.due_date) return;
    if (t.due_date < today) {
      alerts.push({
        id: `boleto_overdue_${t.id}`,
        severity: "critical",
        title: "Boleto vencido",
        description: `${t.description || t.supplier || "Sem descrição"} — ${brl(t.amount)} — Vencimento: ${t.due_date}`,
        module: "financeiro",
      });
    } else if (t.due_date === tomorrow) {
      alerts.push({
        id: `boleto_tomorrow_${t.id}`,
        severity: "warning",
        title: "Boleto vence amanhã",
        description: `${t.description || t.supplier || "Sem descrição"} — ${brl(t.amount)} — Vencimento: ${t.due_date}`,
        module: "financeiro",
      });
    } else if (t.due_date <= next7) {
      alerts.push({
        id: `boleto_soon_${t.id}`,
        severity: "warning",
        title: "Boleto vence em breve",
        description: `${t.description || t.supplier || "Sem descrição"} — ${brl(t.amount)} — Vencimento: ${t.due_date}`,
        module: "financeiro",
      });
    }
  });

  // 3. Documents awaiting confirmation
  (documents || []).forEach(d => {
    if (d.status === "aguardando_confirmacao" || d.status === "em_analise" || d.status === "recebido") {
      alerts.push({
        id: `doc_pending_${d.id}`,
        severity: "info",
        title: `${d.category || "Documento"} aguardando conferência`,
        description: `${d.title || "Sem título"} — ${d.supplier || "N/A"} — ${brl(d.value || 0)}`,
        module: "documentos",
      });
    }
  });

  // 4. Supplier price increase
  const priceMap = {};
  (priceHistory || []).forEach(ph => {
    const key = `${ph.product_id}_${ph.supplier_id}`;
    if (!priceMap[key]) priceMap[key] = [];
    priceMap[key].push(ph);
  });
  Object.entries(priceMap).forEach(([key, prices]) => {
    if (prices.length < 2) return;
    const sorted = [...prices].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const latest = sorted[0];
    const previous = sorted[1];
    if (latest.price > previous.price && previous.price > 0) {
      const pct = ((latest.price - previous.price) / previous.price * 100).toFixed(1);
      alerts.push({
        id: `price_increase_${key}`,
        severity: "warning",
        title: `${latest.product_name}: preço aumentou ${pct}%`,
        description: `De ${brl(previous.price)} para ${brl(latest.price)} — Fornecedor: ${latest.supplier_name} — Em ${latest.date || "N/A"}`,
        module: "compras",
      });
    }
  });

  // 5. Negative cash flow predicted
  const totalPagar = aPagar.reduce((s, t) => s + (t.amount || 0), 0);
  const aReceber = (transactions || []).filter(t => t.type === "a_receber" && t.status !== "recebido");
  const totalReceber = aReceber.reduce((s, t) => s + (t.amount || 0), 0);
  const fluxo = totalReceber - totalPagar;
  if (fluxo < 0) {
    alerts.push({
      id: "cashflow_negative",
      severity: "critical",
      title: "Fluxo de caixa negativo previsto",
      description: `Contas a pagar (${brl(totalPagar)}) superam contas a receber (${brl(totalReceber)}). Déficit previsto: ${brl(fluxo)}.`,
      module: "financeiro",
    });
  }

  return alerts;
}

export function generateRecommendations(data) {
  const { transactions, products, documents, production } = data;
  const today = new Date().toISOString().slice(0, 10);
  const next3 = addDays(today, 3);
  const recs = [];

  // 1. Buy products below min stock
  const lowStock = (products || []).filter(p =>
    p.controls_stock !== false &&
    (p.min_quantity || 0) > 0 &&
    (p.stock_quantity || 0) <= (p.min_quantity || 0)
  );
  lowStock.slice(0, 10).forEach(p => {
    recs.push({
      id: `buy_${p.id}`,
      priority: (p.stock_quantity || 0) <= 0 ? "alta" : "media",
      title: `Comprar ${p.name}`,
      justification: `Estoque atual (${p.stock_quantity || 0} ${p.unit || ""}) está abaixo do mínimo (${p.min_quantity} ${p.unit || ""}). Fornecedor principal: ${p.primary_supplier_name || "N/A"}.`,
      action_label: "Ir para Compras",
      link: "/compras",
    });
  });

  // 2. Early payment for boletos due within 3 days
  const upcomingBoletos = (transactions || []).filter(t =>
    t.type === "a_pagar" && t.status !== "pago" && t.due_date && t.due_date <= next3 && t.due_date >= today
  );
  if (upcomingBoletos.length > 0) {
    recs.push({
      id: "early_payment",
      priority: "media",
      title: "Antecipar pagamento de boleto",
      justification: `Há ${upcomingBoletos.length} boleto(s) vencendo nos próximos 3 dias (total: ${brl(upcomingBoletos.reduce((s, t) => s + (t.amount || 0), 0))}). Verifique se há desconto para pagamento antecipado.`,
      action_label: "Ir para Financeiro",
      link: "/financeiro",
    });
  }

  // 3. Confirm pending documents
  const pendingDocs = (documents || []).filter(d => d.status === "aguardando_confirmacao" || d.status === "em_analise" || d.status === "recebido");
  if (pendingDocs.length > 0) {
    recs.push({
      id: "confirm_docs",
      priority: "media",
      title: "Conferir documentos pendentes",
      justification: `Há ${pendingDocs.length} documento(s) aguardando confirmação. Dados não confirmados podem atrasar lançamentos financeiros e de estoque.`,
      action_label: "Ir para Documentos",
      link: "/documentos",
    });
  }

  // 4. Complete pending productions
  const pendingProd = (production || []).filter(p => p.status === "planejada" || p.status === "em_producao");
  if (pendingProd.length > 0) {
    recs.push({
      id: "complete_production",
      priority: pendingProd.length > 3 ? "alta" : "media",
      title: "Concluir produções pendentes",
      justification: `Há ${pendingProd.length} produção(ões) pendente(s). Itens: ${pendingProd.slice(0, 5).map(p => p.item).join(", ")}.`,
      action_label: "Ir para Produção",
      link: "/producao",
    });
  }

  // 5. Check for stale iFood reports
  const ifoodReports = (documents || []).filter(d => d.category === "relatorio_ifood" && d.period_end);
  if (ifoodReports.length > 0) {
    const sorted = [...ifoodReports].sort((a, b) => (b.period_end || "").localeCompare(a.period_end || ""));
    const latestEnd = sorted[0].period_end;
    const daysSince = Math.floor((new Date(today) - new Date(latestEnd + "T00:00:00")) / (1000 * 60 * 60 * 24));
    if (daysSince > 7) {
      recs.push({
        id: "update_ifood",
        priority: "baixa",
        title: "Atualizar relatório semanal do iFood",
        justification: `O último relatório do iFood cadastrado abrange até ${latestEnd} (há ${daysSince} dias). Recomenda-se importar o relatório mais recente.`,
        action_label: "Ir para Documentos",
        link: "/documentos",
      });
    }
  }

  // 6. Inventory check
  const hasStockProducts = (products || []).some(p => p.controls_stock !== false);
  const recentPriceEntries = (data.priceHistory || []).filter(ph => {
    if (!ph.date) return false;
    return addDays(today, -30) <= ph.date;
  });
  if (hasStockProducts && recentPriceEntries.length === 0) {
    recs.push({
      id: "inventory_check",
      priority: "baixa",
      title: "Realizar conferência de inventário",
      justification: "Não há registros de movimentação de preços nos últimos 30 dias. Recomenda-se uma conferência de estoque para validar as quantidades cadastradas.",
      action_label: "Ir para Estoque",
      link: "/estoque",
    });
  }

  return recs;
}

export function generatePendingItems(data) {
  const { transactions, documents, purchases } = data;
  const items = [];

  // 1. Documents awaiting confirmation
  (documents || []).forEach(d => {
    if (d.status === "aguardando_confirmacao" || d.status === "em_analise" || d.status === "recebido") {
      items.push({
        id: `doc_${d.id}`,
        title: d.title || "Documento sem título",
        description: `${d.category || "Documento"} — ${d.supplier || "N/A"} — ${brl(d.value || 0)} — Status: ${d.status}`,
        module: "documentos",
        link: "/documentos",
      });
    }
  });

  // 2. Boletos without category
  (transactions || []).forEach(t => {
    if (t.type === "a_pagar" && t.status !== "pago" && (!t.category || t.category === "")) {
      items.push({
        id: `uncat_${t.id}`,
        title: `${t.description || "Boleto"} sem categoria`,
        description: `${brl(t.amount)} — Venc: ${t.due_date || "N/A"} — ${t.supplier || "N/A"} — Sem categoria definida`,
        module: "financeiro",
        link: "/financeiro",
      });
    }
  });

  // 3. NFs not processed
  (documents || []).forEach(d => {
    if (d.category === "nota_fiscal" && d.status !== "processado" && d.status !== "arquivado" && d.status !== "rejeitado") {
      items.push({
        id: `nf_${d.id}`,
        title: `NF não processada: ${d.title || ""}`,
        description: `${d.supplier || "N/A"} — ${brl(d.value || 0)} — Status: ${d.status}`,
        module: "documentos",
        link: "/documentos",
      });
    }
  });

  // 4. Purchases pending
  (purchases || []).forEach(p => {
    if (p.status === "pendente") {
      items.push({
        id: `purchase_${p.id}`,
        title: `Compra pendente: ${p.supplier || ""}`,
        description: `${p.description || "N/A"} — ${brl(p.total_amount || 0)} — Data: ${p.order_date || "N/A"}`,
        module: "compras",
        link: "/compras",
      });
    }
  });

  return items;
}

export function generateExecutiveSummary(data, user) {
  const { transactions, products, purchases, production, documents } = data;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const next7 = addDays(today, 7);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const userName = (user?.full_name || "Gestor").split(" ")[0];

  const aPagar = (transactions || []).filter(t => t.type === "a_pagar" && t.status !== "pago");
  const aReceber = (transactions || []).filter(t => t.type === "a_receber" && t.status !== "recebido");
  const boletosVencendo = aPagar.filter(t => t.due_date && t.due_date <= next7);
  const pagarHoje = aPagar.filter(t => t.due_date === today);
  const lowStock = (products || []).filter(p =>
    p.controls_stock !== false && (p.min_quantity || 0) > 0 && (p.stock_quantity || 0) <= (p.min_quantity || 0)
  );
  const producaoPendente = (production || []).filter(p => p.status === "planejada" || p.status === "em_producao");
  const totalPagar = aPagar.reduce((s, t) => s + (t.amount || 0), 0);
  const totalReceber = aReceber.reduce((s, t) => s + (t.amount || 0), 0);
  const fluxoCaixa = totalReceber - totalPagar;
  const docsPendentes = (documents || []).filter(d =>
    d.status === "recebido" || d.status === "em_analise" || d.status === "aguardando_confirmacao"
  ).length;

  const alerts = generateAlerts(data);
  const pendencias = generatePendingItems(data);

  const hasData =
    (transactions || []).length > 0 ||
    (products || []).length > 0 ||
    (documents || []).length > 0 ||
    (purchases || []).length > 0;

  const cards = [
    {
      icon: "receipt",
      label: "Boletos Vencendo",
      value: String(boletosVencendo.length),
      detail: boletosVencendo.length > 0 ? brl(boletosVencendo.reduce((s, t) => s + (t.amount || 0), 0)) : "",
      tone: boletosVencendo.length > 0 ? "warning" : "neutral",
      accent: "bg-orange-50 text-orange-600",
    },
    {
      icon: "file",
      label: "Documentos Pendentes",
      value: String(docsPendentes),
      tone: docsPendentes > 0 ? "warning" : "neutral",
      accent: "bg-amber-50 text-amber-600",
    },
    {
      icon: "package",
      label: "Abaixo do Estoque Mínimo",
      value: String(lowStock.length),
      tone: lowStock.length > 0 ? "negative" : "neutral",
      accent: "bg-red-50 text-red-600",
    },
    {
      icon: "cart",
      label: "Compras Sugeridas",
      value: String(lowStock.length),
      tone: lowStock.length > 0 ? "warning" : "neutral",
      accent: "bg-indigo-50 text-indigo-600",
    },
    {
      icon: "factory",
      label: "Produções Pendentes",
      value: String(producaoPendente.length),
      tone: producaoPendente.length > 0 ? "warning" : "neutral",
      accent: "bg-cyan-50 text-cyan-600",
    },
    {
      icon: "wallet",
      label: "Fluxo de Caixa Previsto",
      value: brl(fluxoCaixa),
      tone: fluxoCaixa >= 0 ? "positive" : "negative",
      accent: "bg-teal-50 text-teal-600",
    },
    {
      icon: "dollar",
      label: "Contas a Pagar Hoje",
      value: String(pagarHoje.length),
      detail: pagarHoje.length > 0 ? brl(pagarHoje.reduce((s, t) => s + (t.amount || 0), 0)) : "",
      tone: pagarHoje.length > 0 ? "warning" : "neutral",
      accent: "bg-rose-50 text-rose-600",
    },
    {
      icon: "alert",
      label: "Alertas Ativos",
      value: String(alerts.length),
      tone: alerts.length > 0 ? "warning" : "neutral",
      accent: "bg-yellow-50 text-yellow-600",
    },
    {
      icon: "clock",
      label: "Pendências",
      value: String(pendencias.length),
      tone: pendencias.length > 0 ? "warning" : "neutral",
      accent: "bg-purple-50 text-purple-600",
    },
  ];

  const summaryParts = [];
  if (pagarHoje.length > 0) summaryParts.push(`${pagarHoje.length} conta(s) a pagar hoje (${brl(pagarHoje.reduce((s, t) => s + (t.amount || 0), 0))})`);
  if (alerts.length > 0) summaryParts.push(`${alerts.length} alerta(s) ativo(s)`);
  if (pendencias.length > 0) summaryParts.push(`${pendencias.length} pendência(s)`);
  if (lowStock.length > 0) summaryParts.push(`${lowStock.length} produto(s) abaixo do estoque mínimo`);
  if (docsPendentes > 0) summaryParts.push(`${docsPendentes} documento(s) pendente(s)`);
  const daySummary = summaryParts.length > 0
    ? `Hoje: ${summaryParts.join(", ")}.`
    : "Operação estável. Nenhum item crítico no momento.";

  return {
    greeting: `${greeting}, ${userName}.`,
    date: now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    hasData,
    daySummary,
    cards,
    alertCount: alerts.length,
    pendingCount: pendencias.length,
    alerts,
    pendencias,
  };
}