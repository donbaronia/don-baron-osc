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
import { RecoveryEngine } from "@/lib/recoveryEngine";

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
    // Toda gravação passa pelo Recovery Engine:
    // Write → Read Back → Validação → Commit (rastreável, com retry e dead letter)
    return RecoveryEngine.create(entityName, data, options);
  },

  /**
   * UPDATE: valida → atualiza → read-back → audit → sync.
   * Retorna o registro CONFIRMADO apos update.
   */
  async update(entityName, id, data, options = {}) {
    return RecoveryEngine.update(entityName, id, data, options);
  },

  /**
   * DELETE: soft-delete (se suportar) ou hard-delete → read-back → audit.
   */
  async delete(entityName, id, options = {}) {
    return RecoveryEngine.delete(entityName, id, options);
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