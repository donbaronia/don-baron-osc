/**
 * DON BARON X — Níveis de Autonomia
 * 1 Assistido (sempre perguntar)
 * 2 Supervisionado (executa simples, informa depois; confirma alto impacto)
 * 3 Autônomo (executa permitido automaticamente)
 * 4 Estratégico (antecipa, sugere, simula impactos)
 */
export const AutonomyLevels = { ASSISTIDO: 1, SUPERVISIONADO: 2, AUTONOMO: 3, ESTRATEGICO: 4 };

export const LEVEL_LABELS = { 1: "Assistido", 2: "Supervisionado", 3: "Autônomo", 4: "Estratégico" };

const STORAGE_KEY = "baron_autonomy_level";

export function getAutonomyLevel() {
  try { return Number(localStorage.getItem(STORAGE_KEY)) || 2; } catch { return 2; }
}

export function setAutonomyLevel(level) {
  try { localStorage.setItem(STORAGE_KEY, String(level)); } catch {}
}

// Ações de alto impacto que exigem confirmação no nível 2.
const HIGH_IMPACT = new Set([
  "CREATE_PAYMENT", "MARK_PAYMENT_PAID", "CREATE_PURCHASE", "DELETE_ENTITY",
  "UPDATE_EMPLOYEE", "CREATE_FINANCIAL_TRANSACTION", "CREATE_PRODUCTION",
]);

/**
 * Retorna true se a ação deve aguardar confirmação humana no nível atual.
 */
export function shouldConfirm(level, actionType) {
  if (level <= 1) return true;
  if (level === 2) return HIGH_IMPACT.has(actionType);
  if (level >= 3) return false;
  return true;
}

export default { AutonomyLevels, LEVEL_LABELS, getAutonomyLevel, setAutonomyLevel, shouldConfirm };