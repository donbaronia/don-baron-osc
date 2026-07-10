import React, { useEffect, useState } from "react";
import { IE, brl } from "@/lib/inventoryEngine";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

const SEL = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const CRITERIA = [
  { v: "valor", l: "Por Valor" },
  { v: "quantidade", l: "Por Quantidade" },
  { v: "consumo", l: "Por Consumo" },
];

export default function ABCCurve() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [criteria, setCriteria] = useState("valor");

  const load = async (c = criteria) => {
    setLoading(true);
    try { setData(await IE.getABCCurve(c)); }
    catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(criteria); }, [criteria]);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  if (!data) return null;

  const classColors = {
    A: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", badge: "bg-rose-600 text-white" },
    B: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-500 text-white" },
    C: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-500 text-white" },
  };

  const totalMetric = (data.classA.totalMetric || 0) + (data.classB.totalMetric || 0) + (data.classC.totalMetric || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <select className={SEL + " w-48"} value={criteria} onChange={e => setCriteria(e.target.value)}>
          {CRITERIA.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={() => exportToCsv("curva_abc.csv", data.allItems.map(i => ({ produto: i.product_name, classe: i.abc_class, metrica: i.metric, percentual_acumulado: i.cumulative_pct })))} className="gap-2">Exportar CSV</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {["A", "B", "C"].map(cls => {
          const c = classColors[cls];
          const classData = cls === "A" ? data.classA : cls === "B" ? data.classB : data.classC;
          const pct = totalMetric > 0 ? (classData.totalMetric / totalMetric) * 100 : 0;
          return (
            <div key={cls} className={`rounded-2xl border ${c.border} ${c.bg} p-5`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${c.badge}`}>Classe {cls}</span>
                <span className={`text-2xl font-bold ${c.text}`}>{classData.count}</span>
              </div>
              <p className="text-xs text-neutral-500">Itens</p>
              <p className={`text-lg font-semibold ${c.text} mt-1`}>{brl(classData.totalMetric)}</p>
              <p className="text-xs text-neutral-400">{pct.toFixed(1)}% do total</p>
              {cls === "A" && <p className="mt-2 text-xs text-neutral-500">80% do valor — prioridade máxima</p>}
              {cls === "B" && <p className="mt-2 text-xs text-neutral-500">15% do valor — controle moderado</p>}
              {cls === "C" && <p className="mt-2 text-xs text-neutral-500">5% do valor — controle simples</p>}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Detalhamento ABC ({data.totalItems} itens)</h3>
        <div className="space-y-1 max-h-[50vh] overflow-y-auto">
          {data.allItems.map((item, i) => {
            const c = classColors[item.abc_class];
            return (
              <div key={i} className="flex items-center justify-between rounded-lg border border-neutral-50 p-2 text-sm hover:bg-neutral-50">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.badge}`}>{item.abc_class}</span>
                  <span className="text-neutral-700">{item.product_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-neutral-400">{item.quantity} un</span>
                  <span className="text-xs text-neutral-500">{item.cumulative_pct.toFixed(1)}%</span>
                  <span className="font-medium text-neutral-900">{brl(item.metric)}</span>
                </div>
              </div>
            );
          })}
          {data.allItems.length === 0 && <p className="py-4 text-center text-sm text-neutral-400">Sem dados suficientes</p>}
        </div>
      </div>
    </div>
  );
}