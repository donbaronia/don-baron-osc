import { base44 } from "@/api/base44Client";

const invoke = (payload) => base44.functions.invoke('apiGateway', payload).then((r) => r.data);

export const IntegrationHub = {
  getCatalog: () => invoke({ action: 'getCatalog' }),
  getDashboard: () => invoke({ action: 'getDashboard' }),
  listIntegrations: (filters = {}) => invoke({ action: 'listIntegrations', ...filters }),
  createIntegration: (data) => invoke({ action: 'createIntegration', data }),
  updateIntegration: (id, data) => invoke({ action: 'updateIntegration', id, data }),
  deleteIntegration: (id) => invoke({ action: 'deleteIntegration', id }),
  testIntegration: (id) => invoke({ action: 'testIntegration', id }),
  publishToExternal: (params) => invoke({ action: 'publishToExternal', ...params }),
  receiveWebhook: (params) => invoke({ action: 'receiveWebhook', ...params }),
  reprocessWebhook: (webhook_id) => invoke({ action: 'reprocessWebhook', webhook_id }),
  reprocessQueue: (queue_id) => invoke({ action: 'reprocessQueue', queue_id }),
  getLogs: (filters = {}) => invoke({ action: 'getLogs', ...filters }),
  listWebhooks: (filters = {}) => invoke({ action: 'listWebhooks', ...filters }),
  listQueue: (filters = {}) => invoke({ action: 'listQueue', ...filters }),
  convertData: (mapping_id, data) => invoke({ action: 'convertData', mapping_id, data }),

  // Data mappings - CRUD direto na entidade
  listMappings: () => base44.entities.DataMapping.filter({}, '-created_date', 200).then((r) => r.data),
  createMapping: (data) => base44.entities.DataMapping.create(data).then((r) => r.data),
  updateMapping: (id, data) => base44.entities.DataMapping.update(id, data).then((r) => r.data),
  deleteMapping: (id) => base44.entities.DataMapping.delete(id).then((r) => r.data),
};

export const INTEGRATION_ICONS = {
  ifood: "🍔",
  saipos: "🍽️",
  cardapio_web: "📋",
  mercado_pago: "💳",
  stone: "💎",
  pagseguro: "🔒",
  pix: "⚡",
  whatsapp_business: "💬",
  google_drive: "📁",
  dropbox: "📦",
  one_drive: "☁️",
  google_calendar: "📅",
  outlook: "📧",
  gmail: "✉️",
  open_finance: "🏦",
  power_bi: "📈",
  meta_ads: "📘",
  google_ads: "🔍",
  nfc_e: "🧾",
  nf_e: "📄",
  sped: "📋",
  custom_api: "🔧",
};

export const CATEGORY_LABELS = {
  delivery: "Delivery",
  payment: "Pagamento",
  storage: "Armazenamento",
  calendar: "Agenda",
  email: "Email",
  ads: "Anúncios",
  fiscal: "Fiscal",
  analytics: "Analytics",
  messaging: "Mensagens",
  finance: "Financeiro",
  custom: "Personalizada",
};

export const STATUS_CONFIG = {
  ativo: { label: "Ativo", color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  inativo: { label: "Inativo", color: "text-neutral-500", bg: "bg-neutral-100", ring: "ring-neutral-200" },
  erro: { label: "Erro", color: "text-red-600", bg: "bg-red-50", ring: "ring-red-200" },
  sandbox: { label: "Sandbox", color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" },
  pendente: { label: "Pendente", color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-200" },
};