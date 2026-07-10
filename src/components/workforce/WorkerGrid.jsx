import React, { useEffect, useState, useCallback } from "react";
import { DigitalWorkforce, DEPARTMENT_CONFIG, DEPARTMENT_ORDER, WORKER_STATUS_CONFIG } from "@/lib/workforceEngine";

export default function WorkerGrid({ refreshKey, onSelectWorker }) {
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await DigitalWorkforce.listWorkers();
      setGrouped(res.grouped || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-4">
        {DEPARTMENT_ORDER.map((d) => (
          <div key={d} className="h-40 animate-pulse rounded-2xl bg-neutral-200/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {DEPARTMENT_ORDER.map((deptKey) => {
        const workers = grouped[deptKey] || [];
        if (workers.length === 0) return null;
        const cfg = DEPARTMENT_CONFIG[deptKey];
        return (
          <div key={deptKey} className={`rounded-2xl border ${cfg.border} bg-white p-5`}>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">{cfg.emoji}</span>
              <h3 className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</h3>
              <span className={`rounded-full ${cfg.bg} ${cfg.color} px-2 py-0.5 text-xs font-semibold`}>{workers.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {workers.map((w) => {
                const status = WORKER_STATUS_CONFIG[w.status] || WORKER_STATUS_CONFIG.idle;
                const nextRoutine = (w.routines || []).find(r => !r.last_executed_at) || (w.routines || [])[0];
                return (
                  <button key={w.id} onClick={() => onSelectWorker?.(w.worker_key)} className="text-left rounded-xl border border-neutral-100 p-4 hover:border-neutral-300 hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{w.avatar_emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-neutral-800 leading-tight">{w.name}</h4>
                        <p className="text-xs text-neutral-500">{w.role}</p>
                      </div>
                      <div className={`flex items-center gap-1 rounded-full ${status.bg} px-2 py-0.5`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${status.dot} ${w.status === 'working' ? 'animate-pulse' : ''}`} />
                        <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-neutral-400 line-clamp-2">{w.objective}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-neutral-50 pt-3">
                      <div className="text-center">
                        <p className="text-sm font-bold text-neutral-800">{w.analyses_count || 0}</p>
                        <p className="text-[10px] text-neutral-400">Análises</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-neutral-800">{w.suggestions_count || 0}</p>
                        <p className="text-[10px] text-neutral-400">Sugestões</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-emerald-600">R$ {(w.savings_generated || 0).toFixed(0)}</p>
                        <p className="text-[10px] text-neutral-400">Economia</p>
                      </div>
                    </div>
                    {nextRoutine && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-neutral-50 px-2 py-1">
                        <span className="text-[10px] font-mono text-neutral-500">{nextRoutine.time}</span>
                        <span className="text-[10px] text-neutral-500">{nextRoutine.action}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}