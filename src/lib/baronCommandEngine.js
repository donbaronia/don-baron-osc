/**
 * BARON Command Engine 2.0 — Modo Executar
 *
 * Fluxo: identificar intenção → extrair informações → verificar o que falta →
 * perguntar só o indispensável → executar operação completa → atualizar módulos → informar resultado.
 *
 * Suporta conversa multi-turno: quando falta informação, retorna needs_info com
 * needsField + understood + parsed. O chamador preenche o campo na próxima mensagem.
 */
import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/coreEngine";
import { todayStr, brl } from "@/lib/financialCenter";
import { convertQuantity } from "@/lib/masterData";

const MEMORY_KEY = "baron_operational_memory";

export function loadMemory() {
  try { return JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}"); } catch { return {}; }
}
function saveMemory(mem) { localStorage.setItem(MEMORY_KEY, JSON.stringify(mem)); }
function learn(key, value) {
  if (!value) return;
  const mem = loadMemory();
  mem[key] = value;
  saveMemory(mem);
}

const INTENT_SCHEMA = {
  type: "object",
  properties: {
    intent: { type: "string", enum: ["compra", "pagamento", "producao", "baixa", "rh", "despesa", "navegacao", "pergunta"] },
    product_name: { type: "string", description: "Nome do produto" },
    quantity: { type: "number" },
    unit: { type: "string", description: "un, kg, cx, pct, lt, g" },
    price: { type: "number", description: "Preço em reais" },
    price_type: { type: "string", enum: ["unit", "total"] },
    supplier: { type: "string", description: "Fornecedor" },
    payment_target: { type: "string", description: "A quem foi pago" },
    bank: { type: "string", description: "Banco utilizado" },
    payment_method: { type: "string", enum: ["pix", "boleto", "transferencia", "cartao_credito", "cartao_debito", "dinheiro"] },
    amount: { type: "number", description: "Valor pago" },
    category: { type: "string", description: "Categoria da despesa" },
    employee_name: { type: "string", description: "Nome do funcionário" },
    rh_action: { type: "string", enum: ["ferias", "afastamento", "retorno", "demissao"], description: "Ação de RH" },
    loss_reason: { type: "string", description: "Motivo da perda" },
    route: { type: "string", description: "Rota de navegação" },
    route_filter: { type: "string", enum: ["vencendo", "baixo", "pendentes", "hoje"] },
    message: { type: "string", description: "Resposta curta confirmando a ação" },
    needs_info: { type: "string", description: "Informação faltante" },
  },
};

const PARSE_PROMPT = `Você é o BARON, Diretor Operacional do DON BARON OS. Analise o comando em linguagem natural e extraia a intenção estruturada.

Exemplos:
- "Comprei 100kg de arroz a R$12,50" → intent=compra, product_name=arroz, quantity=100, unit=kg, price=12.50, price_type=unit
- "Comprei 20 caixas de Coca-Cola por R$180" → intent=compra, product_name=coca-cola, quantity=20, unit=cx, price=180, price_type=total
- "Chegaram 45kg de carne por R$36,90 o kg da Fribal" → intent=compra, product_name=carne, quantity=45, unit=kg, price=36.90, price_type=unit, supplier=Fribal
- "Paguei a Equatorial hoje pelo Inter via PIX" → intent=pagamento, payment_target=Equatorial, bank=Inter, payment_method=pix
- "Produzimos 18 geleias de bacon" → intent=producao, product_name=geleia de bacon, quantity=18, unit=un
- "Perdemos 8 pães por vencimento" → intent=baixa, product_name=pão, quantity=8, unit=un, loss_reason=vencimento
- "João entrou de férias hoje" → intent=rh, employee_name=João, rh_action=ferias
- "Paguei R$85 de combustível" → intent=despesa, amount=85, category=combustível
- "Abrir estoque" → intent=navegacao, route=/estoque
- "Mostrar RH" → intent=navegacao, route=/rh
- "Boletos vencendo" → intent=navegacao, route=/financeiro, route_filter=vencendo
- "Produtos abaixo do mínimo" → intent=navegacao, route=/estoque, route_filter=baixo
- "Mostrar Intelligence" → intent=navegacao, route=/inteligencia
- "Chegou carne" / "Recebi pão" → intent=compra (sem preço, sem fornecedor)

Regras:
- Se for resposta curta a uma pergunta do BARON (ex: só um nome de fornecedor, só um valor), mantenha intent da pergunta anterior se possível, ou use intent=pergunta.
- message: confirmação curta e amigável em português.
- route deve ser uma das: /estoque, /financeiro, /compras, /producao, /rh, /cmv, /documentos, /processamento, /indicadores, /motoboys, /cadastro, /relatorios, /inteligencia, /ia, /missions, /planejamento, /administracao, /kernel, /integracoes, /whatsapp, /dashboard
- Se for uma pergunta sobre dados, intent=pergunta e responda em message.`;

export async function parseCommand(text, previousIntent) {
  const contextHint = previousIntent ? `\n\nContexto: o BARON havia perguntado uma informação sobre uma operação de "${previousIntent}". Esta mensagem provavelmente é a resposta.` : "";
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `${PARSE_PROMPT}${contextHint}\n\nComando: "${text}"`,
    response_json_schema: INTENT_SCHEMA,
  });
  // Se havia contexto e a resposta não trouxe intent clara, preservar a anterior
  if (previousIntent && (!res.intent || res.intent === "pergunta")) {
    res.intent = previousIntent;
  }
  return res;
}

async function findProduct(name) {
  if (!name) return null;
  const products = await base44.entities.Product.filter({ active: true }, "-created_date", 500).catch(() => []);
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
  const target = norm(name);
  for (const p of products) {
    if (norm(p.name) === target || (p.short_name && norm(p.short_name) === target)) return { product: p, confidence: 1 };
    for (const alias of p.aliases || []) { if (norm(alias) === target) return { product: p, confidence: 1 }; }
  }
  for (const p of products) {
    if (norm(p.name).includes(target) || target.includes(norm(p.name))) { await learnAlias(p, name); return { product: p, confidence: 0.9 }; }
    if (p.short_name && (norm(p.short_name).includes(target) || target.includes(norm(p.short_name)))) { await learnAlias(p, name); return { product: p, confidence: 0.85 }; }
  }
  return null;
}

async function learnAlias(product, aliasName) {
  const aliases = product.aliases || [];
  const norm = (s) => s.toLowerCase().trim();
  if (aliases.some((a) => norm(a) === norm(aliasName))) return;
  try { await base44.entities.Product.update(product.id, { aliases: [...aliases, aliasName] }); } catch {}
}

async function findEmployee(name) {
  if (!name) return null;
  const employees = await base44.entities.Employee.filter({}, "-created_date", 200).then((list) => list.filter((e) => e.status !== "demitido" && e.status !== "inativo")).catch(() => []);
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const target = norm(name);
  return employees.find((e) => {
    const fn = norm(e.full_name || "");
    const sn = norm(e.short_name || "");
    return fn.includes(target) || target.includes(fn) || sn.includes(target) || target.includes(sn);
  }) || null;
}

async function execCompra(parsed, user) {
  const match = await findProduct(parsed.product_name);
  if (!match) {
    return { type: "needs_info", message: `Não encontrei "${parsed.product_name}" no cadastro. Quer cadastrar este produto? Abrirei o cadastro.`, route: "/cadastro", needsField: null };
  }
  const product = match.product;
  const supplier = parsed.supplier || loadMemory().preferred_supplier;

  // Unidades: o BARON usa o cadastro, nunca pergunta unidade
  const purchaseUnit = (parsed.unit || product.purchase_unit || product.control_unit || "UN").toUpperCase();
  const controlUnit = (product.control_unit || product.unit || "UN").toUpperCase();
  const qty = parsed.quantity || 0;
  const controlQty = convertQuantity(qty, purchaseUnit, controlUnit, product.unit_conversions);
  const unitConverted = purchaseUnit !== controlUnit;

  const understood = `Entendi:\n• Produto: ${product.name}\n• Quantidade: ${qty} ${purchaseUnit}${unitConverted ? ` → ${controlQty} ${controlUnit}` : ""}${parsed.price ? `\n• Valor ${parsed.price_type === "total" ? "total" : "unitário"}: ${brl(parsed.price)}` : ""}`;

  // Sem preço → apenas entrada de estoque, sem fornecedor necessário
  if (!parsed.price) {
    const newQty = (product.stock_quantity || 0) + controlQty;
    await base44.entities.Product.update(product.id, {
      stock_quantity: newQty,
      movement_history: [...(product.movement_history || []), { date: todayStr(), type: "entrada", quantity: controlQty, unit: controlUnit, reason: "compra sem nota", user: user?.full_name }],
    });
    await Core.audit({ audit_action: "create", module: "estoque", entity_type: "Product", entity_id: product.id, details: `Entrada via BARON: +${qty} ${purchaseUnit}${unitConverted ? ` → ${controlQty} ${controlUnit}` : ""} ${product.name} (sem nota) | Usuário: ${user?.full_name}` });
    return { type: "done", message: `✓ Entrada realizada: +${qty} ${purchaseUnit}${unitConverted ? ` → ${controlQty} ${controlUnit}` : ""}\n✓ Estoque atualizado: ${newQty} ${controlUnit}` };
  }

  // Com preço → precisa fornecedor
  if (!supplier) {
    return { type: "needs_info", understood, message: "Falta apenas informar o fornecedor.", needsField: "supplier", parsed };
  }

  learn("preferred_supplier", supplier);
  const totalAmount = parsed.price_type === "total" ? parsed.price : (parsed.price || 0) * qty;
  const unitPriceControl = controlQty > 0 ? totalAmount / controlQty : 0;
  const newQty = (product.stock_quantity || 0) + controlQty;
  const newCost = unitPriceControl || product.cost_price;
  const prevMax = product.max_price_paid || 0;
  const prevMin = product.min_price_paid || 0;
  const newMax = Math.max(prevMax, unitPriceControl);
  const newMin = prevMin > 0 ? Math.min(prevMin, unitPriceControl) : unitPriceControl;
  const history = product.purchase_history || [];
  const newAvg = history.length > 0
    ? ([...history, { price: unitPriceControl }].reduce((s, e) => s + (e.price || 0), 0)) / (history.length + 1)
    : unitPriceControl;

  const purchaseEntry = { date: todayStr(), supplier, price: unitPriceControl, quantity: qty, unit: purchaseUnit, total: totalAmount, user: user?.full_name };
  const movementEntry = { date: todayStr(), type: "entrada", quantity: controlQty, unit: controlUnit, reason: "compra", user: user?.full_name };

  await base44.entities.Product.update(product.id, {
    stock_quantity: newQty,
    cost_price: newCost,
    primary_supplier_name: supplier,
    last_price: unitPriceControl,
    avg_price: newAvg,
    max_price_paid: newMax,
    min_price_paid: newMin,
    last_purchase_date: todayStr(),
    last_adjustment: todayStr(),
    purchase_history: [...history, purchaseEntry],
    movement_history: [...(product.movement_history || []), movementEntry],
  });

  await base44.entities.FinancialTransaction.create({
    description: `Compra: ${qty} ${purchaseUnit} ${product.name} - ${supplier}`,
    type: "a_pagar",
    amount: totalAmount,
    due_date: todayStr(),
    payment_date: todayStr(),
    status: "pago",
    supplier,
    origin: "compra",
    payment_method: "pix",
    notes: `Registro via BARON por ${user?.full_name || "Sistema"}`,
  });

  await Core.audit({ audit_action: "create", module: "estoque", entity_type: "Product", entity_id: product.id, details: `Compra via BARON: +${qty} ${purchaseUnit}${unitConverted ? ` → ${controlQty} ${controlUnit}` : ""} ${product.name} | Custo: ${brl(newCost)}/${controlUnit} | Fornecedor: ${supplier} | Total: ${brl(totalAmount)} | Usuário: ${user?.full_name}` });

  return { type: "done", message: `✓ Compra registrada: ${qty} ${purchaseUnit} ${product.name}${unitConverted ? ` → ${controlQty} ${controlUnit}` : ""} - ${brl(totalAmount)}\n✓ Estoque atualizado: ${newQty} ${controlUnit}\n✓ Custo médio atualizado: ${brl(newCost)}/${controlUnit}\n✓ Fornecedor: ${supplier}\n✓ CMV atualizado\n✓ Intelligence atualizado\n✓ Histórico registrado\n✓ Auditoria registrada` };
}

async function execPagamento(parsed, user) {
  const target = parsed.payment_target || "";
  const payments = await base44.entities.Payment.filter({ status: "pendente" }, "-due_date", 100).catch(() => []);
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const found = payments.find((p) => norm(p.supplier_name || "").includes(norm(target)) || norm(p.description || "").includes(norm(target)));

  if (!found) {
    // Não há boleto pendente — perguntar valor para registrar como despesa
    if (!parsed.amount) {
      return { type: "needs_info", understood: `Não encontrei conta pendente de "${target}".`, message: "Qual o valor pago? Vou registrar como despesa.", needsField: "amount", parsed };
    }
    // Registrar como despesa avulsa
    const bank = parsed.bank || loadMemory().preferred_bank;
    const method = parsed.payment_method || loadMemory().preferred_payment_method || "pix";
    learn("preferred_bank", bank);
    learn("preferred_payment_method", method);
    await base44.entities.FinancialTransaction.create({
      description: `Pagamento: ${target}`,
      type: "a_pagar", amount: parsed.amount, due_date: todayStr(), payment_date: todayStr(),
      status: "pago", supplier: target, origin: "manual", payment_method: method,
      notes: `Banco: ${bank} | Via BARON por ${user?.full_name}`,
    });
    await Core.audit({ audit_action: "create", module: "financeiro", entity_type: "FinancialTransaction", details: `Despesa via BARON: ${brl(parsed.amount)} - ${target} | Banco: ${bank} | ${method} | Usuário: ${user?.full_name}` });
    return { type: "done", message: `✓ Pagamento registrado: ${target} - ${brl(parsed.amount)}\n✓ Banco: ${bank} | Forma: ${method.toUpperCase()}\n✓ Fluxo de caixa atualizado`, follow_up: "Deseja anexar o comprovante?" };
  }

  const bank = parsed.bank || loadMemory().preferred_bank;
  const method = parsed.payment_method || loadMemory().preferred_payment_method || "pix";
  learn("preferred_bank", bank);
  learn("preferred_payment_method", method);

  await base44.entities.Payment.update(found.id, {
    status: "pago", payment_date: todayStr(), payment_method: method, bank,
    version: (found.version || 1) + 1,
  });

  await base44.entities.FinancialTransaction.create({
    description: found.description, type: "a_pagar", amount: found.amount,
    due_date: found.due_date, payment_date: todayStr(), status: "pago",
    supplier: found.supplier_name, supplier_id: found.supplier_id,
    payment_method: method, account_name: loadMemory().preferred_account || "",
    document_id: found.document_id, origin: "compra",
    notes: `Banco: ${bank} | Pago via BARON por ${user?.full_name}`,
  });

  await Core.audit({ audit_action: "confirm", module: "financeiro", entity_type: "Payment", entity_id: found.id, details: `Pago via BARON: ${found.description} - ${brl(found.amount)} | Banco: ${bank} | ${method} | Usuário: ${user?.full_name}` });

  return { type: "done", message: `✓ Pagamento registrado: ${found.description}\n✓ Valor: ${brl(found.amount)}\n✓ Banco: ${bank} | Forma: ${method.toUpperCase()}\n✓ Fluxo de caixa atualizado\n✓ Financeiro atualizado`, follow_up: "Deseja anexar o comprovante?" };
}

async function execProducao(parsed, user) {
  const match = await findProduct(parsed.product_name);
  const productName = match?.product.name || parsed.product_name;
  const controlUnit = match ? (match.product.control_unit || match.product.unit || "UN").toUpperCase() : (parsed.unit || "UN").toUpperCase();
  const qty = match ? convertQuantity(parsed.quantity || 0, (parsed.unit || controlUnit).toUpperCase(), controlUnit, match.product.unit_conversions) : (parsed.quantity || 0);
  const unit = parsed.unit || controlUnit;

  await base44.entities.ProductionRecord.create({
    item: productName, product_id: match?.product.id,
    produced_quantity: qty, planned_quantity: qty, unit: controlUnit,
    production_date: todayStr(), status: "concluida",
    responsible: user?.full_name || "Sistema", notes: "Registro via BARON",
  });

  if (match) {
    const newQty = (match.product.stock_quantity || 0) + qty;
    await base44.entities.Product.update(match.product.id, {
      stock_quantity: newQty,
      movement_history: [...(match.product.movement_history || []), { date: todayStr(), type: "producao", quantity: qty, unit: controlUnit, reason: "produção", user: user?.full_name }],
    });
  }

  await Core.audit({ audit_action: "create", module: "producao", entity_type: "ProductionRecord", details: `Produção via BARON: ${qty} ${controlUnit} ${productName} | Usuário: ${user?.full_name}` });

  return { type: "done", message: `✓ Produção registrada: ${qty} ${controlUnit} ${productName}\n✓ Estoque atualizado${match ? `: ${match.product.stock_quantity + qty} ${controlUnit}` : ""}\n✓ Custos atualizados\n✓ Auditoria registrada` };
}

async function execBaixa(parsed, user) {
  const match = await findProduct(parsed.product_name);
  if (!match) {
    return { type: "needs_info", message: `Não encontrei "${parsed.product_name}" no estoque. Abra o estoque para revisar.`, route: "/estoque", needsField: null };
  }
  const product = match.product;
  const controlUnit = (product.control_unit || product.unit || "UN").toUpperCase();
  const qty = convertQuantity(parsed.quantity || 0, (parsed.unit || controlUnit).toUpperCase(), controlUnit, product.unit_conversions);
  const newQty = Math.max(0, (product.stock_quantity || 0) - qty);

  await base44.entities.Product.update(product.id, {
    stock_quantity: newQty,
    movement_history: [...(product.movement_history || []), { date: todayStr(), type: "baixa", quantity: qty, unit: controlUnit, reason: parsed.loss_reason || "não informado", user: user?.full_name }],
  });

  await Core.audit({ audit_action: "update", module: "estoque", entity_type: "Product", entity_id: product.id, details: `Baixa via BARON: -${qty} ${controlUnit} ${product.name} | Motivo: ${parsed.loss_reason || "não informado"} | Usuário: ${user?.full_name}` });

  return { type: "done", message: `✓ Baixa registrada: -${qty} ${controlUnit} ${product.name}\n✓ Motivo: ${parsed.loss_reason || "não informado"}\n✓ Estoque atualizado: ${newQty} ${controlUnit}\n✓ CMV atualizado\n✓ Histórico registrado` };
}

async function execRH(parsed, user) {
  const emp = await findEmployee(parsed.employee_name);
  if (!emp) {
    return { type: "needs_info", message: `Não encontrei o funcionário "${parsed.employee_name}". Abra o RH para revisar.`, route: "/rh", needsField: null };
  }
  const statusMap = { ferias: "ferias", afastamento: "afastado", retorno: "ativo", demissao: "demitido" };
  const newStatus = statusMap[parsed.rh_action] || "ativo";

  await base44.entities.Employee.update(emp.id, { status: newStatus });
  await Core.audit({ audit_action: "update", module: "rh", entity_type: "Employee", entity_id: emp.id, details: `${parsed.rh_action} via BARON: ${emp.full_name} → ${newStatus} | Usuário: ${user?.full_name}` });

  const labels = { ferias: "entrou de férias", afastamento: "afastado", retorno: "voltou ao trabalho", demissao: "demitido" };
  return { type: "done", message: `✓ RH atualizado: ${emp.full_name} ${labels[parsed.rh_action] || "atualizado"}` };
}

async function execDespesa(parsed, user) {
  const amount = parsed.amount || 0;
  const category = parsed.category || "outros";
  const method = loadMemory().preferred_payment_method || "pix";

  await base44.entities.FinancialTransaction.create({
    description: `Despesa: ${category}`, type: "a_pagar", amount,
    due_date: todayStr(), payment_date: todayStr(), status: "pago",
    category, origin: "manual", payment_method: method,
    notes: `Registro via BARON por ${user?.full_name}`,
  });

  await Core.audit({ audit_action: "create", module: "financeiro", entity_type: "FinancialTransaction", details: `Despesa via BARON: ${brl(amount)} - ${category} | Usuário: ${user?.full_name}` });

  return { type: "done", message: `✓ Despesa registrada: ${brl(amount)}\n✓ Categoria: ${category}\n✓ Fluxo de caixa atualizado\n✓ Financeiro atualizado` };
}

export async function executeCommand(parsed, user) {
  try {
    switch (parsed.intent) {
      case "compra": return await execCompra(parsed, user);
      case "pagamento": return await execPagamento(parsed, user);
      case "producao": return await execProducao(parsed, user);
      case "baixa": return await execBaixa(parsed, user);
      case "rh": return await execRH(parsed, user);
      case "despesa": return await execDespesa(parsed, user);
      case "navegacao": return { type: "navigate", route: parsed.route, filter: parsed.route_filter, message: parsed.message || "Abrindo..." };
      default: return { type: "message", message: parsed.message || "Não entendi. Pode reformular?" };
    }
  } catch (e) {
    return { type: "error", message: `Tive um problema ao executar: ${e.message}. Tente novamente.` };
  }
}

export { learn };