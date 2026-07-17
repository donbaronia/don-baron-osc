/**
 * Motor de Workflow Persistente de Documentos (BARON)
 *
 * Garante que nenhum documento perca o fluxo:
 * - Cada documento recebe um Process ID unico (PROC-AAAA-NNNNNN)
 * - Maquina de estados persistida no banco (entity DocumentProcess)
 * - Aprovacao apenas PAUSA o fluxo; retoma do ponto exato (sem reenviar nota / sem perder OCR)
 * - Recuperacao automatica de processos pausados/erro
 * - Auditoria completa por transicao + read-back no banco
 */
import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/coreEngine";
import { todayStr } from "@/lib/financialCenter";

export const PROCESS_STATES = [
  "RECEBIDO",
  "OCR_CONCLUIDO",
  "PRODUTOS_EXTRAIDOS",
  "AGUARDANDO_CADASTRO_PRODUTO",
  "AGUARDANDO_APROVACAO",
  "AGUARDANDO_PROCESSAMENTO",
  "PRODUTO_CRIADO",
  "ESTOQUE_PROCESSADO",
  "CMV_PROCESSADO",
  "DRE_PROCESSADO",
  "FINANCEIRO_PROCESSADO",
  "DOCUMENTO_ARQUIVADO",
  "CONCLUIDO",
  "ERRO",
];

export const WAITING_STATES = [
  "AGUARDANDO_CADASTRO_PRODUTO",
  "AGUARDANDO_APROVACAO",
  "AGUARDANDO_PROCESSAMENTO",
  "ERRO",
];

export const TERMINAL_STATES = ["CONCLUIDO", "ERRO"];

const STOCK_ROUTES = ["nota_fiscal", "cupom_fiscal", "xml", "nota_boleto"];
// Nota fiscal/cupom/XML também geram conta a pagar quando têm valor —
// antes só "nota_boleto" fazia isso, deixando nota fiscal comum sem
// nunca virar lançamento financeiro (item ia pro estoque, valor sumia).
const FINANCE_ROUTES = ["boleto", "comprovante_pix", "comprovante_bancario", "nota_boleto", "nota_fiscal", "cupom_fiscal", "xml"];

/** Normalizacao de nome para matching fuzzy (copia isolada p/ evitar dependencia circular) */
function nameSimilarity(a, b) {
  if (!a || !b) return 0;
  const norm = (s) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
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

export function matchProductName(productName, products) {
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

function stepsForRoute(route_type) {
  if (STOCK_ROUTES.includes(route_type) && FINANCE_ROUTES.includes(route_type)) {
    return ["ESTOQUE_PROCESSADO", "CMV_PROCESSADO", "FINANCEIRO_PROCESSADO", "DOCUMENTO_ARQUIVADO"];
  }
  if (STOCK_ROUTES.includes(route_type)) {
    return ["ESTOQUE_PROCESSADO", "CMV_PROCESSADO", "DOCUMENTO_ARQUIVADO"];
  }
  if (FINANCE_ROUTES.includes(route_type)) {
    return ["FINANCEIRO_PROCESSADO", "DOCUMENTO_ARQUIVADO"];
  }
  return ["DOCUMENTO_ARQUIVADO"];
}

async function nextProcessId() {
  const year = new Date().getFullYear();
  const prefix = `PROC-${year}-`;
  const existing = await base44.entities.DocumentProcess.list("-created_date", 500).catch(() => []);
  let max = 0;
  for (const p of existing || []) {
    if (p.process_id && String(p.process_id).startsWith(prefix)) {
      const n = parseInt(String(p.process_id).slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(6, "0")}`;
}

function statusForState(state) {
  if (state === "CONCLUIDO") return "concluido";
  if (state === "ERRO") return "erro";
  if (WAITING_STATES.includes(state)) return "pausado";
  return "ativo";
}

/** Cria o processo e faz read-back para confirmar gravacao no banco */
export async function createProcess({ document_id, title, route_type, context, user }) {
  const process_id = await nextProcessId();
  const now = new Date().toISOString();
  const created = await base44.entities.DocumentProcess.create({
    process_id,
    document_id,
    document_title: title || "",
    route_type: route_type || "outros",
    current_state: "RECEBIDO",
    previous_state: "",
    context: context || {},
    results: {},
    pending: {},
    history: [
      {
        state: "RECEBIDO",
        previous_state: "",
        timestamp: now,
        actor: user?.full_name || "BARON IA",
        duration_ms: 0,
        reason: "Processo criado",
        errors: [],
        retry_count: 0,
      },
    ],
    next_step: "Extracao OCR",
    status: "ativo",
    recovery_attempts: 0,
  });
  // read-back obrigatorio
  const readBack = await base44.entities.DocumentProcess.get(created.id);
  return readBack;
}

/** Transita de estado com auditoria + read-back */
export async function transition(processId, toState, { actor, reason, errors, duration_ms } = {}) {
  const proc = await base44.entities.DocumentProcess.get(processId);
  const prev = proc.current_state;
  const entry = {
    state: toState,
    previous_state: prev,
    timestamp: new Date().toISOString(),
    actor: actor || "BARON IA",
    duration_ms: duration_ms || 0,
    reason: reason || "",
    errors: errors || [],
    retry_count: proc.recovery_attempts || 0,
  };
  await base44.entities.DocumentProcess.update(processId, {
    previous_state: prev,
    current_state: toState,
    history: [...(proc.history || []), entry],
    next_step: nextStepHint(toState),
    status: statusForState(toState),
  });
  // read-back
  return base44.entities.DocumentProcess.get(processId);
}

function nextStepHint(state) {
  const map = {
    OCR_CONCLUIDO: "Classificacao e extracao de produtos",
    PRODUTOS_EXTRAIDOS: "Verificar cadastro de produtos",
    AGUARDANDO_CADASTRO_PRODUTO: "Cadastrar produto(s) e aprovar para retomar",
    AGUARDANDO_APROVACAO: "Aguardando decisao humana",
    AGUARDANDO_PROCESSAMENTO: "Aguardando processamento automatico",
    PRODUTO_CRIADO: "Atualizar estoque / custo / financeiro",
    ESTOQUE_PROCESSADO: "Atualizar custo medio (CMV)",
    CMV_PROCESSADO: "Processar financeiro / arquivar",
    FINANCEIRO_PROCESSADO: "Arquivar documento",
    DOCUMENTO_ARQUIVADO: "Concluir processo",
    CONCLUIDO: "Processo finalizado",
    ERRO: "Investigar erro e retomar",
  };
  return map[state] || "";
}

export async function recordResults(processId, results) {
  const proc = await base44.entities.DocumentProcess.get(processId);
  await base44.entities.DocumentProcess.update(processId, {
    results: { ...(proc.results || {}), ...results },
  });
  return base44.entities.DocumentProcess.get(processId);
}

export async function pauseForProduct(processId, { product_names, reason, context, user }) {
  const proc = await base44.entities.DocumentProcess.get(processId);
  await base44.entities.DocumentProcess.update(processId, {
    pending: {
      type: "cadastro_produto",
      reason: reason || `${product_names.length} produto(s) sem cadastro`,
      product_names,
      requested_by: user?.full_name || "BARON IA",
      requested_at: new Date().toISOString(),
    },
    context: { ...(proc.context || {}), ...(context || {}) },
  });
  return transition(processId, "AGUARDANDO_CADASTRO_PRODUTO", {
    actor: user?.full_name || "BARON IA",
    reason: reason || `${product_names.length} produto(s) sem cadastro`,
  });
}

export async function pauseForApproval(processId, { reason, context, user }) {
  const proc = await base44.entities.DocumentProcess.get(processId);
  await base44.entities.DocumentProcess.update(processId, {
    pending: {
      type: "aprovacao",
      reason,
      requested_by: user?.full_name || "BARON IA",
      requested_at: new Date().toISOString(),
    },
    context: { ...(proc.context || {}), ...(context || {}) },
  });
  return transition(processId, "AGUARDANDO_APROVACAO", {
    actor: user?.full_name || "BARON IA",
    reason,
  });
}

/**
 * Finaliza o fluxo apos a execucao do roteador.
 * - Se auto (tudo resolvido) -> registra etapas ate CONCLUIDO
 * - Se pendente por produto -> pausa em AGUARDANDO_CADASTRO_PRODUTO
 * - Se pendente por outro motivo -> pausa em AGUARDANDO_APROVACAO
 */
export async function finalizeAfterRoute(processId, { route, route_type, unmatchedProductNames, user, reason }) {
  if (route?.auto) {
    await recordResults(processId, {
      route: route.routed,
      payment_id: route.paymentId,
      confidence: route.confidence?.score,
      processed: true,
    });
    const steps = stepsForRoute(route_type);
    for (const s of steps) {
      await transition(processId, s, { actor: "BARON IA", reason: "Etapa executada automaticamente" });
    }
    return transition(processId, "CONCLUIDO", { actor: "BARON IA", reason: "Fluxo concluido automaticamente" });
  }
  if (unmatchedProductNames && unmatchedProductNames.length > 0) {
    return pauseForProduct(processId, { product_names: unmatchedProductNames, reason, context: { route_type }, user });
  }
  return pauseForApproval(processId, {
    reason: reason || route?.divergencias?.[0]?.message || "Aguardando aprovacao manual",
    context: { route_type },
    user,
  });
}

/**
 * Retoma o processo do ponto exato onde parou.
 * Nao reenvia nota nem reprocessa OCR: reusa o contexto persistido.
 * Idempotente: nao recria pagamento ja existente.
 */
export async function resumeProcess(processId, user) {
  const proc = await base44.entities.DocumentProcess.get(processId);
  if (proc.status === "concluido") return { resumed: false, reason: "Processo ja concluido", process: proc };
  if (proc.current_state === "ERRO") {
    // erro recuperavel: tenta retomar do estado anterior
  }
  const ctx = proc.context || {};
  const route_type = proc.route_type || ctx.route_type || "outros";
  try {
    const doc = await base44.entities.DBDocument.get(proc.document_id);
    const products = ctx.products || doc.products || [];
    const allProducts = await base44.entities.Product.filter({ active: true }, "-created_date", 500).catch(() => []);

    const matches = products.map((p) => ({ noteProduct: p, match: matchProductName(p.name, allProducts) }));
    const unmatched = matches.filter((m) => !m.match || m.match.confidence < 0.85);

    if (unmatched.length > 0) {
      return pauseForProduct(processId, {
        product_names: unmatched.map((m) => m.noteProduct.name),
        reason: `${unmatched.length} produto(s) ainda sem cadastro`,
        context: ctx,
        user,
      });
    }

    if (proc.current_state !== "PRODUTO_CRIADO") {
      await transition(processId, "PRODUTO_CRIADO", {
        actor: user?.full_name || "Sistema",
        reason: "Todos os produtos cadastrados — retomando do ponto exato",
      });
    }

    const results = { ...(proc.results || {}) };

    // ESTOQUE + CUSTO MEDIO (CMV)
    if (STOCK_ROUTES.includes(route_type) && !results.stock) {
      const processed = [];
      for (const m of matches) {
        const prod = m.match.product;
        const qty = m.noteProduct.quantity || 0;
        const unitCost = m.noteProduct.unit_price || prod.cost_price || 0;
        const newQty = (prod.stock_quantity || 0) + qty;
        await base44.entities.Product.update(prod.id, {
          stock_quantity: newQty,
          cost_price: unitCost,
          primary_supplier_name: ctx.supplier || prod.primary_supplier_name,
        });
        // Sincroniza Stock (tela Estoque Atual) e cria Movement (aba Movimentações
        // + CMV/DRE) — sem isso a entrada por documento fica invisível fora do
        // cadastro do produto, exatamente como acontecia com o Baron antes.
        try {
          await base44.entities.Stock.filter({ product_id: prod.id }, null, 1).then(async ([existing]) => {
            const stockPayload = {
              product_name: prod.name, quantity: newQty, unit: prod.control_unit || prod.unit || "UN",
              average_cost: unitCost, total_value: newQty * unitCost,
              last_movement_date: new Date().toISOString(), last_movement_type: "entrada", status: "ativo",
            };
            if (existing) await base44.entities.Stock.update(existing.id, stockPayload);
            else await base44.entities.Stock.create({ product_id: prod.id, ...stockPayload });
          });
        } catch (syncErr) {
          await Core.audit({ audit_action: "error", module: "estoque", entity_type: "Stock", details: `Falha ao sincronizar Stock via documento: ${syncErr.message}` });
        }
        try {
          await base44.entities.Movement.create({
            movement_type: "entrada", product_id: prod.id, product_name: prod.name,
            quantity: qty, unit: prod.control_unit || prod.unit || "UN",
            unit_cost: unitCost, total_cost: qty * unitCost,
            reason: "Entrada via documento processado pelo BARON", origin_type: "documento",
            supplier_name: ctx.supplier || "", document_id: doc.id,
            responsible_name: user?.full_name || "BARON IA",
            movement_date: new Date().toISOString(), status: "ativo",
          });
        } catch (syncErr) {
          await Core.audit({ audit_action: "error", module: "estoque", entity_type: "Movement", details: `Falha ao criar Movement via documento: ${syncErr.message}` });
        }
        processed.push({ name: prod.name, quantity: qty, product_id: prod.id });
      }
      results.stock = processed;
      await transition(processId, "ESTOQUE_PROCESSADO", {
        actor: "BARON IA",
        reason: `${processed.length} produto(s) atualizado(s) no estoque`,
      });
      await transition(processId, "CMV_PROCESSADO", {
        actor: "BARON IA",
        reason: "Custo medio (CMV) atualizado",
      });
    }

    // FINANCEIRO (idempotente: so cria se ainda nao existe)
    if (FINANCE_ROUTES.includes(route_type) && !results.payment_id) {
      if (!(ctx.value > 0)) {
        // Salva o progresso ANTES de pausar — sem isso, ao retomar o processo
        // reprocessaria o estoque de novo (duplicando quantidade), pois
        // releria resultados vazios do banco.
        await recordResults(processId, results);
        return pauseForApproval(processId, {
          reason: "Valor do documento não identificado automaticamente — confirme o valor manualmente para gerar a conta a pagar.",
          context: ctx,
          user,
        });
      }
      const payment = await base44.entities.Payment.create({
        description: `${ctx.supplier || "Documento"}${ctx.document_number ? ` - ${ctx.document_number}` : ""}`.trim(),
        supplier_name: ctx.supplier || "",
        amount: ctx.value,
        issue_date: ctx.document_date || todayStr(),
        due_date: ctx.due_date || "",
        bank: ctx.bank || "",
        pix_key: ctx.pix_copia_cola || "",
        barcode: ctx.codigo_barras || ctx.linha_digitavel || "",
        document_number: ctx.document_number || "",
        document_id: doc.id,
        payment_method: route_type === "comprovante_pix" ? "pix" : "boleto",
        status: "pendente",
      });
      results.payment_id = payment.id;
      await Core.audit({
        audit_action: "create", module: "financeiro", entity_type: "Payment",
        entity_id: payment.id, details: `Conta a pagar criada via retomada de processo ${proc.process_id}`,
      });
      await transition(processId, "FINANCEIRO_PROCESSADO", {
        actor: "BARON IA",
        reason: `Conta a pagar criada: ${payment.id}`,
      });
    }

    // ARQUIVAR DOCUMENTO
    if (doc.status !== "processado") {
      await base44.entities.DBDocument.update(doc.id, {
        status: "processado",
        confirmed_by: user?.full_name || "BARON IA",
        confirmed_at: new Date().toISOString(),
      });
    }
    await transition(processId, "DOCUMENTO_ARQUIVADO", { actor: "BARON IA", reason: "Documento arquivado" });

    await recordResults(processId, results);
    const final = await transition(processId, "CONCLUIDO", {
      actor: user?.full_name || "BARON IA",
      reason: "Fluxo retomado e concluido sem reinicio",
    });
    return { resumed: true, process: final };
  } catch (e) {
    await transition(processId, "ERRO", {
      actor: user?.full_name || "Sistema",
      reason: "Erro ao retomar processo",
      errors: [e.message],
    });
    return { resumed: false, error: e.message };
  }
}

/**
 * Cria o produto pendente e retoma o fluxo automaticamente.
 * productData: { name, unit, category, cost_price, ... }
 */
export async function approveAndResume(processId, { user, productData, contextOverride } = {}) {
  const proc = await base44.entities.DocumentProcess.get(processId);
  if (productData && productData.name) {
    const product = await base44.entities.Product.create({
      name: productData.name,
      unit: productData.unit || "un",
      category: productData.category || "Geral",
      cost_price: productData.cost_price || 0,
      active: true,
      status: "ativo",
    });
    await Core.audit({
      audit_action: "create", module: "cadastro", entity_type: "Product",
      entity_id: product.id, details: `Produto criado via aprovacao de processo ${proc.process_id}: ${productData.name}`,
    });
    await base44.entities.DocumentProcess.update(processId, {
      pending: { ...(proc.pending || {}), resolved_by: user?.full_name || "Administrador", resolved_at: new Date().toISOString() },
    });
  }
  // Permite corrigir manualmente dados que a IA não extraiu (ex: valor do
  // boleto), preenchidos pelo usuário na tela de revisão.
  if (contextOverride && Object.keys(contextOverride).length > 0) {
    await base44.entities.DocumentProcess.update(processId, {
      context: { ...(proc.context || {}), ...contextOverride },
      pending: { ...(proc.pending || {}), resolved_by: user?.full_name || "Administrador", resolved_at: new Date().toISOString() },
    });
  }
  return resumeProcess(processId, user);
}

/** Rejeita um processo (ex: duplicata confirmada) — terminal */
export async function rejectProcess(processId, { user, reason }) {
  const proc = await base44.entities.DocumentProcess.get(processId);
  await base44.entities.DocumentProcess.update(processId, {
    pending: { ...(proc.pending || {}), resolved_by: user?.full_name || "Administrador", resolved_at: new Date().toISOString() },
  });
  if (proc.document_id) {
    await base44.entities.DBDocument.update(proc.document_id, {
      status: "rejeitado",
      rejected_by: user?.full_name || "Administrador",
      notes: reason || "Rejeitado via workflow",
    }).catch(() => {});
  }
  return transition(processId, "ERRO", { actor: user?.full_name || "Administrador", reason: reason || "Processo rejeitado" });
}

/**
 * Recuperacao automatica: ao iniciar o sistema ou apos falha,
 * procura processos pausados/erro cujo bloqueio ja foi resolvido e retoma.
 */
export async function recoverProcesses(user) {
  const waiting = await base44.entities.DocumentProcess.filter(
    { status: "pausado" },
    "-created_date",
    100
  ).catch(() => []);

  const resumable = [];
  for (const proc of waiting || []) {
    // So retoma automaticamente pendencias de cadastro de produto cujo produto ja existe
    if (proc.current_state === "AGUARDANDO_CADASTRO_PRODUTO" && proc.pending?.product_names?.length) {
      const allProducts = await base44.entities.Product.filter({ active: true }, "-created_date", 500).catch(() => []);
      const stillMissing = proc.pending.product_names.some((n) => {
        const m = matchProductName(n, allProducts);
        return !m || m.confidence < 0.85;
      });
      if (!stillMissing) {
        await base44.entities.DocumentProcess.update(proc.id, {
          recovery_attempts: (proc.recovery_attempts || 0) + 1,
          last_recovered_at: new Date().toISOString(),
        });
        resumable.push(proc.id);
      }
    }
  }

  const results = [];
  for (const id of resumable) {
    results.push({ id, result: await resumeProcess(id, user) });
  }
  return { scanned: (waiting || []).length, resumed: results };
}

export { stepsForRoute, STOCK_ROUTES, FINANCE_ROUTES };