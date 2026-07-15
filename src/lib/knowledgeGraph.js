/**
 * DON BARON X — Knowledge Graph corporativo
 *
 * Relaciona produtos, receitas, fornecedores, clientes, funcionários, pedidos,
 * produção, compras, financeiro, motoboys e campanhas. O sistema entende
 * relações, não apenas tabelas.
 *
 * As arestas são criadas automaticamente pelo ActionEngine a cada gravação
 * (linkFromWrite) e podem ser consultadas por neighbors(id).
 */
import { base44 } from "@/api/base44Client";

export const KnowledgeGraph = {
  async link(source, target, relation, ctx = {}) {
    if (!source?.id || !target?.id) return null;
    try {
      return await base44.entities.KnowledgeEdge.create({
        source_type: source.type,
        source_id: source.id,
        source_name: source.name || "",
        target_type: target.type,
        target_id: target.id,
        target_name: target.name || "",
        relation,
        weight: 1,
        context: { ...ctx, created_by: "knowledge_graph" },
        active: true,
      });
    } catch {
      return null;
    }
  },

  async linkByName(source, targetType, targetName, relation, ctx = {}) {
    if (!source?.id || !targetName) return null;
    try {
      const found = await base44.entities[targetType].filter({ name: targetName }, null, 1);
      if (found && found[0]) {
        return this.link(source, { type: targetType, id: found[0].id, name: found[0].name }, relation, ctx);
      }
    } catch {}
    // Mesmo sem encontrar o id, registra a relação nominal (órfão detectável pelo Auditor)
    return this.link(source, { type: targetType, id: `name:${targetName}`, name: targetName }, relation, ctx);
  },

  /**
   * Cria arestas a partir de uma gravação concluída. Best-effort, nunca derruba a ação.
   */
  async linkFromWrite(entity, result, payload, agentKey) {
    const id = result?.id;
    if (!id) return;
    const name = result?.name || payload?.name || payload?.description || payload?.item || "";
    const src = { type: entity, id, name };

    if (entity === "Product") {
      if (payload.primary_supplier_name || payload.supplier) {
        await this.linkByName(src, "Supplier", payload.primary_supplier_name || payload.supplier, "supplied_by", { agent: agentKey });
      }
      if (payload.category) await this.linkByName(src, "Category", payload.category, "in_category", { agent: agentKey });
    }
    if (entity === "Payment" || entity === "FinancialTransaction") {
      if (payload.supplier || payload.supplier_id) {
        await this.linkByName(src, "Supplier", payload.supplier || "", "pay_to", { agent: agentKey });
      }
      if (payload.customer || payload.customer_id) {
        await this.linkByName(src, "Customer", payload.customer || "", "receive_from", { agent: agentKey });
      }
    }
    if (entity === "ProductionRecord" && (result.product_id || payload.product_id)) {
      await this.link(src, { type: "Product", id: result.product_id || payload.product_id }, "produces", { agent: agentKey });
    }
    if (entity === "Purchase" && (payload.supplier_id || payload.supplier)) {
      await this.linkByName(src, "Supplier", payload.supplier || "", "ordered_from", { agent: agentKey });
    }
    if (entity === "Recipe" && (payload.product_id || payload.product_name)) {
      if (payload.product_id) await this.link(src, { type: "Product", id: payload.product_id }, "recipe_for", { agent: agentKey });
    }
  },

  async neighbors(id) {
    try {
      const [asSource, asTarget] = await Promise.all([
        base44.entities.KnowledgeEdge.filter({ source_id: id }, "-created_date", 200).catch(() => []),
        base44.entities.KnowledgeEdge.filter({ target_id: id }, "-created_date", 200).catch(() => []),
      ]);
      return [...(asSource || []), ...(asTarget || [])];
    } catch {
      return [];
    }
  },

  async byRelation(relation, limit = 100) {
    try {
      return await base44.entities.KnowledgeEdge.filter({ relation }, "-created_date", limit);
    } catch {
      return [];
    }
  },
};

export default KnowledgeGraph;