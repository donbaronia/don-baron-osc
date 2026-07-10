import React, { useEffect, useState } from "react";
import { FinancialCenter, brl } from "@/lib/financialCenter";
import { Calendar, RefreshCw } from "lucide-react";

const PERIODS = [7, 15, 30, 60, 90, 365];

export default function Projecao() {
  const [projections, setProjections] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(PERIODS.map(d => FinancialCenter.getProjection(d)));
      setProjections(results);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">Projeção de fluxo de caixa baseada em contas a pagar e receber pendentes.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projections.map(p => (
          <div key={p.days} className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-neutral-500">{p.days} dias</h3>
              <Calendar className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">A Receber</span>
                <span className="text-sm font-medium text-emerald-600">{brl(p.a_receber)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">A Pagar</span>
                <span className="text-sm font-medium text-rose-600">{brl(p.a_pagar)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
                <span className="text-sm font-medium text-neutral-700">Saldo Projetado</span>
                <span className={`text-lg font-semibold ${p.saldo_projetado >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{brl(p.saldo_projetado)}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-neutral-400">{p.count_receber} recebimentos · {p.count_pagar} pagamentos</p>
          </div>
        ))}
      </div>
    </div>
  );
}