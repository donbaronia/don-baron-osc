/**
 * Classificador Inteligente de Documentos
 *
 * Camada que normaliza a saída da IA em uma decisão de roteamento confiável.
 * Combina o `document_type` informado pela IA com sinais estruturais
 * (has_products, has_payment_info) para:
 *  - Detectar documentos HÍBRIDOS (Nota + Boleto) mesmo quando a IA rotula como um só
 *  - Reduzir a confiança quando o tipo e os dados extraídos não batem
 *  - Decidir se o documento vai direto ao fluxo ou para a fila de Pendências da IA
 *
 * Tudo que sai daqui termina em um estado claro:
 *  - confidence >= LIMIAR → roteia automaticamente
 *  - confidence <  LIMIAR → needs_human_review = true (vai para Pendências da IA)
 */

// Limiar de confiança para roteamento automático. Abaixo disso → revisão humana.
export const CLASSIFICATION_THRESHOLD = 85;

// Tipos canônicos de roteamento (decidem qual fluxo executar)
export const DOC_TYPES = {
  BOLETO: "boleto",
  NOTA_FISCAL: "nota_fiscal",
  NOTA_BOLETO: "nota_boleto",
  CUPOM_FISCAL: "cupom_fiscal",
  XML: "xml",
  ORCAMENTO: "orcamento",
  COMPROVANTE_PIX: "comprovante_pix",
  COMPROVANTE_BANCARIO: "comprovante_bancario",
  PEDIDO_COMPRA: "pedido_compra",
  OUTROS: "outros",
};

// Tipos que disparam o FLUXO FINANCEIRO (criar Contas a Pagar + anexar boleto)
export const FINANCIAL_TYPES = ["boleto", "comprovante_pix", "comprovante_bancario", "nota_boleto"];
// Tipos que disparam o FLUXO DE ESTOQUE (atualizar estoque + custo médio + CMV)
export const STOCK_TYPES = ["nota_fiscal", "cupom_fiscal", "xml", "nota_boleto"];

export const PAYMENT_TYPES = ["boleto", "comprovante_pix", "comprovante_bancario"];

const META = {
  boleto: { label: "Boleto Bancário", emoji: "📄", flow: "financeiro" },
  nota_fiscal: { label: "Nota Fiscal (DANFE)", emoji: "🧾", flow: "estoque" },
  nota_boleto: { label: "Nota + Boleto (Híbrido)", emoji: "🔀", flow: "híbrido" },
  cupom_fiscal: { label: "Cupom Fiscal", emoji: "🧾", flow: "estoque" },
  xml: { label: "XML", emoji: "📄", flow: "estoque" },
  orcamento: { label: "Orçamento", emoji: "💵", flow: "outros" },
  comprovante_pix: { label: "Comprovante PIX", emoji: "💸", flow: "financeiro" },
  comprovante_bancario: { label: "Comprovante Bancário", emoji: "🏦", flow: "financeiro" },
  pedido_compra: { label: "Pedido de Compra", emoji: "🛒", flow: "compras" },
  outros: { label: "Outros", emoji: "📎", flow: "outros" },
};

export function classificationMeta(type) {
  return META[type] || META.outros;
}

/**
 * Classifica o documento a partir da saída extraída pela IA.
 * Retorna a decisão de roteamento normalizada.
 */
export function classifyDocument(extracted) {
  if (!extracted) {
    return {
      routed_type: "outros",
      confidence: 0,
      reasons: ["Extração falhou — não foi possível classificar"],
      needs_human_review: true,
      has_products: false,
      has_payment: false,
    };
  }

  const rawType = (extracted.document_type || "outros").toLowerCase();
  const hasProducts =
    !!extracted.has_products || (Array.isArray(extracted.products) && extracted.products.length > 0);
  const hasPayment =
    !!extracted.has_payment_info ||
    !!(extracted.linha_digitavel || extracted.codigo_barras || extracted.pix_copia_cola);
  let confidence = Math.max(0, Math.min(100, Number(extracted.classification_confidence ?? 70)));
  const reasons = [];
  if (extracted.classification_reasoning) reasons.push(extracted.classification_reasoning);

  let routedType = rawType;

  // 1) Detecção de HÍBRIDO: a IA rotulou como um tipo só, mas há produtos E pagamento.
  if (hasProducts && hasPayment && routedType !== "nota_boleto") {
    if (["nota_fiscal", "boleto", "comprovante_pix", "comprovante_bancario", "cupom_fiscal"].includes(routedType)) {
      routedType = "nota_boleto";
      confidence = Math.min(confidence, 60);
      reasons.push(
        "Documento contém produtos E dados de pagamento (boleto/PIX) — reclassificado como híbrido Nota+Boleto."
      );
    }
  }

  // 2) Híbrido declarado sem sinais consistententes → confiança baixa.
  if (routedType === "nota_boleto" && !hasProducts && !hasPayment) {
    confidence = Math.min(confidence, 40);
    reasons.push("Classificado como híbrido, mas não foram encontrados produtos nem dados de pagamento.");
  }

  // 3) Tipo financeiro sem dados de pagamento → confiança baixa.
  if (PAYMENT_TYPES.includes(routedType) && !hasPayment) {
    confidence = Math.min(confidence, 50);
    reasons.push("Tipo financeiro sem linha digitável, código de barras ou PIX Copia e Cola.");
  }

  // 4) Tipo fiscal sem produtos → confiança baixa.
  if (["nota_fiscal", "cupom_fiscal"].includes(routedType) && !hasProducts) {
    confidence = Math.min(confidence, 55);
    reasons.push("Tipo fiscal sem produtos extraídos da nota.");
  }

  const needsHumanReview = confidence < CLASSIFICATION_THRESHOLD;

  return {
    routed_type: routedType,
    confidence: Math.round(confidence),
    reasons,
    needs_human_review: needsHumanReview,
    has_products: hasProducts,
    has_payment: hasPayment,
  };
}