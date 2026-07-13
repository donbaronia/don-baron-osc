/**
 * Centro de Processamento Inteligente de Documentos (IA)
 *
 * Pipeline único: anexar → IA identifica → extrai → valida → roteia automaticamente.
 *
 * Fluxos:
 * - Boleto/PIX: validar → auto-criar Contas a Pagar (sem divergências) ou pendência
 * - Nota Fiscal/XML: conferir produtos → auto-entrada estoque (sem divergências) ou pendência
 * - Outros: apenas armazenar com dados extraídos
 */
import { base44 } from "@/api/base44Client";
import { analyzeDocument, mapExtractedToDocument } from "@/lib/documentAI";
import { detectDuplicate, detectPriceChanges, generateAlerts } from "@/lib/documentCenter";
import { Core } from "@/lib/coreEngine";
import { todayStr } from "@/lib/financialCenter";

const BOLETO_TYPES = ["boleto", "comprovante_pix", "comprovante_bancario"];
const NF_TYPES = ["nota_fiscal", "xml"];

/**
 * Similaridade de strings normalizada (0-1). Simples baseada em tokens.
 */
function nameSimilarity(a, b) {
  if (!a || !b) return 0;
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  const ta = new Set(na.split(" ").filter((w) => w.length > 2));
  const tb = new Set(nb.split(" ").filter((w) => w.length > 2));
  let common = 0;
  ta.forEach((w) => { if (tb.has(w)) common++; });
  return common / Math.max(ta.size, tb.size, 1);
}

/**
 * Encontra produto correspondente no cadastro por nome ou alias.
 * Retorna { product, confidence, matchedBy } ou null.
 */
export function matchProduct(productName, products) {
  if (!productName) return null;
  let best = null;
  for (const p of products) {
    const sim = nameSimilarity(productName, p.name);
    if (sim > (best?.confidence || 0)) {
      best = { product: p, confidence: sim, matchedBy: "name" };
    }
    if (p.short_name) {
      const ssim = nameSimilarity(productName, p.short_name);
      if (ssim > (best?.confidence || 0)) {
        best = { product: p, confidence: ssim, matchedBy: "short_name" };
      }
    }
    for (const alias of p.aliases || []) {
      const asim = nameSimilarity(productName, alias);
      if (asim >= 0.9) {
        return { product: p, confidence: 1, matchedBy: "alias" };
      }
      if (asim > (best?.confidence || 0)) {
        best = { product: p, confidence: asim, matchedBy: "alias" };
      }
    }
  }
  if (best && best.confidence >= 0.85) return best;
  return best; // retorna mesmo parcial para sugestão
}

/**
 * Aprendizado: armazena alias permanentemente no produto.
 */
export async function learnAlias(productId, alias) {
  if (!productId || !alias) return;
  const product = await base44.entities.Product.get(productId);
  const aliases = [...new Set([...(product.aliases || []), alias])];
  await base44.entities.Product.update(productId, { aliases });
  await Core.audit({ audit_action: "update", module: "cadastro", entity_type: "Product", entity_id: productId, details: `IA aprendeu alias: ${alias}` });
}

/**
 * Validações de boleto antes de criar Contas a Pagar.
 * Retorna { divergencias: [], clean: boolean }.
 */
export async function validarBoleto(doc, extracted) {
  const divergencias = [];

  // 1. Linha digitável duplicada
  if (extracted.linha_digitavel) {
    const existing = await base44.entities.DBDocument.filter(
      { linha_digitavel: extracted.linha_digitavel, deleted_at: { $exists: false } },
      "-created_date", 10
    ).catch(() => []);
    const dup = existing.find((d) => d.id !== doc.id);
    if (dup) {
      divergencias.push({ type: "linha_duplicada", severity: "critica", message: `Linha digitável duplicada (doc: ${dup.title})` });
    }
  }

  // 2. Boleto igual (mesmo fornecedor + valor + vencimento)
  if (extracted.supplier && extracted.value && extracted.due_date) {
    const similar = await base44.entities.DBDocument.filter(
      { supplier: extracted.supplier, value: extracted.value, due_date: extracted.due_date, deleted_at: { $exists: false } },
      "-created_date", 10
    ).catch(() => []);
    const dup = similar.find((d) => d.id !== doc.id);
    if (dup) {
      divergencias.push({ type: "boleto_igual", severity: "critica", message: `Boleto igual já cadastrado (${dup.title})` });
    }
  }

  // 3. Já foi pago? (Payment com mesmo document_number + status pago)
  if (extracted.document_number) {
    const paid = await base44.entities.Payment.filter(
      { document_number: extracted.document_number, status: "pago" },
      "-created_date", 5
    ).catch(() => []);
    if (paid.length > 0) {
      divergencias.push({ type: "ja_pago", severity: "critica", message: `Documento já pago em ${paid[0].payment_date}` });
    }
  }

  // 4. Valor muito diferente da média (boletos do mesmo fornecedor)
  if (extracted.supplier && extracted.value > 0) {
    const history = await base44.entities.Payment.filter(
      { supplier_name: extracted.supplier, status: "pago" },
      "-created_date", 20
    ).catch(() => []);
    if (history.length >= 3) {
      const avg = history.reduce((s, p) => s + (p.amount || 0), 0) / history.length;
      const dev = Math.abs((extracted.value - avg) / avg);
      if (dev > 0.5) {
        divergencias.push({ type: "valor_atipico", severity: "alta", message: `Valor ${extracted.value > avg ? "acima" : "abaixo"} da média (${((dev) * 100).toFixed(0)}% vs ${avg.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})` });
      }
    }
  }

  // 5. CNPJ diferente do fornecedor esperado
  if (extracted.supplier && extracted.cnpj) {
    const supplier = await base44.entities.Supplier.filter(
      { name: { $regex: extracted.supplier, $options: "i" } }, "-created_date", 3
    ).catch(() => []);
    if (supplier.length > 0 && supplier[0].document_number && extracted.cnpj.replace(/\D/g, "") !== supplier[0].document_number.replace(/\D/g, "")) {
      divergencias.push({ type: "cnpj_divergente", severity: "alta", message: `CNPJ do documento difere do cadastro do fornecedor` });
    }
  }

  return { divergencias, clean: divergencias.length === 0 };
}

/**
 * Processa boleto: se limpo → auto-cria Contas a Pagar. Se divergências → pendência.
 */
async function processarBoleto(doc, extracted, user) {
  const { divergencias, clean } = await validarBoleto(doc, extracted);
  const alerts = generateAlerts(doc, { duplicate: divergencias.find((d) => d.type === "boleto_igual" || d.type === "linha_duplicada") ? doc : null, priceChanges: [], newProducts: [] });

  const allAlerts = [
    ...alerts,
    ...divergencias.map((d) => ({ type: d.type, severity: d.severity === "critica" ? "urgent" : "warning", message: d.message })),
  ];

  if (clean && extracted.value > 0) {
    // Auto-criar Contas a Pagar
    const payment = await base44.entities.Payment.create({
      description: `${extracted.supplier || "Documento"}${extracted.document_number ? ` - ${extracted.document_number}` : ""}`.trim(),
      supplier_name: extracted.supplier || "",
      amount: extracted.value,
      issue_date: extracted.document_date || todayStr(),
      due_date: extracted.due_date || "",
      bank: extracted.bank || "",
      pix_key: extracted.pix_copia_cola || "",
      barcode: extracted.codigo_barras || extracted.linha_digitavel || "",
      document_number: extracted.document_number || "",
      document_id: doc.id,
      payment_method: extracted.category === "comprovante_pix" ? "pix" : "boleto",
      status: "pendente",
    });

    await base44.entities.DBDocument.update(doc.id, {
      status: "processado",
      confirmed_by: "BARON IA",
      confirmed_at: new Date().toISOString(),
      alerts: allAlerts,
      related_entities: [{ entity_type: "Payment", entity_id: payment.id, entity_name: payment.description, relationship: "conta_a_pagar" }],
    });

    await Core.audit({ audit_action: "create", module: "financeiro", entity_type: "Payment", entity_id: payment.id, details: `Auto-criado via IA: ${payment.description} - ${payment.amount}` });
    await Core.audit({ audit_action: "confirm", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Boleto processado automaticamente (sem divergências)` });

    return { routed: "contas_pagar", auto: true, paymentId: payment.id, divergencias: [], alerts: allAlerts };
  }

  // Pendência
  await base44.entities.DBDocument.update(doc.id, {
    status: "aguardando_confirmacao",
    alerts: allAlerts,
  });
  await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Boleto com divergências — pendência criada (${divergencias.length})` });

  return { routed: "contas_pagar", auto: false, divergencias, alerts: allAlerts };
}

/**
 * Processa Nota Fiscal: confere produtos → se todos validados → auto-entrada estoque.
 */
async function processarNotaFiscal(doc, extracted, user) {
  const products = extracted.products || [];
  const allProducts = await base44.entities.Product.filter({ active: true }, "-created_date", 500).catch(() => []);

  const matches = products.map((p) => ({
    noteProduct: p,
    match: matchProduct(p.name, allProducts),
    isNew: false,
  }));

  // Detectar produtos novos (sem match >= 0.85)
  const newProducts = matches.filter((m) => !m.match || m.match.confidence < 0.85);
  const priceChanges = await detectPriceChanges({ ...doc, products });

  const divergencias = [];
  if (newProducts.length > 0) {
    divergencias.push({ type: "produtos_novos", severity: "alta", message: `${newProducts.length} produto(s) sem correspondência no cadastro` });
  }
  for (const pc of priceChanges) {
    if (Math.abs(pc.change_pct) > 20) {
      divergencias.push({ type: "preco_alterado", severity: "alta", message: `${pc.product_name}: preço ${pc.change_pct > 0 ? "+" : ""}${pc.change_pct.toFixed(0)}% vs histórico` });
    }
  }

  const alerts = generateAlerts(doc, { duplicate: null, priceChanges, newProducts: newProducts.map((m) => m.noteProduct.name) });
  const allAlerts = [...alerts, ...divergencias.map((d) => ({ type: d.type, severity: d.severity === "critica" ? "urgent" : "warning", message: d.message }))];

  if (divergencias.length === 0 && products.length > 0) {
    // Auto-entrada no estoque
    for (const m of matches) {
      if (m.match?.product) {
        const prod = m.match.product;
        const newQty = (prod.stock_quantity || 0) + (m.noteProduct.quantity || 0);
        const newCost = m.noteProduct.unit_price || prod.cost_price;
        await base44.entities.Product.update(prod.id, {
          stock_quantity: newQty,
          cost_price: newCost,
          primary_supplier_name: extracted.supplier || prod.primary_supplier_name,
        });
        // Aprendizado de alias
        if (m.noteProduct.name && m.noteProduct.name.toLowerCase() !== prod.name.toLowerCase()) {
          await learnAlias(prod.id, m.noteProduct.name);
        }
      }
    }

    await base44.entities.DBDocument.update(doc.id, {
      status: "processado",
      confirmed_by: "BARON IA",
      confirmed_at: new Date().toISOString(),
      alerts: allAlerts,
      ia_analysis: { price_changes: priceChanges, new_products: [], inconsistencies: [] },
    });

    await Core.audit({ audit_action: "confirm", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Nota fiscal processada automaticamente — estoque atualizado (${products.length} itens)` });

    return { routed: "estoque", auto: true, divergencias: [], alerts: allAlerts, productMatches: matches };
  }

  // Pendência — produtos para conferir
  await base44.entities.DBDocument.update(doc.id, {
    status: "aguardando_confirmacao",
    alerts: allAlerts,
    ia_analysis: { price_changes: priceChanges, new_products: newProducts.map((m) => m.noteProduct.name), inconsistencies: divergencias },
  });
  await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Nota fiscal com divergências — pendência (${divergencias.length})` });

  return { routed: "estoque", auto: false, divergencias, alerts: allAlerts, productMatches: matches };
}

/**
 * Pipeline principal — ponto único de entrada.
 * processDocument(file, user) → { doc, extracted, route, auto, divergencias, alerts }
 */
export async function processDocument(file, user) {
  // 1. Upload
  const { file_url } = await base44.integrations.Core.UploadFile({ file });

  // 2. Criar documento
  const doc = await base44.entities.DBDocument.create({
    title: file.name,
    file_url,
    file_type: file.type || file.name.split(".").pop(),
    status: "em_analise",
    source: "processamento_ia",
    sent_by: user?.full_name || "Sistema",
    sent_at: new Date().toISOString(),
  });

  // 3. IA extrai
  const extracted = await analyzeDocument(file_url);
  const mapped = mapExtractedToDocument(extracted);
  const title = mapped.supplier
    ? `${mapped.supplier}${mapped.document_date ? ` - ${mapped.document_date}` : ""}`
    : file.name;

  await base44.entities.DBDocument.update(doc.id, { ...mapped, extracted_data: extracted, title });
  const fullDoc = { ...doc, ...mapped, id: doc.id, title };

  // 4. Detectar duplicata global
  const duplicate = await detectDuplicate(fullDoc);

  // 5. Roteamento
  const docType = (mapped.category || extracted.document_type || "").toLowerCase();
  let route;

  if (duplicate) {
    await base44.entities.DBDocument.update(doc.id, {
      status: "aguardando_confirmacao",
      duplicate_of: duplicate.id,
      alerts: [{ type: "duplicate", severity: "urgent", message: `Documento duplicado: ${duplicate.title}` }],
    });
    route = { routed: "pendencia", auto: false, divergencias: [{ type: "duplicata", severity: "critica", message: "Documento duplicado" }], alerts: [{ type: "duplicate", severity: "urgent", message: `Documento duplicado: ${duplicate.title}` }] };
  } else if (BOLETO_TYPES.includes(docType)) {
    route = await processarBoleto(fullDoc, mapped, user);
  } else if (NF_TYPES.includes(docType)) {
    route = await processarNotaFiscal(fullDoc, mapped, user);
  } else {
    // Outros documentos — apenas armazenar
    await base44.entities.DBDocument.update(doc.id, { status: "aguardando_confirmacao" });
    route = { routed: "documento", auto: false, divergencias: [], alerts: [] };
  }

  return { doc: { ...fullDoc, ...route }, extracted, route, duplicate };
}

/**
 * Gera insights do BARON sobre documentos processados.
 */
export async function generateBaronInsights(documents, payments) {
  const insights = [];

  // Boletos vencendo amanhã
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const vencendoAmanha = documents.filter((d) => d.due_date === tomorrowStr && d.category === "boleto");
  if (vencendoAmanha.length > 0) {
    insights.push({ icon: "⏰", text: `Existem ${vencendoAmanha.length} boleto(s) vencendo amanhã.` });
  }

  // Boletos vencidos
  const today = todayStr();
  const vencidos = documents.filter((d) => d.due_date && d.due_date < today && d.category === "boleto");
  if (vencidos.length > 0) {
    insights.push({ icon: "🚨", text: `${vencidos.length} boleto(s) vencido(s) aguardando ação.` });
  }

  // Produtos novos em notas
  const notasPendentes = documents.filter((d) => d.status === "aguardando_confirmacao" && d.ia_analysis?.new_products?.length > 0);
  if (notasPendentes.length > 0) {
    const names = notasPendentes.flatMap((d) => d.ia_analysis.new_products);
    insights.push({ icon: "📦", text: `${notasPendentes.length} nota(s) com produto(s) novo(s): ${names.slice(0, 3).join(", ")}${names.length > 3 ? "..." : ""}` });
  }

  // Alterações de preço
  const priceAlerts = documents.filter((d) => d.ia_analysis?.price_changes?.length > 0);
  if (priceAlerts.length > 0) {
    const pc = priceAlerts[0].ia_analysis.price_changes[0];
    insights.push({ icon: "📈", text: `${pc.product_name}: preço ${pc.change_pct > 0 ? "+" : ""}${pc.change_pct.toFixed(0)}% vs histórico.` });
  }

  // Boletos duplicados
  const dups = documents.filter((d) => d.duplicate_of);
  if (dups.length > 0) {
    insights.push({ icon: "⚠️", text: `${dups.length} boleto(s) duplicado(s) detectado(s).` });
  }

  return insights;
}