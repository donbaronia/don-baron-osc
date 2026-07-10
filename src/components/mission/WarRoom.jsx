import React, { useEffect, useState, useCallback } from "react";
import { MissionControl, MISSION_TYPE_CONFIG, PRIORITY_CONFIG, SEVERITY_CONFIG } from "@/lib/missionEngine";
import { Button } from "@/components/ui/button";
import { AlertTriangle, DollarSign, Loader2, Shield, Timer, Zap } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

function CountdownBadge({ endDate, status }) {
  if (status === 'concluida') return null;
  const today = new Date().toISOString().split('T')[0];
  const daysLeft = Math.ceil((new Date(endDate) - new Date(today)) / (1000 * 60 * 60 * 24));
  const color = daysLeft < 0 ? 'text-red-600 bg-red-50' : daysLeft <= 1 ? 'text-orange-600 bg-orange-50' : 'text-neutral-600 bg-neutral-100';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      <Timer className="h-3 w-3" />
      {daysLeft < 0 ? `Atrasada ${Math.abs(daysLeft)}d` : daysLeft === 0 ? 'Hoje' : `${daysLeft}d restante`}
    </span>
  );
}

export default function WarRoom({ refreshKey, onSelectMission }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoCreating, setAutoCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await MissionControl.getWarRoom();
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleAutoCreate = async () => {
    setAutoCreating(true);
    try {
      const res = await MissionControl.autoCreate();
      toast({ title: res.message });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setAutoCreating(false); }
  };

  if (loading || !data) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;
  }

  const hasContent = data.critical_missions?.length > 0 || data.delayed_missions?.length > 0 || data.active_alerts?.length > 0 || data.blocked_tasks?.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-red-900/30 bg-gradient-to-br from-red-950 via-neutral-900 to-neutral-950 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Sala de Guerra</h2>
            <p className="text-sm text-neutral-400">Missões críticas · Alertas · Riscos · Pendências · Bloqueios</p>
          </div>
          <div className="flex-1" />
          <Button onClick={handleAutoCreate} disabled={autoCreating} variant="outline" size="sm" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
            {autoCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {autoCreating ? "Criando..." : "Detectar com IA"}
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-2xl font-bold text-red-400">{data.critical_missions?.length || 0}</p>
            <p className="text-xs text-neutral-400">Críticas</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-2xl font-bold text-orange-400">{data.delayed_missions?.length || 0}</p>
            <p className="text-xs text-neutral-400">Atrasadas</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-2xl font-bold text-amber-400">{data.active_alerts?.length || 0}</p>
            <p className="text-xs text-neutral-400">Alertas</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-2xl font-bold text-white">{data.blocked_tasks?.length || 0}</p>
            <p className="text-xs text-neutral-400">Bloqueios</p>
          </div>
        </div>
      </div>

      {!hasContent && (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/30 p-10 text-center">
          <Shield className="mx-auto h-10 w-10 text-emerald-400" />
          <p className="mt-3 text-sm font-medium text-emerald-700">Tudo sob controle</p>
          <p className="text-xs text-neutral-400 mt-1">Nenhuma missão crítica, atraso ou bloqueio no momento</p>
        </div>
      )}

      {/* Critical missions */}
      {data.critical_missions?.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-white p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-600">
            <AlertTriangle className="h-4 w-4" /> Missões Críticas
          </h3>
          <div className="space-y-2">
            {data.critical_missions.map((m) => {
              const tCfg = MISSION_TYPE_CONFIG[m.type] || {};
              const pCfg = PRIORITY_CONFIG[m.priority] || {};
              return (
                <button key={m.id} onClick={() => onSelectMission?.(m.id)} className="w-full text-left rounded-xl border border-red-100 p-3 hover:bg-red-50/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{tCfg.emoji}</span>
                    <h4 className="text-sm font-semibold text-neutral-800 flex-1 line-clamp-1">{m.name}</h4>
                    <CountdownBadge endDate={m.end_date} status={m.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-neutral-100 overflow-hidden">
                      <div className="h-full rounded-full bg-red-500" style={{ width: `${m.progress_pct}%` }} />
                    </div>
                    <span className="text-xs text-neutral-500">{m.progress_pct}%</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-400">
                    <span className={`rounded-full ${pCfg.bg} ${pCfg.color} px-1.5 py-0.5 font-semibold`}>{pCfg.label}</span>
                    <span>{m.tasks_completed || 0}/{m.tasks_count || 0} tarefas</span>
                    {m.responsible_name && <span>· {m.responsible_name}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Delayed missions */}
      {data.delayed_missions?.length > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-white p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-orange-600">
            <Timer className="h-4 w-4" /> Missões Atrasadas
          </h3>
          <div className="space-y-2">
            {data.delayed_missions.map((m) => {
              const tCfg = MISSION_TYPE_CONFIG[m.type] || {};
              return (
                <button key={m.id} onClick={() => onSelectMission?.(m.id)} className="w-full text-left rounded-xl border border-orange-100 p-3 hover:bg-orange-50/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{tCfg.emoji}</span>
                    <h4 className="text-sm font-semibold text-neutral-800 flex-1 line-clamp-1">{m.name}</h4>
                    <span className="text-xs text-red-600 font-medium">Atrasada</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-neutral-100 overflow-hidden">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${m.progress_pct}%` }} />
                    </div>
                    <span className="text-xs text-neutral-500">{m.progress_pct}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active alerts from workforce */}
      {data.active_alerts?.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-white p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-600">
            <AlertTriangle className="h-4 w-4" /> Alertas Ativos da Equipe Digital
          </h3>
          <div className="space-y-2">
            {data.active_alerts.slice(0, 10).map((a) => {
              const sev = SEVERITY_CONFIG[a.severity] || {};
              return (
                <div key={a.id} className="rounded-lg border border-neutral-100 p-3">
                  <div className="flex items-center gap-2">
                    <span>{sev.emoji}</span>
                    <h4 className="text-sm font-medium text-neutral-800 line-clamp-1">{a.title}</h4>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{a.message}</p>
                  <p className="mt-1 text-[10px] text-neutral-400">{a.worker_name}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Blocked tasks */}
      {data.blocked_tasks?.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-white p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-600">
            <Shield className="h-4 w-4" /> Tarefas Bloqueadas
          </h3>
          <div className="space-y-2">
            {data.blocked_tasks.map((t) => (
              <button key={t.id} onClick={() => onSelectMission?.(t.mission_id)} className="w-full text-left rounded-lg border border-red-100 p-3 hover:bg-red-50/30 transition-colors">
                <h4 className="text-sm font-medium text-neutral-800">{t.name}</h4>
                <p className="text-xs text-neutral-400 mt-0.5">{t.mission_name}</p>
                {t.depends_on_names?.length > 0 && <p className="text-[10px] text-amber-600 mt-1">Aguardando: {t.depends_on_names.join(', ')}</p>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}