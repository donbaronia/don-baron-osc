import { base44 } from "@/api/base44Client";

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    document_type: {
      type: "string",
      "enum": ["nota_fiscal", "boleto", "comprovante_pix", "comprovante_bancario", "contrato", "relatorio_ifood", "relatorio_financeiro", "relatorio_bancario", "pedido_compra", "orcamento", "recibo", "xml", "planilha", "imagem", "documento_interno", "outros"],
    },
    supplier: { type: "string", description: "Nome do fornecedor ou emitente" },
    cnpj: { type: "string" },
    cpf: { type: "string" },
    document_number: { type: "string" },
    chave_nota: { type: "string", description: "Chave de acesso da NFe (44 digitos)" },
    value: { type: "number", description: "Valor total em reais" },
    document_date: { type: "string", description: "Data de emissao AAAA-MM-DD" },
    due_date: { type: "string", description: "Data de vencimento AAAA-MM-DD" },
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
    ia_summary: { type: "string", description: "Resumo conciso do documento em portugues (max 200 caracteres)" },
    suggested_tags: {
      type: "array",
      items: { type: "string" },
      description: "Tags inteligentes: Urgente, Imposto, Producao, Estoque, Compra, Pagamento, Contrato, Investimento, Equipamento, RH",
    },
    classification_flow: {
      type: "array",
      items: {
        type: "object",
        properties: {
          step: { type: "string", description: "Modulo/entidade destino" },
          description: { type: "string" },
        },
      },
      description: "Fluxo de classificacao sugerido (ex: Fornecedor -> Compra -> Estoque -> Financeiro -> CMV)",
    },
  },
};

const PROMPT = `Voce e um especialista em analise de documentos fiscais e financeiros brasileiros.

Analise o documento enviado e extraia TODAS as informacoes relevantes.

Primeiro, identifique o tipo do documento:
- nota_fiscal: Nota Fiscal (NFe, NFCe, NFS-e, cupom fiscal, DANFE)
- boleto: Boleto Bancario
- comprovante_pix: Comprovante de transferencia PIX
- comprovante_bancario: Comprovante bancario (transferencia, deposito)
- contrato: Contrato
- relatorio_ifood: Relatorio de vendas do iFood
- relatorio_financeiro: Relatorio financeiro em geral
- relatorio_bancario: Extrato ou relatorio bancario
- pedido_compra: Pedido de compra
- orcamento: Orcamento
- recibo: Recibo
- xml: Arquivo XML (NFe, CT-e, etc)
- planilha: Planilha (Excel, CSV)
- imagem: Imagem ou captura de tela
- documento_interno: Documento interno da empresa
- outros: Qualquer outro tipo

CAMPOS GERAIS — extraia sempre que disponivel:
- Fornecedor/emitente (nome completo da empresa)
- CNPJ (apenas numeros ou formatado)
- CPF (se pessoa fisica)
- Numero do documento
- Chave de acesso da NFe (44 digitos, se houver)
- Valor total em reais (numero)
- Data de emissao (formato AAAA-MM-DD)
- Data de vencimento (formato AAAA-MM-DD)

PARA BOLETOS — extraia additionally:
- Banco emissor
- Linha digitavel (digitos)
- Codigo de barras (numeros)
- Beneficiario (quem recebe)
- PIX Copia e Cola (se houver)

PARA NOTAS FISCAIS — extraia additionally:
- Lista de produtos: nome, quantidade, valor unitario, valor total
- Impostos (ICMS, ISS, etc.)
- Frete

PARA RELATORIOS IFOOD — extraia additionally:
- Venda Bruta, Venda Liquida, Descontos, Campanhas, Taxas, Qtd pedidos, Ticket medio, Periodo

ADICIONALMENTE, para TODOS os documentos:
- ia_summary: Um resumo conciso do documento (max 200 caracteres) em portugues
- suggested_tags: Sugira 1-5 tags inteligentes baseadas no conteudo. Use estas quando aplicavel: Urgente, Imposto, Producao, Estoque, Compra, Pagamento, Contrato, Investimento, Equipamento, RH
- classification_flow: Sugira o fluxo de processamento. Exemplos:
  - Nota Fiscal: [{step:"Fornecedor",description:"Cadastrar/atualizar fornecedor"},{step:"Compra",description:"Registrar compra"},{step:"Estoque",description:"Dar entrada no estoque"},{step:"Financeiro",description:"Criar conta a pagar"},{step:"CMV",description:"Atualizar custo medio"}]
  - Boleto: [{step:"Financeiro",description:"Criar conta a pagar"},{step:"Fluxo de Caixa",description:"Agendar pagamento"}]

Use string vazia para campos nao encontrados. Para datas, use SEMPRE o formato AAAA-MM-DD. Para valores, use numeros (nao strings).`;

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
    cpf: data.cpf || "",
    document_number: data.document_number || "",
    chave_nota: data.chave_nota || "",
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
    ia_summary: data.ia_summary || "",
    auto_tags: data.suggested_tags || [],
    classification_flow: data.classification_flow || [],
  };
}