import { base44 } from "@/api/base44Client";

/**
 * Document Center — Pipeline central de processamento de documentos.
 *
 * Responsavel por:
 * - Deteccao de duplicatas (mesmo numero + fornecedor)
 * - Deteccao de alteracoes de preco (vs historico)
 * - Deteccao de produtos novos (nao cadastrados)
 * - Geracao de alertas automaticos
 * - Versionamento (reenvio cria nova versao)
 */

/**
 * Verifica se ja existe um documento com o mesmo numero + fornecedor.
 * Retorna o documento original se encontrar.
 */
export async function detectDuplicate(doc) {
  if (!doc.document_number && !doc.chave_nota) return null;
  const existing = await base44.entities.DBDocument.filter(
    { status: { $ne: "rejeitado" }, deleted_at: null },
    "-created_date",
    200
  ).catch(() => []);

  return existing.find((d) => {
    if (d.id === doc.id) return false;
    if (doc.chave_nota && d.chave_nota && d.chave_nota === doc.chave_nota) return true;
    if (doc.document_number && d.supplier && d.document_number === doc.document_number && d.supplier === doc.supplier) return true;
    return false;
  }) || null;
}

/**
 * Compara os produtos extraidos com o historico de precos.
 * Retorna array de alteracoes: [{ product_name, old_price, new_price, change_pct }]
 */
export async function detectPriceChanges(doc) {
  if (!doc.products || doc.products.length === 0) return [];

  const changes = [];
  for (const product of doc.products) {
    if (!product.name || !product.unit_price) continue;

    const history = await base44.entities.PriceHistory.filter(
      { product_name: { $regex: product.name, $options: "i" } },
      "-date",
      5
    ).catch(() => []);

    if (history.length === 0) continue;

    const lastPrice = history[0].price;
    if (lastPrice && lastPrice > 0) {
      const changePct = ((product.unit_price - lastPrice) / lastPrice) * 100;
      if (Math.abs(changePct) > 5) {
        changes.push({
          product_name: product.name,
          old_price: lastPrice,
          new_price: product.unit_price,
          change_pct: changePct,
        });
      }
    }
  }
  return changes;
}

/**
 * Verifica se os produtos extraidos existem no cadastro de produtos.
 * Retorna nomes de produtos nao cadastrados.
 */
export async function detectNewProducts(doc) {
  if (!doc.products || doc.products.length === 0) return [];

  const allProducts = await base44.entities.Product.filter(
    { active: true },
    "-created_date",
    500
  ).catch(() => []);

  const registeredNames = allProducts.map((p) => (p.name || "").toLowerCase());

  return doc.products
    .filter((p) => p.name && !registeredNames.includes(p.name.toLowerCase()))
    .map((p) => p.name);
}

/**
 * Gera alertas automaticos baseados nos dados extraidos e nas analises.
 */
export function generateAlerts(doc, { duplicate, priceChanges, newProducts }) {
  const alerts = [];

  if (duplicate) {
    alerts.push({
      type: "duplicate",
      severity: "warning",
      message: `Documento duplicado: ja existe no sistema (enviado em ${new Date(duplicate.sent_at || duplicate.created_date).toLocaleDateString("pt-BR")})`,
    });
  }

  if (doc.taxes && doc.value && doc.taxes / doc.value > 0.25) {
    alerts.push({
      type: "high_tax",
      severity: "warning",
      message: `Impostos elevados: ${((doc.taxes / doc.value) * 100).toFixed(1)}% do valor total`,
    });
  }

  if (doc.due_date) {
    const due = new Date(doc.due_date);
    const today = new Date();
    const daysUntil = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) {
      alerts.push({
        type: "overdue",
        severity: "urgent",
        message: `Documento vencido ha ${Math.abs(daysUntil)} dia(s)`,
      });
    } else if (daysUntil <= 3) {
      alerts.push({
        type: "expiring",
        severity: "warning",
        message: `Documento vence em ${daysUntil} dia(s)`,
      });
    }
  }

  for (const change of priceChanges) {
    if (change.change_pct > 20) {
      alerts.push({
        type: "price_increase",
        severity: "urgent",
        message: `${change.product_name}: preco +${change.change_pct.toFixed(0)}% vs historico`,
      });
    } else if (change.change_pct > 5) {
      alerts.push({
        type: "price_increase",
        severity: "warning",
        message: `${change.product_name}: preco +${change.change_pct.toFixed(0)}% vs historico`,
      });
    }
  }

  for (const name of newProducts) {
    alerts.push({
      type: "new_product",
      severity: "info",
      message: `Produto sem cadastro: ${name}`,
    });
  }

  return alerts;
}

/**
 * Pipeline completo: executa todas as analises pos-extracao.
 * Retorna { duplicate, priceChanges, newProducts, alerts, ia_analysis }
 */
export async function runFullAnalysis(doc) {
  const [duplicate, priceChanges, newProducts] = await Promise.all([
    detectDuplicate(doc),
    detectPriceChanges(doc),
    detectNewProducts(doc),
  ]);

  const alerts = generateAlerts(doc, { duplicate, priceChanges, newProducts });

  const ia_analysis = {
    inconsistencies: [],
    price_changes: priceChanges,
    new_products: newProducts,
  };

  if (duplicate) {
    ia_analysis.inconsistencies.push({
      type: "duplicate",
      message: `Documento duplicado detectado`,
      original_id: duplicate.id,
      original_title: duplicate.title,
    });
  }

  return { duplicate, priceChanges, newProducts, alerts, ia_analysis };
}