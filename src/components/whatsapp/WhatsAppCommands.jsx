import React from "react";

const COMMAND_GROUPS = [
  {
    title: "1 · Financeiro",
    icon: "💰",
    commands: ["Quanto tenho em caixa?", "Qual meu saldo hoje?", "Quanto vou receber do iFood?", "Quais boletos vencem hoje?", "Quanto vendi ontem?"],
  },
  {
    title: "2 · Estoque",
    icon: "📦",
    commands: ["Quais produtos estão em estoque crítico?", "Quanto tenho de carne?", "Qual produto está acabando?"],
  },
  {
    title: "3 · Produção",
    icon: "🏭",
    commands: ["Qual o CMV desta semana?", "Como foi a produção de ontem?", "Qual o rendimento da blend?"],
  },
  {
    title: "4 · Compras",
    icon: "🛒",
    commands: ["Quais compras estão pendentes?", "Qual fornecedor entregou hoje?", "Qual fornecedor está atrasado?"],
  },
  {
    title: "5 · RH",
    icon: "👥",
    commands: ["Quem faltou hoje?", "Quem está de férias?", "Quantos motoboys fizeram check-in?", "Quanto cada motoboy irá receber?", "Quem pediu lanche esta semana?"],
  },
  {
    title: "6 · Delivery",
    icon: "🛵",
    commands: ["Quantos motoboys ativos?", "Qual o ranking de entregas?", "Quem entregou mais hoje?"],
  },
  {
    title: "7 · Relatórios",
    icon: "📊",
    commands: ["Resumo diário", "Resumo semanal", "Fluxo de caixa", "DRE", "CMV do mês"],
  },
  {
    title: "9 · Aprovações",
    icon: "✅",
    commands: ["Quais aprovações pendentes?", "Aprovar compra [número]", "Rejeitar pagamento [número]"],
  },
];

export default function WhatsAppCommands() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-900">📱 Menu Inicial do WhatsApp</p>
        <p className="mt-1 whitespace-pre-line text-xs text-emerald-700">
          {"Bom dia, [Nome]. Como posso ajudar hoje?\n\n1 Financeiro\n2 Estoque\n3 Produção\n4 Compras\n5 RH\n6 Delivery\n7 Relatórios\n8 Inteligência Baron\n9 Aprovações\n10 Ajuda\n\nTambém aceito linguagem natural!"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {COMMAND_GROUPS.map(group => (
          <div key={group.title} className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-700">
              <span>{group.icon}</span> {group.title}
            </h3>
            <div className="space-y-1.5">
              {group.commands.map(cmd => (
                <p key={cmd} className="rounded-lg bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600">
                  "{cmd}"
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">🔐 Segurança</h3>
        <ul className="space-y-1 text-xs text-neutral-600">
          <li>• Toda operação respeita as permissões existentes do seu perfil</li>
          <li>• Operações financeiras críticas exigem PIN de confirmação</li>
          <li>• Todas as ações são registradas na auditoria</li>
          <li>• Nenhuma regra é duplicada — o WhatsApp usa as mesmas permissões do sistema</li>
        </ul>
      </div>
    </div>
  );
}