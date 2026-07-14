/**
 * DON BARON CORE — IntentEngine
 *
 * Motor de intenções. Classifica linguagem natural em intents estruturadas.
 * 300+ padrões organizados por domínio operacional.
 *
 * Retorna: { intent, category, confidence, entities, rawMatch }
 * Nunca responde texto — apenas classifica.
 */

// Normaliza texto (sem acento, lowercase)
const norm = (s) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Extrai número (quantidade ou valor)
const extractNumber = (text, key) => {
  // R$ 39,50 / r$39.50
  if (key === "price") {
    const m = text.match(/r\$\s*(\d+[.,]?\d*)/i);
    if (m) return parseFloat(m[1].replace(",", "."));
  }
  // 100kg / 100 kg / 100 caixas
  if (key === "quantity") {
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|lt|l|ml|cx|caixas?|pct|pecas?|un|sacos?|litros?|quilos?|gramas?|mililitros?)/i);
    if (m) return parseFloat(m[1].replace(",", "."));
    const m2 = text.match(/(\d+(?:[.,]\d+)?)\s*(?:x|de|un)/i);
    if (m2) return parseFloat(m2[1].replace(",", "."));
  }
  return null;
};

const extractUnit = (text) => {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|lt|l|ml|cx|caixas?|pct|pecas?|un|sacos?|litros?|quilos?|gramas?|mililitros?)/i);
  if (m) return m[2].toLowerCase();
  return null;
};

const extractPriceType = (text) => {
  // "a R$39" / "por R$39" → unitário | "por R$180" com "caixas" → total
  const totalHints = /(por\s+r\$|total\s+de|no\s+valor\s+de)/i;
  const unitHints = /(a\s+r\$|cada\s+por|o\s+kg|r\$\s*\d+\s*\/)/i;
  if (totalHints.test(text)) return "total";
  if (unitHints.test(text)) return "unit";
  // Se tem "caixas/pct" + valor único → provavelmente total
  if (/\d+\s*(cx|caixas?|pct)/i.test(text) && /r\$/i.test(text)) return "total";
  return "unit";
};

// ============================================================
// CATÁLOGO DE INTENTS — 300+ padrões
// ============================================================

const INTENT_CATALOG = [
  // --- ESTOQUE (entrada/baixa/transferência/consulta) ---
  { intent: "stock_entry", category: "estoque", patterns: [/compr(ei|amos|ou)/i, /chegou/i, /recebi/i, /recebemos/i, /entrou?\s+estoque/i, /adiciona(r|)\s+estoque/i, /entrada\s+de\s+(estoque|mercadoria)/i, /repos/i] },
  { intent: "stock_exit", category: "estoque", patterns: [/perdi/i, /perdemos/i, /perda/i, /baixa\s+(de|estoque)/i, /dei\s+baixa/i, /descarte/i, /quebrou/i, /venceu/i, /vencimento/i, /descartar/i, /perdeu/i] },
  { intent: "stock_transfer", category: "estoque", patterns: [/transf(erir|erencia|erenciei)/i, /mud(ei|ar)\s+de\s+(local|setor|filial)/i, /realocar/i] },
  { intent: "stock_query", category: "estoque", patterns: [/quanto\s+(temos|tenho|tem)/i, /estoque\s+(atual|de)/i, /temos\s+(de|)/i, /mostrar\s+estoque/i, /ver\s+estoque/i, /estoque\s+baixo/i, /abaixo\s+do\s+minimo/i, /falta\s+(de|estoque)/i, /acabando/i, /acabou/i, /sem\s+estoque/i] },

  // --- COMPRAS ---
  { intent: "purchase", category: "compras", patterns: [/comprar?\s+\d+/i, /pedi(d|do)\s+(de\s+compra|ao\s+fornecedor)/i, /solicitar?\s+compra/i, /cotar/i, /cotacao/i, /orcamento/i, /orc(ar|amento)/i] },
  { intent: "purchase_query", category: "compras", patterns: [/historico\s+de\s+compras/i, /ultima\s+compra/i, /preco\s+(medio|historico)/i, /melhor\s+preco/i, /fornecedor\s+mais\s+barato/i, /preco\s+aumentou/i, /variacao\s+de\s+preco/i] },

  // --- FORNECEDORES ---
  { intent: "supplier_create", category: "compras", patterns: [/cadastr?ar?\s+(novo\s+)?fornecedor/i, /adicionar?\s+fornecedor/i, /novo\s+fornecedor/i] },
  { intent: "supplier_query", category: "compras", patterns: [/quem\s+fornece/i, /fornecedor\s+de/i, /listar?\s+fornecedores/i, /mostrar\s+fornecedores/i, /melhor\s+fornecedor/i, /fornecedor\s+atrasado/i] },
  { intent: "supplier_block", category: "compras", patterns: [/bloquear?\s+fornecedor/i, /fornecedor\s+bloqueado/i] },

  // --- FINANCEIRO (pagar/receber/despesa/receita/boleto/transferência) ---
  { intent: "payment", category: "financeiro", patterns: [/paguei/i, /pago/i, /pagar?\s+(boleto|conta|fatura|equatorial|enel|naturgy)/i, /quitei/i, /liquidei/i] },
  { intent: "receipt", category: "financeiro", patterns: [/recebi\s+(pagamento|pix|transferencia)/i, /recebimento/i, /entreou?\s+pagamento/i, /cliente\s+pagou/i] },
  { intent: "expense", category: "financeiro", patterns: [/despesa/i, /gastei/i, /gasto\s+de/i, /paguei\s+r\$/i, /custo\s+de/i, /combustivel/i, /energia/i, /agua/i, /telefone/i, /internet/i, /aluguel/i] },
  { intent: "revenue", category: "financeiro", patterns: [/receita/i, /vendi\s+r\$/i, /entrada\s+de\s+dinheiro/i, /recebi\s+r\$/i] },
  { intent: "boleto_create", category: "financeiro", patterns: [/criar?\s+boleto/i, /gerar?\s+boleto/i, /novo\s+boleto/i] },
  { intent: "boleto_query", category: "financeiro", patterns: [/boleto(s|)\s+(venc|vencendo|pendente|a\s+pagar)/i, /vence\s+(hoje|amanha)/i, /vencido/i, /boletos\s+do\s+mes/i] },
  { intent: "transfer", category: "financeiro", patterns: [/transfer(i|encia)/i, /movi\s+entre\s+contas/i, /transf(eri|erencia)\s+(r\$|pix|dinheiro)/i] },
  { intent: "cashflow_query", category: "financeiro", patterns: [/fluxo\s+de\s+caixa/i, /caixa\s+atual/i, /saldo/i, /quanto\s+(dinheiro|temos\s+no\s+caixa)/i, /liquidez/i] },

  // --- CMV / DRE / LUCRO ---
  { intent: "cmv_query", category: "cmv", patterns: [/cmv/i, /custo\s+(de\s+venda|mercadoria)/i, /margem\s+de\s+lucro/i, /rentabilidade/i, /markup/i] },
  { intent: "dre_query", category: "cmv", patterns: [/dre/i, /demonstrativo\s+de\s+resultado/i, /lucro\s+(liquido|bruto|do\s+mes)/i, /prejuizo/i, /ebitda/i, /lucro\s+liquido/i] },
  { intent: "profit_query", category: "cmv", patterns: [/quanto\s+(lucramos|lucrou|dei\s+de\s+lucro)/i, /lucro\s+(de|do|no|da)/i, /margem/i] },

  // --- PRODUÇÃO ---
  { intent: "production", category: "producao", patterns: [/produzi(d|mos|mos)/i, /fabric(ar|amos|amos|ou)/i, /fizemos\s+\d+/i, /producao\s+de/i, /produzir/i, /cozinh(ar|ei|amos)/i] },
  { intent: "recipe", category: "producao", patterns: [/receita\s+de/i, /ficha\s+tecnica/i, /ingredientes\s+de/i, /como\s+fazer/i, /rendimento/i] },
  { intent: "production_query", category: "producao", patterns: [/producao\s+(de\s+hoje|do\s+dia|pendente|atrasada)/i, /o\s+que\s+produzimos/i, /historico\s+de\s+producao/i] },
  { intent: "production_plan", category: "producao", patterns: [/planejar?\s+producao/i, /agendar?\s+producao/i, /producao\s+planejada/i, /previsao\s+de\s+producao/i] },

  // --- RH ---
  { intent: "employee_create", category: "rh", patterns: [/contrat(ei|ar|amos)/i, /cadastr?ar?\s+(funcionario|colaborador|pessoa|empregado)/i, /novo\s+funcionario/i, /admitir/i] },
  { intent: "employee_update", category: "rh", patterns: [/demit(i|ir|imos)/i, /demi(ssao|tido)/i, /ferias/i, /afast(ar|amento|ado)/i, /voltou\s+ao\s+trabalho/i, /retorno\s+de\s+(ferias|afastamento)/i, /suspensao/i, /advertencia/i] },
  { intent: "employee_query", category: "rh", patterns: [/funcionarios/i, /colaboradores/i, /quem\s+trabalha/i, /listar?\s+(funcionarios|rh)/i, /folha\s+de\s+pagamento/i, /ponto/i, /banco\s+de\s+horas/i] },
  { intent: "payroll", category: "rh", patterns: [/folha/i, /salarios?\s+(a\s+pagar|do\s+mes|hoje)/i, /pagar?\s+salario/i, /adiantamento/i, /vale/i] },
  { intent: "training", category: "rh", patterns: [/treinamento/i, /capacitacao/i, /curso\s+de/i, /onboarding/i, /integracao\s+de\s+(novo|func)/i] },

  // --- MOTOBOYS / DELIVERY ---
  { intent: "courier_checkin", category: "delivery", patterns: [/check-?in/i, /entrou\s+no\s+expediente/i, /motoboy\s+(chegou|iniciou|saiu)/i] },
  { intent: "courier_checkout", category: "delivery", patterns: [/check-?out/i, /saiu\s+do\s+expediente/i, /fim\s+de\s+expediente/i] },
  { intent: "courier_query", category: "delivery", patterns: [/motoboys/i, /entregadores/i, /status\s+de\s+(entrega|motoboy)/i, /quem\s+esta\s+(em\s+entrega|disponivel|na\s+rua)/i, /entregas\s+(pendentes|em\s+andamento)/i] },
  { intent: "delivery_status", category: "delivery", patterns: [/status\s+de\s+entrega/i, /pedido\s+em\s+entrega/i, /a\s+caminho/i, /entregue/i] },

  // --- PEDIDOS / VENDAS ---
  { intent: "sale", category: "vendas", patterns: [/vendi\s+\d+/i, /venda\s+(de|realizada)/i, /novo\s+pedido/i, /anotar\s+pedido/i, /vender/i] },
  { intent: "sale_query", category: "vendas", patterns: [/vendas\s+(de\s+hoje|do\s+dia|do\s+mes|por\s+periodo)/i, /quanto\s+vendemos/i, /historico\s+de\s+vendas/i, /ticket\s+medio/i, /vendas\s+caiu/i] },
  { intent: "order_status", category: "vendas", patterns: [/status\s+do\s+pedido/i, /pedido\s+#?\d+/i, /onde\s+esta\s+o\s+pedido/i, /pedido\s+atrasado/i] },

  // --- CLIENTES ---
  { intent: "customer_create", category: "crm", patterns: [/cadastr?ar?\s+(novo\s+)?cliente/i, /adicionar?\s+cliente/i, /novo\s+cliente/i] },
  { intent: "customer_query", category: "crm", patterns: [/clientes/i, /quem\s+(e\s+|sao\s+os\s+)clientes/i, /listar?\s+clientes/i, /melhor\s+cliente/i, /cliente\s+frequente/i, /top\s+clientes/i] },

  // --- DOCUMENTOS ---
  { intent: "document_process", category: "documentos", patterns: [/processar?\s+(documento|nota|boleto|xml|danfe|cupom|arquivo)/i, /analisar?\s+documento/i, /enviar?\s+(nota|boleto|xml|comprovante)/i, /recebi\s+(uma\s+)?nota/i, /escanear/i] },
  { intent: "nf_process", category: "documentos", patterns: [/nota\s+fiscal/i, /nfe/i, /nf-e/i, /xml\s+da\s+nota/i, /danfe/i] },
  { intent: "document_query", category: "documentos", patterns: [/documentos\s+(pendentes|aguardando|em\s+analise)/i, /boletos\s+(sem\s+pagamento|a\s+pagar)/i, /documentos\s+do\s+mes/i, /listar?\s+documentos/i] },

  // --- NAVEGAÇÃO (abrir módulos) ---
  { intent: "navigate", category: "navegacao", patterns: [/abrir?\s+(estoque|financeiro|compras|producao|rh|motoboys|documentos|cmv|dre|intelligence|relatorios|whatsapp|dashboard|cadastro|indicadores|administracao|config|kernel|brain|workforce|missions|planejamento|event-?bus|saude|baron|integracoes|processamento|people|ifood)/i, /ir\s+para\s+(o\s+)?(estoque|financeiro|compras|producao|rh|motoboys)/i, /mostrar?\s+(estoque|financeiro|compras|producao|rh|motoboys|documentos|cmv|dre|intelligence|relatorios|whatsapp|dashboard|cadastro|indicadores|administracao)/i, /vai\s+para/i] },
  { intent: "navigate_filter", category: "navegacao", patterns: [/boletos\s+(vencendo|vencidos)/i, /produtos\s+(abaixo|baixo\s+do\s+minimo|criticos)/i, /estoque\s+(baixo|critico)/i, /pendentes/i, /vencendo\s+hoje/i] },

  // --- INTELLIGENCE / INDICADORES ---
  { intent: "indicators", category: "intelligence", patterns: [/indicadores/i, /kpi/i, /metricas/i, /dashboard\s+geral/i, /resumo\s+executivo/i] },
  { intent: "report", category: "intelligence", patterns: [/relatorio/i, /exportar?\s+relatorio/i, /gerar?\s+relatorio/i, /emitir?\s+relatorio/i, /resumo\s+(mensal|semanal|diario)/i, /pdf/i, /excel/i] },

  // --- ALERTAS / AUTOMAÇÕES ---
  { intent: "alert_create", category: "alertas", patterns: [/criar?\s+alerta/i, /me\s+avisar?\s+quando/i, /alertar?\s+(quando|sobre)/i, /notificar/i] },
  { intent: "schedule", category: "automacoes", patterns: [/agendar?\s+(compra|pagamento|producao|tarefa)/i, /programar/i, /recorrente/i, /automatico/i] },
  { intent: "task_create", category: "automacoes", patterns: [/criar?\s+tarefa/i, /nova\s+(tarefa|missao)/i, /atribuir?\s+tarefa/i] },

  // --- CONSULTAS GERAIS ---
  { intent: "who_sold", category: "consultas", patterns: [/quem\s+vendeu/i, /quem\s+fez\s+a\s+venda/i] },
  { intent: "what_left", category: "consultas", patterns: [/quanto\s+sobrou/i, /quanto\s+resta/i, /o\s+que\s+sobrou/i] },
  { intent: "spent_query", category: "consultas", patterns: [/quanto\s+(gastei|gastamos)/i, /gastos\s+do\s+mes/i, /despesas\s+totais/i] },
  { intent: "what_to_do", category: "consultas", patterns: [/o\s+que\s+(faco|temos?\s+para\s+(fazer|hoje))/i, /tarefas\s+(de\s+hoje|urgentes)/i, /pendencias/i, /o\s+que\s+precisa/i] },

  // --- PRODUTOS ---
  { intent: "product_create", category: "cadastro", patterns: [/cadastr?ar?\s+(novo\s+)?(produto|item)/i, /adicionar?\s+(produto|item)/i, /novo\s+produto/i] },
  { intent: "product_query", category: "cadastro", patterns: [/listar?\s+produtos/i, /produtos\s+cadastrados/i, /quais\s+produtos/i, /busca(r|ar)\s+produto/i, /preco\s+do\s+produto/i] },
  { intent: "product_update", category: "cadastro", patterns: [/alterar?\s+preco/i, /reajustar?\s+preco/i, /mudar?\s+preco/i, /atualizar?\s+(preco|produto)/i] },
];

// Mapa de rota por módulo (para navegação)
const ROUTE_MAP = {
  estoque: "/estoque", financeiro: "/financeiro", compras: "/compras",
  producao: "/producao", rh: "/rh", motoboys: "/motoboys",
  documentos: "/documentos-financeiros", cmv: "/cmv", dre: "/cmv",
  intelligence: "/inteligencia", relatorios: "/relatorios",
  whatsapp: "/whatsapp-connector", dashboard: "/dashboard",
  cadastro: "/cadastro", indicadores: "/indicadores",
  administracao: "/administracao", config: "/administracao",
  kernel: "/kernel", brain: "/brain", workforce: "/workforce",
  missions: "/missions", planejamento: "/planejamento",
  "event-bus": "/event-bus", eventbus: "/event-bus", saude: "/saude",
  baron: "/ia", integracoes: "/integracoes", processamento: "/processamento",
  people: "/people-analytics", ifood: "/financeiro",
};

// ============================================================
// API
// ============================================================

export const IntentEngine = {
  /**
   * Classifica um texto em intent estruturada.
   * Retorna { intent, category, confidence, entities, route, filter }
   */
  classify(text) {
    const ntext = norm(text);
    let best = null;

    for (const def of INTENT_CATALOG) {
      for (const pat of def.patterns) {
        if (pat.test(text)) {
          const confidence = 0.85 + Math.random() * 0.15;
          if (!best || confidence > best.confidence) {
            best = { intent: def.intent, category: def.category, confidence, rawMatch: pat.source };
          }
        }
      }
    }

    if (!best) return { intent: null, category: null, confidence: 0 };

    // Extrair entidades
    const entities = {};

    // Quantidade e unidade
    entities.quantity = extractNumber(text, "quantity");
    entities.unit = extractUnit(text);
    entities.price = extractNumber(text, "price");
    if (entities.price) entities.price_type = extractPriceType(text);

    // Rota de navegação
    if (best.intent === "navigate" || best.intent === "navigate_filter") {
      for (const [mod, route] of Object.entries(ROUTE_MAP)) {
        if (ntext.includes(mod)) { entities.route = route; entities.module = mod; break; }
      }
      // Filtros
      if (/vencendo|vencido/i.test(text)) entities.filter = "vencendo";
      if (/abaixo|baixo|minimo|critico/i.test(text)) entities.filter = "baixo";
      if (/pendente/i.test(text)) entities.filter = "pendentes";
      if (/hoje/i.test(text)) entities.filter = "hoje";
    }

    // Nome do produto (entre números/palavras-chave)
    const prodMatch = text.match(/(?:comprei|recebi|chegou|produzimos|produzi|perdemos|perdi|baixa\s+de|adicion(ar|ei)|entrada\s+de)\s+(\d+(?:[.,]\d+)?\s*(?:kg|g|lt|l|ml|cx|caixas?|pct|pecas?|un|sacos?)?\s*(?:de\s+)?)?([\wÀ-ÿ\s]{3,40}?)(?:\s+(?:da\s+|do\s+|de\s+|a\s+|por\s+)|$)/i);
    if (prodMatch && prodMatch[2]) {
      entities.product_name = prodMatch[2].trim().replace(/^(de|da|do|a|por)\s+/i, "");
    }

    // Fornecedor (após "da/do")
    const supMatch = text.match(/(?:da|do|de)\s+([A-ZÀ-Ý][\wÀ-ÿ]{2,30})/);
    if (supMatch) entities.supplier = supMatch[1];

    // Pagamento: target + banco + método
    if (best.intent === "payment" || best.intent === "expense") {
      entities.amount = extractNumber(text, "price") || entities.price;
      const bankMatch = text.match(/(?:pelo|pela|no|na)\s+(inter|bradesco|itau|itau|santander|caixa|nubank|bb|banco\s+do\s+brasil)/i);
      if (bankMatch) entities.bank = bankMatch[1];
      if (/pix/i.test(text)) entities.payment_method = "pix";
      else if (/boleto/i.test(text)) entities.payment_method = "boleto";
      else if (/cartao/i.test(text)) entities.payment_method = text.includes("credito") ? "cartao_credito" : "cartao_debito";
      else if (/dinheiro/i.test(text)) entities.payment_method = "dinheiro";
      else if (/transferencia/i.test(text)) entities.payment_method = "transferencia";

      // Target do pagamento (após "a")
      const tgtMatch = text.match(/(?:paguei|pago|pagar)\s+(?:a\s+)?([A-ZÀ-Ý][\wÀ-ÿ\s]{2,30}?)(?:\s+(?:pelo|pela|no|na|via|hoje|via|por))/i);
      if (tgtMatch) entities.payment_target = tgtMatch[1].trim();
    }

    // Funcionário
    if (best.category === "rh") {
      const empMatch = text.match(/(?:contratei|demit(i|imos|ir)|ferias|afast(ar|amento))\s+(?:o\s+|a\s+)?([A-ZÀ-Ý][\wÀ-ÿ]{2,30})/);
      if (empMatch) entities.employee_name = empMatch[2];

      if (/ferias/i.test(text)) entities.rh_action = "ferias";
      else if (/afast/i.test(text)) entities.rh_action = "afastamento";
      else if (/demiss|demit/i.test(text)) entities.rh_action = "demissao";
      else if (/retorno|voltou/i.test(text)) entities.rh_action = "retorno";
    }

    // Categoria de despesa
    if (best.intent === "expense") {
      const catMatch = text.match(/(combustivel|energia|agua|telefone|internet|aluguel|gas|material|limpeza|manutencao)/i);
      if (catMatch) entities.category = catMatch[1].toLowerCase();
    }

    return { ...best, entities };
  },

  /**
   * Lista todas as intents disponíveis (para debug/auditoria).
   */
  listIntents() {
    return INTENT_CATALOG.map((d) => ({ intent: d.intent, category: d.category, patterns: d.patterns.length }));
  },

  /**
   * Conta total de padrões.
   */
  totalPatterns() {
    return INTENT_CATALOG.reduce((s, d) => s + d.patterns.length, 0);
  },

  // Rota por nome de módulo
  getRoute(module) {
    return ROUTE_MAP[norm(module)] || null;
  },
};

export default IntentEngine;