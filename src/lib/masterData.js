import { base44 } from "@/api/base44Client";

export const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export const DEFAULT_UNITS = [
  { name: "Unidade", abbreviation: "UN", category: "unidade", is_default: true },
  { name: "Quilograma", abbreviation: "KG", category: "peso" },
  { name: "Grama", abbreviation: "G", category: "peso" },
  { name: "Litro", abbreviation: "L", category: "volume" },
  { name: "Mililitro", abbreviation: "ML", category: "volume" },
  { name: "Caixa", abbreviation: "CX", category: "embalagem" },
  { name: "Pacote", abbreviation: "PCT", category: "embalagem" },
  { name: "Fardo", abbreviation: "FD", category: "embalagem" },
  { name: "Saco", abbreviation: "SC", category: "embalagem" },
  { name: "Garrafa", abbreviation: "GF", category: "embalagem" },
  { name: "Lata", abbreviation: "LT", category: "embalagem" },
  { name: "Balde", abbreviation: "BD", category: "embalagem" },
  { name: "Bandeja", abbreviation: "BJ", category: "embalagem" },
  { name: "Caixa Master", abbreviation: "CXM", category: "embalagem" },
  { name: "Rolo", abbreviation: "RL", category: "embalagem" },
  { name: "Metro", abbreviation: "M", category: "comprimento" },
  { name: "Centímetro", abbreviation: "CM", category: "comprimento" },
  { name: "Par", abbreviation: "PR", category: "unidade" },
  { name: "Dúzia", abbreviation: "DZ", category: "unidade" },
  { name: "Cento", abbreviation: "CTO", category: "unidade" },
];

/**
 * Converte quantidade entre unidades usando as conversões cadastradas no produto.
 * Ex: 3 caixas → 36 unidades (se 1 CX = 12 UN).
 * Se não houver conversão cadastrada e as unidades forem iguais, retorna o original.
 */
export function convertQuantity(qty, fromUnit, toUnit, conversions) {
  if (!qty || fromUnit === toUnit) return qty;
  const fu = (fromUnit || "").toUpperCase();
  const tu = (toUnit || "").toUpperCase();
  if (fu === tu) return qty;
  const conv = (conversions || []).find((c) => (c.from_unit || "").toUpperCase() === fu && (c.to_unit || "").toUpperCase() === tu);
  if (conv) return qty * conv.factor;
  const rev = (conversions || []).find((c) => (c.from_unit || "").toUpperCase() === tu && (c.to_unit || "").toUpperCase() === fu);
  if (rev) return qty / rev.factor;
  // Sem conversão — retorna original (o BARON perguntará se necessário)
  return qty;
}

export const DEFAULT_CATEGORIES = [
  "Carnes", "Pães", "Laticínios", "Molhos", "Bebidas",
  "Descartáveis", "Limpeza", "Embalagens", "Produção", "Temperos", "Outros",
];

export const DEFAULT_TAGS = [
  "Importado", "Congelado", "Refrigerado", "Promoção", "Produção", "Uso Diário", "Alto Giro",
];

export function formatBRL(n) {
  return (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function generateInternalCode() {
  return `DB-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export function searchProducts(products, query) {
  if (!query) return products;
  const q = query.toLowerCase().trim();
  return products.filter((p) =>
    (p.name || "").toLowerCase().includes(q) ||
    (p.short_name || "").toLowerCase().includes(q) ||
    (p.internal_code || "").toLowerCase().includes(q) ||
    (p.barcode || "").toLowerCase().includes(q) ||
    (p.primary_supplier_name || "").toLowerCase().includes(q) ||
    (p.alternative_supplier_name || "").toLowerCase().includes(q) ||
    (p.category || "").toLowerCase().includes(q) ||
    (p.subcategory || "").toLowerCase().includes(q) ||
    (p.brand || "").toLowerCase().includes(q) ||
    (p.tags || []).some((t) => (t || "").toLowerCase().includes(q))
  );
}

export function searchSuppliers(suppliers, query) {
  if (!query) return suppliers;
  const q = query.toLowerCase().trim();
  return suppliers.filter((s) =>
    (s.name || "").toLowerCase().includes(q) ||
    (s.trade_name || "").toLowerCase().includes(q) ||
    (s.document_number || "").toLowerCase().includes(q) ||
    (s.city || "").toLowerCase().includes(q) ||
    (s.primary_contact || "").toLowerCase().includes(q)
  );
}

// Função chamada automaticamente pelo módulo de Compras quando uma compra é registrada.
// Nunca apagar histórico — cada entrada é permanente.
export async function addPriceHistoryEntry({ product, supplier, price, quantity, unit, user }) {
  await base44.entities.PriceHistory.create({
    product_id: product.id || product._id,
    product_name: product.name,
    supplier_id: supplier.id || supplier._id,
    supplier_name: supplier.name,
    price,
    quantity,
    unit: unit || product.unit || "un",
    date: new Date().toISOString().slice(0, 10),
    user_name: user?.full_name || "Sistema",
  });
}