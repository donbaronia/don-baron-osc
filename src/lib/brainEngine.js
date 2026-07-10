import { base44 } from "@/api/base44Client";

const invoke = (payload) => base44.functions.invoke('baronBrain', payload).then((r) => r.data);

export const BaronBrain = {
  seedAgents: () => invoke({ action: 'seedAgents' }),
  ask: (question) => invoke({ action: 'ask', question }),
  simulate: (scenario) => invoke({ action: 'simulate', scenario }),
  getDashboard: () => invoke({ action: 'getDashboard' }),
  listAgents: () => invoke({ action: 'listAgents' }),
  listConversations: () => invoke({ action: 'listConversations' }),
  getConversation: (id) => invoke({ action: 'getConversation', id }),
  listAlerts: () => invoke({ action: 'listAlerts' }),
  generateAlerts: () => invoke({ action: 'generateAlerts' }),
  acknowledgeAlert: (id, status) => invoke({ action: 'acknowledgeAlert', id, status }),
  listLearnings: () => invoke({ action: 'listLearnings' }),
  listMemory: (agent_key) => invoke({ action: 'listMemory', agent_key }),
  provideFeedback: (conversation_id, feedback, comment) => invoke({ action: 'provideFeedback', conversation_id, feedback, comment }),
};

export const DIRECTORATE_CONFIG = {
  kernel: { label: "CEO AI", emoji: "👑", color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200", border: "border-amber-200" },
  financeira: { label: "Diretoria Financeira", emoji: "💰", color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200", border: "border-emerald-200" },
  operacional: { label: "Diretoria Operacional", emoji: "⚙️", color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-200", border: "border-blue-200" },
  pessoas: { label: "Diretoria de Pessoas", emoji: "👥", color: "text-purple-600", bg: "bg-purple-50", ring: "ring-purple-200", border: "border-purple-200" },
  comercial: { label: "Diretoria Comercial", emoji: "📊", color: "text-orange-600", bg: "bg-orange-50", ring: "ring-orange-200", border: "border-orange-200" },
  dados: { label: "Diretoria de Dados", emoji: "📈", color: "text-cyan-600", bg: "bg-cyan-50", ring: "ring-cyan-200", border: "border-cyan-200" },
};

export const DIRECTORATE_ORDER = ["kernel", "financeira", "operacional", "pessoas", "comercial", "dados"];

export const CONFIDENCE_CONFIG = {
  alta: { label: "Alta", color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200", dot: "bg-emerald-500", emoji: "🟢" },
  media: { label: "Média", color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200", dot: "bg-amber-500", emoji: "🟡" },
  baixa: { label: "Baixa", color: "text-red-600", bg: "bg-red-50", ring: "ring-red-200", dot: "bg-red-500", emoji: "🔴" },
};

export const SEVERITY_CONFIG = {
  critica: { label: "Crítica", color: "text-red-600", bg: "bg-red-50", dot: "bg-red-500", emoji: "🔴" },
  alta: { label: "Alta", color: "text-orange-600", bg: "bg-orange-50", dot: "bg-orange-500", emoji: "🟠" },
  media: { label: "Média", color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-500", emoji: "🟡" },
  baixa: { label: "Baixa", color: "text-blue-600", bg: "bg-blue-50", dot: "bg-blue-500", emoji: "🔵" },
};

export const ALERT_TYPE_LABELS = {
  price_change: "Alteração de Preço",
  margin_drop: "Queda de Margem",
  stock_critical: "Estoque Crítico",
  cashflow_negative: "Fluxo de Caixa Negativo",
  opportunity: "Oportunidade",
  risk: "Risco",
  supplier_change: "Mudança de Fornecedor",
  recipe_change: "Mudança de Receita",
  schedule_change: "Mudança de Escala",
  performance_drop: "Queda de Performance",
};

export const MEMORY_TYPE_LABELS = {
  decision: "Decisão",
  learning: "Aprendizado",
  best_practice: "Boa Prática",
  error: "Erro",
  result: "Resultado",
  pattern: "Padrão",
  corporate_change: "Mudança Corporativa",
};