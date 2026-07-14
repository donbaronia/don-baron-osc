/**
 * DON BARON CORE — EventBus (local)
 *
 * Pub/sub em memoria para sincronizacao instantanea entre componentes.
 * Nenhum componente chama outro diretamente — tudo via EventBus.
 *
 * Para eventos persistentes (cross-restart), usar o EventBus backend
 * (src/lib/eventBus.js) que grava em SystemEvent.
 */
const handlers = new Map();

export const LocalEventBus = {
  on(event, handler) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event).add(handler);
    return () => {
      handlers.get(event)?.delete(handler);
    };
  },

  emit(event, payload) {
    const subs = handlers.get(event);
    if (!subs) return;
    subs.forEach((handler) => {
      try {
        handler(payload);
      } catch (e) {
        console.error(`[EventBus] Handler error for "${event}"`, e);
      }
    });
  },

  off(event) {
    handlers.delete(event);
  },
};

export default LocalEventBus;