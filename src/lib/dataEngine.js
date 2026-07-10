import { base44 } from "@/api/base44Client";

/**
 * Data Engine — Motor Central de Dados do Don Baron OS
 *
 * Fonte unica de verdade para todo o sistema.
 * Nenhum modulo devera criar calculos proprios ou armazenar indicadores proprios.
 * Todo acesso a dados passa exclusivamente por este ponto.
 *
 * Uso:
 *   import { DataEngine } from "@/lib/dataEngine";
 *
 *   const { records } = await DataEngine.getDataset("produtos");
 *   const { result } = await DataEngine.calculate("lucro", { start_date, end_date });
 *   const { timeline } = await DataEngine.getTimeline({ limit: 20 });
 */

async function invoke(action, params = {}) {
  const response = await base44.functions.invoke("dataEngine", { action, ...params });
  return response.data;
}

export const DataEngine = {
  // ===== DATASETS =====
  // Lista de datasets disponiveis no sistema.
  datasets: {
    list: () => invoke("listDatasets"),
    get: (dataset, options = {}) => invoke("getDataset", { dataset, ...options }),
  },

  // ===== MOTOR DE CALCULO =====
  // Unico servico de calculos. Nenhum modulo implementa calculos proprios.
  // Calculos disponiveis: cmv, lucro, margem, fluxo_caixa, ticket_medio,
  // estoque_valor, estoque_critico, indicadores
  calculate: (calculation, options = {}) => invoke("calculate", { calculation, ...options }),
  listCalculations: () => invoke("listCalculations"),

  // ===== SNAPSHOTS =====
  // Snapshots automaticos: diario, semanal, mensal, anual.
  // Servem como cache e para analise historica.
  snapshots: {
    create: (params) => invoke("createSnapshot", params),
    get: (params = {}) => invoke("getSnapshot", params),
  },

  // ===== TIMELINE EMPRESARIAL =====
  // Tudo entra na timeline. Cada evento tem data, origem, responsavel e relacionamentos.
  timeline: {
    get: (params = {}) => invoke("getTimeline", params),
    add: (params) => invoke("addTimelineEntry", params),
  },

  // ===== DATA QUALITY =====
  // Detecta duplicidade, campos obrigatorios, valores negativos, relacionamentos invalidos.
  dataQuality: {
    check: (params = {}) => invoke("checkDataQuality", params),
    getAlerts: (params = {}) => invoke("getQualityAlerts", params),
    resolve: (alert_id) => invoke("resolveAlert", { alert_id }),
  },

  // ===== EXPORTACAO =====
  // Todo dataset preparado para exportacao: csv, json (futuro: excel, pdf)
  export: (dataset, format = "csv") => invoke("exportDataset", { dataset, format }),

  // ===== CACHE =====
  // Estrutura preparada para cache inteligente. Snapshots servem como cache.
  cache: {
    info: () => invoke("getCacheInfo"),
  },
};

export default DataEngine;