import React from "react";
import SectionCard from "./SectionCard";
import { brl } from "@/lib/financialCenter";
import { TrendingUp, Wallet, Factory, ShoppingCart, Package, Receipt, PiggyBank } from "lucide-react";

export default function CommandForecasts({ data }) {
  const p = data.previsoes;

  const items = [
    { icon: Wallet, label: "Fluxo de Caixa", value: brl(p.fluxo_caixa), tone: p.fluxo_caixa >= 0 ? "text-emerald-600" : "text-rose-600" },
    { icon: Factory, label: "Produção", value: p.producao, tone: "text-neutral-700" },
    { icon: ShoppingCart, label: "Compras", value: brl(p.compras), tone: "text-neutral-700" },
    { icon: Package, label: "Cobertura Estoque", value: `${p.estoque.toFixed(0)} dias`, tone: "text-neutral-700" },
    { icon: Receipt, label: "iFood", value: brl(p.ifood), tone: "text-rose-600" },
    { icon: PiggyBank, label: "Lucro", value: brl(p.lucro), tone: p.lucro >= 0 ? "text-emerald-600" : "text-rose-600" },
  ];

  return (
    <SectionCard icon={TrendingUp} title="Previsões" accent="text-indigo-500">
      <p className="mb-3 text-xs text-neutral-400">Projeção para o fechamento do mês com base no ritmo atual.</p>
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