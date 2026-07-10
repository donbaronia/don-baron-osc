import { base44 } from "@/api/base44Client";

const invoke = (payload) => base44.functions.invoke('baronKernel', payload).then((r) => r.data);

export const BaronKernel = {
  boot: () => invoke({ action: 'boot' }),
  getDashboard: () => invoke({ action: 'getDashboard' }),
  listModules: () => invoke({ action: 'listModules' }),
  updateModule: (id, data) => invoke({ action: 'updateModule', id, data }),
  restartModule: (id) => invoke({ action: 'restartModule', id }),
  isolateModule: (id, reason) => invoke({ action: 'isolateModule', id, reason }),
  listServices: () => invoke({ action: 'listServices' }),
  runHealthCheck: () => invoke({ action: 'runHealthCheck' }),
  getHealthChecks: () => invoke({ action: 'getHealthChecks' }),
  getTelemetry: () => invoke({ action: 'getTelemetry' }),
  getLicense: () => invoke({ action: 'getLicense' }),
  updateLicense: (id, data) => invoke({ action: 'updateLicense', id, data }),
  getMaintenance: () => invoke({ action: 'getMaintenance' }),
  toggleMaintenance: (reason, message) => invoke({ action: 'toggleMaintenance', reason, message }),
  getCentralConfig: () => invoke({ action: 'getCentralConfig' }),
  updateCentralConfig: (key, value, category, description) => invoke({ action: 'updateCentralConfig', key, value, category, description }),
};

export const MODULE_STATUS_CONFIG = {
  active: { label: "Ativo", color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  registered: { label: "Registrado", color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-200", dot: "bg-blue-500" },
  loading: { label: "Carregando", color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200", dot: "bg-amber-500" },
  degraded: { label: "Degradado", color: "text-orange-600", bg: "bg-orange-50", ring: "ring-orange-200", dot: "bg-orange-500" },
  isolated: { label: "Isolado", color: "text-purple-600", bg: "bg-purple-50", ring: "ring-purple-200", dot: "bg-purple-500" },
  failed: { label: "Falhou", color: "text-red-600", bg: "bg-red-50", ring: "ring-red-200", dot: "bg-red-500" },
  inactive: { label: "Inativo", color: "text-neutral-500", bg: "bg-neutral-100", ring: "ring-neutral-200", dot: "bg-neutral-400" },
};

export const HEALTH_STATUS_CONFIG = {
  healthy: { label: "Saudável", color: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  degraded: { label: "Degradado", color: "text-orange-600", bg: "bg-orange-50", dot: "bg-orange-500" },
  unhealthy: { label: "Crítico", color: "text-red-600", bg: "bg-red-50", dot: "bg-red-500" },
  unknown: { label: "Desconhecido", color: "text-neutral-500", bg: "bg-neutral-100", dot: "bg-neutral-400" },
};

export const LICENSE_PLAN_LABELS = {
  free: "Gratuito",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export const BOOT_STEPS = [
  "Validar Licença",
  "Carregar Configurações",
  "Conectar Banco",
  "Carregar Módulos Ativos",
  "Carregar Event Bus",
  "Carregar Workflow",
  "Carregar BARON AI",
  "Carregar Dashboard",
  "Registrar Saúde do Sistema",
  "Liberar Usuários",
];