/**
 * Formatação de data sem o bug clássico de fuso horário do JavaScript.
 *
 * Problema: new Date("2026-07-20") é interpretado como meia-noite em UTC.
 * Ao exibir no fuso de Brasília (UTC-3), vira 21h do dia ANTERIOR — toda
 * data-only (vencimento, previsão, data de compra, etc.) aparecia um dia
 * a menos em qualquer tela do sistema.
 *
 * Correção: para strings no formato "YYYY-MM-DD" (sem hora), força a
 * interpretação como meia-noite LOCAL em vez de UTC, adicionando "T00:00:00".
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Constrói um Date correto a partir de uma string de data (com ou sem hora)
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  if (DATE_ONLY.test(dateStr)) return new Date(dateStr + "T00:00:00");
  return new Date(dateStr);
}

// Formata "YYYY-MM-DD" (ou timestamp completo) como "DD/MM/AAAA"
export function formatDateBR(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

// Formata com data e hora, "DD/MM/AAAA HH:mm"
export function formatDateTimeBR(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

// Hoje no formato "YYYY-MM-DD", no fuso local (não UTC)
export function todayLocalStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Diferença em dias entre duas datas "YYYY-MM-DD" (positivo = no futuro)
export function daysUntil(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d) return null;
  const today = parseLocalDate(todayLocalStr());
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}
