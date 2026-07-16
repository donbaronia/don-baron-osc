/**
 * DON BARON CORE — OperationalMemory
 *
 * BARON conhece TUDO da empresa. Cache central de conhecimento operacional.
 * Produtos, fornecedores, receitas, funcionários, motoboys, categorias,
 * unidades, centros de custo, contas, impostos.
 *
 * Nunca perguntar informações que já existem. TTL de 60s para não viciar.
 */
import { base44 } from "@/api/base44Client";

const TTL = 60_000; // 60 segundos
const cache = new Map(); // entity -> { data, ts }

async function load(entityName, filter = {}, sort = "-created_date", limit = 500) {
  const key = `${entityName}:${JSON.stringify(filter)}`;
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < TTL) return entry.data;

  let data = [];
  try {
    data = await base44.entities[entityName].filter(filter, sort, limit);
  } catch {
    data = [];
  }
  cache.set(key, { data, ts: Date.now() });
  return data;
}

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// ============================================================
// API
// ============================================================
export const OperationalMemory = {
  // --- Produtos ---
  // Mesmo cuidado do getEmployees: busca tudo e filtra em memoria, sem exigir
  // "ativo" exato no servidor (produtos tem varios caminhos de cadastro).
  async getProducts() {
    const all = await load("Product", {});
    return all.filter((p) => p.active !== false && p.status !== "inativo" && p.status !== "arquivado" && !p.deleted_at);
  },

  async findProduct(name) {
    if (!name) return null;
    const products = await this.getProducts();
    const target = norm(name);
    // Match exato (nome, short_name, alias)
    for (const p of products) {
      if (norm(p.name) === target || (p.short_name && norm(p.short_name) === target)) return { product: p, confidence: 1 };
      for (const alias of p.aliases || []) if (norm(alias) === target) return { product: p, confidence: 1 };
    }
    // Match parcial
    for (const p of products) {
      if (norm(p.name).includes(target) || target.includes(norm(p.name))) return { product: p, confidence: 0.9 };
      if (p.short_name && (norm(p.short_name).includes(target) || target.includes(norm(p.short_name)))) return { product: p, confidence: 0.85 };
    }
    return null;
  },

  async getLowStock() {
    const products = await this.getProducts();
    return products.filter((p) => p.controls_stock !== false && (p.min_quantity || 0) > 0 && (p.stock_quantity || 0) <= (p.min_quantity || 0));
  },

  async getProductById(id) {
    const products = await this.getProducts();
    return products.find((p) => p.id === id) || null;
  },

  // --- Fornecedores ---
  async getSuppliers() {
    const all = await load("Supplier", {});
    return all.filter((s) => s.active !== false && s.status !== "inativo" && s.status !== "bloqueado" && !s.deleted_at);
  },

  async findSupplier(name) {
    if (!name) return null;
    const suppliers = await this.getSuppliers();
    const target = norm(name);
    return suppliers.find((s) => norm(s.name).includes(target) || target.includes(norm(s.name)) || (s.trade_name && norm(s.trade_name).includes(target))) || null;
  },

  // --- Funcionários ---
  // Busca TODOS e filtra em memória — evitar filtro rígido no servidor por
  // status, já que cadastros de origens diferentes (RH manual, Baron,
  // promoção de candidato) podem gravar o campo status de formas distintas.
  async getEmployees() {
    const all = await load("Employee", {});
    return all.filter((e) => e.status !== "demitido" && e.status !== "inativo" && !e.deleted_at);
  },

  async findEmployee(name) {
    if (!name) return null;
    const employees = await this.getEmployees();
    const target = norm(name);
    return employees.find((e) => {
      const fn = norm(e.full_name);
      const sn = norm(e.short_name || "");
      return fn.includes(target) || target.includes(fn) || sn.includes(target) || target.includes(sn);
    }) || null;
  },

  // --- Motoboys ---
  async getCouriers() { return load("Courier", { status: { $in: ["ativo", "em_entrega"] } }); },

  async findCourier(name) {
    if (!name) return null;
    const couriers = await this.getCouriers();
    const target = norm(name);
    return couriers.find((c) => norm(c.name || "").includes(target) || target.includes(norm(c.name || ""))) || null;
  },

  // --- Categorias / Unidades / Centros de Custo / Contas ---
  async getCategories() { return load("Category", { status: "ativo" }); },
  async getUnits() { return load("UnitOfMeasure", { status: "ativo" }); },
  async getCostCenters() { return load("CostCenter", { active: true }); },
  async getFinancialAccounts() { return load("FinancialAccount", { active: true }); },

  // --- Receitas ---
  async getRecipes() { return load("Recipe", { active: true }); },

  async findRecipe(name) {
    if (!name) return null;
    const recipes = await this.getRecipes();
    const target = norm(name);
    return recipes.find((r) => norm(r.name).includes(target) || target.includes(norm(r.name))) || null;
  },

  // --- Clientes ---
  async getCustomers() { return load("Customer", { active: true }); },

  async findCustomer(name) {
    if (!name) return null;
    const customers = await this.getCustomers();
    const target = norm(name);
    return customers.find((c) => norm(c.name || "").includes(target) || target.includes(norm(c.name || ""))) || null;
  },

  // --- Resumo rápido da empresa (para o modo executivo) ---
  async getCompanySnapshot() {
    const today = new Date().toISOString().slice(0, 10);
    const [payments, products, production, couriers, docs] = await Promise.all([
      load("Payment", { status: "pendente" }, "-due_date", 200),
      this.getProducts(),
      load("ProductionRecord", { status: { $in: ["planejada", "em_producao"] } }, "-created_date", 50),
      this.getCouriers(),
      load("DBDocument", { status: { $in: ["recebido", "em_analise", "aguardando_confirmacao"] } }, "-created_date", 50),
    ]);

    const vencidos = payments.filter((p) => p.due_date && p.due_date < today);
    const vencemHoje = payments.filter((p) => p.due_date === today);
    const lowStock = products.filter((p) => p.controls_stock !== false && (p.min_quantity || 0) > 0 && (p.stock_quantity || 0) <= (p.min_quantity || 0));
    const noCheckin = couriers.filter((c) => !c.last_checkin_at || !c.last_checkin_at.startsWith(today));

    return {
      estoque: { ok: lowStock.length === 0, alert: lowStock.length > 0 ? `${lowStock.length} item(ns) abaixo do mínimo` : null },
      financeiro: { ok: vencidos.length === 0 && vencemHoje.length === 0, alert: (vencidos.length + vencemHoje.length) > 0 ? `${vencidos.length + vencemHoje.length} boleto(s)` : null },
      producao: { ok: production.length === 0, alert: production.length > 0 ? `${production.length} produção(ões)` : null },
      motoboys: { ok: noCheckin.length === 0 || couriers.length === 0, alert: noCheckin.length > 0 ? `${noCheckin.length} sem check-in` : null },
      documentos: { ok: docs.length === 0, alert: docs.length > 0 ? `${docs.length} aguardando` : null },
    };
  },

  // Invalida cache (após escrita)
  invalidate(entityName) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${entityName}:`)) cache.delete(key);
    }
  },

  invalidateAll() { cache.clear(); },
};

export default OperationalMemory;