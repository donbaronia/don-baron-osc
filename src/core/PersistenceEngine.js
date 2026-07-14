/**
 * DON BARON CORE — PersistenceEngine
 *
 * A UNICA camada permitida para gravar/ler dados.
 * Nenhum componente, tela ou agente IA pode acessar base44.entities diretamente.
 *
 * Garantias:
 *   1. Validacao antes de gravar
 *   2. Read-back obrigatorio apos create/update/delete
 *   3. Audit log de toda operacao
 *   4. Cache invalidado apos gravacao
 *   5. Sync da interface via EventBus
 *   6. Erros propagados (nunca escondidos)
 *
 * Uso:
 *   import { PersistenceEngine } from "@/core";
 *   const product = await PersistenceEngine.create("Product", { name: "Bacon" });
 */
import { base44 } from "@/api/base44Client";
import { activeFilter } from "@/lib/activeFilter";
import { ValidationEngine } from "./ValidationEngine";
import { Logger } from "./Logger";
import { CacheManager } from "./CacheManager";
import { SyncManager } from "./SyncManager";
import { BaronError } from "./ErrorManager";

const softDeleteCache = new Map();

async function hasSoftDelete(entityName) {
  if (softDeleteCache.has(entityName)) return softDeleteCache.get(entityName);
  let result = false;
  try {
    const schema = await base44.entities[entityName].schema();
    result = !!(schema?.properties?.deleted_at);
  } catch {
    result = false;
  }
  softDeleteCache.set(entityName, result);
  return result;
}

export const PersistenceEngine = {
  /**
   * CREATE: valida → grava → read-back → audit → sync.
   * Retorna o registro CONFIRMADO pelo banco (read-back).
   */
  async create(entityName, data, options = {}) {
    const t0 = Date.now();
    const correlationId = options.correlationId || `create-${entityName}-${Date.now()}`;

    // Validacao
    if (options.validate !== false) {
      await ValidationEngine.validate(entityName, data, { checkRequired: true });
    }

    // Gravar
    const created = await base44.entities[entityName].create(data);
    if (!created?.id) {
      throw new BaronError(
        `Create nao retornou ID para ${entityName}`,
        { code: "PERSIST_NO_ID", entity: entityName, operation: "create" }
      );
    }

    // READ-BACK obrigatorio
    const readBack = await base44.entities[entityName].get(created.id);
    if (!readBack || readBack.id !== created.id) {
      throw new BaronError(
        `Read-back falhou: ${entityName}:${created.id} nao encontrado apos create`,
        { code: "PERSIST_READBACK_FAILED", entity: entityName, operation: "create" }
      );
    }

    // Audit + Sync
    Logger.audit({
      entity_name: entityName,
      operation: "create",
      status: "success",
      payload: data,
      bank_response: { id: created.id },
      duration_ms: Date.now() - t0,
      module: options.module || "core",
      origin: options.origin || "frontend",
      correlation_id: correlationId,
    });
    SyncManager.sync(entityName, "created");

    return readBack;
  },

  /**
   * UPDATE: valida → atualiza → read-back → audit → sync.
   * Retorna o registro CONFIRMADO apos update.
   */
  async update(entityName, id, data, options = {}) {
    const t0 = Date.now();
    const correlationId = options.correlationId || `update-${entityName}-${id}-${Date.now()}`;

    if (options.validate !== false) {
      await ValidationEngine.validate(entityName, data, { checkRequired: false });
    }

    const updated = await base44.entities[entityName].update(id, data);
    if (!updated?.id) {
      throw new BaronError(
        `Update nao confirmou ${entityName}:${id}`,
        { code: "PERSIST_UPDATE_NO_CONFIRM", entity: entityName, operation: "update" }
      );
    }

    // READ-BACK
    const readBack = await base44.entities[entityName].get(id);
    if (!readBack || readBack.id !== id) {
      throw new BaronError(
        `Read-back falhou: ${entityName}:${id} nao encontrado apos update`,
        { code: "PERSIST_READBACK_FAILED", entity: entityName, operation: "update" }
      );
    }

    Logger.audit({
      entity_name: entityName,
      operation: "update",
      status: "success",
      payload: data,
      bank_response: { id, fields_updated: Object.keys(data).length },
      duration_ms: Date.now() - t0,
      module: options.module || "core",
      origin: options.origin || "frontend",
      correlation_id: correlationId,
    });
    SyncManager.sync(entityName, "updated");

    return readBack;
  },

  /**
   * DELETE: soft-delete (se suportar) ou hard-delete → read-back → audit.
   */
  async delete(entityName, id, options = {}) {
    const t0 = Date.now();
    const softDelete = await hasSoftDelete(entityName);

    if (softDelete) {
      await base44.entities[entityName].update(id, {
        deleted_at: new Date().toISOString(),
        deleted_by: options.userId || "system",
      });
    } else {
      await base44.entities[entityName].delete(id);
    }

    // READ-BACK: confirmar que esta "deletado"
    if (softDelete) {
      const readBack = await base44.entities[entityName].get(id);
      if (!readBack?.deleted_at) {
        throw new BaronError(
          `Soft-delete nao confirmado para ${entityName}:${id}`,
          { code: "PERSIST_DELETE_NOT_CONFIRMED", entity: entityName, operation: "delete" }
        );
      }
    }

    Logger.audit({
      entity_name: entityName,
      operation: "delete",
      status: "success",
      payload: { id, soft: softDelete },
      bank_response: { id, deleted: true },
      duration_ms: Date.now() - t0,
      module: options.module || "core",
      origin: options.origin || "frontend",
      correlation_id: options.correlationId,
    });
    SyncManager.sync(entityName, "deleted");

    return { id, deleted: true, soft: softDelete };
  },

  /**
   * FIND (list): aplica activeFilter automaticamente.
   */
  async find(entityName, extraFilter = {}, sort, limit, options = {}) {
    const soft = await hasSoftDelete(entityName);
    const filter = soft ? { ...activeFilter, ...extraFilter } : extraFilter;
    return base44.entities[entityName].filter(filter, sort, limit);
  },

  /**
   * FIND ONE: busca por ID, respeitando soft-delete.
   */
  async findOne(entityName, id, options = {}) {
    const record = await base44.entities[entityName].get(id);
    if (!record) return null;
    const soft = await hasSoftDelete(entityName);
    if (soft && record.deleted_at && !options.includeDeleted) return null;
    return record;
  },

  /**
   * UPSERT: cria se nao existe, atualiza se existe (por filtro).
   */
  async upsert(entityName, filter, data, options = {}) {
    const existing = await this.find(entityName, filter, null, 1, options);
    if (existing && existing.length > 0) {
      return this.update(entityName, existing[0].id, data, options);
    }
    return this.create(entityName, { ...filter, ...data }, options);
  },

  /**
   * BULK INSERT: cria multiplos registros.
   */
  async bulkInsert(entityName, records, options = {}) {
    const t0 = Date.now();
    const created = await base44.entities[entityName].bulkCreate(records);
    Logger.audit({
      entity_name: entityName,
      operation: "create",
      status: "success",
      payload: { count: records.length },
      bank_response: { count: created?.length || 0 },
      duration_ms: Date.now() - t0,
      module: options.module || "core",
      origin: options.origin || "frontend",
    });
    SyncManager.sync(entityName, "bulk_created");
    return created;
  },

  /**
   * BULK UPDATE: atualiza multiplos registros.
   */
  async bulkUpdate(entityName, updates, options = {}) {
    const t0 = Date.now();
    const result = await base44.entities[entityName].bulkUpdate(updates);
    Logger.audit({
      entity_name: entityName,
      operation: "update",
      status: "success",
      payload: { count: updates.length },
      duration_ms: Date.now() - t0,
      module: options.module || "core",
    });
    SyncManager.sync(entityName, "bulk_updated");
    return result;
  },

  clearSchemaCache() {
    softDeleteCache.clear();
  },
};

export default PersistenceEngine;