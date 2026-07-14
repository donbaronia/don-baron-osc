/**
 * DON BARON CORE — Barrel Export
 *
 * Import tudo de "@/core":
 *   import { PersistenceEngine, ActionEngine } from "@/core";
 */
export { PersistenceEngine } from "./PersistenceEngine";
export { ValidationEngine } from "./ValidationEngine";
export { TransactionManager } from "./TransactionManager";
export { ActionEngine } from "./ActionEngine";
export { ActionTypes, ActionRegistry, IntentPatterns } from "./actions";
export { Logger } from "./Logger";
export { ErrorManager, BaronError } from "./ErrorManager";
export { CacheManager } from "./CacheManager";
export { LocalEventBus } from "./EventBus";
export { SyncManager } from "./SyncManager";
export { NotificationManager, useNotificationInit } from "./NotificationManager";