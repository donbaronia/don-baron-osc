/**
 * Filtro central de registros ativos (não deletados).
 *
 * O Base44 inicializa `deleted_at` como `null` em todos os registros
 * (porque o campo é declarado no schema da entidade). Por isso, o filtro
 * MongoDB `{ $exists: false }` NUNCA encontra registros — ele verifica
 * se o campo não existe no documento, mas o campo sempre existe (como null).
 *
 * O filtro correto é `{ deleted_at: null }`, que no MongoDB corresponde a
 * "campo é null OU não existe" — o comportamento esperado para "não deletado".
 *
 * Uso:
 *   import { activeFilter } from '@/lib/activeFilter';
 *   base44.entities.Product.filter({ ...activeFilter, active: true });
 *
 * Se a convenção do Base44 mudar no futuro (deleted, archived_at, etc.),
 * basta alterar este arquivo — todos os módulos que importam o helper
 * passam a usar o novo padrão automaticamente.
 */
export const activeFilter = { deleted_at: null };

/**
 * Retorna um filtro combinado: registros ativos + filtros adicionais.
 *
 * Uso:
 *   base44.entities.Product.filter(activeFilterFor({ active: true }), "name", 500);
 */
export const activeFilterFor = (extra = {}) => ({ ...activeFilter, ...extra });