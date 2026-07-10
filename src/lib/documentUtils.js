export const DOCUMENT_CATEGORIES = [
  { value: "nota_fiscal", label: "Nota Fiscal", emoji: "🧾" },
  { value: "boleto", label: "Boleto", emoji: "📄" },
  { value: "comprovante_pix", label: "Comprovante PIX", emoji: "💸" },
  { value: "comprovante_bancario", label: "Comprovante Bancário", emoji: "🏦" },
  { value: "contrato", label: "Contrato", emoji: "📋" },
  { value: "relatorio_ifood", label: "Relatório iFood", emoji: "📱" },
  { value: "relatorio_financeiro", label: "Relatório Financeiro", emoji: "📊" },
  { value: "pedido_compra", label: "Pedido de Compra", emoji: "🛒" },
  { value: "orcamento", label: "Orçamento", emoji: "💵" },
  { value: "recibo", label: "Recibo", emoji: "🧾" },
  { value: "outros", label: "Outros", emoji: "📎" },
];

export const DOCUMENT_STATUSES = [
  { value: "recebido", label: "Recebido" },
  { value: "em_analise", label: "Em Análise" },
  { value: "aguardando_confirmacao", label: "Aguardando Confirmação" },
  { value: "processado", label: "Processado" },
  { value: "arquivado", label: "Arquivado" },
  { value: "rejeitado", label: "Rejeitado" },
];

export const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png,.heic,.xml,.xlsx,.xls,.csv,.txt,.zip";

export function formatBRL(n) {
  return (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("pt-BR");
}

export function getCategoryLabel(value) {
  return DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label || value || "—";
}

export function getCategoryEmoji(value) {
  return DOCUMENT_CATEGORIES.find((c) => c.value === value)?.emoji || "📎";
}

export function getStatusLabel(value) {
  return DOCUMENT_STATUSES.find((s) => s.value === value)?.label || value || "—";
}

export function isImageFile(fileType, fileUrl) {
  if (!fileType && !fileUrl) return false;
  const ext = (fileUrl || "").split("?")[0].split(".").pop()?.toLowerCase();
  return (fileType || "").startsWith("image/") || ["jpg", "jpeg", "png", "heic", "gif", "webp"].includes(ext);
}

export function isPDFFile(fileType, fileUrl) {
  if (!fileType && !fileUrl) return false;
  const ext = (fileUrl || "").split("?")[0].split(".").pop()?.toLowerCase();
  return (fileType || "") === "application/pdf" || ext === "pdf";
}

export function searchDocuments(documents, query) {
  if (!query) return documents;
  const q = query.toLowerCase().trim();
  return documents.filter((d) => {
    const text = [
      d.title, d.supplier, d.cnpj, d.document_number, d.category,
      d.notes, d.annotations, d.bank, d.linha_digitavel,
      d.codigo_barras, d.beneficiario, d.pix_copia_cola,
      d.value?.toString(), d.gross_sales?.toString(), d.net_sales?.toString(),
      ...(d.tags || []),
      d.extracted_data ? JSON.stringify(d.extracted_data) : "",
    ].filter(Boolean).join(" ").toLowerCase();
    return text.includes(q);
  });
}