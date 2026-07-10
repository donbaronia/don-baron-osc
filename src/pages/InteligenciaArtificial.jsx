import React from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Bot, FileText, Receipt, Table, TrendingUp, ShieldCheck } from "lucide-react";

const MODULES = [
  { icon: Receipt, title: "Leitura de Boletos", desc: "Foto de boleto → a IA interpreta valores, vencimento e beneficiário.", status: "Em breve" },
  { icon: FileText, title: "Leitura de Notas Fiscais", desc: "Foto ou PDF de NF → itens, impostos e fornecedor extraídos automaticamente.", status: "Em breve" },
  { icon: Table, title: "Interpretação de Planilhas", desc: "Excel, CSV e relatórios de delivery interpretados sem digitação manual.", status: "Em breve" },
  { icon: TrendingUp, title: "Recomendações Estratégicas", desc: "Sugestões baseadas sempre nos dados cadastrados no sistema.", status: "Em breve" },
];

export default function InteligenciaArtificial() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader emoji="🤖" title="Inteligência Artificial Don Baron" subtitle="Um colaborador digital: a IA trabalha, você apenas confirma." />

      <div className="mt-8 overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-neutral-900 to-neutral-800 p-8 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-black">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Núcleo de IA</h2>
            <p className="text-sm text-neutral-300">Nunca responde sem consultar os dados. Sempre justifica com base no sistema.</p>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm text-neutral-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Toda interpretação da IA passa por confirmação do usuário e é registrada em auditoria.
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.title} className="rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:shadow-lg hover:shadow-neutral-200/50">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">{m.status}</span>
              </div>
              <h3 className="mt-4 font-semibold text-neutral-900">{m.title}</h3>
              <p className="mt-1.5 text-sm text-neutral-500">{m.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}