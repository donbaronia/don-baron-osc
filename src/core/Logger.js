/**
 * DON BARON CORE — Logger
 *
 * Registro estruturado de toda operacao do sistema.
 * Grava em SystemLog (persistente) e em console (dev).
 * Nenhum log e apagado.
 */
import { base44 } from "@/api/base44Client";

const LOG_LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

let pendingFlush = [];
let flushTimer = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    const batch = pendingFlush.splice(0);
    for (const entry of batch) {
      try {
        await base44.entities.SystemLog.create(entry);
      } catch {
        // Log de sistema nunca deve quebrar a operacao principal.
        console.error("[Logger] Falha ao persistir SystemLog", entry);
      }
    }
  }, 1500);
}

function buildEntry({ entity_name, operation, status, payload, bank_response, duration_ms, error_message, module: mod, origin, correlation_id }) {
  return {
    entity_name: entity_name || "Unknown",
    operation: operation || "read",
    status: status || "success",
    timestamp: new Date().toISOString(),
    payload: payload || {},
    bank_response: bank_response || null,
    duration_ms: duration_ms || 0,
    error_message: error_message || null,
    module: mod || "core",
    origin: origin || "frontend",
    correlation_id: correlation_id || null,
  };
}

export const Logger = {
  /**
   * Registra uma operacao de persistencia (create/update/delete).
   * Grava no banco de forma assincrona (nao bloqueia a UI).
   */
  audit(entry) {
    const full = buildEntry(entry);
    pendingFlush.push(full);
    scheduleFlush();
    if (LOG_LEVELS.error <= (LOG_LEVELS[full.status === "error" ? "error" : "info"] || 20)) {
      // eslint-disable-next-line no-console
      console.log(`[Logger] ${full.entity_name}.${full.operation} → ${full.status} (${full.duration_ms}ms)`);
    }
    return full;
  },

  /**
   * Log de erro explicito (sempre persiste imediatamente).
   */
  async error(message, context = {}) {
    const entry = buildEntry({
      entity_name: context.entity_name || "System",
      operation: context.operation || "error",
      status: "error",
      error_message: message,
      module: context.module || "core",
      origin: context.origin || "frontend",
      payload: context.payload,
    });
    try {
      await base44.entities.SystemLog.create(entry);
    } catch {
      console.error("[Logger] Falha ao persistir erro", message);
    }
    console.error(`[Logger ERROR] ${message}`, context);
    return entry;
  },

  info(message, context = {}) {
    console.info(`[Logger INFO] ${message}`, context);
  },
};

export default Logger;