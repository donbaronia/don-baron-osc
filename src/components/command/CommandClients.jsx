import React from "react";
import SectionCard from "./SectionCard";
import { brl } from "@/lib/financialCenter";
import { UserPlus, Repeat, Clock, DollarSign, Star, MessageSquare } from "lucide-react";

export default function CommandClients({ data }) {
  const c = data.clientes;

  const items = [
    { icon: UserPlus, label: "Novos", value: c.novos, tone: "text-emerald-600" },
    { icon: Repeat, label: "Recorrentes", value: c.recorrentes, tone: "text-blue-600" },
    { icon: Clock, label: "Tempo Médio Entre Compras", value: `${c.tempo_medio_compras.toFixed(0)} dias`, tone: "text-neutral-700" },
    { icon: DollarSign, label: "Ticket Médio", value: brl(c.ticket_medio), tone: "text-neutral-700" },
    { icon: Star, label: "Avaliações", value: c.avaliacoes, tone: "text-neutral-700" },
    { icon: MessageSquare, label: "Reclamações", value: c.reclamacoes, tone: c.reclamacoes > 0 ? "text-rose-600" : "text-neutral-700" },
  ];

  return (
    <SectionCard icon={UserPlus} title="Clientes" accent="text-emerald-500">
      <div className="grid grid-cols-2 gap-3">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg bg-neutral-50 p-3">
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">{item.label}</p>
              </div>
              <p className={`mt-0.5 text-sm font-bold ${item.tone}`}>{item.value}</p>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}