import React, { useEffect, useState, useCallback } from "react";
import { PeopleAnalytics, RISK_CONFIG, DEPARTMENT_CONFIG } from "@/lib/peopleAnalytics";
import { AlertTriangle, Brain, Loader2, Rocket, Shield, Sparkles, Users } from "lucide-react";

export default function Predictions({ refreshKey, onSelectEmployee }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await PeopleAnalytics.getPredictions()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading || !data) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;

  const highRisk = data.predictions.filter(p => p.turnoverRisk === 'alto');
  const leadership = data.predictions.filter(p => p.leadershipPotential);
  const needsTraining = data.predictions.filter(p => p.risks.includes('Treinamentos pendentes'));
  const highPerformers = data.predictions.filter(p => p.overall >= 80);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-red-200 bg-red-50/30 p-4"><AlertTriangle className="h-5 w-5 text-red-500" /><p className="text-2xl font-bold text-red-600 mt-1">{data.summary.high_risk}</p><p className="text-xs text-neutral-500">Alto Risco</p></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4"><Rocket className="h-5 w-5 text-amber-500" /><p className="text-2xl font-bold text-amber-600 mt-1">{data.summary.leadership_candidates}</p><p className="text-xs text-neutral-500">Líderes em Potencial</p></div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4"><Brain className="h-5 w-5 text-blue-500" /><p className="text-2xl font-bold text-blue-600 mt-1">{data.summary.needs_training}</p><p className="text-xs text-neutral-500">Precisam Treinamento</p></div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4"><Sparkles className="h-5 w-5 text-emerald-500" /><p className="text-2xl font-bold text-emerald-600 mt-1">{data.summary.high_performers}</p><p className="text-xs text-neutral-500">High Performers</p></div>
      </div>

      {/* High Risk */}
      <div className="rounded-2xl border border-red-200 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-600"><AlertTriangle className="h-4 w-4" /> Risco de Desligamento</h3>
        {highRisk.length === 0 ? (
          <div className="text-center py-4"><Shield className="mx-auto h-8 w-8 text-emerald-300" /><p className="mt-2 text-sm text-emerald-600">Nenhum colaborador em alto risco</p></div>
        ) : (
          <div className="space-y-2">
            {highRisk.map((p) => (
              <button key={p.employee_id} onClick={() => onSelectEmployee?.(p.employee_id)} className="w-full text-left rounded-xl border border-red-100 p-3 hover:bg-red-50/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-neutral-800">{p.employee_name}</h4>
                    <p className="text-xs text-neutral-400">{p.position} · {DEPARTMENT_CONFIG[p.department]?.label}</p>
                  </div>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">{p.overall}</span>
                </div>
                {p.risks.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{p.risks.map((r, i) => <span key={i} className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">{r}</span>)}</div>}
                <p className="mt-1 text-xs text-red-500 font-medium">⚠ {p.recommendation}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leadership Potential */}
      <div className="rounded-2xl border border-amber-200 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-600"><Rocket className="h-4 w-4" /> Possíveis Sucessores para Liderança</h3>
        {leadership.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-4">Nenhum candidato identificado</p>
        ) : (
          <div className="space-y-2">
            {leadership.map((p) => (
              <button key={p.employee_id} onClick={() => onSelectEmployee?.(p.employee_id)} className="w-full text-left rounded-xl border border-amber-100 p-3 hover:bg-amber-50/30">
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-amber-500" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-neutral-800">{p.employee_name}</h4>
                    <p className="text-xs text-neutral-400">{p.position} · {DEPARTMENT_CONFIG[p.department]?.label}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-600">{p.overall}</span>
                </div>
                <p className="mt-1 text-xs text-amber-600">{p.recommendation}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* All Predictions */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><Users className="h-4 w-4" /> Previsões por Colaborador</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {data.predictions.map((p) => {
            const tCfg = RISK_CONFIG[p.turnoverRisk] || {};
            return (
              <button key={p.employee_id} onClick={() => onSelectEmployee?.(p.employee_id)} className="text-left rounded-xl border border-neutral-100 p-3 hover:bg-neutral-50">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-neutral-800">{p.employee_name}</h4>
                    <p className="text-xs text-neutral-400">{p.position}</p>
                  </div>
                  {p.leadershipPotential && <Rocket className="h-4 w-4 text-amber-500" />}
                  <span className={`rounded-full ${tCfg.bg} ${tCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>{p.overall}</span>
                </div>
                {p.risks.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{p.risks.slice(0, 2).map((r, i) => <span key={i} className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">{r}</span>)}</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}