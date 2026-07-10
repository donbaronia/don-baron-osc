import React, { useEffect, useState, useCallback } from "react";
import { BaronKernel, HEALTH_STATUS_CONFIG } from "@/lib/kernelEngine";
import { Button } from "@/components/ui/button";
import { Activity, Loader2, RefreshCw, Stethoscope } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function HealthMonitor({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BaronKernel.getHealthChecks();
      setItems(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleRunCheck = async () => {
    setRunning(true);
    try {
      const res = await BaronKernel.runHealthCheck();
      toast({ title: "Health check concluído", description: `${res.results.length} componentes verificados` });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  // Agrupar por componente_type pegando o mais recente
  const latestByComponent = {};
  items.forEach((h) => {
    if (!latestByComponent[h.component] || new Date(h.checked_at) > new Date(latestByComponent[h.component].checked_at)) {
      latestByComponent[h.component] = h;
    }
  });
  const latest = Object.values(latestByComponent);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{latest.length} componente(s) monitorado(s)</p>
        <Button onClick={handleRunCheck} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
          {running ? "Verificando..." : "Executar Health Check"}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-200/60" />
          ))}
        </div>
      ) : latest.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
          <Activity className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 text-sm text-neutral-400">Nenhum health check executado ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {latest.map((h) => {
            const cfg = HEALTH_STATUS_CONFIG[h.status] || HEALTH_STATUS_CONFIG.unknown;
            return (
              <div key={h.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                    <h4 className="text-sm font-semibold text-neutral-800">{h.component}</h4>
                  </div>
                  <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-2">{h.details || '—'}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
                  <span>{h.response_time_ms}ms</span>
                  <span>{h.checked_at ? new Date(h.checked_at).toLocaleString('pt-BR') : '—'}</span>
                </div>
                {h.metrics && (
                  <div className="mt-2 flex gap-3 text-[10px] text-neutral-400">
                    {h.metrics.cpu != null && <span>CPU: {h.metrics.cpu}%</span>}
                    {h.metrics.memory != null && <span>RAM: {h.metrics.memory}%</span>}
                    {h.metrics.disk != null && <span>Disco: {h.metrics.disk}%</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}