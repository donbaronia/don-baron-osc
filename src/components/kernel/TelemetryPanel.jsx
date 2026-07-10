import React, { useEffect, useState, useCallback } from "react";
import { BaronKernel } from "@/lib/kernelEngine";
import StatCard from "@/components/dashboard/StatCard";
import { Activity, Clock, Cpu, Gauge, MemoryStick, TrendingUp } from "lucide-react";

export default function TelemetryPanel({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BaronKernel.getTelemetry();
      setItems(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />
        ))}
      </div>
    );
  }

  // Agrupar metricas mais recentes por nome
  const latestByMetric = {};
  items.forEach((t) => {
    if (!latestByMetric[t.metric_name] || new Date(t.recorded_at) > new Date(latestByMetric[t.metric_name].recorded_at)) {
      latestByMetric[t.metric_name] = t;
    }
  });
  const latest = Object.values(latestByMetric);

  const bootTime = latestByMetric.boot_time;
  const responseTime = latestByMetric.avg_response_time;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Tempo de Boot" value={bootTime ? `${bootTime.metric_value}ms` : "—"} icon={Clock} tone="neutral" />
        <StatCard label="Tempo de Resposta Médio" value={responseTime ? `${responseTime.metric_value}ms` : "—"} icon={Gauge} tone="neutral" />
        <StatCard label="Métricas Registradas" value={items.length} icon={TrendingUp} tone="neutral" />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Histórico de Telemetria</h3>
        {items.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-8">Nenhuma métrica registrada</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {items.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border border-neutral-100 p-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
                  {t.metric_type === 'performance' ? <Gauge className="h-3.5 w-3.5 text-neutral-500" /> : <Activity className="h-3.5 w-3.5 text-neutral-500" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-neutral-800">{t.metric_name}</div>
                  <div className="text-xs text-neutral-400">{t.metric_type} · {t.recorded_at ? new Date(t.recorded_at).toLocaleString('pt-BR') : '—'}</div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-neutral-700">{t.metric_value}</span>
                  <span className="text-xs text-neutral-400 ml-1">{t.metric_unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}