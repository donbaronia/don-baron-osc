import React, { useEffect, useState } from "react";
import { EventBus } from "@/lib/eventBus";
import StatCard from "@/components/dashboard/StatCard";
import { Activity, AlertOctagon, Clock, Cpu, Database, Zap, RefreshCw, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

const HEALTH_CONFIG = {
  excelente: { label: "Excelente", color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  boa: { label: "Boa", color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-200" },
  atencao: { label: "Atenção", color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" },
  critica: { label: "Crítica", color: "text-rose-600", bg: "bg-rose-50", ring: "ring-rose-200" },
};

export default function EventBusOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    EventBus.getDashboard().then(r => { setData(r); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;
  }

  if (!data) return null;

  const { metrics, health, queues, top_events, recent_events } = data;
  const hCfg = HEALTH_CONFIG[health.status] || HEALTH_CONFIG.boa;

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <div className={`rounded-2xl p-6 ring-1 ${hCfg.bg} ${hCfg.ring}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
              <Server className={`h-7 w-7 ${hCfg.color}`} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500">Saúde do Sistema</p>
              <p className={`text-2xl font-black ${hCfg.color}`}>{health.score}/100 — {hCfg.label}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Eventos / min" value={metrics.events_per_minute} icon={Zap} tone={metrics.events_per_minute > 0 ? "positive" : "neutral"} />
        <StatCard label="Pendentes" value={metrics.pending} icon={Clock} tone={metrics.pending > 20 ? "negative" : "neutral"} />
        <StatCard label="Com Erro" value={metrics.failed} icon={AlertOctagon} tone={metrics.failed > 0 ? "negative" : "positive"} />
        <StatCard label="Tempo Médio (ms)" value={Math.round(metrics.avg_processing_time_ms)} icon={Activity} tone={metrics.avg_processing_time_ms > 2000 ? "warning" : "positive"} />
        <StatCard label="Módulos Ativos" value={metrics.active_modules} icon={Cpu} tone="neutral" />
        <StatCard label="Retentativas" value={metrics.total_retries} icon={RefreshCw} tone={metrics.total_retries > 0 ? "warning" : "neutral"} />
        <StatCard label="Taxa de Erro (%)" value={metrics.error_rate} icon={AlertOctagon} tone={metrics.error_rate > 5 ? "negative" : "positive"} />
        <StatCard label="Backlog Filas" value={metrics.total_queue_backlog} icon={Database} tone={metrics.total_queue_backlog > 50 ? "negative" : "neutral"} />
      </div>

      {/* Active Modules */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Módulos Ativos</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {metrics.active_module_list?.map(m => (
            <span key={m} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">{m}</span>
          ))}
        </div>
      </div>

      {/* Top Events */}
      {top_events?.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-900">Eventos Mais Frequentes</h3>
          <div className="mt-3 space-y-2">
            {top_events.map(e => (
              <div key={e.name} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                <span className="text-xs font-mono text-neutral-700">{e.name}</span>
                <span className="text-sm font-bold text-neutral-900">{e.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Events */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Eventos Recentes</h3>
        <div className="mt-3 space-y-1.5">
          {recent_events?.map(e => {
            const statusColor = {
              pending: "bg-amber-100 text-amber-700",
              dispatched: "bg-blue-100 text-blue-700",
              completed: "bg-emerald-100 text-emerald-700",
              failed: "bg-rose-100 text-rose-700",
              processing: "bg-violet-100 text-violet-700",
              retrying: "bg-orange-100 text-orange-700",
            };
            const prioColor = {
              critica: "bg-rose-50 text-rose-600",
              alta: "bg-orange-50 text-orange-600",
              media: "bg-blue-50 text-blue-600",
              baixa: "bg-neutral-50 text-neutral-500",
            };
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-neutral-50">
                <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${prioColor[e.priority] || prioColor.media}`}>{e.priority}</span>
                <span className="shrink-0 font-mono text-xs font-semibold text-neutral-900">{e.event_name || e.event_type}</span>
                <span className="shrink-0 text-xs text-neutral-400">{e.module}</span>
                <span className="ml-auto flex items-center gap-2">
                  {e.retry_count > 0 && <span className="text-[10px] text-orange-500">↻{e.retry_count}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[e.event_status] || "bg-neutral-100 text-neutral-600"}`}>{e.event_status}</span>
                  <span className="text-[10px] text-neutral-400">{e.processing_time_ms}ms</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}