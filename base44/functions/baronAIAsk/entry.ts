import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function brl(n) {
  return (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatContext(data) {
  const { transactions, products, purchases, production, documents, priceHistory, suppliers } = data;
  const today = new Date().toISOString().slice(0, 10);
  const lines = [];

  lines.push(`DATA ATUAL: ${today}`);
  lines.push("");

  if (products && products.length > 0) {
    lines.push("=== PRODUTOS CADASTRADOS ===");
    products.forEach(p => {
      const stockInfo = p.controls_stock !== false
        ? `Estoque: ${p.stock_quantity || 0} ${p.unit || ""} (Min: ${p.min_quantity || 0}, Max: ${p.max_quantity || 0}, Ideal: ${p.ideal_quantity || 0})`
        : "Nao controla estoque";
      lines.push(`- ${p.name} | Cat: ${p.category || "N/A"} | ${stockInfo} | Custo: ${brl(p.cost_price)} | Fornecedor: ${p.primary_supplier_name || "N/A"} | Ativo: ${p.active}`);
    });
    lines.push("");
  }

  const aPagar = (transactions || []).filter(t => t.type === "a_pagar" && t.status !== "pago");
  const aReceber = (transactions || []).filter(t => t.type === "a_receber" && t.status !== "recebido");
  const pagas = (transactions || []).filter(t => t.type === "a_pagar" && t.status === "pago");
  const recebidas = (transactions || []).filter(t => t.type === "a_receber" && t.status === "recebido");

  lines.push("=== FINANCEIRO ===");
  lines.push(`CONTAS A PAGAR (pendentes): ${aPagar.length} | Total: ${brl(aPagar.reduce((s,t) => s+(t.amount||0), 0))}`);
  aPagar.forEach(t => {
    lines.push(`  - ${t.description || "Sem descricao"} | Fornecedor: ${t.supplier || "N/A"} | ${brl(t.amount)} | Venc: ${t.due_date || "N/A"} | Status: ${t.status} | Cat: ${t.category || "Sem categoria"}`);
  });
  lines.push(`CONTAS A RECEBER (pendentes): ${aReceber.length} | Total: ${brl(aReceber.reduce((s,t) => s+(t.amount||0), 0))}`);
  aReceber.forEach(t => {
    lines.push(`  - ${t.description || "Sem descricao"} | ${t.supplier || "N/A"} | ${brl(t.amount)} | Venc: ${t.due_date || "N/A"} | Status: ${t.status}`);
  });
  lines.push(`CONTAS PAGAS: ${pagas.length} | Total: ${brl(pagas.reduce((s,t) => s+(t.amount||0), 0))}`);
  lines.push(`CONTAS RECEBIDAS: ${recebidas.length} | Total: ${brl(recebidas.reduce((s,t) => s+(t.amount||0), 0))}`);
  lines.push("");

  if (documents && documents.length > 0) {
    lines.push("=== DOCUMENTOS ===");
    documents.forEach(d => {
      lines.push(`- ${d.title} | Tipo: ${d.category} | Status: ${d.status} | Fornecedor: ${d.supplier || "N/A"} | Valor: ${brl(d.value || 0)} | Venc: ${d.due_date || "N/A"} | Num: ${d.document_number || "N/A"}`);
    });
    lines.push("");
  }

  if (priceHistory && priceHistory.length > 0) {
    lines.push("=== HISTORICO DE PRECOS ===");
    priceHistory.forEach(ph => {
      lines.push(`- ${ph.product_name} | Fornecedor: ${ph.supplier_name} | Preco: ${brl(ph.price)} | Qtd: ${ph.quantity} ${ph.unit || ""} | Data: ${ph.date || "N/A"}`);
    });
    lines.push("");
  }

  if (purchases && purchases.length > 0) {
    lines.push("=== COMPRAS ===");
    purchases.forEach(p => {
      lines.push(`- ${p.supplier} | ${p.description || "Sem descricao"} | ${brl(p.total_amount || 0)} | Data: ${p.order_date || "N/A"} | Status: ${p.status}`);
    });
    lines.push("");
  }

  if (production && production.length > 0) {
    lines.push("=== PRODUCAO ===");
    production.forEach(p => {
      lines.push(`- ${p.item} | Qtd: ${p.quantity} ${p.unit || ""} | Data: ${p.production_date || "N/A"} | Resp: ${p.responsible || "N/A"} | Status: ${p.status}`);
    });
    lines.push("");
  }

  if (suppliers && suppliers.length > 0) {
    lines.push("=== FORNECEDORES ===");
    suppliers.forEach(s => {
      lines.push(`- ${s.name} | ${s.trade_name || ""} | Tel: ${s.phone || "N/A"} | Entrega: ${s.average_delivery_days || "N/A"} dias | Ativo: ${s.active}`);
    });
  }

  return lines.join("\n");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const question = body.question;
    if (!question || !question.trim()) {
      return Response.json({ error: "Pergunta e obrigatoria" }, { status: 400 });
    }

    const results = await Promise.allSettled([
      base44.entities.FinancialTransaction.list("-created_date", 500),
      base44.entities.Product.list("-created_date", 500),
      base44.entities.Purchase.list("-created_date", 200),
      base44.entities.ProductionRecord.list("-created_date", 200),
      base44.entities.DBDocument.list("-created_date", 200),
      base44.entities.PriceHistory.list("-created_date", 200),
      base44.entities.Supplier.list("-created_date", 200),
    ]);

    const data = {
      transactions: results[0].status === "fulfilled" ? results[0].value : [],
      products: results[1].status === "fulfilled" ? results[1].value : [],
      purchases: results[2].status === "fulfilled" ? results[2].value : [],
      production: results[3].status === "fulfilled" ? results[3].value : [],
      documents: results[4].status === "fulfilled" ? results[4].value : [],
      priceHistory: results[5].status === "fulfilled" ? results[5].value : [],
      suppliers: results[6].status === "fulfilled" ? results[6].value : [],
    };

    const context = formatContext(data);

    const prompt = `Voce e a BARON AI, o Diretor Operacional Digital da Don Baron (restaurante/hamburgueria).

REGRAS ABSOLUTAS:
1. Responda APENAS com as informacoes fornecidas no CONTEXTO abaixo.
2. NUNCA invente dados, valores ou informacoes. NUNCA use conhecimento generico.
3. Se nao houver dados suficientes no contexto para responder, diga exatamente: "Nao ha informacoes suficientes para responder esta pergunta."
4. Seja direto, claro e objetivo.
5. Cite valores, datas, fornecedores e produtos quando relevante.
6. Para valores monetarios, use sempre o formato R$.

CONTEXTO DOS DADOS DO SISTEMA DON BARON:
${context}

PERGUNTA DO USUARIO: ${question}

Responda:`;

    const answer = await base44.integrations.Core.InvokeLLM({
      prompt,
    });

    const answerStr = typeof answer === "string" ? answer : String(answer || "");

    try {
      await base44.entities.BaronAIHistory.create({
        question: question,
        answer: answerStr,
        user_name: user.full_name || "N/A",
        user_email: user.email || "N/A",
      });
    } catch (e) {
      // History save failure should not break the answer
    }

    return Response.json({ answer: answerStr });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});