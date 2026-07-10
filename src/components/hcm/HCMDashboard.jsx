import React, { useEffect, useState, useCallback } from "react";
import { HCM, EMPLOYEE_STATUS_CONFIG, DEPARTMENT_CONFIG, DOC_TYPE_CONFIG, DOC_STATUS_CONFIG, RECOGNITION_TYPE_CONFIG } from "@/lib/hcmEngine";
import StatCard from "@/components/dashboard/StatCard";
import { AlertTriangle, Award, Cake, CalendarClock, Clock, FileWarning, GraduationCap, TrendingDown, Users, Wallet } from "lucide-react";

export default function HCMDashboard({ refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await HCM.getDashboard()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading || !data) {
    return <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;
  }

  const m = data.metrics;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Colaboradores Ativos" value={m.active_employees} icon={Users} tone="neutral" />
        <StatCard label="Em Férias" value={m.on_vacation} icon={CalendarClock} tone="neutral" />
        <StatCard label="Turnover" value={`${m.turnover_rate}%`} icon={TrendingDown} tone={m.turnover_rate > 15 ? "negative" : "neutral"} hint={`${m.terminated} desligados`} />
        <StatCard label="Tempo Médio" value={`${m.avg_tenure_months}m`} icon={Clock} tone="neutral" hint="Na empresa" />
        <StatCard label="Avaliação Média" value={m.avg_performance.toFixed(1)} icon={Award} tone={m.avg_performance >= 7 ? "positive" : "warning"} />
        <StatCard label="Treinamentos Pend." value={m.pending_trainings} icon={GraduationCap} tone={m.pending_trainings > 0 ? "warning" : "neutral"} />
        <StatCard label="Docs Vencendo" value={m.expiring_documents} icon={FileWarning} tone={m.expiring_documents > 0 ? "negative" : "neutral"} />
        <StatCard label="Banco de Horas" value={`${m.total_bank_hours}min`} icon={Clock} tone={m.total_bank_hours < 0 ? "negative" : "neutral"} />
        <StatCard label="Vagas Abertas" value={m.open_positions} icon={Users} tone="neutral" />
        <StatCard label="Candidatos Ativos" value={m.active_candidates} icon={Users} tone="neutral" />
        <StatCard label="Ocorrências Abertas" value={m.unresolved_occurrences} icon={AlertTriangle} tone={m.unresolved_occurrences > 0 ? "negative" : "neutral"} />
        <StatCard label="Vales Ativos" value={`R$ ${m.total_advance_balance.toLocaleString('pt-BR')}`} icon={Wallet} tone="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.birthdays?.length > 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><Cake className="h-4 w-4 text-pink-500" /> Aniversariantes do Mês</h3>
            <div className="space-y-2">
              {data.birthdays.map((emp) => (
                <div key={emp.id} className="flex items-center gap-2 rounded-lg border border-neutral-100 p-2">
                  <span className="text-lg">🎂</span>
                  <span className="text-sm font-medium text-neutral-700 flex-1">{emp.full_name}</span>
                  {emp.birth_date && <span className="text-xs text-neutral-400">{new Date(emp.birth_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.pending_trainings?.length > 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><GraduationCap className="h-4 w-4 text-blue-500" /> Treinamentos Pendentes</h3>
            <div className="space-y-2">
              {data.pending_trainings.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-lg border border-neutral-100 p-2">
                  <span className="text-sm text-neutral-700 flex-1">{t.title}</span>
                  <span className="text-xs text-neutral-400">{t.employee_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.expiring_documents?.length > 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><FileWarning className="h-4 w-4 text-red-500" /> Documentos Vencendo</h3>
            <div className="space-y-2">
              {data.expiring_documents.map((d) => {
                const dCfg = DOC_STATUS_CONFIG[d.status] || {};
                return (
                  <div key={d.id} className="flex items-center gap-2 rounded-lg border border-neutral-100 p-2">
                    <span className="text-sm text-neutral-700 flex-1">{d.doc_name}</span>
                    <span className="text-xs text-neutral-400">{d.employee_name}</span>
                    <span className={`rounded-full ${dCfg.bg} ${dCfg.color} px-1.5 py-0.5 text-[10px] font-semibold`}>{dCfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {data.recent_recognitions?.length > 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><Award className="h-4 w-4 text-amber-500" /> Reconhecimentos Recentes</h3>
            <div className="space-y-2">
              {data.recent_recognitions.map((r) => {
                const rCfg = RECOGNITION_TYPE_CONFIG[r.type] || {};
                return (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg border border-neutral-100 p-2">
                    <span>{rCfg.emoji}</span>
                    <span className="text-sm font-medium text-neutral-700 flex-1">{r.title}</span>
                    <span className="text-xs text-neutral-400">{r.employee_name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}