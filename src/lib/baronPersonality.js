/**
 * BARON Personality — humor leve, mensagens de login e sugestões contextuais.
 * Profissional, nunca infantil, sem excesso de emojis.
 */

const LOGIN_MESSAGES = [
  "Chegou nosso CLT Premium. Bora trabalhar!",
  "Mais um reforço na operação. Bem-vindo!",
  "Equipe completa. Vamos fazer acontecer.",
  "Hora de entregar mais um dia excelente.",
  "Bem-vindo de volta!",
  "Pronto para mais um turno?",
  "Hoje promete. Vamos juntos!",
  "Mais um dia para fazer a diferença.",
  "Operação ativa. Que comece o trabalho.",
  "Bom te ver por aqui. Vamos trabalhar.",
];

const ACTION_HUMOR = {
  caixa_fechado: [
    "Caixa fechado com sucesso. Menos uma missão.",
    "Caixa conferido. Tudo no lugar.",
  ],
  compra_registrada: [
    "Compras registradas. O estoque agradece.",
    "Pedido lançado. Fornecedor já foi avisado.",
  ],
  boleto_pago: [
    "Conta paga. Mais uma preocupação resolvida.",
    "Pagamento registrado. Fluxo de caixa atualizado.",
  ],
  inventario_concluido: [
    "Inventário atualizado. Agora sim estamos organizados.",
    "Conferência feita. Estoque sob controle.",
  ],
  nota_conferida: [
    "Nota conferida. Estoque atualizado automaticamente.",
    "Produtos validados. CMV recalculado.",
  ],
  producao_finalizada: [
    "Produção concluída. Rendimento dentro do esperado.",
    "Lote finalizado. Pronto para venda.",
  ],
  documento_processado: [
    "Documento processado. IA identificou e encaminhou.",
    "Mais um documento arquivado com segurança.",
  ],
  missao_concluida: [
    "Missão cumprida. Parabéns à equipe.",
    "Objetivo alcançado. Próxima missão?",
  ],
};

const CONTEXTUAL_SUGGESTIONS = {
  compras: [
    "Deseja conferir o estoque atualizado?",
    "Quer ver o impacto no CMV desta compra?",
  ],
  pagamentos: [
    "Parece que finalizamos os pagamentos de hoje. Deseja ver o fluxo de caixa atualizado?",
    "Todos os boletos do dia quitados. Que tal conferir o saldo?",
  ],
  producao: [
    "Produção registrada. Quer ver o rendimento do turno?",
    "Lote concluído. Deseja atualizar o CMV?",
  ],
  documentos: [
    "Documento processado. Deseja ver as pendências de conferência?",
    "IA extraiu os dados. Quer revisar as divergências?",
  ],
  estoque: [
    "Estoque atualizado. Quer ver os itens abaixo do mínimo?",
    "Inventário feito. Deseja gerar relatório de cobertura?",
  ],
};

export function getLoginMessage() {
  return LOGIN_MESSAGES[Math.floor(Math.random() * LOGIN_MESSAGES.length)];
}

export function getActionHumor(action) {
  const msgs = ACTION_HUMOR[action];
  if (!msgs) return null;
  return msgs[Math.floor(Math.random() * msgs.length)];
}

export function getContextualSuggestion(category) {
  const msgs = CONTEXTUAL_SUGGESTIONS[category];
  if (!msgs) return null;
  return msgs[Math.floor(Math.random() * msgs.length)];
}

export function getGreeting(user) {
  const hour = new Date().getHours();
  const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = user?.full_name?.split(" ")[0] || "Gestor";
  const role = user?.role || "user";
  const isBoss = ["administrador", "admin", "gerencia", "gerente"].includes(role);

  if (isBoss && hour < 12) {
    return {
      period,
      firstName,
      title: `${period}, ${firstName}.`,
      subtitle: "O patrão chegou! Todos a postos e prontos para trabalhar.",
      emoji: true,
    };
  }
  return {
    period,
    firstName,
    title: `${period}, ${firstName}.`,
    subtitle: "O que vamos fazer hoje?",
    emoji: false,
  };
}