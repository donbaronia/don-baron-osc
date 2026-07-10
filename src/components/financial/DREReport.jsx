import React, { useEffect, useState } from "react";
import { FinancialCenter, brl, monthRange } from "@/lib/financialCenter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

export default function DREReport() {
  const [dre, setDre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(monthRange());

  const load = async () => {
    setLoading(true);
    try { setDre(await FinancialCenter.getDRE(period.start, period.end)); }
    catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  if (!dre) return null;

  const rows = [
    { label: "Receita Bruta", value: dre.receita_bruta },
    { label: "(-) Descontos", value: -dre.descontos },
    { label: "(=) Receita Líquida", value: dre.receita_liquida, bold: true },
    { label: "(-) CMV", value: -dre.cmv },
    { label: "(=) Lucro Bruto", value: dre.lucro_bruto, bold: true },
    { label: "(-) Despesas Operacionais", value: -dre.despesas_operacionais },
    { label: "(=) EBITDA", value: dre.ebitda, bold: true },
    { label: "(-) Impostos e Juros", value: -dre.impostos_juros },
    { label: "(=) Resultado Final", value: dre.resultado_final, bold: true, final: true },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
        <div className="flex gap-3">
          <div className="space-y-1"><label className="text-xs text-neutral-500">Início</label><Input type="date" value={period.start} onChange={e => setPeriod({ ...period, start: e.target.value })} /></div>
          <div className="space-y-1"><label className="text-xs text-neutral-500">Fim</label><Input type="date" value={period.end} onChange={e => setPeriod({ ...period, end: e.target.value })} /></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /> Atualizar</Button>
          <Button variant="outline" size="sm" onClick={() => exportToCsv("dre.csv", rows)} className="gap-2"><Download className="h-4 w-4" /> Exportar</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 bg-neutral-50/80 px-5 py-3">
          <h3 className="text-sm font-semibold text-neutral-700">Demonstração do Resultado do Exercício</h3>
        </div>
        <div className="divide-y divide-neutral-100">
          {rows.map((row, i) => (
            <div key={i} className={`flex items-center justify-between px-5 py-3.5 ${row.final ? "bg-neutral-50" : ""}`}>
              <span className={`text-sm ${row.bold ? "font-semibold text-neutral-900" : "text-neutral-600"}`}>{row.label}</span>
              <span className={`text-sm ${row.bold ? "font-semibold" : ""} ${row.value >= 0 ? "text-neutral-900" : "text-rose-600"}`}>{brl(row.value)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-neutral-200 bg-neutral-50/80 px-5 py-3 flex gap-6">
          <div><span className="text-xs text-neutral-500">Margem Bruta: </span><span className="text-sm font-medium">{dre.margem_bruta.toFixed(1)}%</span></div>
          <div><span className="text-xs text-neutral-500">Margem Líquida: </span><span className="text-sm font-medium">{dre.margem_liquida.toFixed(1)}%</span></div>
        </div>
      </div>
    </div>
  );
}