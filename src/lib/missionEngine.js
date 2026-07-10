import { base44 } from "@/api/base44Client";

export const MissionControl = {
  init: () => base44.functions.invoke('missionControl', { action: 'init' }).then(r => r.data),
  getDashboard: () => base44.functions.invoke('missionControl', { action: 'getDashboard' }).then(r => r.data),
  listMissions: (status, type, priority) => base44.functions.invoke('missionControl', { action: 'listMissions', status, type, priority }).then(r => r.data),
  getMission: (mission_id) => base44.functions.invoke('missionControl', { action: 'getMission', mission_id }).then(r => r.data),
  createMission: (data) => base44.functions.invoke('missionControl', { action: 'createMission', ...data }).then(r => r.data),
  updateMission: (mission_id, updates) => base44.functions.invoke('missionControl', { action: 'updateMission', mission_id, ...updates }).then(r => r.data),
  decomposeMission: (mission_id) => base44.functions.invoke('missionControl', { action: 'decomposeMission', mission_id }).then(r => r.data),
  updateTask: (task_id, updates) => base44.functions.invoke('missionControl', { action: 'updateTask', task_id, ...updates }).then(r => r.data),
  toggleChecklist: (checklist_id) => base44.functions.invoke('missionControl', { action: 'toggleChecklist', checklist_id }).then(r => r.data),
  autoCreate: () => base44.functions.invoke('missionControl', { action: 'autoCreate' }).then(r => r.data),
  completeMission: (mission_id) => base44.functions.invoke('missionControl', { action: 'completeMission', mission_id }).then(r => r.data),
  getWarRoom: () => base44.functions.invoke('missionControl', { action: 'getWarRoom' }).then(r => r.data),
};

export const MISSION_TYPE_CONFIG = {
  diaria: { label: 'Diária', emoji: '☀️', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  semanal: { label: 'Semanal', emoji: '📅', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  mensal: { label: 'Mensal', emoji: '🗓️', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  especial: { label: 'Especial', emoji: '⭐', color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
  emergencial: { label: 'Emergencial', emoji: '🚨', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  estrategica: { label: 'Estratégica', emoji: '🎯', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
};

export const PRIORITY_CONFIG = {
  baixa: { label: 'Baixa', color: 'text-neutral-600', bg: 'bg-neutral-100', border: 'border-neutral-200' },
  media: { label: 'Média', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  alta: { label: 'Alta', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  critica: { label: 'Crítica', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

export const MISSION_STATUS_CONFIG = {
  planejada: { label: 'Planejada', color: 'text-neutral-600', bg: 'bg-neutral-100', dot: 'bg-neutral-400' },
  em_andamento: { label: 'Em Andamento', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  concluida: { label: 'Concluída', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  atrasada: { label: 'Atrasada', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
  cancelada: { label: 'Cancelada', color: 'text-neutral-400', bg: 'bg-neutral-50', dot: 'bg-neutral-300' },
  pausada: { label: 'Pausada', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
};

export const TASK_STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: 'text-neutral-600', bg: 'bg-neutral-100' },
  em_andamento: { label: 'Em Andamento', color: 'text-blue-600', bg: 'bg-blue-50' },
  concluida: { label: 'Concluída', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  bloqueada: { label: 'Bloqueada', color: 'text-red-600', bg: 'bg-red-50' },
  cancelada: { label: 'Cancelada', color: 'text-neutral-400', bg: 'bg-neutral-50' },
};

export const DEPARTMENT_CONFIG = {
  compras: { label: 'Compras', emoji: '🛒', color: 'text-blue-600', bg: 'bg-blue-50' },
  financeiro: { label: 'Financeiro', emoji: '📊', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  producao: { label: 'Produção', emoji: '🏭', color: 'text-orange-600', bg: 'bg-orange-50' },
  estoque: { label: 'Estoque', emoji: '📦', color: 'text-amber-600', bg: 'bg-amber-50' },
  rh: { label: 'RH', emoji: '👥', color: 'text-purple-600', bg: 'bg-purple-50' },
  logistica: { label: 'Logística', emoji: '🏍️', color: 'text-cyan-600', bg: 'bg-cyan-50' },
  comercial: { label: 'Comercial', emoji: '📈', color: 'text-pink-600', bg: 'bg-pink-50' },
  auditoria: { label: 'Auditoria', emoji: '🔍', color: 'text-red-600', bg: 'bg-red-50' },
  estrategia: { label: 'Estratégia', emoji: '🎯', color: 'text-indigo-600', bg: 'bg-indigo-50' },
};

export const CHECKLIST_TYPE_CONFIG = {
  manual: { label: 'Manual', emoji: '✋', color: 'text-neutral-600', bg: 'bg-neutral-100' },
  automatico: { label: 'Automático', emoji: '⚙️', color: 'text-blue-600', bg: 'bg-blue-50' },
  ia: { label: 'IA', emoji: '🤖', color: 'text-purple-600', bg: 'bg-purple-50' },
  workflow: { label: 'Workflow', emoji: '🔄', color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

export const SEVERITY_CONFIG = {
  critica: { label: 'Crítica', emoji: '🔴', color: 'text-red-600', bg: 'bg-red-50' },
  alta: { label: 'Alta', emoji: '🟠', color: 'text-orange-600', bg: 'bg-orange-50' },
  media: { label: 'Média', emoji: '🟡', color: 'text-amber-600', bg: 'bg-amber-50' },
  baixa: { label: 'Baixa', emoji: '🔵', color: 'text-blue-600', bg: 'bg-blue-50' },
};

export const SCORE_NOTE_CONFIG = {
  'A': { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Excelente' },
  'B': { color: 'text-blue-600', bg: 'bg-blue-50', label: 'Bom' },
  'C': { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Regular' },
  'D': { color: 'text-orange-600', bg: 'bg-orange-50', label: 'Abaixo do esperado' },
  'F': { color: 'text-red-600', bg: 'bg-red-50', label: 'Crítico' },
};