import { base44 } from "@/api/base44Client";

export const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export const DEFAULT_UNITS = [
  { name: "Quilograma", abbreviation: "kg" },
  { name: "Grama", abbreviation: "g" },
  { name: "Litro", abbreviation: "L" },
  { name: "Mililitro", abbreviation: "ml" },
  { name: "Unidade", abbreviation: "un" },
  { name: "Caixa", abbreviation: "cx" },
  { name: "Pacote", abbreviation: "pct" },
  { name: "Saco", abbreviation: "sco" },
  { name: "Fardo", abbreviation: "far" },
  { name: "Balde", abbreviation: "bld" },
];

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