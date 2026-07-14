/**
 * DON BARON CORE — TransactionManager
 *
 * Operacoes compostas (ex: processar NF = fornecedor + estoque + conta + CMV).
 * Se qualquer etapa falhar, executa rollback das etapas anteriores.
 *
 * Nao e uma transacao de banco real (MongoDB/Base44 nao suporta multi-doc),
 * mas uma compensacao: desfaz cada operacao concluida na ordem inversa.
 *
 * Uso:
 *   const tx = TransactionManager.begin();
 *   const supplier = await tx.addStep(() => PersistenceEngine.create("Supplier", data));
 *   const product = await tx.addStep(() => PersistenceEngine.create("Product", data));
 *   await tx.commit();
 *   // ou se algo falhar: tx.rollback() desfaz tudo automaticamente.
 */
import { PersistenceEngine } from "./PersistenceEngine";
import { Logger } from "./Logger";

export const TransactionManager = {
  begin(options = {}) {
    const steps = [];
    const correlationId = options.correlationId || `tx-${Date.now()}`;
    let rolledBack = false;

    const tx = {
      correlationId,

      async addStep(execute, compensate) {
        if (rolledBack) throw new Error("Transacao ja foi desfeita (rollback)");
        const stepIndex = steps.length;
        try {
          const result = await execute();
          steps.push({ result, compensate, entity: options.entity });
          return result;
        } catch (error) {
          Logger.audit({
            entity_name: options.entity || "Transaction",
            operation: "transaction",
            status: "error",
            error_message: error.message,
            payload: { step: stepIndex, correlation_id: correlationId },
            module: options.module || "core",
            correlation_id: correlationId,
          });
          await this.rollback();
          throw error;
        }
      },

      async rollback() {
        if (rolledBack) return;
        rolledBack = true;
        Logger.audit({
          entity_name: options.entity || "Transaction",
          operation: "transaction",
          status: "rolled_back",
          payload: { steps: steps.length, correlation_id: correlationId },
          module: options.module || "core",
          correlation_id: correlationId,
        });
        // Desfaz na ordem inversa
        for (let i = steps.length - 1; i >= 0; i--) {
          const step = steps[i];
          try {
            if (step.compensate) {
              await step.compensate(step.result);
            } else if (step.result?.id) {
              // Compensacao padrao: deletar o registro criado
              const entityName = step.result.constructor?.entityName || step.entity;
              if (entityName) {
                await PersistenceEngine.delete(entityName, step.result.id, {
                  correlationId,
                  module: "transaction_rollback",
                });
              }
            }
          } catch (e) {
            Logger.audit({
              entity_name: "Transaction",
              operation: "transaction",
              status: "error",
              error_message: `Rollback falhou no passo ${i}: ${e.message}`,
              correlation_id: correlationId,
            });
          }
        }
      },

      commit() {
        Logger.audit({
          entity_name: options.entity || "Transaction",
          operation: "transaction",
          status: "success",
          payload: { steps: steps.length, correlation_id: correlationId },
          module: options.module || "core",
          correlation_id: correlationId,
        });
        return steps.map((s) => s.result);
      },

      get steps() {
        return steps;
      },
    };

    return tx;
  },
};

export default TransactionManager;