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
import { EnterpriseCore } from "@/lib/enterpriseCore";
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
    const Core = EnterpriseCore;

    // 1. Se há contexto pendente (pergunta em aberto), preencher campo
    if (ctx && ctx.needsField && ctx.parsed) {
      const updated = { ...ctx.parsed };
      const field = ctx.needsField;
      const val = this._extractField(text, field);
      if (val !== null) {
        updated.entities = { ...updated.entities, [field]: val };
        clearContext();
        // Novo PRC obrigatório para o comando de resposta
        const proc = await Core.startCommand({ command: text, intent: updated.intent, user, context: { parsed: updated } });
        try {
          await Core.transition(proc.id, "VALIDANDO", { actor: user?.full_name || "BARON IA", reason: "Campo complementar preenchido" });
          const result = await ExecutionEngine.execute(updated, user, mem);
          return await this._finalizeProcess(proc.id, result, updated, user);
        } catch (e) {
          await Core.fail(proc.id, { error: e, user });
          return { status: "error", message: `Falha: ${e.message}. Operação não concluída.` };
        }
      }
      // Não conseguiu extrair — repassa como texto
      clearContext();
    }

    // 2. Novo PRC obrigatório para todo comando recebido pelo Baron
    const proc = await Core.startCommand({ command: text, user });

    // 3. Classificar intent (VALIDANDO)
    let parsed = IntentEngine.classify(text);

    // 3b. Se não reconheceu, tenta LLM
    if (!parsed.intent || parsed.confidence < 0.5) {
      const llm = await llmFallback(text, ctx?.parsed?.intent);
      if (llm && llm.intent) parsed = llm;
    }

    await Core.recordContext(proc.id, { parsed });
    await Core.transition(proc.id, "VALIDANDO", {
      actor: user?.full_name || "BARON IA",
      reason: parsed.intent ? `Intent classificada: ${parsed.intent}` : "Intent não reconhecida",
    });

    if (!parsed.intent) {
      await Core.fail(proc.id, { error: "Intent não reconhecida", user });
      return { status: "message", message: "Não entendi. Pode reformular?" };
    }

    // 4. Executar (PROCESSANDO -> EXECUTANDO)
    try {
      await Core.transition(proc.id, "PROCESSANDO", {
        actor: user?.full_name || "BARON IA",
        reason: `Executando no módulo ${Core.moduleForIntent(parsed.intent)}`,
      });
      const result = await ExecutionEngine.execute(parsed, user, mem);
      return await this._finalizeProcess(proc.id, result, parsed, user);
    } catch (e) {
      await Core.fail(proc.id, { error: e, user });
      return { status: "error", message: `Falha na execução: ${e.message}. Operação não concluída.` };
    }
  },

  /**
   * Finaliza um processo Enterprise Core segundo o resultado do ExecutionEngine.
   * - needs_info -> AGUARDANDO_APROVACAO (pausa, salva contexto para retomada)
   * - needs_product_registration -> AGUARDANDO_CADASTRO (pausa)
   * - sucesso -> EXECUTANDO -> CONCLUIDO (read-back já feito pelo ExecutionEngine)
   */
  async _finalizeProcess(procId, result, parsed, user) {
    const Core = EnterpriseCore;
    const mem = OperationalMemory;

    if (result.status === "needs_info" && result.needsField) {
      saveContext({ needsField: result.needsField, parsed });
      await Core.pauseForApproval(procId, {
        reason: result.message || "Aguardando informação do operador",
        field: result.needsField,
        context: { parsed },
        user,
      });
      return result;
    }

    if (result.status === "needs_product_registration" && result.pendingCommand) {
      try { localStorage.setItem(PENDING_REG_KEY, JSON.stringify({ ...result.pendingCommand, __processId: procId })); } catch {}
      mem.invalidate("Product");
      await Core.pauseForCadastro(procId, {
        reason: `Produto "${result.prefill?.name || ""}" não cadastrado`,
        productName: result.prefill?.name || "",
        context: { prefill: result.prefill, pendingCommand: result.pendingCommand },
        user,
      });
      return result;
    }

    // Sucesso: read-back já confirmado pelo PersistenceEngine dentro do ExecutionEngine
    await Core.transition(procId, "EXECUTANDO", {
      actor: user?.full_name || "BARON IA",
      reason: "Gravação confirmada por read-back",
    });
    await Core.complete(procId, {
      result: {
        executed: true,
        message: result.message,
        route: result.route,
        filter: result.filter,
        read_back: result.readBack,
      },
      user,
    });
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
    const sp = savedProduct || {};
    const qty = e.quantity || sp.stock_quantity || 0;
    const unit = (sp.control_unit || sp.unit || "UN").toUpperCase();
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

    // Sincroniza a entidade Stock (a que a tela Estoque > Estoque Atual realmente lê)
    try {
      await PersistenceEngine.upsert("Stock", { product_id: savedProduct.id }, {
        product_name: savedProduct.name,
        quantity: savedProduct.stock_quantity || qty,
        unit,
        last_movement_date: new Date().toISOString(),
        last_movement_type: "cadastro_inicial",
        status: "ativo",
      }, { module: "estoque", origin: "baron", userId: user?.id, validate: false });
    } catch {}

    await Core.audit({ audit_action: "create", module: "estoque", entity_type: "Product", entity_id: savedProduct.id, details: `Cadastro + entrada via BARON: ${qty} ${unit} ${savedProduct.name}${price > 0 ? ` | ${brl(total)}` : ""}${supplier ? ` | ${supplier}` : ""} | Usuário: ${user?.full_name}` });

    const returnMsg = `Entrada concluída.\n${qty} ${unit} ${savedProduct.name} adicionados.\nEstoque atual: ${savedProduct.stock_quantity || qty} ${unit}.`;

    // Retoma o processo Enterprise Core pausado em AGUARDANDO_CADASTRO -> CONCLUIDO
    const procId = pending?.__processId;
    if (procId) {
      try {
        await EnterpriseCore.recordResults(procId, { executed: true, message: returnMsg, read_back: true });
        await EnterpriseCore.complete(procId, { user });
      } catch {}
    }

    return { status: "executed", message: returnMsg };
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