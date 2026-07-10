import React from "react";
import SectionCard from "./SectionCard";
import { brl } from "@/lib/financialCenter";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

export default function CommandFinancial({ data }) {
  const f = data.financeiro;

  const items = [
    { label: "Saldo Atual", value: brl(f.saldo), tone: f.saldo >= 0 ? "text-emerald-600" : "text-rose-600" },
    { label: "Fluxo de Caixa", value: brl(f.fluxo_caixa), tone: f.fluxo_caixa >= 0 ? "text-emerald-600" : "text-rose-600" },
    { label: "Boletos Vencendo", value: f.boletos_vencendo, tone: f.boletos_vencendo > 0 ? "text-amber-600" : "text-neutral-700" },
    { label: "Boletos Vencidos", value: `${f.boletos_vencidos} (${brl(f.boletos_vencidos_valor)})`, tone: f.boletos_vencidos > 0 ? "text-rose-600" : "text-neutral-700" },
    { label: "Recebimentos Previstos", value: brl(f.recebimentos_previstos), tone: "text-emerald-600" },
    { label: "Recebimento iFood", value: brl(f.ifood_recebimento), tone: "text-rose-600" },
  ];

  return (
    <SectionCard icon={Wallet} title="Financeiro" accent="text-teal-500">
      <div className="grid grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.label} className="rounded-lg bg-neutral-50 p-3">
            <p className="text-xs text-neutral-500">{item.label}</p>
            <p className={`mt-0.5 text-sm font-bold ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {(f.maior_despesa || f.maior_receita) && (
        <div className="mt-4 space-y-2 border-t border-neutral-100 pt-3">
          {f.maior_despesa && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-neutral-500">
                <TrendingDown className="h-4 w-4 text-rose-400" /> Maior Despesa
              </span>
              <span className="font-medium text-neutral-700">{f.maior_despesa.description} — {brl(f.maior_despesa.value)}</span>
            </div>
          )}
          {f.maior_receita && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-neutral-500">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Maior Receita
              </span>
              <span className="font-medium text-neutral-700">{f.maior_receita.description} — {brl(f.maior_receita.value)}</span>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}