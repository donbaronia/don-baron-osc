import { base44 } from "@/api/base44Client";

export const EnterprisePlanning = {
  getDashboard: () => base44.functions.invoke('enterprisePlanning', { action: 'getDashboard' }).then(r => r.data),
  getKPIs: () => base44.functions.invoke('enterprisePlanning', { action: 'getKPIs' }).then(r => r.data),
  getRoadmap: () => base44.functions.invoke('enterprisePlanning', { action: 'getRoadmap' }).then(r => r.data),
  init: () => base44.functions.invoke('enterprisePlanning', { action: 'init' }).then(r => r.data),
  aiExecutiveBriefing: () => base44.functions.invoke('enterprisePlanning', { action: 'aiExecutiveBriefing' }).then(r => r.data),
  aiCompareScenarios: (scenario_ids) => base44.functions.invoke('enterprisePlanning', { action: 'aiCompareScenarios', scenario_ids }).then(r => r.data),
  aiRiskAnalysis: () => base44.functions.invoke('enterprisePlanning', { action: 'aiRiskAnalysis' }).then(r => r.data),
};

export const PLAN_TYPE_CONFIG = {
  diario: { label: 'Diário', emoji: '📅' },
  semanal: { label: 'Semanal', emoji: '🗓️' },
  mensal: { label: 'Mensal', emoji: '📆' },
  trimestral: { label: 'Trimestral', emoji: '📊' },
  semestral: { label: 'Semestral', emoji: '📈' },
  anual: { label: 'Anual', emoji: '🎯' },
  plurianual: { label: 'Plurianual', emoji: '🚀' },
};

export const PLAN_STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', color: 'text-neutral-500', bg: 'bg-neutral-100' },
  aprovado: { label: 'Aprovado', color: 'text-blue-600', bg: 'bg-blue-50' },
  em_execucao: { label: 'Em Execução', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  concluido: { label: 'Concluído', color: 'text-purple-600', bg: 'bg-purple-50' },
  revisado: { label: 'Revisado', color: 'text-amber-600', bg: 'bg-amber-50' },
  arquivado: { label: 'Arquivado', color: 'text-neutral-400', bg: 'bg-neutral-50' },
};

export const GOAL_SCOPE_CONFIG = {
  empresa: { label: 'Empresa', emoji: '🏢' },
  filial: { label: 'Filial', emoji: '🏪' },
  departamento: { label: 'Departamento', emoji: 'department'.replace('department', '📂') },
  equipe: { label: 'Equipe', emoji: '👥' },
  colaborador: { label: 'Colaborador', emoji: '👤' },
  indicador: { label: 'Indicador', emoji: '📊' },
  produto: { label: 'Produto', emoji: '🍔' },
  categoria: { label: 'Categoria', emoji: '🏷️' },
  fornecedor: { label: 'Fornecedor', emoji: '🚚' },
};

export const GOAL_STATUS_CONFIG = {
  nao_iniciada: { label: 'Não Iniciada', color: 'text-neutral-500', bg: 'bg-neutral-100' },
  em_andamento: { label: 'Em Andamento', color: 'text-blue-600', bg: 'bg-blue-50' },
  concluida: { label: 'Concluída', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  atrasada: { label: 'Atrasada', color: 'text-red-600', bg: 'bg-red-50' },
  cancelada: { label: 'Cancelada', color: 'text-neutral-400', bg: 'bg-neutral-50' },
};

export const PRIORITY_CONFIG = {
  baixa: { label: 'Baixa', color: 'text-neutral-500', bg: 'bg-neutral-100' },
  media: { label: 'Média', color: 'text-blue-600', bg: 'bg-blue-50' },
  alta: { label: 'Alta', color: 'text-amber-600', bg: 'bg-amber-50' },
  critica: { label: 'Crítica', color: 'text-red-600', bg: 'bg-red-50' },
};

export const BUDGET_TYPE_CONFIG = {
  receita: { label: 'Receita', emoji: '💰', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  despesa: { label: 'Despesa', emoji: '💸', color: 'text-red-600', bg: 'bg-red-50' },
  investimento: { label: 'Investimento', emoji: '📈', color: 'text-blue-600', bg: 'bg-blue-50' },
  capex: { label: 'Capex', emoji: '🏗️', color: 'text-purple-600', bg: 'bg-purple-50' },
  opex: { label: 'Opex', emoji: '⚙️', color: 'text-amber-600', bg: 'bg-amber-50' },
};

export const BUDGET_STATUS_CONFIG = {
  previsto: { label: 'Previsto', color: 'text-neutral-500', bg: 'bg-neutral-100' },
  em_execucao: { label: 'Em Execução', color: 'text-blue-600', bg: 'bg-blue-50' },
  realizado: { label: 'Realizado', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  desviado: { label: 'Desviado', color: 'text-red-600', bg: 'bg-red-50' },
};

export const PROJECT_TYPE_CONFIG = {
  nova_loja: { label: 'Nova Loja', emoji: '🏪' },
  nova_marca: { label: 'Nova Marca', emoji: '✨' },
  novo_produto: { label: 'Novo Produto', emoji: '🍔' },
  reforma: { label: 'Reforma', emoji: '🔧' },
  equipamento: { label: 'Equipamento', emoji: '⚙️' },
  automacao: { label: 'Automação', emoji: '🤖' },
  marketing: { label: 'Marketing', emoji: '📣' },
  outros: { label: 'Outros', emoji: '📋' },
};

export const PROJECT_STATUS_CONFIG = {
  planejado: { label: 'Planejado', color: 'text-neutral-500', bg: 'bg-neutral-100' },
  em_andamento: { label: 'Em Andamento', color: 'text-blue-600', bg: 'bg-blue-50' },
  concluido: { label: 'Concluído', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  pausado: { label: 'Pausado', color: 'text-amber-600', bg: 'bg-amber-50' },
  cancelado: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50' },
};

export const SCENARIO_TYPE_CONFIG = {
  preco: { label: 'Preço', emoji: '💲' },
  fornecedor: { label: 'Fornecedor', emoji: '🚚' },
  contratacao: { label: 'Contratação', emoji: '👤' },
  expansao: { label: 'Expansão', emoji: '🏪' },
  equipamento: { label: 'Equipamento', emoji: '⚙️' },
  desperdicio: { label: 'Desperdício', emoji: '♻️' },
  comissao: { label: 'Comissão', emoji: '💵' },
  outros: { label: 'Outros', emoji: '📋' },
};

export const SCENARIO_STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', color: 'text-neutral-500', bg: 'bg-neutral-100' },
  simulado: { label: 'Simulado', color: 'text-blue-600', bg: 'bg-blue-50' },
  aprovado: { label: 'Aprovado', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  rejeitado: { label: 'Rejeitado', color: 'text-red-600', bg: 'bg-red-50' },
};

export const OKR_STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', color: 'text-neutral-500', bg: 'bg-neutral-100' },
  em_andamento: { label: 'Em Andamento', color: 'text-blue-600', bg: 'bg-blue-50' },
  concluido: { label: 'Concluído', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  atrasado: { label: 'Atrasado', color: 'text-red-600', bg: 'bg-red-50' },
};

export const KPI_CATEGORY_CONFIG = {
  financeiro: { label: 'Financeiro', emoji: '💰', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  operacional: { label: 'Operacional', emoji: '⚙️', color: 'text-blue-600', bg: 'bg-blue-50' },
  pessoas: { label: 'Pessoas', emoji: '👥', color: 'text-purple-600', bg: 'bg-purple-50' },
  cliente: { label: 'Cliente', emoji: '😊', color: 'text-amber-600', bg: 'bg-amber-50' },
};

export const KPI_STATUS_CONFIG = {
  acima_meta: { label: 'Acima da Meta', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  na_meta: { label: 'Na Meta', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  abaixo_meta: { label: 'Abaixo da Meta', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  critico: { label: 'Crítico', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
};

export const ROADMAP_TYPE_CONFIG = {
  meta: { label: 'Meta', emoji: '🎯', color: 'text-blue-600', bg: 'bg-blue-50' },
  projeto: { label: 'Projeto', emoji: '📋', color: 'text-purple-600', bg: 'bg-purple-50' },
  expansao: { label: 'Expansão', emoji: '🏪', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  investimento: { label: 'Investimento', emoji: '📈', color: 'text-amber-600', bg: 'bg-amber-50' },
  outros: { label: 'Outros', emoji: '📌', color: 'text-neutral-500', bg: 'bg-neutral-100' },
};

export const ROADMAP_STATUS_CONFIG = {
  planejado: { label: 'Planejado', color: 'text-neutral-500', bg: 'bg-neutral-100' },
  em_andamento: { label: 'Em Andamento', color: 'text-blue-600', bg: 'bg-blue-50' },
  concluido: { label: 'Concluído', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  atrasado: { label: 'Atrasado', color: 'text-red-600', bg: 'bg-red-50' },
};

export function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
}