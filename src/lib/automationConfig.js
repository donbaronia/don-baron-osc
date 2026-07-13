/**
 * Configuração de Automação do BARON — IA Autônoma para Documentos.
 * Carrega/salva os toggles que controlam o nível de autonomia da IA.
 */
import { base44 } from "@/api/base44Client";

export const DEFAULT_CONFIG = {
  auto_approve_boletos: true,
  auto_create_accounts: true,
  auto_approve_nf_known_products: true,
  auto_update_stock: true,
  auto_update_cmv: true,
  learn_aliases: true,
  auto_create_suppliers: false,
  auto_create_products: false,
  min_confidence_auto_approve: 95,
};

export async function loadAutomationConfig() {
  try {
    const list = await base44.entities.AutomationConfig.list("-created_date", 1);
    if (list.length === 0) {
      const created = await base44.entities.AutomationConfig.create(DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG, id: created.id };
    }
    return { ...DEFAULT_CONFIG, ...list[0], id: list[0].id };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveAutomationConfig(config) {
  const { id, ...data } = config;
  if (id) {
    return base44.entities.AutomationConfig.update(id, { ...data, version: (config.version || 1) + 1 });
  }
  return base44.entities.AutomationConfig.create(data);
}