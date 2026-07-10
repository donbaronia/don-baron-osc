import React, { useEffect, useState } from "react";
import { PE, brl } from "@/lib/productionEngine";
import StatCard from "@/components/dashboard/StatCard";
import { Factory, Clock, TrendingUp, AlertTriangle, Package, ChefHat, Timer, Users, RefreshCw } from "lucide-react";

export default function ProductionDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await PE.getOperationalDashboard()); }
    catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  if (!data) return null;
  const s = data.summary;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Factory} label="Em Andamento" value={s.inProgress} tone={s.inProgress > 0 ? "warning" : "neutral"} />
        <StatCard icon={Package} label="Pendentes" value={s.pending} tone={s.pending > 0 ? "warning" : "neutral"} />
        <StatCard icon={AlertTriangle} label="Atrasadas" value={s.overdue} tone={s.overdue > 0 ? "negative" : "neutral"} />
        <StatCard icon={ChefHat} label="Concluídas Hoje" value={s.completedToday} tone="positive" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Rendimento Médio" value={`${s.avgYield.toFixed(0)}%`} tone="positive" />
        <StatCard icon={Timer} label="Eficiência Média" value={`${s.avgEfficiency.toFixed(0)}%`} tone={s.avgEfficiency >= 90 ? "positive" : "warning"} />
        <StatCard icon={Clock} label="Tempo Médio" value={`${s.avgTime.toFixed(0)} min`} />
        <StatCard icon={AlertTriangle} label="Perdas Hoje" value={`${s.todayLossQty}`} tone={s.todayLossQty > 0 ? "negative" : "neutral"} />
      </div>

      {data.alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-500">ALERTAS</h3>
          {data.alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 ${a.severity === "urgent" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
              <AlertTriangle className={`h-5 w-5 ${a.severity === "urgent" ? "text-rose-600" : "text-amber-600"}`} />
              <span className={`text-sm ${a.severity === "urgent" ? "text-rose-700" : "text-amber-700"}`}>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produções em andamento */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4"><Factory className="h-5 w-5 text-blue-500" /><h3 className="text-sm font-semibold text-neutral-700">Produções em Andamento</h3></div>
          <div className="space-y-2">
            {data.inProgress.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-neutral-100 p-2 text-sm">
                <div>
                  <span className="font-medium text-neutral-900">{p.item}</span>
                  <span className="ml-2 text-xs text-neutral-400">{p.production_code}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-400">{p.responsible}</span>
                  <span className="text-xs font-medium text-blue-600">{p.status.replace(/_/g, " ")}</span>
                </div>
              </div>
            ))}
            {data.inProgress.length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Nenhuma produção em andamento</p>}
          </div>
        </div>

        {/* Produtividade por funcionário */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4"><Users className="h-5 w-5 text-emerald-500" /><h3 className="text-sm font-semibold text-neutral-700">Produtividade por Funcionário</h3></div>
          <div className="space-y-2">
            {data.workerRanking.slice(0, 8).map((w, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700"><span className="text-neutral-400 mr-2">#{i + 1}</span>{w.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-400">{w.totalQty} un</span>
                  <span className="text-xs text-neutral-400">{w.avgTime.toFixed(0)}min</span>
                  <span className="text-xs font-medium text-emerald-600">{w.perHour.toFixed(1)}/h</span>
                </div>
              </div>
            ))}
            {data.workerRanking.length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Sem dados</p>}
          </div>
        </div>
      </div>

      {/* Perdas por tipo */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4"><AlertTriangle className="h-5 w-5 text-rose-500" /><h3 className="text-sm font-semibold text-neutral-700">Perdas por Tipo</h3></div>
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(data.lossesByType).map(([type, qty]) => (
            <div key={type} className="rounded-xl border border-neutral-100 p-3 text-center">
              <p className="text-xs capitalize text-neutral-500">{type.replace(/_/g, " ")}</p>
              <p className="mt-1 text-lg font-bold text-rose-600">{qty}</p>
            </div>
          ))}
          {Object.keys(data.lossesByType).length === 0 && <p className="col-span-full py-2 text-center text-sm text-neutral-400">Sem perdas registradas</p>}
        </div>
      </div>

      {/* Centros de produção */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4"><Factory className="h-5 w-5 text-neutral-500" /><h3 className="text-sm font-semibold text-neutral-700">Centros de Produção</h3></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {data.productionCenters.map((c, i) => (
            <div key={i} className="rounded-xl border border-neutral-100 p-3">
              <p className="text-xs capitalize text-neutral-500">{c.name.replace(/_/g, " ")}</p>
              <p className="mt-1 text-lg font-bold text-neutral-900">{c.completed}/{c.count}</p>
              <p className="text-xs text-neutral-400">{c.totalQty} un produzidas</p>
            </div>
          ))}
          {data.productionCenters.length === 0 && <p className="col-span-full py-2 text-center text-sm text-neutral-400">Nenhum centro ativo</p>}
        </div>
      </div>
    </div>
  );
}