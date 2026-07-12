import React, { useState } from "react";
import { HelpCircle, X, Search, ChevronRight, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const HELP_CATEGORIES = [
  {
    name: "Financeiro",
    icon: "💰",
    description: "Contas a pagar e receber, fluxo de caixa, DRE, conciliação e projeções.",
    when: "Quando precisar registrar pagamentos, receber valores ou analisar resultados.",
    who: "Administradores e equipe financeira.",
    features: ["Contas a Pagar", "Contas a Receber", "Fluxo de Caixa", "DRE", "Conciliação", "Projeções", "Centros de Custo"],
    commands: ["Registrar pagamento", "Fluxo de caixa", "Mostrar DRE", "Contas a pagar", "Contas a receber"],
    route: "/financeiro",
  },
  {
    name: "Estoque",
    icon: "📦",
    description: "Controle de itens físicos, movimentações, lotes, validade e inventário.",
    when: "Quando precisar consultar saldos, registrar entradas/saídas ou fazer inventário.",
    who: "Administradores, equipe de estoque e compras.",
    features: ["Estoque Atual", "Movimentações", "Lotes & Validade", "Curva ABC", "Inventário", "Compras Sugeridas"],
    commands: ["Consultar estoque", "Estoque de carne", "Movimentações", "Inventário", "Lotes vencendo"],
    route: "/estoque",
  },
  {
    name: "Compras",
    icon: "🛒",
    description: "Solicitações, cotações, pedidos, recebimento e avaliação de fornecedores.",
    when: "Quando precisar comprar insumos, comparar preços ou avaliar fornecedores.",
    who: "Administradores e equipe de compras.",
    features: ["Solicitações", "Cotações", "Pedidos", "Recebimento", "Fornecedores", "Histórico de Preços"],
    commands: ["Lançar compra", "Cadastrar fornecedor", "Cotações", "Pedidos de compra", "Recebimento"],
    route: "/compras",
  },
  {
    name: "Produção",
    icon: "🍔",
    description: "Ordens de produção, fichas técnicas, custos, margens e baixa automática de estoque.",
    when: "Quando precisar produzir itens, calcular custos ou analisar rendimento.",
    who: "Administradores e equipe de produção.",
    features: ["Ordens de Produção", "Fichas Técnicas", "Rentabilidade", "Simulador", "Combos", "Produção Inteligente"],
    commands: ["Registrar produção", "Ficha técnica", "Simular produção", "Rentabilidade"],
    route: "/producao",
  },
  {
    name: "RH",
    icon: "👥",
    description: "Colaboradores, recrutamento, ponto, vales, avaliações, treinamentos e cultura.",
    when: "Quando precisar cadastrar funcionários, registrar ponto ou gerenciar folha.",
    who: "Administradores e equipe de RH.",
    features: ["Colaboradores", "Recrutamento", "Ponto & Horas", "Vales & Folha", "Avaliações", "Treinamentos", "Cultura"],
    commands: ["Cadastrar funcionário", "Abrir RH", "Registrar ponto", "Vales", "Avaliações"],
    route: "/rh",
  },
  {
    name: "Motoboys",
    icon: "🚚",
    description: "Gestão de entregadores, rotas, comissões e acompanhamento de delivery.",
    when: "Quando precisar gerenciar entregadores ou acompanhar entregas.",
    who: "Administradores e equipe de delivery.",
    features: ["Cadastro de Entregadores", "Rotas", "Comissões", "Status de Entrega"],
    commands: ["Abrir motoboys", "Entregadores", "Comissões", "Rotas de entrega"],
    route: "/motoboys",
  },
  {
    name: "Relatórios",
    icon: "📊",
    description: "Relatórios consolidados de todos os módulos do sistema.",
    when: "Quando precisar de análises consolidadas e exportações.",
    who: "Administradores e gerentes.",
    features: ["Relatório Financeiro", "Relatório de Estoque", "Relatório de Produção", "Relatório de Vendas"],
    commands: ["Mostrar relatórios", "Relatório financeiro", "Relatório de estoque"],
    route: "/relatorios",
  },
  {
    name: "Configurações",
    icon: "⚙️",
    description: "Usuários, permissões, integrações, eventos e núcleo do sistema.",
    when: "Quando precisar gerenciar usuários, configurar integrações ou auditar o sistema.",
    who: "Administradores.",
    features: ["Usuários", "Logs de Auditoria", "Integrações", "Central de Eventos", "Núcleo do Sistema"],
    commands: ["Abrir configurações", "Usuários", "Integrações", "Auditoria"],
    route: "/administracao",
  },
  {
    name: "BARON",
    icon: "🤖",
    description: "O Diretor Operacional Virtual que entende seus comandos e abre a tela certa.",
    when: "Sempre que precisar fazer qualquer coisa no sistema — comece pelo BARON.",
    who: "Todos os usuários.",
    features: ["Comandos em linguagem natural", "Abertura automática de telas", "Consultas rápidas", "Análises"],
    commands: ["Lançar compra", "Cadastrar funcionário", "Mostrar DRE", "Fluxo de caixa", "Consultar estoque", "Cadastrar fornecedor"],
    route: "/",
  },
];

export default function BDSHelp({ title = "Centro de Ajuda", sections = [], className }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  const filtered = search.trim()
    ? HELP_CATEGORIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.features.some(f => f.toLowerCase().includes(search.toLowerCase())) ||
        c.commands.some(cmd => cmd.toLowerCase().includes(search.toLowerCase()))
      )
    : HELP_CATEGORIES;

  const handleOpen = (cat) => {
    setSelected(cat);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground", className)}
        title="Centro de Ajuda"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Ajuda</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => { setOpen(false); setSelected(null); }} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-base font-bold text-foreground">{selected ? selected.name : "Centro de Ajuda"}</p>
                <p className="text-[11px] text-muted-foreground">{selected ? selected.icon + " " + selected.description : "O que deseja fazer?"}</p>
              </div>
              <button onClick={() => { if (selected) setSelected(null); else setOpen(false); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            {!selected && (
              <div className="border-b border-border p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="O que deseja fazer?"
                    className="h-9 w-full rounded-lg border border-border bg-secondary pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {!selected ? (
                <div className="space-y-2">
                  {filtered.map(cat => (
                    <button
                      key={cat.name}
                      onClick={() => handleOpen(cat)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/30 hover:bg-secondary"
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{cat.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{cat.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">Nenhum resultado.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* When */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quando utilizar</p>
                    <p className="mt-1 text-sm text-foreground">{selected.when}</p>
                  </div>

                  {/* Who */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quem utiliza</p>
                    <p className="mt-1 text-sm text-foreground">{selected.who}</p>
                  </div>

                  {/* Features */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Funcionalidades</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selected.features.map(f => (
                        <span key={f} className="rounded-md bg-secondary px-2 py-1 text-[11px] text-muted-foreground">{f}</span>
                      ))}
                    </div>
                  </div>

                  {/* BARON Commands */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Comandos do BARON</p>
                    <div className="mt-2 space-y-1.5">
                      {selected.commands.map(cmd => (
                        <div key={cmd} className="flex items-center gap-2 text-sm text-foreground">
                          <MessageCircle className="h-3.5 w-3.5 text-primary" />
                          <span>"{cmd}"</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Open */}
                  <button
                    onClick={() => { setOpen(false); setSelected(null); navigate(selected.route); }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
                  >
                    Abrir {selected.name}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}