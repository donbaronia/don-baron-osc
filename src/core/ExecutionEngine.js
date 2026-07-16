/**
 * DON BARON CORE — ExecutionEngine
 *
 * Fluxo OBRIGATÓRIO de toda execução:
 *   Intent → Validation → Action → Persistence → ReadBack → Log → Notification → Response
 *
 * NUNCA chama base44.entities diretamente. Sempre via PersistenceEngine.
 * Regra de ouro: só confirma sucesso após read-back confirmar o registro.
 *
 * Retorna: { status, message, data, audit, readBack }
 *   status: "executed" | "needs_info" | "error" | "navigate" | "message"
 */
import { PersistenceEngine } from "./PersistenceEngine";
import { ActionEngine } from "./ActionEngine";
import { OperationalMemory } from "./OperationalMemory";
import { Logger } from "./Logger";
import { Core } from "@/lib/coreEngine";
import { todayStr, brl } from "@/lib/financialCenter";
import { convertQuantity } from "@/lib/masterData";
import { EventBus } from "@/lib/eventBus";

// Emite evento no barramento sem derrubar a execucao (fire-and-forget seguro)
function emit(eventType, module, payload) {
  EventBus.publish({ event_type: eventType, module, entity_type: payload.entity_type || "", entity_id: payload.entity_id || "", payload })
    .catch(() => {});
}

// ============================================================
// Validadores por intent
// ============================================================
const VALIDATORS = {
  stock_entry: (parsed) => {
    const e = parsed.entities;
    if (!e.product_name) return { field: "product_name", message: "Qual produto?" };
    if (!e.quantity) return { field: "quantity", message: "Qual quantidade?" };
    if (e.price && !e.supplier && e.price_type === "unit") return { field: "supplier", message: "Qual fornecedor?" };
    return null;
  },
  stock_exit: (parsed) => {
    const e = parsed.entities;
    if (!e.product_name) return { field: "product_name", message: "Qual produto?" };
    if (!e.quantity) return { field: "quantity", message: "Qual quantidade?" };
    return null;
  },
  payment: (parsed) => {
    const e = parsed.entities;
    if (!e.payment_target && !e.amount) return { field: "payment_target", message: "Para quem?" };
    return null;
  },
  production: (parsed) => {
    const e = parsed.entities;
    if (!e.product_name) return { field: "product_name", message: "O que produziu?" };
    if (!e.quantity) return { field: "quantity", message: "Qual quantidade?" };
    return null;
  },
  employee_update: (parsed) => {
    const e = parsed.entities;
    if (!e.employee_name) return { field: "employee_name", message: "Qual funcionário?" };
    return null;
  },
  payroll: (parsed) => {
    const e = parsed.entities;
    if (!e.employee_name) return { field: "employee_name", message: "Vale para qual funcionário?" };
    if (!e.amount) return { field: "amount", message: "Qual o valor do vale?" };
    return null;
  },
};

// ============================================================
// Executors por intent — usam PersistenceEngine (com read-back)
// ============================================================

// Normaliza unidade para uppercase (padrão do cadastro)
const normUnit = (u) => String(u || "UN").toUpperCase();

// Sugere categoria pelo nome do produto
function guessCategory(name) {
  const n = String(name || "").toLowerCase();
  if (/molho|maionese|ketchup|mostarda/.test(n)) return "Molhos";
  if (/carne|bacon|linguica|presunto|salame|frango|peixe|bovino|suino/.test(n)) return "Carnes";
  if (/queijo|mussarela|prato|parmesao/.test(n)) return "Laticínios";
  if (/pao|massa|farinha|trigo/.test(n)) return "Padaria";
  if (/bebida|refrigerante|coca|suco|agua|cerveja/.test(n)) return "Bebidas";
  if (/verdura|legume|tomate|cebola|alface|batata|cenoura/.test(n)) return "Hortifruti";
  if (/embalagem|saco|sacola|copo|bandeja/.test(n)) return "Embalagens";
  if (/limpeza|detergente|sabao|agua sanitaria/.test(n)) return "Limpeza";
  return "";
}

// Constrói o pré-preenchimento do cadastro a partir das entidades extraídas
function buildProductPrefill(entities) {
  const unit = normUnit(entities.unit);
  const price = entities.price || 0;
  const qty = entities.quantity || 0;
  const unitPrice = entities.price_type === "total" && qty > 0 ? price / qty : price;

  return {
    name: (entities.product_name || "").replace(/\b\w/g, (c) => c.toUpperCase()),
    control_unit: unit,
    purchase_unit: unit,
    consumption_unit: unit,
    unit: unit,
    stock_quantity: qty,
    min_quantity: qty > 0 ? Math.ceil(qty * 0.1) : 10,
    cost_price: unitPrice,
    last_price: unitPrice,
    avg_price: unitPrice,
    primary_supplier_name: entities.supplier || "",
    preferred_supplier_name: entities.supplier || "",
    is_raw_material: true,
    controls_stock: true,
    active: true,
    category: guessCategory(entities.product_name),
    cost_center: "Produção",
  };
}

async function execStockEntry(parsed, user, mem) {
  const e = parsed.entities;
  const match = await mem.findProduct(e.product_name);
  if (!match) {
    // NÃO perde o comando — retorna pré-preenchimento para cadastro
    return {
      status: "needs_product_registration",
      prefill: buildProductPrefill(e),
      pendingCommand: parsed,
      message: `Produto "${e.product_name}" não cadastrado. Abrindo cadastro pré-preenchido — revise e confirme.`,
    };
  }
  const product = match.product;
  const purchaseUnit = (e.unit || product.purchase_unit || product.control_unit || "UN").toUpperCase();
  const controlUnit = (product.control_unit || product.unit || "UN").toUpperCase();
  const qty = e.quantity || 0;
  const controlQty = convertQuantity(qty, purchaseUnit, controlUnit, product.unit_conversions);

  const newQty = (product.stock_quantity || 0) + controlQty;
  const movement = [...(product.movement_history || []), { date: todayStr(), type: "entrada", quantity: controlQty, unit: controlUnit, reason: "compra", user: user?.full_name }];

  const readBack = await PersistenceEngine.update("Product", product.id, {
    stock_quantity: newQty,
    movement_history: movement,
    ...(e.price && e.supplier ? {
      cost_price: e.price,
      last_price: e.price,
      primary_supplier_name: e.supplier,
      last_purchase_date: todayStr(),
    } : {}),
  }, { module: "estoque", origin: "baron", userId: user?.id });

  await Core.audit({ audit_action: "update", module: "estoque", entity_type: "Product", entity_id: product.id, details: `Entrada via BARON: +${qty} ${purchaseUnit} ${product.name} | Usuário: ${user?.full_name}` });

  emit("stock_entry_created", "estoque", {
    entity_type: "Product", entity_id: product.id,
    product_id: product.id, product_name: product.name, movement_type: "entrada",
    quantity: controlQty, unit: controlUnit, unit_cost: e.price || 0,
    supplier_name: e.supplier || "", responsible_name: user?.full_name,
  });

  // Sincroniza a entidade Stock (é ela que a tela de Estoque > Estoque Atual lê de verdade —
  // sem isso, o Baron grava certo em Product mas a tela some com a informação)
  try {
    await PersistenceEngine.upsert("Stock", { product_id: product.id }, {
      product_name: product.name,
      quantity: newQty,
      unit: controlUnit,
      last_movement_date: new Date().toISOString(),
      last_movement_type: "entrada",
      status: "ativo",
    }, { module: "estoque", origin: "baron", userId: user?.id, validate: false });
  } catch (syncErr) {
    Logger.audit({ entity_name: "Stock", operation: "sync", status: "error", error_message: syncErr.message, module: "estoque" });
  }

  // Registra na entidade Movement — é ela que a aba Movimentações e o motor de CMV/DRE leem
  try {
    await PersistenceEngine.create("Movement", {
      movement_type: "entrada",
      product_id: product.id,
      product_name: product.name,
      quantity: controlQty,
      unit: controlUnit,
      unit_cost: e.price || 0,
      total_cost: (e.price || 0) * controlQty,
      reason: "Entrada via BARON",
      origin_type: "compra",
      supplier_name: e.supplier || "",
      responsible_name: user?.full_name || "Sistema",
      movement_date: new Date().toISOString(),
      status: "ativo",
    }, { module: "estoque", origin: "baron", userId: user?.id, validate: false });
  } catch (syncErr) {
    Logger.audit({ entity_name: "Movement", operation: "sync", status: "error", error_message: syncErr.message, module: "estoque" });
  }

  return {
    status: "executed",
    readBack,
    message: `Entrada concluída.\n${qty} ${purchaseUnit} adicionados.\nEstoque atual: ${newQty} ${controlUnit}.`,
  };
}

async function execStockExit(parsed, user, mem) {
  const e = parsed.entities;
  const match = await mem.findProduct(e.product_name);
  if (!match) return { status: "needs_info", message: `Produto "${e.product_name}" não encontrado no estoque.`, route: "/estoque" };
  const product = match.product;
  const controlUnit = (product.control_unit || product.unit || "UN").toUpperCase();
  const qty = convertQuantity(e.quantity || 0, (e.unit || controlUnit).toUpperCase(), controlUnit, product.unit_conversions);
  const newQty = Math.max(0, (product.stock_quantity || 0) - qty);
  const reason = e.category || "não informado";

  const readBack = await PersistenceEngine.update("Product", product.id, {
    stock_quantity: newQty,
    movement_history: [...(product.movement_history || []), { date: todayStr(), type: "baixa", quantity: qty, unit: controlUnit, reason, user: user?.full_name }],
  }, { module: "estoque", origin: "baron", userId: user?.id });

  await Core.audit({ audit_action: "update", module: "estoque", entity_type: "Product", entity_id: product.id, details: `Baixa via BARON: -${qty} ${controlUnit} ${product.name} | Motivo: ${reason} | Usuário: ${user?.full_name}` });

  emit("stock_exit_created", "estoque", {
    entity_type: "Product", entity_id: product.id,
    product_id: product.id, product_name: product.name, movement_type: "saida",
    quantity: qty, unit: controlUnit, reason, responsible_name: user?.full_name,
  });

  try {
    await PersistenceEngine.upsert("Stock", { product_id: product.id }, {
      product_name: product.name,
      quantity: newQty,
      unit: controlUnit,
      last_movement_date: new Date().toISOString(),
      last_movement_type: "saida",
      status: "ativo",
    }, { module: "estoque", origin: "baron", userId: user?.id, validate: false });
  } catch (syncErr) {
    Logger.audit({ entity_name: "Stock", operation: "sync", status: "error", error_message: syncErr.message, module: "estoque" });
  }

  try {
    await PersistenceEngine.create("Movement", {
      movement_type: "saida",
      product_id: product.id,
      product_name: product.name,
      quantity: qty,
      unit: controlUnit,
      reason: `Baixa via BARON: ${reason}`,
      origin_type: "baixa",
      responsible_name: user?.full_name || "Sistema",
      movement_date: new Date().toISOString(),
      status: "ativo",
    }, { module: "estoque", origin: "baron", userId: user?.id, validate: false });
  } catch (syncErr) {
    Logger.audit({ entity_name: "Movement", operation: "sync", status: "error", error_message: syncErr.message, module: "estoque" });
  }

  return { status: "executed", readBack, message: `Baixa registrada.\n-${qty} ${controlUnit} ${product.name}.\nEstoque atual: ${newQty} ${controlUnit}.` };
}

async function execPayment(parsed, user, mem) {
  const e = parsed.entities;
  const target = e.payment_target || e.supplier || "";
  const payments = await PersistenceEngine.find("Payment", { status: "pendente" }, "-due_date", 100);
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const found = payments.find((p) => norm(p.supplier_name || "").includes(norm(target)) || norm(p.description || "").includes(norm(target)));

  if (!found) {
    if (!e.amount) return { status: "needs_info", message: `Não encontrei conta pendente de "${target}". Qual o valor pago?`, needsField: "amount" };
    const readBack = await PersistenceEngine.create("FinancialTransaction", {
      description: `Pagamento: ${target}`, type: "a_pagar", amount: e.amount,
      due_date: todayStr(), payment_date: todayStr(), status: "pago",
      supplier: target, origin: "manual", payment_method: e.payment_method || "pix",
      notes: `Banco: ${e.bank || ""} | Via BARON por ${user?.full_name}`,
    }, { module: "financeiro", origin: "baron", userId: user?.id });

    await Core.audit({ audit_action: "create", module: "financeiro", entity_type: "FinancialTransaction", details: `Despesa via BARON: ${brl(e.amount)} - ${target} | Usuário: ${user?.full_name}` });
    emit("payment_created", "financeiro", { entity_type: "FinancialTransaction", entity_id: readBack.id, amount: e.amount, target, method: e.payment_method || "pix", responsible: user?.full_name });
    emit("payment_confirmed", "financeiro", { entity_type: "FinancialTransaction", entity_id: readBack.id, amount: e.amount, target, method: e.payment_method || "pix", responsible: user?.full_name });
    return { status: "executed", readBack, message: `Pagamento registrado.\n${target} — ${brl(e.amount)}.\nFluxo de caixa atualizado.`, follow_up: "Deseja anexar o comprovante?" };
  }

  const readBack = await PersistenceEngine.update("Payment", found.id, {
    status: "pago", payment_date: todayStr(),
    payment_method: e.payment_method || "pix", bank: e.bank,
    version: (found.version || 1) + 1,
  }, { module: "financeiro", origin: "baron", userId: user?.id });

  await PersistenceEngine.create("FinancialTransaction", {
    description: found.description, type: "a_pagar", amount: found.amount,
    due_date: found.due_date, payment_date: todayStr(), status: "pago",
    supplier: found.supplier_name, supplier_id: found.supplier_id,
    payment_method: e.payment_method || "pix", origin: "compra",
    notes: `Banco: ${e.bank || ""} | Pago via BARON por ${user?.full_name}`,
  }, { module: "financeiro", origin: "baron", userId: user?.id });

  await Core.audit({ audit_action: "confirm", module: "financeiro", entity_type: "Payment", entity_id: found.id, details: `Pago via BARON: ${found.description} - ${brl(found.amount)} | Usuário: ${user?.full_name}` });

  emit("payment_confirmed", "financeiro", {
    entity_type: "Payment", entity_id: found.id, payment_id: found.id,
    amount: found.amount, supplier: found.supplier_name, supplier_id: found.supplier_id,
    method: e.payment_method || "pix", bank: e.bank || "", responsible: user?.full_name,
  });

  return { status: "executed", readBack, message: `Pagamento registrado.\n${found.description}\n${brl(found.amount)}.\nBanco: ${e.bank || "N/A"} | Forma: ${(e.payment_method || "pix").toUpperCase()}.`, follow_up: "Deseja anexar o comprovante?" };
}

async function execProduction(parsed, user, mem) {
  const e = parsed.entities;
  const match = await mem.findProduct(e.product_name);
  const productName = match?.product.name || e.product_name;
  const controlUnit = match ? (match.product.control_unit || match.product.unit || "UN").toUpperCase() : (e.unit || "UN").toUpperCase();
  const qty = match ? convertQuantity(e.quantity || 0, (e.unit || controlUnit).toUpperCase(), controlUnit, match.product.unit_conversions) : (e.quantity || 0);

  const readBack = await PersistenceEngine.create("ProductionRecord", {
    item: productName, product_id: match?.product.id,
    produced_quantity: qty, planned_quantity: qty, unit: controlUnit,
    production_date: todayStr(), status: "concluida",
    responsible: user?.full_name || "Sistema", notes: "Registro via BARON",
  }, { module: "producao", origin: "baron", userId: user?.id });

  if (match) {
    const newQty = (match.product.stock_quantity || 0) + qty;
    await PersistenceEngine.update("Product", match.product.id, {
      stock_quantity: newQty,
      movement_history: [...(match.product.movement_history || []), { date: todayStr(), type: "producao", quantity: qty, unit: controlUnit, reason: "produção", user: user?.full_name }],
    }, { module: "producao", origin: "baron", userId: user?.id });
    try {
      await PersistenceEngine.upsert("Stock", { product_id: match.product.id }, {
        product_name: match.product.name, quantity: newQty, unit: controlUnit,
        last_movement_date: new Date().toISOString(), last_movement_type: "producao", status: "ativo",
      }, { module: "estoque", origin: "baron", userId: user?.id, validate: false });
    } catch (syncErr) {
      Logger.audit({ entity_name: "Stock", operation: "sync", status: "error", error_message: syncErr.message, module: "estoque" });
    }
    try {
      await PersistenceEngine.create("Movement", {
        movement_type: "producao",
        product_id: match.product.id, product_name: match.product.name,
        quantity: qty, unit: controlUnit,
        reason: "Produção via BARON", origin_type: "producao",
        responsible_name: user?.full_name || "Sistema",
        movement_date: new Date().toISOString(), status: "ativo",
      }, { module: "producao", origin: "baron", userId: user?.id, validate: false });
    } catch (syncErr) {
      Logger.audit({ entity_name: "Movement", operation: "sync", status: "error", error_message: syncErr.message, module: "producao" });
    }
  }

  await Core.audit({ audit_action: "create", module: "producao", entity_type: "ProductionRecord", entity_id: readBack.id, details: `Produção via BARON: ${qty} ${controlUnit} ${productName} | Usuário: ${user?.full_name}` });
  emit("production_finished", "producao", {
    entity_type: "ProductionRecord", entity_id: readBack.id,
    product_id: match?.product.id, product_name: productName, quantity: qty, unit: controlUnit, responsible: user?.full_name,
  });
  return { status: "executed", readBack, message: `Produção registrada.\n${qty} ${controlUnit} ${productName}.\nEstoque atualizado.` };
}

async function execEmployeeUpdate(parsed, user, mem) {
  const e = parsed.entities;
  const emp = await mem.findEmployee(e.employee_name);
  if (!emp) return { status: "needs_info", message: `Funcionário "${e.employee_name}" não encontrado.`, route: "/rh" };

  const statusMap = { ferias: "ferias", afastamento: "afastado", retorno: "ativo", demissao: "demitido" };
  const newStatus = statusMap[e.rh_action] || "ativo";
  const readBack = await PersistenceEngine.update("Employee", emp.id, { status: newStatus }, { module: "rh", origin: "baron", userId: user?.id });

  await Core.audit({ audit_action: "update", module: "rh", entity_type: "Employee", entity_id: emp.id, details: `${e.rh_action} via BARON: ${emp.full_name} → ${newStatus} | Usuário: ${user?.full_name}` });
  const labels = { ferias: "entrou de férias", afastamento: "afastado", retorno: "voltou ao trabalho", demissao: "demitido" };
  return { status: "executed", readBack, message: `RH atualizado.\n${emp.full_name} ${labels[e.rh_action] || "atualizado"}.` };
}

async function execAdvance(parsed, user, mem) {
  const e = parsed.entities;
  const emp = await mem.findEmployee(e.employee_name);
  if (!emp) return { status: "needs_info", message: `Funcionário "${e.employee_name}" não encontrado.`, route: "/rh" };

  const amount = e.amount || 0;
  const readBack = await PersistenceEngine.create("EmployeeAdvance", {
    employee_id: emp.id,
    employee_name: emp.full_name,
    type: "vale_semanal",
    amount,
    installments: 1,
    installment_amount: amount,
    balance: amount,
    date: todayStr(),
    status: "ativo",
    description: `Vale registrado via BARON`,
  }, { module: "rh", origin: "baron", userId: user?.id });

  await Core.audit({ audit_action: "create", module: "rh", entity_type: "EmployeeAdvance", entity_id: readBack.id, details: `Vale via BARON: ${brl(amount)} para ${emp.full_name} | Usuário: ${user?.full_name}` });

  // Espelha no Financeiro — mesmo evento que o vale manual do RH publica
  emit("advance_created", "rh", {
    entity_type: "EmployeeAdvance", entity_id: readBack.id,
    advance_id: readBack.id, employee_id: emp.id, employee_name: emp.full_name,
    type: "vale_semanal", amount, installment_amount: amount, installments: 1, date: todayStr(),
  });

  return { status: "executed", readBack, message: `Vale registrado.\n${brl(amount)} para ${emp.full_name}.\nLançado na conta da funcionária e espelhado no Financeiro.` };
}

async function execExpense(parsed, user, mem) {
  const e = parsed.entities;
  const readBack = await PersistenceEngine.create("FinancialTransaction", {
    description: `Despesa: ${e.category || "outros"}`, type: "a_pagar", amount: e.amount || 0,
    due_date: todayStr(), payment_date: todayStr(), status: "pago",
    category: e.category || "outros", origin: "manual", payment_method: e.payment_method || "pix",
    notes: `Via BARON por ${user?.full_name}`,
  }, { module: "financeiro", origin: "baron", userId: user?.id });

  await Core.audit({ audit_action: "create", module: "financeiro", entity_type: "FinancialTransaction", entity_id: readBack.id, details: `Despesa via BARON: ${brl(e.amount)} - ${e.category || "outros"} | Usuário: ${user?.full_name}` });
  return { status: "executed", readBack, message: `Despesa registrada.\n${brl(e.amount)}.\nCategoria: ${e.category || "outros"}.\nFluxo de caixa atualizado.` };
}

// ============================================================
// Consultas (leitura) — usam OperationalMemory
// ============================================================
async function execQuery(parsed, user, mem) {
  const intent = parsed.intent;

  if (intent === "stock_query") {
    const low = await mem.getLowStock();
    if (low.length === 0) return { status: "message", message: "Estoque OK. Nenhum produto abaixo do mínimo." };
    return { status: "message", message: `${low.length} produto(s) abaixo do mínimo:\n${low.slice(0, 5).map((p) => `• ${p.name}: ${p.stock_quantity} ${p.control_unit || ""} (mín: ${p.min_quantity})`).join("\n")}`, route: "/estoque", filter: "baixo" };
  }

  if (intent === "boleto_query") {
    const today = todayStr();
    const pend = await PersistenceEngine.find("Payment", { status: "pendente" }, "-due_date", 200);
    const vencidos = pend.filter((p) => p.due_date && p.due_date < today);
    const hoje = pend.filter((p) => p.due_date === today);
    if (vencidos.length === 0 && hoje.length === 0) return { status: "message", message: "Nenhum boleto vencendo." };
    const parts = [];
    if (vencidos.length) parts.push(`${vencidos.length} vencido(s) — ${brl(vencidos.reduce((s, p) => s + (p.amount || 0), 0))}`);
    if (hoje.length) parts.push(`${hoje.length} vence(m) hoje — ${brl(hoje.reduce((s, p) => s + (p.amount || 0), 0))}`);
    return { status: "message", message: parts.join("\n"), route: "/financeiro", filter: "vencendo" };
  }

  if (intent === "cmv_query" || intent === "profit_query" || intent === "dre_query") {
    return { status: "navigate", route: "/cmv", message: "Abrindo CMV." };
  }

  if (intent === "cashflow_query") {
    const pagar = await PersistenceEngine.find("FinancialTransaction", { type: "a_pagar", status: { $ne: "pago" } }, null, 200);
    const receber = await PersistenceEngine.find("FinancialTransaction", { type: "a_receber", status: { $ne: "recebido" } }, null, 200);
    const totalP = pagar.reduce((s, t) => s + (t.amount || 0), 0);
    const totalR = receber.reduce((s, t) => s + (t.amount || 0), 0);
    const fluxo = totalR - totalP;
    return { status: "message", message: `Fluxo de caixa previsto:\nA pagar: ${brl(totalP)}\nA receber: ${brl(totalR)}\nSaldo: ${brl(fluxo)}${fluxo < 0 ? " (déficit)" : ""}.` };
  }

  if (intent === "indicators" || intent === "report") {
    return { status: "navigate", route: intent === "report" ? "/relatorios" : "/indicadores", message: "Abrindo." };
  }

  return { status: "message", message: "Consultando. Um momento." };
}

// ============================================================
// Mapa intent → executor
// ============================================================
const EXECUTORS = {
  stock_entry: execStockEntry,
  stock_exit: execStockExit,
  payment: execPayment,
  expense: execExpense,
  production: execProduction,
  employee_update: execEmployeeUpdate,
  payroll: execAdvance,
};

// ============================================================
// Engine principal
// ============================================================
export const ExecutionEngine = {
  /**
   * Executa uma intent classificada. Fluxo completo:
   * Intent → Validation → Action → Persistence → ReadBack → Log → Response
   */
  async execute(parsed, user, mem) {
    const t0 = Date.now();
    Logger.info(`ExecutionEngine: ${parsed.intent}`, { category: parsed.category });

    // 1. Navegação — não precisa validar/executar
    if (parsed.intent === "navigate" || parsed.intent === "navigate_filter") {
      const e = parsed.entities;
      if (e.route) return { status: "navigate", route: e.route, filter: e.filter, message: `Abrindo ${e.module || ""}.` };
      return { status: "needs_info", message: "Qual módulo deseja abrir?" };
    }

    // 2. Validação
    const validator = VALIDATORS[parsed.intent];
    if (validator) {
      const missing = validator(parsed);
      if (missing) return { status: "needs_info", needsField: missing.field, message: missing.message, parsed };
    }

    // 3. Consulta (leitura)
    if (parsed.category === "consultas" || parsed.category === "intelligence" ||
        ["stock_query", "boleto_query", "cmv_query", "profit_query", "dre_query", "cashflow_query", "indicators", "report"].includes(parsed.intent)) {
      try {
        return await execQuery(parsed, user, mem);
      } catch (e) {
        return { status: "error", message: `Erro na consulta: ${e.message}` };
      }
    }

    // 4. Execução (escrita) — via executor específico
    const executor = EXECUTORS[parsed.intent];
    if (executor) {
      try {
        const result = await executor(parsed, user, mem);
        // Log de conclusão
        Logger.audit({
          entity_name: parsed.category, operation: "baron_exec",
          status: result.status === "executed" ? "success" : "info",
          payload: { intent: parsed.intent, entities: parsed.entities },
          duration_ms: Date.now() - t0, module: "baron_coo", origin: "baron",
        });
        return result;
      } catch (e) {
        Logger.audit({ entity_name: parsed.category, operation: "baron_exec", status: "error", error_message: e.message, duration_ms: Date.now() - t0, module: "baron_coo" });
        return { status: "error", message: `Falha na execução: ${e.message}. Operação não concluída.` };
      }
    }

    // 5. Intent não mapeada para execução
    return { status: "message", message: "Comando reconhecido mas sem executor. Reformule." };
  },
};

export default ExecutionEngine;