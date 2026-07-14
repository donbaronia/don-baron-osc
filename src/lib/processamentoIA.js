/**
 * Centro de Processamento Inteligente de Documentos (IA Autônoma)
 *
 * O BARON trabalha como analista financeiro experiente:
 * - Alta confiança (95%+) → executa sozinho
 * - Confiança média (70-94%) → pergunta só a divergência
 * - Baixa confiança (<70%) → bloqueia para revisão obrigatória
 *
 * Nunca bloqueia o fluxo inteiro por um único detalhe.
 */
import { base44 } from "@/api/base44Client";
import { analyzeDocument, mapExtractedToDocument } from "@/lib/documentAI";
import { detectDuplicate, detectPriceChanges, generateAlerts } from "@/lib/documentCenter";
import { Core } from "@/lib/coreEngine";
import { todayStr } from "@/lib/financialCenter";
import { loadAutomationConfig } from "@/lib/automationConfig";
import {
  classifyDocument,
  classificationMeta,
  FINANCIAL_TYPES,
  STOCK_TYPES,
  PAYMENT_TYPES,
  CLASSIFICATION_THRESHOLD,
} from "@/lib/documentClassifier";

// Fluxo financeiro puro (somente criar Contas a Pagar, sem tocar estoque)
const FINANCIAL_ONLY_TYPES = ["boleto", "comprovante_pix", "comprovante_bancario"];
// Fluxo de estoque puro (atualizar estoque + custo + CMV, sem criar conta a pagar)
const STOCK_ONLY_TYPES = ["nota_fiscal", "cupom_fiscal", "xml"];

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

export function matchProduct(productName, products) {
  if (!productName) return null;
  let best = null;
  for (const p of products) {
    const sim = nameSimilarity(productName, p.name);
    if (sim > (best?.confidence || 0)) best = { product: p, confidence: sim, matchedBy: "name" };
    if (p.short_name) {
      const ssim = nameSimilarity(productName, p.short_name);
      if (ssim > (best?.confidence || 0)) best = { product: p, confidence: ssim, matchedBy: "short_name" };
    }
    for (const alias of p.aliases || []) {
      const asim = nameSimilarity(productName, alias);
      if (asim >= 0.9) return { product: p, confidence: 1, matchedBy: "alias" };
      if (asim > (best?.confidence || 0)) best = { product: p, confidence: asim, matchedBy: "alias" };
    }
  }
  return best;
}

export async function learnAlias(productId, alias, supplierName) {
  if (!productId || !alias) return;
  const product = await base44.entities.Product.get(productId);
  const aliases = [...new Set([...(product.aliases || []), alias])];
  await base44.entities.Product.update(productId, { aliases });
  await Core.audit({
    audit_action: "update", module: "cadastro", entity_type: "Product", entity_id: productId,
    details: `IA aprendeu equivalência: "${alias}"${supplierName ? ` (fornecedor: ${supplierName})` : ""} → ${product.name}`,
  });
}

/**
 * Calcula índice de confiança (0-100) e classifica em tier.
 */
export function calculateConfidence(extracted, divergencias, docType) {
  if (!extracted) return { score: 0, tier: "red", reasons: ["Extração falhou — documento ilegível"] };

  let score = 100;
  const reasons = [];

  for (const d of divergencias) {
    if (d.severity === "critica") { score -= 30; reasons.push(d.message); }
    else if (d.severity === "alta") { score -= 15; reasons.push(d.message); }
    else { score -= 5; reasons.push(d.message); }
  }

  if (!extracted.supplier) { score -= 10; reasons.push("Fornecedor não identificado"); }
  if (!extracted.value || extracted.value <= 0) { score -= 15; reasons.push("Valor não extraído"); }

  if (FINANCIAL_ONLY_TYPES.includes(docType)) {
    if (!extracted.linha_digitavel && !extracted.codigo_barras && !extracted.pix_copia_cola) {
      score -= 15; reasons.push("Linha digitável / código de barras / PIX ausente");
    }
  }

  if (STOCK_ONLY_TYPES.includes(docType)) {
    if (!extracted.products || extracted.products.length === 0) {
      score -= 20; reasons.push("Produtos não extraídos da nota");
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const tier = score >= 95 ? "green" : score >= 70 ? "yellow" : "red";
  return { score, tier, reasons };
}

export async function validarBoleto(doc, extracted) {
  const divergencias = [];

  if (extracted.linha_digitavel) {
    const existing = await base44.entities.DBDocument.filter(
      { linha_digitavel: extracted.linha_digitavel, deleted_at: null }, "-created_date", 10
    ).catch(() => []);
    const dup = existing.find((d) => d.id !== doc.id);
    if (dup) divergencias.push({ type: "linha_duplicada", severity: "critica", message: `Linha digitável duplicada (doc: ${dup.title})` });
  }

  if (extracted.supplier && extracted.value && extracted.due_date) {
    const similar = await base44.entities.DBDocument.filter(
      { supplier: extracted.supplier, value: extracted.value, due_date: extracted.due_date, deleted_at: null }, "-created_date", 10
    ).catch(() => []);
    const dup = similar.find((d) => d.id !== doc.id);
    if (dup) divergencias.push({ type: "boleto_igual", severity: "critica", message: `Boleto igual já cadastrado (${dup.title})` });
  }

  if (extracted.document_number) {
    const paid = await base44.entities.Payment.filter(
      { document_number: extracted.document_number, status: "pago" }, "-created_date", 5
    ).catch(() => []);
    if (paid.length > 0) divergencias.push({ type: "ja_pago", severity: "critica", message: `Documento já pago em ${paid[0].payment_date}` });
  }

  if (extracted.supplier && extracted.value > 0) {
    const history = await base44.entities.Payment.filter(
      { supplier_name: extracted.supplier, status: "pago" }, "-created_date", 20
    ).catch(() => []);
    if (history.length >= 3) {
      const avg = history.reduce((s, p) => s + (p.amount || 0), 0) / history.length;
      const dev = Math.abs((extracted.value - avg) / avg);
      if (dev > 0.5) divergencias.push({ type: "valor_atipico", severity: "alta", message: `Valor ${extracted.value > avg ? "acima" : "abaixo"} da média (${(dev * 100).toFixed(0)}% vs ${avg.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})` });
    }
  }

  if (extracted.supplier && extracted.cnpj) {
    const supplier = await base44.entities.Supplier.filter(
      { name: { $regex: extracted.supplier, $options: "i" } }, "-created_date", 3
    ).catch(() => []);
    if (supplier.length > 0 && supplier[0].document_number && extracted.cnpj.replace(/\D/g, "") !== supplier[0].document_number.replace(/\D/g, "")) {
      divergencias.push({ type: "cnpj_divergente", severity: "alta", message: "CNPJ do documento difere do cadastro do fornecedor" });
    }
  }

  return { divergencias, clean: divergencias.length === 0 };
}

async function processarBoleto(doc, extracted, user, config, confidence) {
  const { divergencias, clean } = await validarBoleto(doc, extracted);
  const recalc = calculateConfidence(extracted, divergencias, "boleto");
  const alerts = generateAlerts(doc, { duplicate: divergencias.find((d) => d.type === "boleto_igual" || d.type === "linha_duplicada") ? doc : null, priceChanges: [], newProducts: [] });
  const allAlerts = [...alerts, ...divergencias.map((d) => ({ type: d.type, severity: d.severity === "critica" ? "urgent" : "warning", message: d.message }))];

  const canAutoApprove = config.auto_approve_boletos && config.auto_create_accounts && recalc.tier === "green" && clean && extracted.value > 0;

  if (canAutoApprove) {
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

    await Core.audit({ audit_action: "create", module: "financeiro", entity_type: "Payment", entity_id: payment.id, details: `Auto-criado via IA: ${payment.description} - ${payment.amount} | Confiança: ${recalc.score}%` });
    await Core.audit({ audit_action: "confirm", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Boleto aprovado automaticamente | Confiança: ${recalc.score}% | Validações: ${divergencias.length === 0 ? "todas OK" : recalc.reasons.join("; ")}` });

    return { routed: "contas_pagar", auto: true, paymentId: payment.id, divergencias: [], alerts: allAlerts, confidence: recalc };
  }

  await base44.entities.DBDocument.update(doc.id, { status: "aguardando_confirmacao", alerts: allAlerts });
  await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Boleto em revisão | Confiança: ${recalc.score}% (${recalc.tier}) | Pendências: ${divergencias.length}` });

  return { routed: "contas_pagar", auto: false, divergencias, alerts: allAlerts, confidence: recalc };
}

async function processarNotaFiscal(doc, extracted, user, config) {
  const products = extracted.products || [];
  const allProducts = await base44.entities.Product.filter({ active: true }, "-created_date", 500).catch(() => []);

  const matches = products.map((p) => ({
    noteProduct: p,
    match: matchProduct(p.name, allProducts),
  }));

  const unmatched = matches.filter((m) => !m.match || m.match.confidence < 0.85);
  const matched = matches.filter((m) => m.match && m.match.confidence >= 0.85);
  const priceChanges = await detectPriceChanges({ ...doc, products });

  const divergencias = [];
  if (unmatched.length > 0) divergencias.push({ type: "produtos_novos", severity: "alta", message: `${unmatched.length} produto(s) sem correspondência: ${unmatched.slice(0, 3).map((m) => m.noteProduct.name).join(", ")}` });
  for (const pc of priceChanges) {
    if (Math.abs(pc.change_pct) > 20) divergencias.push({ type: "preco_alterado", severity: "media", message: `${pc.product_name}: preço ${pc.change_pct > 0 ? "+" : ""}${pc.change_pct.toFixed(0)}% vs histórico` });
  }

  const confidence = calculateConfidence(extracted, divergencias, "nota_fiscal");
  const alerts = generateAlerts(doc, { duplicate: null, priceChanges, newProducts: unmatched.map((m) => m.noteProduct.name) });
  const allAlerts = [...alerts, ...divergencias.map((d) => ({ type: d.type, severity: d.severity === "critica" ? "urgent" : "warning", message: d.message }))];

  // Processamento parcial: atualiza estoque dos produtos reconhecidos (se config permitir)
  const processedProducts = [];
  if (config.auto_update_stock && matched.length > 0) {
    for (const m of matched) {
      const prod = m.match.product;
      const newQty = (prod.stock_quantity || 0) + (m.noteProduct.quantity || 0);
      const newCost = m.noteProduct.unit_price || prod.cost_price;
      await base44.entities.Product.update(prod.id, {
        stock_quantity: newQty,
        cost_price: newCost,
        primary_supplier_name: extracted.supplier || prod.primary_supplier_name,
      });
      if (config.learn_aliases && m.noteProduct.name && m.noteProduct.name.toLowerCase() !== prod.name.toLowerCase()) {
        await learnAlias(prod.id, m.noteProduct.name, extracted.supplier);
      }
      processedProducts.push({ name: prod.name, quantity: m.noteProduct.quantity });
    }
  }

  // Se todos os produtos foram resolvidos → aprovar automaticamente
  const allResolved = unmatched.length === 0 && products.length > 0 && config.auto_approve_nf_known_products;
  const partialProcessed = matched.length > 0 && unmatched.length > 0;

  if (allResolved) {
    await base44.entities.DBDocument.update(doc.id, {
      status: "processado",
      confirmed_by: "BARON IA",
      confirmed_at: new Date().toISOString(),
      alerts: allAlerts,
      ia_analysis: { price_changes: priceChanges, new_products: [], inconsistencies: [], processed_products: processedProducts },
    });
    await Core.audit({ audit_action: "confirm", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Nota fiscal aprovada automaticamente | Confiança: ${confidence.score}% | Estoque atualizado: ${processedProducts.length} itens` });
    return { routed: "estoque", auto: true, divergencias: [], alerts: allAlerts, confidence, productMatches: matches };
  }

  // Processamento parcial: produtos matched já entraram no estoque, só restam exceções
  const status = partialProcessed ? "aguardando_confirmacao" : "aguardando_confirmacao";
  await base44.entities.DBDocument.update(doc.id, {
    status,
    alerts: allAlerts,
    ia_analysis: { price_changes: priceChanges, new_products: unmatched.map((m) => m.noteProduct.name), inconsistencies: divergencias, processed_products: processedProducts },
  });
  await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Nota fiscal em revisão | Confiança: ${confidence.score}% (${confidence.tier}) | ${processedProducts.length} produtos processados, ${unmatched.length} pendentes` });

  return { routed: "estoque", auto: false, divergencias, alerts: allAlerts, confidence, productMatches: matches, partialProcessed };
}

/**
 * Fluxo HÍBRIDO — Nota + Boleto no mesmo documento.
 * Executa simultaneamente:
 *  - Fluxo Financeiro: criar Contas a Pagar + anexar boleto
 *  - Fluxo Estoque: atualizar estoque + custo médio + CMV
 * E cria o VÍNCULO entre a nota e o boleto para futura consulta.
 */
async function processarNotaBoleto(doc, extracted, user, config) {
  // --- Fluxo Financeiro ---
  const { divergencias: finDivs } = await validarBoleto(doc, extracted);
  const paymentReady =
    config.auto_create_accounts && extracted.value > 0 && finDivs.filter((d) => d.severity === "critica").length === 0;

  let payment = null;
  if (paymentReady) {
    payment = await base44.entities.Payment.create({
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
      payment_method: "boleto",
      status: "pendente",
    });
    await Core.audit({
      audit_action: "create", module: "financeiro", entity_type: "Payment",
      entity_id: payment.id, details: `Conta a pagar criada via híbrido: ${payment.description} - ${payment.amount}`,
    });
  }

  // --- Fluxo Estoque ---
  const products = extracted.products || [];
  const allProducts = await base44.entities.Product.filter({ active: true }, "-created_date", 500).catch(() => []);
  const matches = products.map((p) => ({ noteProduct: p, match: matchProduct(p.name, allProducts) }));
  const unmatched = matches.filter((m) => !m.match || m.match.confidence < 0.85);
  const matched = matches.filter((m) => m.match && m.match.confidence >= 0.85);
  const priceChanges = await detectPriceChanges({ ...doc, products });

  const stockDivs = [];
  if (unmatched.length > 0)
    stockDivs.push({ type: "produtos_novos", severity: "alta", message: `${unmatched.length} produto(s) sem correspondência: ${unmatched.slice(0, 3).map((m) => m.noteProduct.name).join(", ")}` });
  for (const pc of priceChanges) {
    if (Math.abs(pc.change_pct) > 20)
      stockDivs.push({ type: "preco_alterado", severity: "media", message: `${pc.product_name}: preço ${pc.change_pct > 0 ? "+" : ""}${pc.change_pct.toFixed(0)}% vs histórico` });
  }

  const processedProducts = [];
  if (config.auto_update_stock && matched.length > 0) {
    for (const m of matched) {
      const prod = m.match.product;
      const newQty = (prod.stock_quantity || 0) + (m.noteProduct.quantity || 0);
      const newCost = m.noteProduct.unit_price || prod.cost_price;
      await base44.entities.Product.update(prod.id, {
        stock_quantity: newQty,
        cost_price: newCost,
        primary_supplier_name: extracted.supplier || prod.primary_supplier_name,
      });
      if (config.learn_aliases && m.noteProduct.name && m.noteProduct.name.toLowerCase() !== prod.name.toLowerCase()) {
        await learnAlias(prod.id, m.noteProduct.name, extracted.supplier);
      }
      processedProducts.push({ name: prod.name, quantity: m.noteProduct.quantity });
    }
  }

  // --- Vínculo + consolidação ---
  const allDivs = [...finDivs, ...stockDivs];
  const related = payment
    ? [{ entity_type: "Payment", entity_id: payment.id, entity_name: payment.description, relationship: "conta_a_pagar_boleto" }]
    : [];
  const allResolved = unmatched.length === 0 && paymentReady;
  const confidence = calculateConfidence(extracted, allDivs, "nota_boleto");

  const alerts = generateAlerts(doc, { duplicate: null, priceChanges, newProducts: unmatched.map((m) => m.noteProduct.name) });
  const allAlerts = [...alerts, ...allDivs.map((d) => ({ type: d.type, severity: d.severity === "critica" ? "urgent" : "warning", message: d.message }))];

  if (allResolved) {
    await base44.entities.DBDocument.update(doc.id, {
      status: "processado",
      confirmed_by: "BARON IA",
      confirmed_at: new Date().toISOString(),
      alerts: allAlerts,
      related_entities: related,
      ia_analysis: { price_changes: priceChanges, new_products: [], inconsistencies: [], processed_products: processedProducts, payment_id: payment?.id },
    });
    await Core.audit({ audit_action: "confirm", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Híbrido processado | Conta a pagar: ${payment?.id} | Estoque: ${processedProducts.length} itens` });
    return { routed: "híbrido", auto: true, paymentId: payment?.id, divergencias: [], alerts: allAlerts, confidence, productMatches: matches };
  }

  // Parcial: criou conta a pagar e/ou deu entrada parcial, mas restam pendências
  const pendingParts = [];
  if (!paymentReady) pendingParts.push("conta a pagar não criada (validação financeira)");
  if (unmatched.length > 0) pendingParts.push(`${unmatched.length} produto(s) sem cadastro`);

  await base44.entities.DBDocument.update(doc.id, {
    status: "aguardando_confirmacao",
    alerts: allAlerts,
    related_entities: related,
    pending_reason: `Híbrido — ${pendingParts.join("; ")}`,
    ia_analysis: { price_changes: priceChanges, new_products: unmatched.map((m) => m.noteProduct.name), inconsistencies: allDivs, processed_products: processedProducts, payment_id: payment?.id },
  });
  await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Híbrido em revisão | Conta a pagar: ${payment ? "criada" : "pendente"} | Estoque: ${processedProducts.length} itens, ${unmatched.length} pendentes` });

  return { routed: "híbrido", auto: false, paymentId: payment?.id, divergencias: allDivs, alerts: allAlerts, confidence, productMatches: matches, partialProcessed: processedProducts.length > 0 };
}

/**
 * Re-roteia um documento já extraído após decisão humana (Pendências da IA).
 * Não reenvia nem reprocessa o arquivo — reusa os dados já extraídos.
 * chosenType: "boleto" | "nota_fiscal" | "nota_boleto" | "outros"
 */
export async function rerouteDocument(docId, chosenType, user) {
  const doc = await base44.entities.DBDocument.get(docId);
  const extracted = {
    ...(doc.extracted_data || {}),
    supplier: doc.supplier,
    cnpj: doc.cnpj,
    cpf: doc.cpf,
    document_number: doc.document_number,
    chave_nota: doc.chave_nota,
    value: doc.value,
    document_date: doc.document_date,
    due_date: doc.due_date,
    bank: doc.bank,
    linha_digitavel: doc.linha_digitavel,
    codigo_barras: doc.codigo_barras,
    pix_copia_cola: doc.pix_copia_cola,
    beneficiario: doc.beneficiario,
    products: doc.products,
    taxes: doc.taxes,
    freight: doc.freight,
    category: chosenType,
    document_type: chosenType,
  };
  const config = await loadAutomationConfig();
  const meta = classificationMeta(chosenType);

  await base44.entities.DBDocument.update(doc.id, {
    classification: chosenType,
    classification_confidence: 100,
    pending_reason: "",
    status: "em_analise",
  });

  let route;
  if (FINANCIAL_ONLY_TYPES.includes(chosenType)) {
    route = await processarBoleto(doc, extracted, user, config);
  } else if (STOCK_ONLY_TYPES.includes(chosenType)) {
    route = await processarNotaFiscal(doc, extracted, user, config);
  } else if (chosenType === "nota_boleto") {
    route = await processarNotaBoleto(doc, extracted, user, config);
  } else {
    // "outros" — arquiva como processado (decisão humana explícita)
    await base44.entities.DBDocument.update(doc.id, {
      status: "processado",
      confirmed_by: user?.full_name || "Operador",
      confirmed_at: new Date().toISOString(),
      pending_reason: "",
    });
    route = { routed: "documento", auto: true, divergencias: [], alerts: [], confidence: { score: 100, tier: "green", reasons: [] } };
  }

  await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Re-roteado por operador (${user?.full_name || "Sistema"}) para: ${meta.label}` });
  return route;
}

export async function processDocument(file, user) {
  const t0 = Date.now();
  const config = await loadAutomationConfig();

  const { file_url } = await base44.integrations.Core.UploadFile({ file });

  const doc = await base44.entities.DBDocument.create({
    title: file.name,
    file_url,
    file_type: file.type || file.name.split(".").pop(),
    status: "em_analise",
    source: "processamento_ia",
    sent_by: user?.full_name || "Sistema",
    sent_at: new Date().toISOString(),
  });

  let extracted, mapped;
  try {
    extracted = await analyzeDocument(file_url);
    mapped = mapExtractedToDocument(extracted);
  } catch (iaError) {
    const confidence = { score: 0, tier: "red", reasons: ["Extração falhou"] };
    await base44.entities.DBDocument.update(doc.id, {
      status: "aguardando_confirmacao",
      alerts: [{ type: "ilegivel", severity: "urgent", message: "IA não conseguiu extrair dados — documento pode estar ilegível. Edite manualmente ou reprocesse." }],
      extracted_data: { confidence_score: 0, confidence_tier: "red", processing_time_ms: Date.now() - t0 },
    });
    await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Falha na extração IA: ${iaError.message} | Confiança: 0%` });
    return { doc: { ...doc, id: doc.id, status: "aguardando_confirmacao" }, extracted: null, route: { routed: "pendencia", auto: false, divergencias: [{ type: "ilegivel", severity: "critica", message: "Documento ilegível" }], alerts: [], confidence }, duplicate: null };
  }

  const title = mapped.supplier ? `${mapped.supplier}${mapped.document_date ? ` - ${mapped.document_date}` : ""}` : file.name;
  const processingTimeMs = Date.now() - t0;

  // --- Classificador Inteligente (ETAPA 1) ---
  const classification = classifyDocument(extracted);

  await base44.entities.DBDocument.update(doc.id, {
    ...mapped,
    classification: classification.routed_type,
    classification_confidence: classification.confidence,
    extracted_data: {
      ...extracted,
      confidence_score: 0,
      confidence_tier: "yellow",
      processing_time_ms: processingTimeMs,
      classification_signals: {
        routed_type: classification.routed_type,
        confidence: classification.confidence,
        has_products: classification.has_products,
        has_payment: classification.has_payment,
        reasons: classification.reasons,
      },
    },
    title,
  });
  const fullDoc = { ...doc, ...mapped, id: doc.id, title, classification: classification.routed_type };

  // --- Duplicata é bloqueio absoluto (ETAPA 4) ---
  const duplicate = await detectDuplicate(fullDoc);
  let route;

  if (duplicate) {
    const reason = `Documento duplicado de ${duplicate.title}`;
    await base44.entities.DBDocument.update(doc.id, {
      status: "aguardando_confirmacao",
      duplicate_of: duplicate.id,
      pending_reason: reason,
      alerts: [{ type: "duplicate", severity: "urgent", message: `Documento duplicado: ${duplicate.title}` }],
      extracted_data: { ...extracted, confidence_score: 35, confidence_tier: "red", processing_time_ms: Date.now() - t0, confidence_reasons: ["Duplicidade detectada"] },
    });
    route = { routed: "pendencia", auto: false, divergencias: [{ type: "duplicata", severity: "critica", message: "Documento duplicado" }], alerts: [{ type: "duplicate", severity: "urgent", message: `Documento duplicado: ${duplicate.title}` }], confidence: { score: 35, tier: "red", reasons: ["Duplicidade"] } };
  } else if (classification.needs_human_review) {
    // --- ETAPA 3: confiança abaixo do limiar → Pendências da IA ---
    const reason = classification.reasons.length > 0
      ? `Classificação incerta (${classification.confidence}%): ${classification.reasons.join("; ")}`
      : `Classificação incerta (${classification.confidence}%) — confirme o tipo do documento`;
    await base44.entities.DBDocument.update(doc.id, {
      status: "aguardando_confirmacao",
      pending_reason: reason,
      alerts: [{ type: "classificacao_incerta", severity: "warning", message: reason }],
      extracted_data: {
        ...extracted,
        confidence_score: classification.confidence,
        confidence_tier: classification.confidence >= 70 ? "yellow" : "red",
        processing_time_ms: Date.now() - t0,
        pending_action: "classificacao",
      },
    });
    await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Enviado para Pendências da IA | Tipo: ${classificationMeta(classification.routed_type).label} | Confiança: ${classification.confidence}%` });
    route = { routed: "pendencia_classificacao", auto: false, divergencias: [{ type: "classificacao_incerta", severity: "media", message: reason }], alerts: [{ type: "classificacao_incerta", severity: "warning", message: reason }], confidence: { score: classification.confidence, tier: classification.confidence >= 70 ? "yellow" : "red", reasons: classification.reasons }, classification };
  } else if (FINANCIAL_ONLY_TYPES.includes(classification.routed_type)) {
    route = await processarBoleto(fullDoc, mapped, user, config);
  } else if (STOCK_ONLY_TYPES.includes(classification.routed_type)) {
    route = await processarNotaFiscal(fullDoc, mapped, user, config);
  } else if (classification.routed_type === "nota_boleto") {
    route = await processarNotaBoleto(fullDoc, mapped, user, config);
  } else {
    // Outros tipos roteáveis (orçamento, pedido, etc.) — confiança alta → arquiva como processado
    await base44.entities.DBDocument.update(doc.id, {
      status: "processado",
      confirmed_by: "BARON IA",
      confirmed_at: new Date().toISOString(),
      alerts: [{ type: "manual_review", severity: "info", message: `Arquivado como ${classificationMeta(classification.routed_type).label} (sem roteamento financeiro/estoque)` }],
      extracted_data: { ...extracted, confidence_score: classification.confidence, confidence_tier: "green", processing_time_ms: Date.now() - t0 },
    });
    route = { routed: "documento", auto: true, divergencias: [], alerts: [], confidence: { score: classification.confidence, tier: "green", reasons: classification.reasons } };
  }

  // Persistir confiança final no extracted_data
  if (route.confidence) {
    const current = await base44.entities.DBDocument.get(doc.id);
    await base44.entities.DBDocument.update(doc.id, {
      extracted_data: { ...(current.extracted_data || extracted), confidence_score: route.confidence.score, confidence_tier: route.confidence.tier, confidence_reasons: route.confidence.reasons, processing_time_ms: Date.now() - t0 },
    });
  }

  return { doc: { ...fullDoc, ...route }, extracted, route, duplicate };
}

export async function generateBaronInsights(documents, payments) {
  const insights = [];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const vencendoAmanha = documents.filter((d) => d.due_date === tomorrowStr && d.category === "boleto");
  if (vencendoAmanha.length > 0) insights.push({ icon: "⏰", text: `Existem ${vencendoAmanha.length} boleto(s) vencendo amanhã.` });

  const today = todayStr();
  const vencidos = documents.filter((d) => d.due_date && d.due_date < today && d.category === "boleto");
  if (vencidos.length > 0) insights.push({ icon: "🚨", text: `${vencidos.length} boleto(s) vencido(s) aguardando ação.` });

  const notasPendentes = documents.filter((d) => d.status === "aguardando_confirmacao" && d.ia_analysis?.new_products?.length > 0);
  if (notasPendentes.length > 0) {
    const names = notasPendentes.flatMap((d) => d.ia_analysis.new_products);
    insights.push({ icon: "📦", text: `${notasPendentes.length} nota(s) com produto(s) novo(s): ${names.slice(0, 3).join(", ")}${names.length > 3 ? "..." : ""}` });
  }

  const priceAlerts = documents.filter((d) => d.ia_analysis?.price_changes?.length > 0);
  if (priceAlerts.length > 0) {
    const pc = priceAlerts[0].ia_analysis.price_changes[0];
    insights.push({ icon: "📈", text: `${pc.product_name}: preço ${pc.change_pct > 0 ? "+" : ""}${pc.change_pct.toFixed(0)}% vs histórico.` });
  }

  const dups = documents.filter((d) => d.duplicate_of);
  if (dups.length > 0) insights.push({ icon: "⚠️", text: `${dups.length} documento(s) duplicado(s) detectado(s).` });

  return insights;
}