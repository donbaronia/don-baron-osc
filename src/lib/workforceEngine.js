import { base44 } from "@/api/base44Client";

export const DigitalWorkforce = {
  init: () => base44.functions.invoke('digitalWorkforce', { action: 'init' }).then(r => r.data),
  getDashboard: () => base44.functions.invoke('digitalWorkforce', { action: 'getDashboard' }).then(r => r.data),
  listWorkers: () => base44.functions.invoke('digitalWorkforce', { action: 'listWorkers' }).then(r => r.data),
  getWorker: (worker_key) => base44.functions.invoke('digitalWorkforce', { action: 'getWorker', worker_key }).then(r => r.data),
  executeRoutine: (worker_key, routine_action) => base44.functions.invoke('digitalWorkforce', { action: 'executeRoutine', worker_key, routine_action }).then(r => r.data),
  generateAlerts: () => base44.functions.invoke('digitalWorkforce', { action: 'generateAlerts' }).then(r => r.data),
  listActivities: (limit = 50, worker_key) => base44.functions.invoke('digitalWorkforce', { action: 'listActivities', limit, worker_key }).then(r => r.data),
  listAlerts: (limit = 50, status) => base44.functions.invoke('digitalWorkforce', { action: 'listAlerts', limit, status }).then(r => r.data),
  acknowledgeAlert: (alert_id, status) => base44.functions.invoke('digitalWorkforce', { action: 'acknowledgeAlert', alert_id, status }).then(r => r.data),
  approveActivity: (activity_id, approved, comment) => base44.functions.invoke('digitalWorkforce', { action: 'approveActivity', activity_id, approved, comment }).then(r => r.data),
  executeAll: (max_workers = 3) => base44.functions.invoke('digitalWorkforce', { action: 'executeAll', max_workers }).then(r => r.data),
};

export const DEPARTMENT_CONFIG = {
  compras: { label: 'Compras', emoji: '🛒', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  financeiro: { label: 'Financeiro', emoji: '📊', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  producao: { label: 'Produção', emoji: '🏭', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  estoque: { label: 'Estoque', emoji: '📦', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  rh: { label: 'Recursos Humanos', emoji: '👥', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  logistica: { label: 'Logística', emoji: '🏍️', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  comercial: { label: 'Comercial', emoji: '📈', color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
  auditoria: { label: 'Auditoria', emoji: '🔍', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  estrategia: { label: 'Estratégia', emoji: '🎯', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
};

export const DEPARTMENT_ORDER = ['compras', 'financeiro', 'producao', 'estoque', 'rh', 'logistica', 'comercial', 'auditoria', 'estrategia'];

export const WORKER_STATUS_CONFIG = {
  idle: { label: 'Aguardando', color: 'text-neutral-500', bg: 'bg-neutral-100', dot: 'bg-neutral-400' },
  working: { label: 'Trabalhando', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  waiting_approval: { label: 'Aguardando Aprovação', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  offline: { label: 'Offline', color: 'text-neutral-400', bg: 'bg-neutral-50', dot: 'bg-neutral-300' },
};

export const SEVERITY_CONFIG = {
  critica: { label: 'Crítica', emoji: '🔴', color: 'text-red-600', bg: 'bg-red-50' },
  alta: { label: 'Alta', emoji: '🟠', color: 'text-orange-600', bg: 'bg-orange-50' },
  media: { label: 'Média', emoji: '🟡', color: 'text-amber-600', bg: 'bg-amber-50' },
  baixa: { label: 'Baixa', emoji: '🔵', color: 'text-blue-600', bg: 'bg-blue-50' },
};

export const ACTIVITY_TYPE_LABELS = {
  analysis: 'Análise',
  suggestion: 'Sugestão',
  alert: 'Alerta',
  report: 'Relatório',
  routine_check: 'Verificação de Rotina',
  cross_analysis: 'Análise Cruzada',
};

export const AUTONOMY_CONFIG = {
  baixo: { label: 'Baixa', color: 'text-red-600', bg: 'bg-red-50' },
  medio: { label: 'Média', color: 'text-amber-600', bg: 'bg-amber-50' },
  alto: { label: 'Alta', color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

export const CONFIDENCE_CONFIG = {
  alta: { label: 'Alta', emoji: '🟢', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  media: { label: 'Média', emoji: '🟡', color: 'text-amber-600', bg: 'bg-amber-50' },
  baixa: { label: 'Baixa', emoji: '🔴', color: 'text-red-600', bg: 'bg-red-50' },
};