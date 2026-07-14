/**
 * DON BARON CORE — BaronCOO
 *
 * O BARON como Chief Operating Officer.
 * Não conversa. EXECUTA.
 *
 * Fluxo: input → IntentEngine.classify → verificar contexto →
 *   se faltam dados → perguntar (contextual memory)
 *   se completo → ExecutionEngine.execute → resposta curta e confirmada
 *
 * Regra de ouro: só diz "concluído" se ExecutionEngine confirmou via read-back.
 */
import { IntentEngine } from "./IntentEngine";
import { ExecutionEngine } from "./ExecutionEngine";
import { OperationalMemory } from "./OperationalMemory";
import { PersistenceEngine } from "./PersistenceEngine";
import { Core } from "@/lib/coreEngine";
import { todayStr, brl } from "@/lib/financialCenter";
import { base44 } from "@/api/base44Client";

const CTX_KEY = "baron_coo_context";
const PENDING_REG_KEY = "baron_pending_registration";

function saveContext(ctx) {
  try { localStorage.setItem(CTX_KEY, JSON.stringify(ctx)); } catch {}
}
function loadContext() {
  try { return JSON.parse(localStorage.getItem(CTX_KEY) || "null"); } catch { return null; }
}
function clearContext() { try { localStorage.removeItem(CTX_KEY); } catch {} }

// Se a LLM deve ser usada para intents complexas (comando natural muito livre)
async function llmFallback(text, previousIntent) {
  const schema = {
    type: "object",
    properties: {
      intent: { type: "string" },
      entities: { type: "object" },
      message: { type: "string" },
    },
  };
  const prompt = `Você é o BARON, COO do DON BARON OS. Analise o comando e extraia intent + entidades.
Contexto anterior: ${previousIntent || "nenhum"}.
Comando: "${text}"
Retorne JSON com: intent (stock_entry|stock_exit|payment|expense|production|employee_update|navigate|stock_query|boleto_query|cmv_query|cashflow_query|message), entities (product_name, quantity, unit, price, price_type, supplier, payment_target, bank, payment_method, amount, category, employee_name, rh_action, route, filter), message (resposta curta).`;
  try {
    const res = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
    return { intent: res.intent, category: "llm", confidence: 0.7, entities: res.entities || {} };
  } catch {
    return null;
  }
}

// ============================================================
// API
// ============================================================
export const BaronCOO = {
  /**
   * Processa um comando natural. Retorna resposta COO-style.
   * { status, message, route?, filter?, needsField?, follow_up? }
   */
  async process(text, user) {
    const mem = OperationalMemory;
    const ctx = loadContext();

    // 1. Se há contexto pendente (pergunta em aberto), preencher campo
    if (ctx && ctx.needsField && ctx.parsed) {
      const updated = { ...ctx.parsed };
      const field = ctx.needsField;
      const val = this._extractField(text, field);
      if (val !== null) {
        updated.entities = { ...updated.entities, [field]: val };
        clearContext();
        return ExecutionEngine.execute(updated, user, mem);
      }
      // Não conseguiu extrair — repassa como texto
      clearContext();
    }

    // 2. Classificar intent
    let parsed = IntentEngine.classify(text);

    // 2b. Se não reconheceu, tenta LLM
    if (!parsed.intent || parsed.confidence < 0.5) {
      const llm = await llmFallback(text, ctx?.parsed?.intent);
      if (llm && llm.intent) parsed = llm;
    }

    if (!parsed.intent) {
      return { status: "message", message: "Não entendi. Pode reformular?" };
    }

    // 3. Executar
    const result = await ExecutionEngine.execute(parsed, user, mem);

    // 4. Se precisa de mais informação, salvar contexto
    if (result.status === "needs_info" && result.needsField) {
      saveContext({ needsField: result.needsField, parsed });
    }

    // 5. Se precisa cadastrar produto, salvar comando pendente
    if (result.status === "needs_product_registration" && result.pendingCommand) {
      try { localStorage.setItem(PENDING_REG_KEY, JSON.stringify(result.pendingCommand)); } catch {}
      mem.invalidate("Product"); // invalida cache para que a busca encontre o novo produto
    }

    return result;
  },

  /**
   * Continua o fluxo após o operador salvar um produto novo.
   * Cria a transação financeira (se houver preço) + auditoria.
   * O produto já foi salvo com stock_quantity = quantidade inicial.
   */
  async continueAfterProductRegistration(savedProduct, user) {
    const mem = OperationalMemory;
    mem.invalidate("Product");

    let pending = null;
    try { pending = JSON.parse(localStorage.getItem(PENDING_REG_KEY) || "null"); } catch {}
    try { localStorage.removeItem(PENDING_REG_KEY); } catch {}

    const e = pending?.entities || {};
    const qty = e.quantity || savedProduct.stock_quantity || 0;
    const unit = (savedProduct.control_unit || savedProduct.unit || "UN").toUpperCase();
    const price = e.price || 0;
    const total = e.price_type === "total" ? price : (price * qty);
    const supplier = e.supplier || savedProduct.primary_supplier_name || "";

    // Se houver preço, criar a transação financeira da compra
    if (price > 0) {
      try {
        await PersistenceEngine.create("FinancialTransaction", {
          description: `Compra: ${qty} ${unit} ${savedProduct.name}${supplier ? ` - ${supplier}` : ""}`,
          type: "a_pagar", amount: total,
          due_date: todayStr(), payment_date: todayStr(), status: "pago",
          supplier, origin: "compra", payment_method: e.payment_method || "pix",
          notes: `Registro via BARON por ${user?.full_name || "Sistema"}`,
        }, { module: "estoque", origin: "baron", userId: user?.id });
      } catch {}
    }

    await Core.audit({ audit_action: "create", module: "estoque", entity_type: "Product", entity_id: savedProduct.id, details: `Cadastro + entrada via BARON: ${qty} ${unit} ${savedProduct.name}${price > 0 ? ` | ${brl(total)}` : ""}${supplier ? ` | ${supplier}` : ""} | Usuário: ${user?.full_name}` });

    return {
      status: "executed",
      message: `Entrada concluída.\n${qty} ${unit} ${savedProduct.name} adicionados.\nEstoque atual: ${savedProduct.stock_quantity || qty} ${unit}.`,
    };
  },

  /**
   * Extrai um campo específico de texto curto (resposta a pergunta).
   */
  _extractField(text, field) {
    const t = text.trim();
    if (field === "quantity") {
      const m = t.match(/(\d+(?:[.,]\d+)?)/);
      return m ? parseFloat(m[1].replace(",", ".")) : null;
    }
    if (field === "price" || field === "amount") {
      const m = t.match(/(\d+(?:[.,]\d+)?)/);
      return m ? parseFloat(m[1].replace(",", ".")) : null;
    }
    if (field === "supplier" || field === "payment_target" || field === "product_name" || field === "employee_name") {
      return t.length >= 2 ? t : null;
    }
    return t || null;
  },

  /**
   * Proactive insights — IA proativa. Não espera perguntas.
   */
  async getProactiveInsights() {
    const mem = OperationalMemory;
    const insights = [];
    const today = new Date().toISOString().slice(0, 10);

    // 1. Preço aumentou
    const products = await mem.getProducts();
    for (const p of products) {
      const hist = p.purchase_history || [];
      if (hist.length >= 2) {
        const sorted = [...hist].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        const latest = sorted[0];
        const prev = sorted[1];
        if (latest.price > prev.price && prev.price > 0) {
          const pct = ((latest.price - prev.price) / prev.price * 100).toFixed(0);
          if (pct >= 5) insights.push({ severity: "warning", text: `Preço de ${p.name} aumentou ${pct}% (${this.brl(prev.price)} → ${this.brl(latest.price)}).` });
        }
      }
    }

    // 2. Estoque acaba em N dias
    for (const p of products) {
      if (!p.controls_stock || !p.avg_consumption || !p.stock_quantity) continue;
      const days = Math.floor((p.stock_quantity || 0) / (p.avg_consumption || 1));
      if (days > 0 && days <= 2) {
        insights.push({ severity: "critical", text: `${p.name} acabará em ${days} dia(s). Estoque: ${p.stock_quantity}.` });
      }
    }

    // 3. Boletos vencendo hoje
    const payments = await mem.getCompanySnapshot().then((s) => s).catch(() => null);

    return insights.slice(0, 5);
  },

  brl(n) { return (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); },

  clearContext,
  hasContext() { return !!loadContext(); },
};

export default BaronCOO;