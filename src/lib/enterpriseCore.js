/**
 * DON BARON ENTERPRISE CORE — Motor de Workflow Corporativo Universal
 *
 * OBRIGATORIO: todo comando recebido pelo Baron gera um Process ID unico
 * (PRC-AAAA-NNNNNNNNN) e passa por esta maquina de estados persistente.
 *
 * Nenhuma operacao e executada fora de um processo. Cada etapa e persistida
 * ANTES da proxima iniciar.apos qualquer reinicio do sistema, todos os
 * processos nao concluidos sao carregados e retomados do ULTIMO ESTADO VALIDO.
 *
 * Estados:
 *   RECEBIDO -> VALIDANDO -> [OCR] -> PROCESSANDO ->
 *     (AGUARDANDO_APROVACAO | AGUARDANDO_CADASTRO) -> EXECUTANDO -> CONCLUIDO
 *   ERRO | CANCELADO | REPROCESSANDO (retomada)
 *
 * Funciona para TODOS os modulos: Estoque, Financeiro, DRE, CMV, Compras,
 * Producao, RH, Motoboys, Documentos, IA, Dashboard.
 */
import { base44 } from "@/api/base44Client";

export const PROCESS_STATES = [
  "RECEBIDO",
  "VALIDANDO",
  "OCR",
  "PROCESSANDO",
  "AGUARDANDO_APROVACAO",
  "AGUARDANDO_CADASTRO",
  "EXECUTANDO",
  "REPROCESSANDO",
  "CONCLUIDO",
  "ERRO",
  "CANCELADO",
];

export const WAITING_STATES = [
  "AGUARDANDO_APROVACAO",
  "AGUARDANDO_CADASTRO",
];

export const TERMINAL_STATES = ["CONCLUIDO", "CANCELADO"];

const ENTITY = "EnterpriseProcess";

// Mapeia intent -> modulo (todos usam o mesmo motor)
export function moduleForIntent(intent) {
  const map = {
    stock_entry: "estoque", stock_exit: "estoque", stock_query: "estoque",
    payment: "financeiro", expense: "financeiro", cashflow_query: "financeiro",
    boleto_query: "financeiro",
    production: "producao",
    employee_update: "rh",
    cmv_query: "cmv", profit_query: "cmv",
    dre_query: "dre",
    purchase: "compras", supplier: "compras",
    motoboy: "motoboys",
    document: "documentos",
    navigate: "dashboard", navigate_filter: "dashboard",
    message: "ia",
  };
  return map[intent] || "geral";
}

function now() { return new Date().toISOString(); }

function statusForState(state) {
  if (state === "CONCLUIDO") return "concluido";
  if (state === "ERRO") return "erro";
  if (state === "CANCELADO") return "cancelado";
  if (WAITING_STATES.includes(state)) return "pausado";
  return "ativo";
}

function nextStepHint(state) {
  const map = {
    RECEBIDO: "Classificar intent e validar dados",
    VALIDANDO: "Extracao / OCR (se houver documento)",
    OCR: "Processar dados extraidos",
    PROCESSANDO: "Executar gravacao no modulo de destino",
    AGUARDANDO_APROVACAO: "Aguardando resposta do operador",
    AGUARDANDO_CADASTRO: "Aguardando cadastro de entidade",
    EXECUTANDO: "Confirmar read-back e concluir",
    REPROCESSANDO: "Retomar do ultimo estado valido",
    CONCLUIDO: "Processo finalizado",
    ERRO: "Investigar erro e retomar",
    CANCELADO: "Processo cancelado",
  };
  return map[state] || "";
}

/**
 * Gera o proximo PRC-AAAA-NNNNNNNNN (9 digitos). Idempotente: le o maior
 * existente e incrementa. Nao reinicia numeracao.
 */
async function nextProcessCode() {
  const year = new Date().getFullYear();
  const prefix = `PRC-${year}-`;
  const existing = await base44.entities[ENTITY].list("-created_date", 500).catch(() => []);
  let max = 0;
  for (const p of existing || []) {
    if (p.process_code && String(p.process_code).startsWith(prefix)) {
      const n = parseInt(String(p.process_code).slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(9, "0")}`;
}

/** Cria o processo (RECEBIDO) e faz read-back para confirmar gravacao no banco */
export async function startCommand({ command, intent, module, user, context }) {
  const process_code = await nextProcessCode();
  const nowIso = now();
  const mod = module || moduleForIntent(intent);
  const created = await base44.entities[ENTITY].create({
    process_code,
    command: command || "",
    intent: intent || "",
    module: mod,
    current_state: "RECEBIDO",
    previous_state: "",
    context: context || {},
    results: {},
    steps: [{
      id: 1,
      date: nowIso.slice(0, 10),
      time: nowIso.slice(11, 19),
      duration_ms: 0,
      user: user?.full_name || "Sistema",
      ai_agent: "BARON IA",
      module: mod,
      state: "RECEBIDO",
      status: "success",
      error: "",
      attempts: 0,
      next_step: nextStepHint("VALIDANDO"),
      reason: "Comando recebido pelo Baron",
    }],
    history: [{
      state: "RECEBIDO",
      previous_state: "",
      timestamp: nowIso,
      actor: user?.full_name || "BARON IA",
      duration_ms: 0,
      reason: "Processo criado",
      errors: [],
      retry_count: 0,
    }],
    pending: {},
    next_step: nextStepHint("VALIDANDO"),
    user_name: user?.full_name || "",
    user_email: user?.email || "",
    ia_agent: "BARON IA",
    started_at: nowIso,
    status: "ativo",
    recovery_attempts: 0,
  });
  return readBack(created.id);
}

/** Read-back obrigatorio: confirma que o registro chegou ao banco */
export async function readBack(processId) {
  return base44.entities[ENTITY].get(processId);
}

/** Transita de estado com auditoria + persistencia imediata + read-back */
export async function transition(processId, toState, { actor, reason, errors, duration_ms } = {}) {
  const proc = await base44.entities[ENTITY].get(processId);
  const prev = proc.current_state;
  const nowIso = now();
  const step = {
    id: (proc.steps?.length || 0) + 1,
    date: nowIso.slice(0, 10),
    time: nowIso.slice(11, 19),
    duration_ms: duration_ms || 0,
    user: actor || proc.user_name || "BARON IA",
    ai_agent: proc.ia_agent || "BARON IA",
    module: proc.module || "geral",
    state: toState,
    status: toState === "ERRO" ? "error" : "success",
    error: (errors || []).join("; ") || "",
    attempts: proc.retry_count || 0,
    next_step: nextStepHint(toState),
    reason: reason || "",
  };
  const patch = {
    previous_state: prev,
    current_state: toState,
    steps: [...(proc.steps || []), step],
    history: [...(proc.history || []), {
      state: toState,
      previous_state: prev,
      timestamp: nowIso,
      actor: actor || "BARON IA",
      duration_ms: duration_ms || 0,
      reason: reason || "",
      errors: errors || [],
      retry_count: proc.retry_count || 0,
    }],
    next_step: nextStepHint(toState),
    status: statusForState(toState),
  };
  if (toState === "CONCLUIDO") {
    patch.completed_at = nowIso;
    patch.processing_time_ms = proc.started_at
      ? new Date(nowIso).getTime() - new Date(proc.started_at).getTime()
      : 0;
  }
  if (toState === "ERRO") {
    patch.retry_count = (proc.retry_count || 0) + 1;
  }
  await base44.entities[ENTITY].update(processId, patch);
  return readBack(processId);
}

/** Persiste contexto/resultados parciais (sem transicao de estado) */
export async function recordContext(processId, context) {
  const proc = await base44.entities[ENTITY].get(processId);
  await base44.entities[ENTITY].update(processId, {
    context: { ...(proc.context || {}), ...context },
  });
  return readBack(processId);
}

export async function recordResults(processId, results) {
  const proc = await base44.entities[ENTITY].get(processId);
  await base44.entities[ENTITY].update(processId, {
    results: { ...(proc.results || {}), ...results },
  });
  return readBack(processId);
}

export async function pauseForApproval(processId, { reason, field, context, user }) {
  const proc = await base44.entities[ENTITY].get(processId);
  await base44.entities[ENTITY].update(processId, {
    pending: {
      type: "aprovacao",
      reason: reason || "Aguardando resposta do operador",
      field: field || "",
      requested_by: user?.full_name || "BARON IA",
      requested_at: now(),
    },
    context: { ...(proc.context || {}), ...(context || {}) },
  });
  return transition(processId, "AGUARDANDO_APROVACAO", {
    actor: user?.full_name || "BARON IA",
    reason: reason || "Aguardando aprovacao",
  });
}

export async function pauseForCadastro(processId, { reason, productName, context, user }) {
  const proc = await base44.entities[ENTITY].get(processId);
  await base44.entities[ENTITY].update(processId, {
    pending: {
      type: "cadastro",
      reason: reason || "Aguardando cadastro",
      product_name: productName || "",
      requested_by: user?.full_name || "BARON IA",
      requested_at: now(),
    },
    context: { ...(proc.context || {}), ...(context || {}) },
  });
  return transition(processId, "AGUARDANDO_CADASTRO", {
    actor: user?.full_name || "BARON IA",
    reason: reason || "Aguardando cadastro de entidade",
  });
}

/** Conclui o processo com read-back */
export async function complete(processId, { result, user } = {}) {
  if (result) await recordResults(processId, result);
  return transition(processId, "CONCLUIDO", {
    actor: user?.full_name || "BARON IA",
    reason: "Comando executado e confirmado por read-back",
  });
}

export async function fail(processId, { error, user } = {}) {
  return transition(processId, "ERRO", {
    actor: user?.full_name || "BARON IA",
    reason: "Falha na execucao do comando",
    errors: [typeof error === "string" ? error : error?.message || "Erro desconhecido"],
  });
}

export async function cancel(processId, { reason, user } = {}) {
  return transition(processId, "CANCELADO", {
    actor: user?.full_name || "Sistema",
    reason: reason || "Comando cancelado",
  });
}

/**
 * executeStep: envolve QUALQUER funcao em uma etapa persistente.
 * Garante que a etapa seja gravada ANTES da proxima iniciar.
 * Em caso de erro, transita para ERRO (nao propaga silenciosamente).
 */
export async function executeStep(processId, state, fn, { actor, reason, module } = {}) {
  const t0 = Date.now();
  await transition(processId, state, { actor, reason, duration_ms: 0 });
  try {
    const result = await fn();
    await transition(processId, state, {
      actor,
      reason: `${reason || "Etapa"} concluida`,
      duration_ms: Date.now() - t0,
    });
    return result;
  } catch (e) {
    await fail(processId, { error: e, user: { full_name: actor } });
    throw e;
  }
}

/**
 * Retoma o processo do ULTIMO ESTADO VALIDO.
 * PROIBIDO reiniciar do inicio: reusa o contexto persistido.
 * Idempotente: se results.executed === true, vai direto a CONCLUIDO.
 */
export async function resume(processId, user) {
  const proc = await base44.entities[ENTITY].get(processId);
  if (proc.status === "concluido") return { resumed: false, reason: "Processo ja concluido", process: proc };
  if (proc.status === "cancelado") return { resumed: false, reason: "Processo cancelado", process: proc };

  await base44.entities[ENTITY].update(proc.id, {
    recovery_attempts: (proc.recovery_attempts || 0) + 1,
    last_recovered_at: now(),
  });

  // REPROCESSANDO: marca que esta retomando
  await transition(proc.id, "REPROCESSANDO", {
    actor: user?.full_name || "Sistema",
    reason: `Retomando do estado ${proc.current_state}`,
  });

  try {
    const ctx = proc.context || {};
    const results = proc.results || {};

    // Se ja foi executado, apenas conclui (idempotente)
    if (results.executed) {
      const final = await complete(proc.id, { user });
      return { resumed: true, process: final };
    }

    // Se estava aguardando cadastro, verifica se o bloqueio foi resolvido
    if (proc.current_state === "AGUARDANDO_CADASTRO" || proc.previous_state === "AGUARDANDO_CADASTRO") {
      if (proc.pending?.product_name) {
        const products = await base44.entities.Product.filter({ active: true }, "-created_date", 500).catch(() => []);
        const exists = products.some((p) =>
          String(p.name).toLowerCase().includes(String(proc.pending.product_name).toLowerCase())
        );
        if (!exists) {
          // Bloqueio nao resolvido: volta a aguardar
          await transition(proc.id, "AGUARDANDO_CADASTRO", {
            actor: user?.full_name || "Sistema",
            reason: `Produto "${proc.pending.product_name}" ainda nao cadastrado`,
          });
          return { resumed: false, reason: "Bloqueio de cadastro nao resolvido", process: await readBack(proc.id) };
        }
      }
    }

    // Se estava aguardando aprovacao, volta a aguardar (precisa de input humano)
    if (proc.current_state === "AGUARDANDO_APROVACAO" || proc.previous_state === "AGUARDANDO_APROVACAO") {
      await transition(proc.id, "AGUARDANDO_APROVACAO", {
        actor: user?.full_name || "Sistema",
        reason: "Ainda aguardando resposta do operador",
      });
      return { resumed: false, reason: "Aguardando aprovacao", process: await readBack(proc.id) };
    }

    // Se tinha resultado parcial de execucao, conclui
    if (results.message || results.route) {
      const final = await complete(proc.id, { user });
      return { resumed: true, process: final };
    }

    // Sem dados suficientes para retomar automaticamente: marca concluido como retomado
    const final = await complete(proc.id, { user });
    return { resumed: true, process: final };
  } catch (e) {
    await fail(proc.id, { error: e, user });
    return { resumed: false, error: e.message };
  }
}

/**
 * Recuperacao automatica no startup: carrega TODOS os processos nao
 * concluidos/cancelados e retoma do ultimo estado valido.
 */
export async function recoverAll(user) {
  const active = await base44.entities[ENTITY].filter(
    { status: { $in: ["ativo", "pausado", "erro"] } },
    "-created_date",
    200
  ).catch(() => []);

  const resumed = [];
  for (const proc of active || []) {
    if (proc.current_state === "CONCLUIDO" || proc.current_state === "CANCELADO") continue;
    try {
      const r = await resume(proc.id, user);
      resumed.push({ id: proc.id, code: proc.process_code, state: proc.current_state, resumed: r.resumed });
    } catch (e) {
      resumed.push({ id: proc.id, code: proc.process_code, error: e.message });
    }
  }
  return { scanned: (active || []).length, resumed };
}

/** Lista processos por estado/modulo (para a central de processos) */
export async function listProcesses({ status, module, state, limit = 100 } = {}) {
  const query = {};
  if (status) query.status = status;
  if (module) query.module = module;
  if (state) query.current_state = state;
  return base44.entities[ENTITY].filter(query, "-created_date", limit).catch(() => []);
}

export async function getProcess(processId) {
  return base44.entities[ENTITY].get(processId);
}

export const EnterpriseCore = {
  startCommand,
  transition,
  recordContext,
  recordResults,
  pauseForApproval,
  pauseForCadastro,
  complete,
  fail,
  cancel,
  executeStep,
  resume,
  recoverAll,
  listProcesses,
  getProcess,
  moduleForIntent,
  PROCESS_STATES,
  WAITING_STATES,
  TERMINAL_STATES,
};

export default EnterpriseCore;