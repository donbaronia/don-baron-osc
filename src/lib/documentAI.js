import { base44 } from "@/api/base44Client";

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    document_type: {
      type: "string",
      enum: ["nota_fiscal", "boleto", "comprovante_pix", "comprovante_bancario", "contrato", "relatorio_ifood", "relatorio_financeiro", "pedido_compra", "orcamento", "recibo", "outros"],
    },
    supplier: { type: "string", description: "Nome do fornecedor ou emitente" },
    cnpj: { type: "string" },
    document_number: { type: "string" },
    value: { type: "number", description: "Valor total em reais" },
    document_date: { type: "string", description: "Data de emissão no formato AAAA-MM-DD" },
    due_date: { type: "string", description: "Data de vencimento no formato AAAA-MM-DD" },
    bank: { type: "string" },
    linha_digitavel: { type: "string" },
    codigo_barras: { type: "string" },
    pix_copia_cola: { type: "string" },
    beneficiario: { type: "string" },
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "number" },
          unit_price: { type: "number" },
          total: { type: "number" },
        },
      },
    },
    taxes: { type: "number" },
    freight: { type: "number" },
    gross_sales: { type: "number" },
    net_sales: { type: "number" },
    discounts: { type: "number" },
    campaigns: { type: "number" },
    fees: { type: "number" },
    order_count: { type: "number" },
    average_ticket: { type: "number" },
    period_start: { type: "string" },
    period_end: { type: "string" },
    notes: { type: "string" },
  },
};

const PROMPT = `Você é um especialista em análise de documentos fiscais e financeiros brasileiros.

Analise o documento enviado e extraia TODAS as informações relevantes.

Primeiro, identifique o tipo do documento:
- nota_fiscal: Nota Fiscal (NFe, NFCe, NFS-e, cupom fiscal)
- boleto: Boleto Bancário
- comprovante_pix: Comprovante de transferência PIX
- comprovante_bancario: Comprovante bancário (transferência, depósito)
- contrato: Contrato
- relatorio_ifood: Relatório de vendas do iFood
- relatorio_financeiro: Relatório financeiro em geral
- pedido_compra: Pedido de compra
- orcamento: Orçamento
- recibo: Recibo
- outros: Qualquer outro tipo

CAMPOS GERAIS — extraia sempre que disponível:
- Fornecedor/emitente (nome completo da empresa)
- CNPJ (apenas números ou formatado)
- Número do documento
- Valor total em reais (número)
- Data de emissão (formato AAAA-MM-DD)
- Data de vencimento (formato AAAA-MM-DD)

PARA BOLETOS — extraia additionally:
- Banco emissor
- Linha digitável (dígitos)
- Código de barras (números)
- Beneficiário (quem recebe o pagamento)
- PIX Copia e Cola (se houver um código PIX no documento)

PARA NOTAS FISCAIS — extraia additionally:
- Lista de produtos: nome, quantidade, valor unitário, valor total
- Impostos (ICMS, ISS, etc.)
- Frete

PARA RELATÓRIOS IFOOD — extraia additionally:
- Venda Bruta
- Venda Líquida
- Descontos
- Campanhas
- Taxas iFood
- Quantidade de pedidos
- Ticket Médio
- Data inicial e final do período

Use string vazia para campos não encontrados. Para datas, use SEMPRE o formato AAAA-MM-DD. Para valores, use números (não strings).`;

export async function analyzeDocument(file_url) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: PROMPT,
    file_urls: [file_url],
    response_json_schema: EXTRACTION_SCHEMA,
  });
  return result;
}

export function mapExtractedToDocument(data) {
  if (!data) return {};
  return {
    category: data.document_type || "outros",
    supplier: data.supplier || "",
    cnpj: data.cnpj || "",
    document_number: data.document_number || "",
    value: data.value || 0,
    document_date: data.document_date || "",
    due_date: data.due_date || "",
    bank: data.bank || "",
    linha_digitavel: data.linha_digitavel || "",
    codigo_barras: data.codigo_barras || "",
    pix_copia_cola: data.pix_copia_cola || "",
    beneficiario: data.beneficiario || "",
    products: data.products || [],
    taxes: data.taxes || 0,
    freight: data.freight || 0,
    gross_sales: data.gross_sales || 0,
    net_sales: data.net_sales || 0,
    discounts: data.discounts || 0,
    campaigns: data.campaigns || 0,
    fees: data.fees || 0,
    order_count: data.order_count || 0,
    average_ticket: data.average_ticket || 0,
    period_start: data.period_start || "",
    period_end: data.period_end || "",
    notes: data.notes || "",
  };
}