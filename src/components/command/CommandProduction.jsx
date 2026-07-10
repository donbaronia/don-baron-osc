import React from "react";
import SectionCard from "./SectionCard";
import { Factory, Clock, AlertTriangle, ChefHat, Gauge, TrendingDown } from "lucide-react";

export default function CommandProduction({ data }) {
  const p = data.producao;

  const items = [
    { icon: Clock, label: "Ordens Abertas", value: p.ordens_abertas, tone: p.ordens_abertas > 0 ? "text-amber-600" : "text-neutral-700" },
    { icon: AlertTriangle, label: "Atrasadas", value: p.atrasadas, tone: p.atrasadas > 0 ? "text-rose-600" : "text-neutral-700" },
    { icon: ChefHat, label: "Para Produzir", value: p.para_produzir, tone: "text-neutral-700" },
    { icon: Gauge, label: "Eficiência", value: `${p.eficiencia.toFixed(1)}%`, tone: p.eficiencia >= 90 ? "text-emerald-600" : p.eficiencia >= 70 ? "text-amber-600" : "text-rose-600" },
    { icon: TrendingDown, label: "Perdas", value: p.perdas.toFixed(1), tone: p.perdas > 0 ? "text-rose-600" : "text-neutral-700" },
  ];

  return (
    <SectionCard icon={Factory} title="Produção" accent="text-cyan-500">
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