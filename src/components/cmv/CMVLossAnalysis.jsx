import React, { useEffect, useState } from "react";
import { CMV, brl } from "@/lib/cmvEngine";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

export default function CMVLossAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await CMV.getLatest("monthly")); }
    catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  if (!data) return <p className="py-10 text-center text-sm text-neutral-400">Calcule o CMV primeiro.</p>;

  const losses = data.losses_by_type || {};
  const totalLosses = Object.values(losses).reduce((s, v) => s + (v || 0), 0);
  const sortedLosses = Object.entries(losses).sort((a, b) => b[1] - a[1]);

  const lossLabels = {
    producao: "Produção", estoque: "Estoque", validade: "Validade", erro_operacional: "Erro Operacional",
    treinamento: "Treinamento", manipulacao: "Manipulação", furto: "Furto", quebra: "Quebra", outros: "Outros",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Análise de Perdas</h3>
          <p className="text-sm text-neutral-500">Total de perdas no período: <span className="font-medium text-rose-600">{brl(totalLosses)}</span></p>
        </div>
        <button onClick={() => exportToCsv("perdas.csv", sortedLosses.map(([k, v]) => ({ tipo: k, valor: v })))} className="text-sm text-neutral-500 hover:text-neutral-700">Exportar CSV</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Losses by type - bars */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h4 className="text-sm font-semibold text-neutral-700 mb-4">Perdas por Categoria</h4>
          <div className="space-y-3">
            {sortedLosses.map(([type, value]) => {
              const pct = totalLosses > 0 ? (value / totalLosses) * 100 : 0;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-neutral-700">{lossLabels[type] || type}</span>
                    <span className="font-medium text-rose-600">{brl(value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100">
                    <div className="h-2 rounded-full bg-rose-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {sortedLosses.length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Sem perdas registradas</p>}
          </div>
        </div>

        {/* Impact summary */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h4 className="text-sm font-semibold text-neutral-700 mb-4">Impacto Financeiro</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Total de Perdas</span><span className="font-bold text-rose-600">{brl(totalLosses)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Receita Líquida</span><span className="font-medium">{brl(data.revenue_net)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">% da Receita</span><span className={`font-medium ${data.revenue_net > 0 && (totalLosses / data.revenue_net) * 100 > 5 ? "text-rose-600" : "text-neutral-700"}`}>{data.revenue_net > 0 ? `${((totalLosses / data.revenue_net) * 100).toFixed(1)}%` : "—"}</span></div>
            <div className="flex justify-between border-t pt-2"><span className="text-neutral-500">Lucro Bruto</span><span className="font-medium text-emerald-600">{brl(data.gross_profit)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Lucro Líquido</span><span className="font-medium">{brl(data.net_profit)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Desperdícios</span><span className="font-medium text-rose-600">{brl(data.waste_value)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Bonificações</span><span className="font-medium text-emerald-600">{brl(data.bonifications_value)}</span></div>
          </div>
          {data.revenue_net > 0 && (totalLosses / data.revenue_net) * 100 > 5 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span className="text-xs text-rose-700">Perdas acima de 5% da receita — atenção necessária</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}