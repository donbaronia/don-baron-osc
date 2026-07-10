import React, { useEffect, useState, useCallback } from "react";
import { MissionControl, MISSION_TYPE_CONFIG, MISSION_STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/missionEngine";
import StatCard from "@/components/dashboard/StatCard";
import { AlertTriangle, CheckCircle2, Clock, DollarSign, Rocket, Target, TrendingUp } from "lucide-react";

export default function MissionDashboard({ refreshKey, onSelectMission }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await MissionControl.getDashboard();
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />)}
      </div>
    );
  }

  const m = data.metrics;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Missões Ativas" value={m.active_missions} icon={Rocket} tone="neutral" />
        <StatCard label="Concluídas" value={m.completed_missions} icon={CheckCircle2} tone="positive" />
        <StatCard label="Atrasadas" value={m.delayed_missions} icon={Clock} tone={m.delayed_missions > 0 ? "negative" : "neutral"} />
        <StatCard label="Críticas" value={m.critical_missions} icon={AlertTriangle} tone={m.critical_missions > 0 ? "negative" : "neutral"} />
        <StatCard label="Progresso Médio" value={`${m.avg_progress}%`} icon={TrendingUp} tone="neutral" />
        <StatCard label="Eficiência" value={`${m.efficiency}%`} icon={Target} tone={m.efficiency >= 70 ? "positive" : "neutral"} />
        <StatCard label="Economia" value={`R$ ${m.total_savings.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`} icon={DollarSign} tone="positive" />
        <StatCard label="Total" value={m.total_missions} icon={Rocket} tone="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Por Tipo</h3>
          <div className="space-y-2">
            {Object.entries(data.missions_by_type || {}).map(([type, count]) => {
              const cfg = MISSION_TYPE_CONFIG[type] || {};
              return (
                <div key={type} className="flex items-center justify-between rounded-lg border border-neutral-100 p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cfg.emoji}</span>
                    <span className="text-sm text-neutral-700">{cfg.label}</span>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Por Status</h3>
          <div className="space-y-2">
            {Object.entries(data.missions_by_status || {}).map(([status, count]) => {
              const cfg = MISSION_STATUS_CONFIG[status] || {};
              return (
                <div key={status} className="flex items-center justify-between rounded-lg border border-neutral-100 p-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                    <span className="text-sm text-neutral-700">{cfg.label}</span>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Missões Recentes</h3>
        {data.recent_missions?.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-8">Nenhuma missão criada ainda</p>
        ) : (
          <div className="space-y-2">
            {data.recent_missions?.map((mission) => {
              const tCfg = MISSION_TYPE_CONFIG[mission.type] || {};
              const sCfg = MISSION_STATUS_CONFIG[mission.status] || {};
              const pCfg = PRIORITY_CONFIG[mission.priority] || {};
              return (
                <button key={mission.id} onClick={() => onSelectMission?.(mission.id)} className="w-full text-left rounded-xl border border-neutral-100 p-3 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tCfg.emoji}</span>
                    <h4 className="text-sm font-medium text-neutral-800 flex-1 line-clamp-1">{mission.name}</h4>
                    <span className={`rounded-full ${pCfg.bg} ${pCfg.color} px-1.5 py-0.5 text-[10px] font-semibold`}>{pCfg.label}</span>
                    <span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>{sCfg.label}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-neutral-100 overflow-hidden">
                      <div className={`h-full rounded-full ${mission.progress_pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${mission.progress_pct}%` }} />
                    </div>
                    <span className="text-xs text-neutral-400">{mission.progress_pct}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}