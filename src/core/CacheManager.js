/**
 * DON BARON CORE — CacheManager
 *
 * Cache em memoria com invalidacao automatica por entidade.
 * Sempre que uma entidade e gravada, o cache dela e invalidado.
 */
const cache = new Map();
const listeners = new Map();

export const CacheManager = {
  /**
   * Le do cache se existir, senao retorna null.
   */
  get(entityName, key = "default") {
    const entityCache = cache.get(entityName);
    if (!entityCache) return null;
    return entityCache.get(key) ?? null;
  },

  /**
   * Escreve no cache.
   */
  set(entityName, key = "default", data) {
    if (!cache.has(entityName)) cache.set(entityName, new Map());
    cache.get(entityName).set(key, data);
  },

  /**
   * Invalida todo o cache de uma entidade e notifica subscribers.
   */
  invalidate(entityName) {
    cache.delete(entityName);
    const subs = listeners.get(entityName) || [];
    subs.forEach((cb) => cb(entityName));
  },

  /**
   * Invalida todas as entidades (ex: apos transacao multi-entidade).
   */
  invalidateAll() {
    cache.clear();
    listeners.forEach((subs) => subs.forEach((cb) => cb("*")));
  },

  /**
   * Assina invalidacao de cache para uma entidade.
   * Retorna funcao de unsubscribe.
   */
  onInvalidate(entityName, callback) {
    if (!listeners.has(entityName)) listeners.set(entityName, []);
    listeners.get(entityName).push(callback);
    return () => {
      const subs = listeners.get(entityName);
      const idx = subs.indexOf(callback);
      if (idx >= 0) subs.splice(idx, 1);
    };
  },

  clear() {
    cache.clear();
  },
};

export default CacheManager;