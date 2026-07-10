import { base44 } from "@/api/base44Client";

export const PeopleAnalytics = {
  getDashboard: () => base44.functions.invoke('peopleAnalytics', { action: 'getDashboard' }).then(r => r.data),
  getEmployeeScores: () => base44.functions.invoke('peopleAnalytics', { action: 'getEmployeeScores' }).then(r => r.data),
  getEmployeeScore: (employee_id) => base44.functions.invoke('peopleAnalytics', { action: 'getEmployeeScore', employee_id }).then(r => r.data),
  getPredictions: () => base44.functions.invoke('peopleAnalytics', { action: 'getPredictions' }).then(r => r.data),
  getComparisons: (groupBy) => base44.functions.invoke('peopleAnalytics', { action: 'getComparisons', groupBy }).then(r => r.data),
  aiAnalyze: (employee_id) => base44.functions.invoke('peopleAnalytics', { action: 'aiAnalyze', employee_id }).then(r => r.data),
  aiTeamAnalysis: () => base44.functions.invoke('peopleAnalytics', { action: 'aiTeamAnalysis' }).then(r => r.data),
};

export const SCORE_DIMENSIONS = [
  { key: 'desempenho', label: 'Desempenho', weight: '20%' },
  { key: 'pontualidade', label: 'Pontualidade', weight: '15%' },
  { key: 'qualidade', label: 'Qualidade', weight: '12%' },
  { key: 'comprometimento', label: 'Comprometimento', weight: '12%' },
  { key: 'treinamentos', label: 'Treinamentos', weight: '10%' },
  { key: 'trabalho_equipe', label: 'Trabalho em Equipe', weight: '10%' },
  { key: 'feedbacks', label: 'Feedbacks', weight: '11%' },
  { key: 'metas', label: 'Cumprimento de Metas', weight: '10%' },
];

export function scoreColor(score) {
  if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500', label: 'Excelente' };
  if (score >= 60) return { text: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500', label: 'Bom' };
  if (score >= 40) return { text: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500', label: 'Regular' };
  return { text: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500', label: 'Crítico' };
}

export const RISK_CONFIG = {
  baixo: { label: 'Baixo', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  medio: { label: 'Médio', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  alto: { label: 'Alto', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
};

export const DEPARTMENT_CONFIG = {
  administracao: { label: 'Administração', emoji: '🏢' },
  financeiro: { label: 'Financeiro', emoji: '📊' },
  compras: { label: 'Compras', emoji: '🛒' },
  estoque: { label: 'Estoque', emoji: '📦' },
  producao: { label: 'Produção', emoji: '🏭' },
  rh: { label: 'RH', emoji: '👥' },
  delivery: { label: 'Delivery', emoji: '🏍️' },
  operacao: { label: 'Operação', emoji: '⚙️' },
  limpeza: { label: 'Limpeza', emoji: '🧹' },
  manutencao: { label: 'Manutenção', emoji: '🔧' },
  outros: { label: 'Outros', emoji: '📋' },
};

export const SHIFT_CONFIG = {
  manha: { label: 'Manhã', emoji: '🌅' },
  tarde: { label: 'Tarde', emoji: '☀️' },
  noite: { label: 'Noite', emoji: '🌙' },
  madrugada: { label: 'Madrugada', emoji: '🌃' },
  integral: { label: 'Integral', emoji: '🕐' },
};

export const CAREER_LEVEL_CONFIG = {
  auxiliar: { label: 'Auxiliar', order: 1 },
  operador: { label: 'Operador', order: 2 },
  lider: { label: 'Líder', order: 3 },
  supervisor: { label: 'Supervisor', order: 4 },
  gerente: { label: 'Gerente', order: 5 },
};

export const PROMOTION_READINESS_CONFIG = {
  pronto: { label: 'Pronto', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  em_desenvolvimento: { label: 'Em Desenvolvimento', color: 'text-amber-600', bg: 'bg-amber-50' },
  nao_recomendado: { label: 'Não Recomendado', color: 'text-red-600', bg: 'bg-red-50' },
};

export const LEADERSHIP_POTENTIAL_CONFIG = {
  alto: { label: 'Alto', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  medio: { label: 'Médio', color: 'text-amber-600', bg: 'bg-amber-50' },
  baixo: { label: 'Baixo', color: 'text-neutral-500', bg: 'bg-neutral-100' },
};