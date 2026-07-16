/**
 * DON BARON CORE — Recovery Engine
 *
 * Garantia fundamental: NENHUMA OPERAÇÃO DESAPARECE DO SISTEMA.
 *
 * Toda gravação executa o pipeline de 4 etapas, rastreável e persistente:
 *   1. WRITE      — grava no banco
 *   2. READ BACK  — lê de volta o registro gravado (prova de persistência)
 *   3. VALIDAÇÃO  — compara payload gravado vs read-back (consistência)
 *   4. COMMIT     — auditoria + sync + marca como committed
 *
 * A INTENÇÃO é persistida ANTES de qualquer gravação. Se o app cair
 * no meio, a operação permanece na fila e é retomada.
 *
 * Falha em qualquer etapa:
 *   - Registra erro, payload, entidade, usuário, horário, etapa exata
 *   - Envia para fila de RETRY
 *   - Nova tentativa automática
 *   - Excedido o limite → DEAD LETTER QUEUE (visível ao administrador)
 *
 * Nunca perde dados. Nunca cancela processo parcialmente concluído.
 */
import { base44 } from "@/api/base44Client";
import { ValidationEngine } from "@/core/ValidationEngine";
import { Logger } from "@/core/Logger";
import { SyncManager } from "@/core/SyncManager";
import { EventBus } from "@/lib/eventBus";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 15000;

let seq = Math.floor(Math.random() * 9999);
function genCode() {
  const year = new Date().getFullYear();
  seq = (seq + 1) % 999999999;
  return `REC-${year}-${String(seq).padStart(9, "0")}`;
}

const nowISO = () => new Date().toISOString();

export const RecoveryEngine = {
  // ============================================================
  // ENQUEUE — persiste a INTENÇÃO antes de qualquer gravação
  // ============================================================
  async enqueue({ entityName, operation, payload, entityId, user, module, origin }) {
    const op = await base44.entities.RecoveryOperation.create({
      operation_code: genCode(),
      entity_name: entityName,
      operation,
      entity_id: entityId || "",
      payload: payload || {},
      current_step: "write",
      current_state: "pending",
      failed_step: "",
      error_message: "",
      error_stack: "",
      attempt_history: [],
      retry_count: 0,
      max_retries: MAX_RETRIES,
      queue: "active",
      module: module || "core",
      origin: origin || "frontend",
      user_name: user?.full_name || "Sistema",
      user_email: user?.email || "",
      user_id: user?.id || "",
      started_at: nowISO(),
      last_attempt_at: nowISO(),
      version: 1,
    });
    return op;
  },

  // ============================================================
  // EXECUTE — roda Write → ReadBack → Validação → Commit
  // ============================================================
  async execute(opId, user) {
    const op = await base44.entities.RecoveryOperation.get(opId);
    if (!op) throw new Error("RecoveryOperation não encontrada: " + opId);

    const attemptNo = (op.retry_count || 0) + 1;
    const history = (op.attempt_history || []).slice();
    const addAttempt = (step, status, error, duration) => {
      history.push({ attempt: attemptNo, step, status, error: error || "", timestamp: nowISO(), duration_ms: duration || 0 });
    };

    const mark = (update) => base44.entities.RecoveryOperation.update(opId, update);
    await mark({ last_attempt_at: nowISO(), attempt_history: history });

    // --- STEP 1: WRITE ---
    const t0 = Date.now();
    let written;
    try {
      await mark({ current_step: "write", current_state: "pending" });
      if (op.operation === "create") {
        written = await base44.entities[op.entity_name].create(op.payload);
        if (!written?.id) throw new Error("Write não retornou ID para " + op.entity_name);
        await mark({ entity_id: written.id });
      } else if (op.operation === "update") {
        written = await base44.entities[op.entity_name].update(op.entity_id, op.payload);
        if (!written?.id) throw new Error("Update não confirmado para " + op.entity_name + ":" + op.entity_id);
      } else if (op.operation === "delete") {
        await base44.entities[op.entity_name].delete(op.entity_id);
      }
      addAttempt("write", "success", "", Date.now() - t0);
      await mark({ current_state: "write_completed", attempt_history: history });
    } catch (e) {
      addAttempt("write", "error", e.message, Date.now() - t0);
      await mark({ attempt_history: history });
      return this._handleFailure(opId, op, "write", e, attemptNo);
    }

    // --- STEP 2: READ BACK ---
    // Pequena tolerância a atraso de consistência do banco: tenta ler de volta
    // até 3 vezes com espera curta antes de considerar falha de verdade.
    const t1 = Date.now();
    let readBack;
    try {
      await mark({ current_step: "readback" });
      for (let attempt = 1; attempt <= 3; attempt++) {
        readBack = await base44.entities[op.entity_name].get(op.entity_id).catch(() => null);
        if (readBack && readBack.id === op.entity_id) break;
        if (attempt < 3) await new Promise((r) => setTimeout(r, 400 * attempt));
      }
      if (!readBack || readBack.id !== op.entity_id) {
        throw new Error("Read-back falhou: " + op.entity_name + ":" + op.entity_id + " não encontrado após gravação");
      }
      addAttempt("readback", "success", "", Date.now() - t1);
      await mark({ current_state: "readback_completed", readback: readBack, attempt_history: history });
    } catch (e) {
      addAttempt("readback", "error", e.message, Date.now() - t1);
      await mark({ attempt_history: history });
      return this._handleFailure(opId, op, "readback", e, attemptNo);
    }

    // --- STEP 3: VALIDAÇÃO (consistência write vs readback) ---
    const t2 = Date.now();
    try {
      await mark({ current_step: "validate" });
      const mismatches = this._validateConsistency(op.payload, readBack, op.operation);
      if (mismatches.length > 0) {
        const detail = mismatches.map((m) => `${m.field} (esperado=${JSON.stringify(m.expected)}, lido=${JSON.stringify(m.actual)})`).join("; ");
        throw new Error("Validação de consistência falhou: " + detail);
      }
      addAttempt("validate", "success", "", Date.now() - t2);
      await mark({ current_state: "validated", attempt_history: history });
    } catch (e) {
      addAttempt("validate", "error", e.message, Date.now() - t2);
      await mark({ attempt_history: history });
      return this._handleFailure(opId, op, "validate", e, attemptNo);
    }

    // --- STEP 4: COMMIT (audit + sync + marcar committed) ---
    const t3 = Date.now();
    try {
      await mark({ current_step: "commit" });
      Logger.audit({
        entity_name: op.entity_name,
        operation: op.operation,
        status: "success",
        payload: op.payload,
        bank_response: { id: op.entity_id },
        duration_ms: Date.now() - t0,
        module: op.module,
        origin: op.origin,
        readback_verified: true,
      });
      SyncManager.sync(op.entity_name, op.operation === "create" ? "created" : op.operation === "update" ? "updated" : "deleted");
      addAttempt("commit", "success", "", Date.now() - t3);
      await mark({
        current_state: "committed",
        queue: "committed",
        completed_at: nowISO(),
        result: { id: op.entity_id, committed: true, verified: true },
        attempt_history: history,
      });
      return readBack;
    } catch (e) {
      addAttempt("commit", "error", e.message, Date.now() - t3);
      await mark({ attempt_history: history });
      return this._handleFailure(opId, op, "commit", e, attemptNo);
    }
  },

  // ============================================================
  // API DE ALTO NÍVEL — substitui o acesso direto a base44
  // ============================================================
  async create(entityName, data, options = {}) {
    return this._run(entityName, "create", data, null, options);
  },
  async update(entityName, id, data, options = {}) {
    return this._run(entityName, "update", data, id, options);
  },
  async delete(entityName, id, options = {}) {
    return this._run(entityName, "delete", null, id, options);
  },

  async _run(entityName, operation, payload, entityId, options = {}) {
    // Pre-validação de campos obrigatórios (antes de gravar)
    if (operation !== "delete" && options.validate !== false) {
      try {
        await ValidationEngine.validate(entityName, payload, { checkRequired: operation === "create" });
      } catch (e) {
        // Validação de schema falhou — ainda assim registramos a intenção
        // para que o administrador veja e decida, mas lançamos o erro.
        const op = await this.enqueue({ entityName, operation, payload, entityId, user: options.user, module: options.module, origin: options.origin });
        await base44.entities.RecoveryOperation.update(op.id, {
          current_state: "dead_letter",
          queue: "dead_letter",
          failed_step: "write",
          error_message: "Pré-validação falhou: " + e.message,
          completed_at: nowISO(),
        });
        throw e;
      }
    }
    const op = await this.enqueue({ entityName, operation, payload, entityId, user: options.user, module: options.module, origin: options.origin });
    return this.execute(op.id, options.user);
  },

  // ============================================================
  // FALHA — registra, agenda retry ou move para dead letter
  // ============================================================
  async _handleFailure(opId, op, step, error, attemptNo) {
    const retryCount = attemptNo;
    const update = {
      failed_step: step,
      error_message: error.message || String(error),
      error_stack: error.stack || "",
      retry_count: retryCount,
    };

    if (retryCount > (op.max_retries || MAX_RETRIES)) {
      // === DEAD LETTER QUEUE ===
      update.current_state = "dead_letter";
      update.queue = "dead_letter";
      update.completed_at = nowISO();
      await base44.entities.RecoveryOperation.update(opId, update);
      EventBus.publish({
        event_type: "recovery_dead_letter",
        module: "kernel",
        entity_type: "RecoveryOperation",
        entity_id: opId,
        payload: {
          operation_code: op.operation_code,
          entity_name: op.entity_name,
          operation: op.operation,
          entity_id: op.entity_id,
          failed_step: step,
          error: error.message,
          retry_count: retryCount,
        },
      }).catch(() => {});
      throw new Error(
        `Operação ${op.operation_code} movida para Dead Letter Queue. Etapa "${step}" falhou após ${retryCount} tentativas: ${error.message}`
      );
    }

    // === RETRY QUEUE ===
    update.current_state = "retry";
    update.queue = "retry";
    update.next_retry_at = new Date(Date.now() + RETRY_DELAY_MS).toISOString();
    await base44.entities.RecoveryOperation.update(opId, update);
    // Nova tentativa automática
    this._scheduleRetry(opId);
    throw new Error(
      `Operação ${op.operation_code} enviada para fila de retry. Etapa "${step}" falhou (tentativa ${retryCount}/${op.max_retries || MAX_RETRIES}): ${error.message}`
    );
  },

  _scheduleRetry(opId) {
    if (typeof setTimeout === "undefined") return;
    setTimeout(async () => {
      try {
        await this.execute(opId);
      } catch {
        // já tratado em _handleFailure (nova tentativa ou dead letter)
      }
    }, RETRY_DELAY_MS);
  },

  // ============================================================
  // RETRY ALL — processa toda a fila de retry (manual ou agendado)
  // ============================================================
  async retryAll() {
    const pending = await base44.entities.RecoveryOperation.filter({ queue: "retry" }, "-started_at", 100);
    const results = { attempted: pending.length, succeeded: 0, failed: 0, dead_lettered: 0 };
    for (const op of pending) {
      try {
        await this.execute(op.id);
        results.succeeded++;
      } catch (e) {
        if (e.message && e.message.includes("Dead Letter")) results.dead_lettered++;
        else results.failed++;
      }
    }
    return results;
  },

  // ============================================================
  // REPROCESS — administrador reprocessa um item da dead letter
  // ============================================================
  async reprocess(opId, user) {
    await base44.entities.RecoveryOperation.update(opId, {
      queue: "retry",
      current_state: "retry",
      retry_count: 0,
      failed_step: "",
      error_message: "",
      error_stack: "",
      next_retry_at: nowISO(),
    });
    return this.execute(opId, user);
  },

  // ============================================================
  // RECOVER PENDING — retoma operações interrompidas no startup
  // ============================================================
  async recoverPending() {
    const stuck = await base44.entities.RecoveryOperation.filter(
      { queue: "active", current_state: { $ne: "committed" } },
      "-started_at",
      50
    );
    const results = { scanned: stuck.length, resumed: 0, failed: 0 };
    for (const op of stuck) {
      try {
        await this.execute(op.id);
        results.resumed++;
      } catch {
        results.failed++;
      }
    }
    return results;
  },

  // ============================================================
  // Helpers
  // ============================================================
  _validateConsistency(payload, readback, operation) {
    const mismatches = [];
    if (operation === "delete") return mismatches;
    if (!readback) {
      mismatches.push({ field: "_record", expected: "exists", actual: "null" });
      return mismatches;
    }
    for (const key of Object.keys(payload || {})) {
      const expected = payload[key];
      const actual = readback[key];
      if (expected === null || expected === undefined) continue;
      if (typeof expected === "number" && typeof actual === "number") {
        if (Math.abs(expected - actual) > 0.0001) mismatches.push({ field: key, expected, actual });
      } else if (typeof expected === "object") {
        continue; // objetos/arrays: validação rasa
      } else if (String(expected) !== String(actual)) {
        mismatches.push({ field: key, expected, actual });
      }
    }
    return mismatches;
  },
};

export default RecoveryEngine;