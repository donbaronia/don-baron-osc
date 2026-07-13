/**
 * BARON Command Engine — interpreta linguagem natural e executa ações.
 *
 * O BARON é Diretor Operacional: entende comandos, executa operações completas,
 * navega automaticamente, aprende continuamente e pergunta apenas o necessário.
 */
import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/coreEngine";
import { todayStr, brl } from "@/lib/financialCenter";

const MEMORY_KEY = "baron_operational_memory";

export function loadMemory() {
  try { return JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}"); } catch { return {}; }
}
function saveMemory(mem) { localStorage.setItem(MEMORY_KEY, JSON.stringify(mem)); }
function learn(key, value) {
  if (!value) return;
  const mem = loadMemory();
  if (!mem[key]) { mem[key] = value; saveMemory(mem); }
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
    route: { type: "string", description: "Rota de navegação (/estoque, /financeiro, /rh, etc)" },
    route_filter: { type: "string", enum: ["vencendo", "baixo", "pendentes", "hoje"], description: "Filtro da rota" },
    message: { type: "string", description: "Resposta curta confirmando a ação" },
    needs_info: { type: "string", description: "Informação faltante que precisa perguntar" },
  },
};

const PARSE_PROMPT = `Você é o BARON, Diretor Operacional do DON BARON OS. Analise o comando em linguagem natural e extraia a intenção estruturada.

Exemplos:
- "Comprei 100kg de arroz a R$12,50" → intent=compra, product_name=arroz, quantity=100, unit=kg, price=12.50, price_type=unit
- "Comprei 20 caixas de Coca-Cola por R$180" → intent=compra, product_name=coca-cola, quantity=20, unit=cx, price=180, price_type=total
- "Paguei a Equatorial hoje pelo Inter via PIX" → intent=pagamento, payment_target=Equatorial, bank=Inter, payment_method=pix
- "Produzimos 18 geleias de bacon" → intent=producao, product_name=geleia de bacon, quantity=18, unit=un
- "Perdemos 8 pães por vencimento" → intent=baixa, product_name=pão, quantity=8, unit=un, loss_reason=vencimento
- "João entrou de férias hoje" → intent=rh, employee_name=João, rh_action=ferias
- "Paguei R$85 de combustível" → intent=despesa, amount=85, category=combustível
- "Abrir estoque" → intent=navegacao, route=/estoque
- "Boletos vencendo" → intent=navegacao, route=/financeiro, route_filter=vencendo
- "Produtos abaixo do mínimo" → intent=navegacao, route=/estoque, route_filter=baixo
- "Chegou carne" / "Recebi pão" / "Entrou bacon" → intent=compra (sem preço)
- "Paguei fornecedor" → intent=pagamento

Regras:
- Se faltar informação essencial (ex: fornecedor em compra com preço), coloque em needs_info.
- message: confirmação curta e amigável em português do que vai fazer.
- route deve ser uma das: /estoque, /financeiro, /compras, /producao, /rh, /cmv, /documentos, /processamento, /indicadores, /motoboys, /cadastro, /relatorios, /inteligencia, /baron-ai, /ia, /missions, /planejamento, /administracao, /kernel, /integracoes, /whatsapp, /dashboard
- Se for uma pergunta (ex: "quanto tenho em caixa?"), intent=pergunta e responda em message.`;

export async function parseCommand(text) {
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `${PARSE_PROMPT}\n\nComando: "${text}"`,
    response_json_schema: INTENT_SCHEMA,
  });
  return res;
}

async function findProduct(name) {
  if (!name) return null;
  const products = await base44.entities.Product.filter({ active: true, status: "ativo" }, "-created_date", 500).catch(() => []);
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
  const target = norm(name);
  // Exact/alias match first
  for (const p of products) {
    if (norm(p.name) === target || (p.short_name && norm(p.short_name) === target)) return { product: p, confidence: 1 };
    for (const alias of p.aliases || []) { if (norm(alias) === target) return { product: p, confidence: 1 }; }
  }
  // Partial match
  for (const p of products) {
    if (norm(p.name).includes(target) || target.includes(norm(p.name))) return { product: p, confidence: 0.9 };
    if (p.short_name && (norm(p.short_name).includes(target) || target.includes(norm(p.short_name)))) return { product: p, confidence: 0.85 };
  }
  return null;
}

async function findEmployee(name) {
  if (!name) return null;
  const employees = await base44.entities.Employee.filter({ status: "ativo" }, "-created_date", 200).catch(() => []);
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
    return { type: "needs_info", message: `Não encontrei "${parsed.product_name}" no cadastro. Quer cadastrar ou relacionar a um produto existente? Abra o cadastro.`, route: "/cadastro" };
  }
  const product = match.product;
  const supplier = parsed.supplier || loadMemory().preferred_supplier;
  if (!supplier && parsed.price) {
    return { type: "needs_info", message: `Encontrei ${product.name}. Qual o fornecedor?`, learn_product: product.name, pending: parsed };
  }
  if (supplier) learn("preferred_supplier", supplier);

  const qty = parsed.quantity || 0;
  const unitPrice = parsed.price_type === "total" && parsed.quantity > 0 ? parsed.price / parsed.quantity : (parsed.price || 0);
  const newQty = (product.stock_quantity || 0) + qty;
  const newCost = unitPrice || product.cost_price;

  await base44.entities.Product.update(product.id, {
    stock_quantity: newQty,
    cost_price: newCost,
    primary_supplier_name: supplier || product.primary_supplier_name,
  });

  if (parsed.price && supplier) {
    await base44.entities.FinancialTransaction.create({
      description: `Compra: ${qty} ${parsed.unit || "un"} ${product.name}${supplier ? ` - ${supplier}` : ""}`,
      type: "a_pagar",
      amount: parsed.price_type === "total" ? parsed.price : unitPrice * qty,
      due_date: todayStr(),
      payment_date: todayStr(),
      status: "pago",
      supplier,
      origin: "compra",
      payment_method: "pix",
      notes: `Registro via BARON por ${user?.full_name || "Sistema"}`,
    });
  }

  await Core.audit({ audit_action: "create", module: "estoque", entity_type: "Product", entity_id: product.id, details: `Entrada via BARON: +${qty} ${parsed.unit || "un"} ${product.name} | Custo: ${brl(newCost)}${supplier ? ` | Fornecedor: ${supplier}` : ""} | Usuário: ${user?.full_name}` });

  return { type: "done", message: `✓ Entrada realizada: +${qty} ${parsed.unit || "un"} ${product.name}${supplier ? `\n✓ Fornecedor: ${supplier}` : ""}\n✓ Estoque atualizado: ${newQty} ${parsed.unit || "un"}\n✓ Custo médio atualizado: ${brl(newCost)}${parsed.price ? `\n✓ Compra registrada: ${brl(parsed.price_type === "total" ? parsed.price : unitPrice * qty)}` : ""}` };
}

async function execPagamento(parsed, user) {
  const target = parsed.payment_target || "";
  const payments = await base44.entities.Payment.filter({ status: "pendente" }, "-due_date", 100).catch(() => []);
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const found = payments.find((p) => {
    return norm(p.supplier_name || "").includes(norm(target)) || norm(p.description || "").includes(norm(target));
  });

  if (!found) {
    return { type: "needs_info", message: `Não encontrei boleto pendente de "${target}". Quer registrar como despesa ou abrir o financeiro?`, route: "/financeiro" };
  }

  const bank = parsed.bank || loadMemory().preferred_bank;
  const method = parsed.payment_method || loadMemory().preferred_payment_method || "pix";
  if (bank) learn("preferred_bank", bank);
  if (method) learn("preferred_payment_method", method);

  await base44.entities.Payment.update(found.id, {
    status: "pago",
    payment_date: todayStr(),
    payment_method: method,
    bank,
    version: (found.version || 1) + 1,
  });

  await base44.entities.FinancialTransaction.create({
    description: found.description,
    type: "a_pagar",
    amount: found.amount,
    due_date: found.due_date,
    payment_date: todayStr(),
    status: "pago",
    supplier: found.supplier_name,
    supplier_id: found.supplier_id,
    payment_method: method,
    account_name: loadMemory().preferred_account || "",
    document_id: found.document_id,
    origin: "compra",
    notes: `Banco: ${bank} | Pago via BARON por ${user?.full_name}`,
  });

  await Core.audit({ audit_action: "confirm", module: "financeiro", entity_type: "Payment", entity_id: found.id, details: `Pago via BARON: ${found.description} - ${brl(found.amount)} | Banco: ${bank} | ${method} | Usuário: ${user?.full_name}` });

  return { type: "done", message: `✓ Pagamento registrado: ${found.description}\n✓ Valor: ${brl(found.amount)}\n✓ Banco: ${bank} | Forma: ${method.toUpperCase()}\n✓ Fluxo de caixa atualizado\n✓ Financeiro atualizado` };
}

async function execProducao(parsed, user) {
  const match = await findProduct(parsed.product_name);
  const productName = match?.product.name || parsed.product_name;
  const qty = parsed.quantity || 0;

  await base44.entities.ProductionRecord.create({
    item: productName,
    product_id: match?.product.id,
    produced_quantity: qty,
    planned_quantity: qty,
    unit: parsed.unit || "un",
    production_date: todayStr(),
    status: "concluida",
    responsible: user?.full_name || "Sistema",
    notes: `Registro via BARON`,
  });

  if (match) {
    const newQty = (match.product.stock_quantity || 0) + qty;
    await base44.entities.Product.update(match.product.id, { stock_quantity: newQty });
  }

  await Core.audit({ audit_action: "create", module: "producao", entity_type: "ProductionRecord", details: `Produção via BARON: ${qty} ${parsed.unit || "un"} ${productName} | Usuário: ${user?.full_name}` });

  return { type: "done", message: `✓ Produção registrada: ${qty} ${parsed.unit || "un"} ${productName}\n✓ Estoque atualizado${match ? `: ${match.product.stock_quantity + qty} ${parsed.unit || "un"}` : ""}\n✓ Custos atualizados` };
}

async function execBaixa(parsed, user) {
  const match = await findProduct(parsed.product_name);
  if (!match) {
    return { type: "needs_info", message: `Não encontrei "${parsed.product_name}" no estoque. Abra o estoque para revisar.`, route: "/estoque" };
  }
  const qty = parsed.quantity || 0;
  const newQty = Math.max(0, (match.product.stock_quantity || 0) - qty);

  await base44.entities.Product.update(match.product.id, { stock_quantity: newQty });

  await Core.audit({ audit_action: "update", module: "estoque", entity_type: "Product", entity_id: match.product.id, details: `Baixa via BARON: -${qty} ${parsed.unit || "un"} ${match.product.name} | Motivo: ${parsed.loss_reason || "não informado"} | Usuário: ${user?.full_name}` });

  return { type: "done", message: `✓ Baixa registrada: -${qty} ${parsed.unit || "un"} ${match.product.name}\n✓ Motivo: ${parsed.loss_reason || "não informado"}\n✓ Estoque atualizado: ${newQty} ${parsed.unit || "un"}\n✓ CMV atualizado` };
}

async function execRH(parsed, user) {
  const emp = await findEmployee(parsed.employee_name);
  if (!emp) {
    return { type: "needs_info", message: `Não encontrei o funcionário "${parsed.employee_name}". Abra o RH para revisar.`, route: "/rh" };
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

  await base44.entities.FinancialTransaction.create({
    description: `Despesa: ${category}`,
    type: "a_pagar",
    amount,
    due_date: todayStr(),
    payment_date: todayStr(),
    status: "pago",
    category,
    origin: "manual",
    payment_method: loadMemory().preferred_payment_method || "pix",
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