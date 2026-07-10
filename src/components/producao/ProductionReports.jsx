import React, { useEffect, useState } from "react";
import { PE, brl } from "@/lib/productionEngine";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Factory, TrendingUp, Timer, AlertTriangle, Package } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

export default function ProductionReports() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await PE.getOperationalDashboard()); }
    catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  if (!data) return null;
  const s = data.summary;

  const Card = ({ icon: Icon, title, value, subtitle }) => (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-500">{title}</span>
        <Icon className="h-5 w-5 text-neutral-400" />
      </div>
      <p className="mt-2 text-2xl font-bold text-neutral-900">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-neutral-400">{subtitle}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-neutral-900">Relatórios de Produção</h3>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"><RefreshCw className="h-4 w-4" /> Atualizar</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Factory} title="Concluídas Hoje" value={s.completedToday} />
        <Card icon={TrendingUp} title="Rendimento Médio" value={`${s.avgYield.toFixed(0)}%`} />
        <Card icon={Timer} title="Eficiência Média" value={`${s.avgEfficiency.toFixed(0)}%`} />
        <Card icon={Timer} title="Tempo Médio" value={`${s.avgTime.toFixed(0)} min`} />
      </div>

      {/* Perdas por tipo */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-neutral-700">Perdas por Tipo</h4>
          <button onClick={() => exportToCsv("perdas_producao.csv", Object.entries(data.lossesByType).map(([k, v]) => ({ tipo: k, quantidade: v })))} className="text-xs text-neutral-500 hover:text-neutral-700">CSV</button>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(data.lossesByType).map(([type, qty]) => (
            <div key={type} className="rounded-xl border border-neutral-100 p-3 text-center">
              <p className="text-xs capitalize text-neutral-500">{type.replace(/_/g, " ")}</p>
              <p className="mt-1 text-lg font-bold text-rose-600">{qty}</p>
            </div>
          ))}
          {Object.keys(data.lossesByType).length === 0 && <p className="col-span-full py-2 text-center text-sm text-neutral-400">Sem perdas</p>}
        </div>
      </div>

      {/* Produtividade por funcionário */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-neutral-700">Produtividade por Funcionário</h4>
          <button onClick={() => exportToCsv("produtividade.csv", data.workerRanking)} className="text-xs text-neutral-500 hover:text-neutral-700">CSV</button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {data.workerRanking.map((w, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b border-neutral-50 pb-1">
              <span className="text-neutral-700"><span className="text-neutral-400 mr-2">#{i + 1}</span>{w.name}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-neutral-400">{w.count} prod.</span>
                <span className="text-xs text-neutral-400">{w.totalQty} un</span>
                <span className="text-xs text-neutral-400">{w.avgTime.toFixed(0)}min</span>
                <span className="font-medium text-emerald-600">{w.perHour.toFixed(1)}/h</span>
              </div>
            </div>
          ))}
          {data.workerRanking.length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Sem dados</p>}
        </div>
      </div>

      {/* Centros de produção */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h4 className="text-sm font-semibold text-neutral-700 mb-4">Produção por Centro</h4>
        <div className="space-y-2">
          {data.productionCenters.map((c, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-neutral-700 capitalize">{c.name.replace(/_/g, " ")}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-neutral-400">{c.completed}/{c.count} concluídas</span>
                <span className="font-medium text-neutral-900">{c.totalQty} un</span>
              </div>
            </div>
          ))}
          {data.productionCenters.length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Sem dados</p>}
        </div>
      </div>
    </div>
  );
}