/**
 * DON BARON CORE — SyncManager
 *
 * Atualiza a interface automaticamente apos gravacao.
 * Combina CacheManager (invalidacao) + EventBus (notificacao).
 */
import { CacheManager } from "./CacheManager";
import { LocalEventBus } from "./EventBus";

export const SyncManager = {
  /**
   * Sincroniza apos gravacao em uma entidade.
   * Invalida cache + emite evento de sincronizacao.
   */
  sync(entityName, action = "updated") {
    CacheManager.invalidate(entityName);
    LocalEventBus.emit("sync", { entity: entityName, action });
    LocalEventBus.emit(`sync:${entityName}`, { entity: entityName, action });
  },

  /**
   * Sincroniza multiplas entidades (apos transacao).
   */
  syncAll(entityNames) {
    entityNames.forEach((name) => this.sync(name, "transaction"));
  },

  /**
   * Assina sincronizacao de uma entidade (para componentes que precisam
   * recarregar dados apos gravacao).
   */
  onSync(entityName, callback) {
    return LocalEventBus.on(`sync:${entityName}`, callback);
  },

  onSyncAll(callback) {
    return LocalEventBus.on("sync", callback);
  },
};

export default SyncManager;