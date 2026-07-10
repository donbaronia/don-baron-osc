import React, { useEffect, useState } from "react";
import { BI } from "@/lib/biEngine";
import StatCard from "@/components/dashboard/StatCard";
import { brl } from "@/lib/financialCenter";
import { Wallet, TrendingUp, TrendingDown, Percent, DollarSign, ArrowUpCircle, ArrowDownCircle, BarChart3 } from "lucide-react";

export default function BIFinancial() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    BI.getFinancialDashboard().then(r => { setData(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;
  }

  const cards = [
    { icon: Wallet, label: "Fluxo de Caixa", value: brl(data.fluxo_caixa), tone: data.fluxo_caixa >= 0 ? "positive" : "negative", accent: "bg-teal-50 text-teal-600" },
    { icon: Percent, label: "CMV", value: `${data.cmv.toFixed(1)}%`, tone: data.cmv > 35 ? "negative" : "neutral", accent: "bg-purple-50 text-purple-600" },
    { icon: TrendingUp, label: "Lucro", value: brl(data.lucro), tone: data.lucro >= 0 ? "positive" : "negative", accent: "bg-emerald-50 text-emerald-600" },
    { icon: BarChart3, label: "Margem", value: `${data.margem.toFixed(1)}%`, tone: data.margem >= 20 ? "positive" : "negative", accent: "bg-blue-50 text-blue-600" },
    { icon: ArrowDownCircle, label: "Recebimentos", value: brl(data.recebimentos), accent: "bg-emerald-50 text-emerald-600" },
    { icon: ArrowUpCircle, label: "Pagamentos", value: brl(data.pagamentos), tone: "negative", accent: "bg-rose-50 text-rose-600" },
  ];

  const comp = data.comparativo;
  const VarBadge = ({ val }) => {
    const positive = val >= 0;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}>
        {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(val).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-neutral-900">DRE Consolidado</h3>
          <div className="mt-4 space-y-3">
            {[
              { label: "Receita Bruta", value: data.dre.receita },
              { label: "(-) Custo dos Produtos", value: -data.dre.custo_produtos },
              { label: "(=) Lucro Bruto", value: data.dre.lucro },
              { label: "(=) Margem", value: data.dre.margem, isPct: true },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <span className="text-sm text-neutral-600">{r.label}</span>
                <span className={`text-sm font-semibold ${r.value < 0 ? "text-rose-600" : "text-neutral-900"}`}>
                  {r.isPct ? `${r.value.toFixed(1)}%` : brl(r.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-neutral-900">Comparativo Mensal</h3>
          <div className="mt-4 space-y-3">
            {[
              { label: "Receita", atual: comp.receita_atual, anterior: comp.receita_anterior, variacao: comp.receita_variacao },
              { label: "Despesas", atual: comp.despesa_atual, anterior: comp.despesa_anterior, variacao: comp.despesa_variacao },
              { label: "Lucro", atual: comp.lucro_atual, anterior: comp.lucro_anterior, variacao: comp.lucro_variacao },
            ].map(r => (
              <div key={r.label} className="border-b border-neutral-100 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">{r.label}</span>
                  <VarBadge val={r.variacao} />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                  <span>Atual: <strong className="text-neutral-800">{brl(r.atual)}</strong></span>
                  <span>•</span>
                  <span>Anterior: {brl(r.anterior)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}