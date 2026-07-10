import React from "react";
import SectionCard from "./SectionCard";
import { brl } from "@/lib/financialCenter";
import { Package, AlertTriangle, Clock, DollarSign, PackageX, ShoppingCart } from "lucide-react";

export default function CommandStock({ data }) {
  const e = data.estoque;

  const items = [
    { icon: PackageX, label: "Itens Críticos", value: e.criticos, tone: e.criticos > 0 ? "text-rose-600" : "text-neutral-700" },
    { icon: AlertTriangle, label: "Vencendo", value: e.vencendo, tone: e.vencendo > 0 ? "text-amber-600" : "text-neutral-700" },
    { icon: Clock, label: "Cobertura", value: `${e.cobertura.toFixed(0)} dias`, tone: "text-neutral-700" },
    { icon: DollarSign, label: "Valor Estoque", value: brl(e.valor), tone: "text-neutral-700" },
    { icon: Package, label: "Sem Movimentação", value: e.sem_movimentacao, tone: e.sem_movimentacao > 0 ? "text-amber-600" : "text-neutral-700" },
    { icon: ShoppingCart, label: "Compras Urgentes", value: e.compras_urgentes, tone: e.compras_urgentes > 0 ? "text-amber-600" : "text-neutral-700" },
  ];

  return (
    <SectionCard icon={Package} title="Estoque" accent="text-blue-500">
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

      {e.critical_items.length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Itens Críticos</p>
          <div className="space-y-1">
            {e.critical_items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate text-neutral-700">{item.name || "—"}</span>
                <span className="ml-2 shrink-0 text-xs text-rose-600">
                  {item.quantity || 0} / mín. {item.min || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}