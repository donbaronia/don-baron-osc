import React, { useEffect, useState } from "react";
import { BI } from "@/lib/biEngine";
import { brl } from "@/lib/financialCenter";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function BITemporal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    BI.getTemporalAnalysis().then(r => { setData(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="grid gap-4 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;
  }

  const comparisons = [
    { title: "Hoje vs Ontem", curr: data.hoje_vs_ontem },
    { title: "Semana Atual vs Anterior", curr: data.semana_vs_anterior },
    { title: "Mês Atual vs Anterior", curr: data.mes_vs_anterior },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {comparisons.map(c => {
          const val = c.curr.variacao;
          const positive = val >= 0;
          const Icon = positive ? TrendingUp : val < 0 ? TrendingDown : Minus;
          return (
            <div key={c.title} className="rounded-2xl border border-neutral-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-neutral-900">{c.title}</h3>
              <div className="mt-4 flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${positive ? "bg-emerald-50" : val < 0 ? "bg-rose-50" : "bg-neutral-100"}`}>
                  <Icon className={`h-6 w-6 ${positive ? "text-emerald-600" : val < 0 ? "text-rose-600" : "text-neutral-400"}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">{Math.abs(val).toFixed(1)}%</p>
                  <p className="text-xs text-neutral-500">variação de receita</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-neutral-100 pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Atual</span>
                  <span className="font-semibold text-neutral-900">{brl(c.curr.atual)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Anterior</span>
                  <span className="text-neutral-700">{brl(c.curr.anterior)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-neutral-900">Indicadores Detalhados</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
                <th className="py-2 pr-4">Indicador</th>
                <th className="py-2 px-4">Hoje</th>
                <th className="py-2 px-4">Ontem</th>
                <th className="py-2 px-4">Semana</th>
                <th className="py-2 px-4">Sem. Passada</th>
                <th className="py-2 px-4">Mês</th>
                <th className="py-2 pl-4">Mês Passado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {[
                { label: "Receita Líquida", key: "receita_liquida", fmt: brl },
                { label: "Lucro Bruto", key: "lucro_bruto", fmt: brl },
                { label: "CMV %", key: "cmv_pct", fmt: v => `${v.toFixed(1)}%` },
                { label: "Margem %", key: "margem_pct", fmt: v => `${v.toFixed(1)}%` },
                { label: "Pedidos", key: "pedidos", fmt: v => v },
                { label: "Ticket Médio", key: "ticket_medio", fmt: brl },
                { label: "Fluxo de Caixa", key: "fluxo_caixa", fmt: brl },
              ].map(r => (
                <tr key={r.key}>
                  <td className="py-2 pr-4 font-medium text-neutral-700">{r.label}</td>
                  <td className="py-2 px-4 text-neutral-600">{r.fmt(data.detalhe.hoje[r.key] || 0)}</td>
                  <td className="py-2 px-4 text-neutral-500">{r.fmt(data.detalhe.ontem[r.key] || 0)}</td>
                  <td className="py-2 px-4 text-neutral-600">{r.fmt(data.detalhe.semana[r.key] || 0)}</td>
                  <td className="py-2 px-4 text-neutral-500">{r.fmt(data.detalhe.semana_passada[r.key] || 0)}</td>
                  <td className="py-2 px-4 text-neutral-600">{r.fmt(data.detalhe.mes[r.key] || 0)}</td>
                  <td className="py-2 pl-4 text-neutral-500">{r.fmt(data.detalhe.mes_passado[r.key] || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}