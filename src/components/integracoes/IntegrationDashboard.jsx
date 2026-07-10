import React, { useEffect, useState, useCallback } from "react";
import { IntegrationHub, INTEGRATION_ICONS } from "@/lib/integrationHub";
import StatCard from "@/components/dashboard/StatCard";
import { Activity, AlertTriangle, ArrowDownLeft, ArrowUpRight, Clock, Cpu, Database, Inbox, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function IntegrationDashboard({ onRefresh, refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await IntegrationHub.getDashboard();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />
        ))}
      </div>
    );
  }

  const m = data.metrics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-800">Visão Geral</h2>
        <Button variant="outline" size="sm" onClick={() => { load(); onRefresh?.(); }}>
          <Activity className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Integrações Ativas" value={m.active} icon={Cpu} tone="positive" hint={`${m.total_integrations} total`} />
        <StatCard label="Com Erro" value={m.with_error} icon={AlertTriangle} tone="negative" hint={`${m.sandbox} em sandbox`} />
        <StatCard label="Chamadas Totais" value={m.total_calls} icon={Zap} tone="neutral" hint={`${m.error_rate}% erro`} />
        <StatCard label="Tempo Médio" value={`${m.avg_response_time_ms}ms`} icon={Clock} tone="neutral" />
        <StatCard label="Eventos Enviados" value={m.events_sent} icon={ArrowUpRight} tone="positive" />
        <StatCard label="Eventos Recebidos" value={m.events_received} icon={ArrowDownLeft} tone="positive" />
        <StatCard label="Fila Pendente" value={m.queue_pending} icon={Inbox} tone={m.queue_pending > 0 ? "warning" : "neutral"} hint={`${m.queue_dead} dead letter`} />
        <StatCard label="Webhooks Recentes" value={m.recent_webhooks} icon={Database} tone="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Integrações por Status</h3>
          <div className="space-y-3">
            {[
              { label: "Ativas", count: m.active, color: "bg-emerald-500" },
              { label: "Erros", count: m.with_error, color: "bg-red-500" },
              { label: "Sandbox", count: m.sandbox, color: "bg-amber-500" },
              { label: "Inativas", count: m.inactive, color: "bg-neutral-400" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-24 text-sm text-neutral-600">{s.label}</div>
                <div className="h-6 flex-1 overflow-hidden rounded-lg bg-neutral-100">
                  <div className={`h-full ${s.color} flex items-center justify-end pr-2 text-xs font-bold text-white`} style={{ width: `${m.total_integrations > 0 ? Math.max((s.count / m.total_integrations) * 100, s.count > 0 ? 8 : 0) : 0}%` }}>
                    {s.count > 0 && s.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Integrações Recentes</h3>
          {data.integrations.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhuma integração configurada</p>
          ) : (
            <div className="space-y-2">
              {data.integrations.slice(0, 6).map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-lg border border-neutral-100 p-2.5">
                  <span className="text-xl">{INTEGRATION_ICONS[i.integration_type] || "🔌"}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-neutral-800">{i.name}</div>
                    <div className="text-xs text-neutral-500">{i.category} · {i.total_calls || 0} chamadas</div>
                  </div>
                  <span className={`text-xs font-semibold ${i.status === 'ativo' ? 'text-emerald-600' : i.status === 'erro' ? 'text-red-600' : 'text-neutral-400'}`}>
                    {i.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}