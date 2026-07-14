/**
 * DON BARON CORE — ErrorManager
 *
 * Elimina try/catch vazios. Todo erro e registrado, propagado e tratado.
 * Nenhum erro pode ser escondido.
 */
import { Logger } from "./Logger";

export class BaronError extends Error {
  constructor(message, { code, entity, operation, cause } = {}) {
    super(message);
    this.name = "BaronError";
    this.code = code || "BARON_ERROR";
    this.entity = entity;
    this.operation = operation;
    this.cause = cause;
  }
}

export const ErrorManager = {
  /**
   * Trata um erro: registra no Logger e repassa para o chamador.
   * NUNCA engole silenciosamente.
   */
  async handle(error, context = {}) {
    const baronError = error instanceof BaronError
      ? error
      : new BaronError(error.message || String(error), {
          code: error.code || "UNEXPECTED",
          entity: context.entity,
          operation: context.operation,
          cause: error,
        });

    await Logger.error(baronError.message, {
      entity_name: context.entity,
      operation: context.operation || "unknown",
      module: context.module || "core",
      payload: context.payload,
    });

    // Re-lanca para que o chamador decida o que fazer (toast, rollback, etc.)
    throw baronError;
  },

  /**
   * Wrap para funcoes async — garante que todo erro passe pelo ErrorManager.
   */
  async run(fn, context = {}) {
    try {
      return await fn();
    } catch (error) {
      await this.handle(error, context);
    }
  },
};

export default ErrorManager;