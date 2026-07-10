import React, { useEffect, useState, useCallback } from "react";
import { DigitalWorkforce, DEPARTMENT_CONFIG, WORKER_STATUS_CONFIG, SEVERITY_CONFIG } from "@/lib/workforceEngine";
import StatCard from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, DollarSign, Loader2, Play, Target, TrendingUp, Users } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function WorkforceDashboard({ refreshKey, onSelectWorker }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await DigitalWorkforce.getDashboard();
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleExecuteAll = async () => {
    setExecuting(true);
    try {
      const res = await DigitalWorkforce.executeAll(3);
      toast({ title: "Rotinas executadas", description: `${res.executed} funcionário(s) processado(s)` });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setExecuting(false); }
  };

  const handleGenerateAlerts = async () => {
    setGenerating(true);
    try {
      const res = await DigitalWorkforce.generateAlerts();
      toast({ title: res.message });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

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
      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleExecuteAll} disabled={executing}>
          {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {executing ? "Executando..." : "Executar Rotinas"}
        </Button>
        <Button onClick={handleGenerateAlerts} disabled={generating} variant="outline">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
          {generating ? "Gerando..." : "Gerar Alertas"}
        </Button>
      </div>

      {/* Aggregate metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Funcionários Ativos" value={`${m.active_workers}/${m.total_workers}`} icon={Users} tone="positive" />
        <StatCard label="Análises Realizadas" value={m.total_analyses} icon={TrendingUp} tone="neutral" />
        <StatCard label="Sugestões Geradas" value={m.total_suggestions} icon={Target} tone="neutral" />
        <StatCard label="Economia Gerada" value={`R$ ${m.total_savings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} tone="positive" />
        <StatCard label="Tempo Economizado" value={`${m.total_time_saved_hours.toFixed(1)}h`} icon={Clock} tone="neutral" />
        <StatCard label="Precisão Média" value={`${m.average_precision}%`} icon={Target} tone={m.average_precision >= 70 ? "positive" : "neutral"} />
        <StatCard label="Alertas Ativos" value={m.active_alerts} icon={AlertTriangle} tone={m.critical_alerts > 0 ? "negative" : "neutral"} hint={m.critical_alerts > 0 ? `${m.critical_alerts} críticos` : "Tudo OK"} />
        <StatCard label="Taxa de Aprovação" value={`${m.total_approvals}/${m.total_approvals + m.total_rejections}`} icon={TrendingUp} tone="neutral" />
      </div>

      {/* Worker status grid */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Status da Equipe Digital</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.workers?.map((w) => {
            const dir = DEPARTMENT_CONFIG[w.department] || {};
            const status = WORKER_STATUS_CONFIG[w.status] || WORKER_STATUS_CONFIG.idle;
            return (
              <button key={w.id} onClick={() => onSelectWorker?.(w.worker_key)} className="text-left rounded-xl border border-neutral-100 p-3 hover:border-neutral-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{w.avatar_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-neutral-800 leading-tight truncate">{w.name}</h4>
                    <span className="text-xs text-neutral-400">{w.role}</span>
                  </div>
                  <div className={`h-2 w-2 rounded-full ${status.dot} ${w.status === 'working' ? 'animate-pulse' : ''}`} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className={`rounded-full ${dir.bg} ${dir.color} px-1.5 py-0.5 font-medium`}>{dir.label}</span>
                  <span className={status.color}>{status.label}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-400">
                  <span>📊 {w.analyses_count || 0}</span>
                  <span>💡 {w.suggestions_count || 0}</span>
                  <span>💰 R$ {(w.savings_generated || 0).toFixed(0)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent alerts and activities */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Alertas Recentes</h3>
          {data.recent_alerts?.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-8">Nenhum alerta ativo</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.recent_alerts?.map((a) => {
                const sev = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.media;
                return (
                  <div key={a.id} className="rounded-lg border border-neutral-100 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{sev.emoji}</span>
                      <h4 className="text-sm font-medium text-neutral-800 line-clamp-1">{a.title}</h4>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{a.message}</p>
                    <p className="mt-1 text-[10px] text-neutral-400">{a.worker_name}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Atividades Recentes</h3>
          {data.recent_activities?.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-8">Nenhuma atividade ainda</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.recent_activities?.map((a) => (
                <div key={a.id} className="rounded-lg border border-neutral-100 p-3">
                  <h4 className="text-sm font-medium text-neutral-800 line-clamp-1">{a.title}</h4>
                  {a.summary && <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{a.summary}</p>}
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-400">
                    <span>{a.worker_name}</span>
                    {a.confidence_level && <span>· {a.confidence_level}</span>}
                    {a.savings_identified > 0 && <span>· R$ {a.savings_identified.toFixed(0)}</span>}
                    <span>· {a.created_date ? new Date(a.created_date).toLocaleString('pt-BR') : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}