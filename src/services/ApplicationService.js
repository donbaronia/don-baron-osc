/**
 * DON BARON CORE 3.0 — ApplicationService
 *
 * A ÚNICA camada oficial de gravação e leitura do sistema.
 * Nenhuma tela, componente ou módulo pode acessar base44.entities diretamente.
 *
 * Fluxo obrigatório (REGRA Nº 1):
 *   ApplicationService.create/update/delete
 *     → ValidationEngine (valida)
 *     → PersistenceEngine → RecoveryEngine (write → read-back → validate → commit)
 *     → EventBus.publish (evento de domínio)
 *     → Logger.audit (auditoria unificada em SystemLog)
 *     → SyncManager.sync (interface)
 *     → Resposta CONFIRMADA (registro lido de volta do banco)
 *
 * Garantias:
 *   - Read-back obrigatório (nunca retorna sem confirmar persistência)
 *   - Recovery automático (fila + retry + dead-letter)
 *   - Eventos publicados para todos os módulos dependentes
 *   - Auditoria unificada (SystemLog)
 *   - Erros propagados (NUNCA silenciados — REGRA Nº 3)
 *
 * Uso:
 *   import { AppService } from "@/services";
 *   const confirmed = await AppService.create("Employee", data, { module: "rh", user });
 *   const rows = await AppService.find("Product", { active: true }, "name", 500);
 */
import { PersistenceEngine } from "@/core/PersistenceEngine";
import { EventBus } from "@/lib/eventBus";
import { Logger } from "@/core/Logger";
import { SyncManager } from "@/core/SyncManager";

// Mapa de eventos por entidade + operação (PascalCase + snake_case)
// Garante que toda gravação publique o evento correto automaticamente.
const EVENT_MAP = {
  Employee: { create: "employee_created", update: "employee_updated", delete: "employee_deleted" },
  EmployeeAdvance: { create: "advance_created", update: "advance_updated", delete: "advance_deleted" },
  Candidate: { create: "candidate_created", update: "candidate_updated", delete: "candidate_deleted" },
  JobOpening: { create: "job_opening_created", update: "job_opening_updated", delete: "job_opening_deleted" },
  EmployeeDocument: { create: "employee_document_created", update: "employee_document_updated", delete: "employee_document_deleted" },
  TimeRecord: { create: "time_record_created", update: "time_record_updated", delete: "time_record_deleted" },
  Training: { create: "training_created", update: "training_updated", delete: "training_deleted" },
  CareerPlan: { create: "career_plan_created", update: "career_plan_updated", delete: "career_plan_deleted" },
  PerformanceReview: { create: "review_created", update: "review_updated", delete: "review_deleted" },
  Recognition: { create: "recognition_created", update: "recognition_updated", delete: "recognition_deleted" },
  Occurrence: { create: "occurrence_created", update: "occurrence_updated", delete: "occurrence_deleted" },
  Product: { create: "product_created", update: "product_updated", delete: "product_deleted" },
  Supplier: { create: "supplier_created", update: "supplier_updated", delete: "supplier_deleted" },
  Customer: { create: "customer_created", update: "customer_updated", delete: "customer_deleted" },
  Stock: { create: "stock_created", update: "stock_updated", delete: "stock_deleted" },
  Movement: { create: "movement_created", update: "movement_updated", delete: "movement_deleted" },
  Payment: { create: "payment_created", update: "payment_updated", delete: "payment_deleted" },
  Receipt: { create: "receipt_created", update: "receipt_updated", delete: "receipt_deleted" },
  FinancialTransaction: { create: "financial_transaction_created", update: "financial_transaction_updated", delete: "financial_transaction_deleted" },
  FinancialAccount: { create: "financial_account_created", update: "financial_account_updated", delete: "financial_account_deleted" },
  Purchase: { create: "purchase_created", update: "purchase_updated", delete: "purchase_deleted" },
  PurchaseRequest: { create: "purchase_request_created", update: "purchase_request_updated", delete: "purchase_request_deleted" },
  Quotation: { create: "quotation_created", update: "quotation_updated", delete: "quotation_deleted" },
  ProductionRecord: { create: "production_created", update: "production_updated", delete: "production_deleted" },
  Recipe: { create: "recipe_created", update: "recipe_updated", delete: "recipe_deleted" },
  CMVRecord: { create: "cmv_created", update: "cmv_updated", delete: "cmv_deleted" },
  CMVGoal: { create: "cmv_goal_created", update: "cmv_goal_updated", delete: "cmv_goal_deleted" },
  IFoodReceipt: { create: "ifood_receipt_created", update: "ifood_receipt_updated", delete: "ifood_receipt_deleted" },
  DBDocument: { create: "document_created", update: "document_updated", delete: "document_deleted" },
  Courier: { create: "courier_created", update: "courier_updated", delete: "courier_deleted" },
  Sale: { create: "sale_created", update: "sale_updated", delete: "sale_deleted" },
  Category: { create: "category_created", update: "category_updated", delete: "category_deleted" },
  UnitOfMeasure: { create: "unit_created", update: "unit_updated", delete: "unit_deleted" },
  Tag: { create: "tag_created", update: "tag_updated", delete: "tag_deleted" },
  PriceHistory: { create: "price_history_created", update: "price_history_updated", delete: "price_history_deleted" },
};

// Módulo padrão por entidade (para auditoria/eventos quando não informado)
const MODULE_BY_ENTITY = {
  Employee: "rh", EmployeeAdvance: "rh", Candidate: "rh", JobOpening: "rh",
  EmployeeDocument: "rh", TimeRecord: "rh", Training: "rh", CareerPlan: "rh",
  PerformanceReview: "rh", Recognition: "rh", Occurrence: "rh", Payroll: "rh",
  Product: "cadastro", Supplier: "cadastro", Customer: "cadastro",
  Category: "cadastro", UnitOfMeasure: "cadastro", Tag: "cadastro", PriceHistory: "cadastro",
  Stock: "estoque", Movement: "estoque",
  Payment: "financeiro", Receipt: "financeiro", FinancialTransaction: "financeiro", FinancialAccount: "financeiro",
  Purchase: "compras", PurchaseRequest: "compras", Quotation: "compras",
  ProductionRecord: "producao", Recipe: "producao",
  CMVRecord: "cmv", CMVGoal: "cmv", IFoodReceipt: "cmv",
  DBDocument: "documentos", DocumentProcess: "documentos",
  Courier: "motoboys", Sale: "vendas",
};

function getEventType(entityName, operation) {
  return EVENT_MAP[entityName]?.[operation] || `${entityName.toLowerCase()}_${operation}d`;
}

function getModule(entityName, options) {
  return options?.module || MODULE_BY_ENTITY[entityName] || "geral";
}

export const AppService = {
  /**
   * CREATE — valida → grava → read-back → valida consistência → commit → evento → auditoria → sync.
   * Retorna o registro CONFIRMADO pelo banco (read-back).
   * NUNCA silencia erros.
   */
  async create(entityName, data, options = {}) {
    const module = getModule(entityName, options);
    const t0 = Date.now();

    const confirmed = await PersistenceEngine.create(entityName, data, {
      validate: options.validate !== false,
      module,
      origin: options.origin || "frontend",
      user: options.user,
    });

    // EventBus — publica evento de domínio para todos os módulos dependentes reagirem
    const eventType = getEventType(entityName, "create");
    try {
      await EventBus.publish({
        event_type: eventType,
        module,
        origin: "frontend",
        entity_type: entityName,
        entity_id: confirmed?.id || "",
        payload: data,
        user_name: options.user?.full_name,
      });
    } catch (e) {
      // Evento falhou — registra, NÃO silencia (mas não bloqueia a gravação já confirmada)
      Logger.error(`Falha ao publicar evento ${eventType}`, { entity_name: entityName, operation: "create", module, payload: { error: e.message } });
    }

    // Auditoria unificada (Logger → SystemLog) — o RecoveryEngine já registra no commit,
    // mas este registro explicita o evento publicado e o módulo de negócio.
    Logger.audit({
      entity_name: entityName,
      operation: "create",
      status: "success",
      payload: { ...data, _event: eventType },
      bank_response: { id: confirmed?.id, verified: true },
      duration_ms: Date.now() - t0,
      module,
      origin: options.origin || "frontend",
      readback_verified: true,
    });

    // Sync da interface (qualquer tela ouvindo recarrega automaticamente)
    SyncManager.sync(entityName, "created");

    return confirmed;
  },

  /**
   * UPDATE — valida → atualiza → read-back → valida consistência → commit → evento → auditoria → sync.
   * Retorna o registro CONFIRMADO após update.
   */
  async update(entityName, id, data, options = {}) {
    const module = getModule(entityName, options);
    const t0 = Date.now();

    const confirmed = await PersistenceEngine.update(entityName, id, data, {
      validate: options.validate !== false,
      module,
      origin: options.origin || "frontend",
      user: options.user,
    });

    const eventType = getEventType(entityName, "update");
    try {
      await EventBus.publish({
        event_type: eventType,
        module,
        origin: "frontend",
        entity_type: entityName,
        entity_id: id,
        payload: data,
        user_name: options.user?.full_name,
      });
    } catch (e) {
      Logger.error(`Falha ao publicar evento ${eventType}`, { entity_name: entityName, operation: "update", module, payload: { error: e.message } });
    }

    Logger.audit({
      entity_name: entityName,
      operation: "update",
      status: "success",
      payload: { id, ...data, _event: eventType },
      bank_response: { id, verified: true },
      duration_ms: Date.now() - t0,
      module,
      origin: options.origin || "frontend",
      readback_verified: true,
    });

    SyncManager.sync(entityName, "updated");

    return confirmed;
  },

  /**
   * DELETE — soft-delete (se suportar) ou hard-delete → read-back → evento → auditoria → sync.
   */
  async delete(entityName, id, options = {}) {
    const module = getModule(entityName, options);
    const t0 = Date.now();

    const result = await PersistenceEngine.delete(entityName, id, {
      validate: options.validate !== false,
      module,
      origin: options.origin || "frontend",
      user: options.user,
    });

    const eventType = getEventType(entityName, "delete");
    try {
      await EventBus.publish({
        event_type: eventType,
        module,
        origin: "frontend",
        entity_type: entityName,
        entity_id: id,
        payload: { id },
        user_name: options.user?.full_name,
      });
    } catch (e) {
      Logger.error(`Falha ao publicar evento ${eventType}`, { entity_name: entityName, operation: "delete", module, payload: { error: e.message } });
    }

    Logger.audit({
      entity_name: entityName,
      operation: "delete",
      status: "success",
      payload: { id, _event: eventType },
      bank_response: { id, deleted: true },
      duration_ms: Date.now() - t0,
      module,
      origin: options.origin || "frontend",
      readback_verified: true,
    });

    SyncManager.sync(entityName, "deleted");

    return result;
  },

  /**
   * FIND (list) — leitura com activeFilter automático (soft-delete).
   */
  async find(entityName, filter = {}, sort = "-created_date", limit = 500, options = {}) {
    return PersistenceEngine.find(entityName, filter, sort, limit, options);
  },

  /**
   * FIND ONE — busca por ID, respeitando soft-delete.
   */
  async findOne(entityName, id, options = {}) {
    return PersistenceEngine.findOne(entityName, id, options);
  },

  /**
   * LIST — atalho para list simples (sem filtro).
   */
  async list(entityName, sort = "-created_date", limit = 500) {
    return PersistenceEngine.find(entityName, {}, sort, limit);
  },

  /**
   * BULK INSERT — cria múltiplos registros (cada um com read-back via RecoveryEngine seria custoso;
   * usa bulkCreate do PersistenceEngine que registra auditoria + sync).
   * Para garantirias individuais de recovery, prefira múltiplos create().
   */
  async bulkCreate(entityName, records, options = {}) {
    const module = getModule(entityName, options);
    const created = await PersistenceEngine.bulkInsert(entityName, records, {
      module,
      origin: options.origin || "frontend",
    });
    SyncManager.sync(entityName, "bulk_created");
    return created;
  },
};

export default AppService;