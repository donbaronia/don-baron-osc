import React, { useEffect, useState, useCallback } from "react";
import { PeopleAnalytics, scoreColor, RISK_CONFIG, DEPARTMENT_CONFIG, SHIFT_CONFIG } from "@/lib/peopleAnalytics";
import StatCard from "@/components/dashboard/StatCard";
import { AlertTriangle, Award, Brain, Clock, DollarSign, GraduationCap, Loader2, TrendingDown, TrendingUp, Users, Zap } from "lucide-react";

export default function AnalyticsDashboard({ refreshKey, onSelectEmployee, onAiTeamAnalysis }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teamAnalysis, setTeamAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await PeopleAnalytics.getDashboard()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleTeamAnalysis = async () => {
    setAnalyzing(true);
    try { setTeamAnalysis(await PeopleAnalytics.aiTeamAnalysis()); }
    catch (e) { console.error(e); }
    finally { setAnalyzing(false); }
  };

  if (loading || !data) {
    return <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;
  }

  const m = data.metrics;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Colaboradores Ativos" value={m.active_employees} icon={Users} tone="neutral" />
        <StatCard label="Turnover" value={`${m.turnover_rate}%`} icon={TrendingDown} tone={m.turnover_rate > 15 ? "negative" : "neutral"} />
        <StatCard label="Tempo Médio" value={`${m.avg_tenure_months}m`} icon={Clock} tone="neutral" />
        <StatCard label="Avaliação Média" value={m.avg_review_score.toFixed(1)} icon={Award} tone={m.avg_review_score >= 7 ? "positive" : "warning"} />
        <StatCard label="Atrasos Hoje" value={m.late_today} icon={Clock} tone={m.late_today > 0 ? "negative" : "neutral"} hint={`${m.total_late_min}min total`} />
        <StatCard label="Horas Extras" value={`${m.total_overtime_min}min`} icon={Zap} tone="neutral" />
        <StatCard label="Treinamentos Pend." value={m.pending_trainings} icon={GraduationCap} tone={m.pending_trainings > 0 ? "warning" : "neutral"} />
        <StatCard label="Folha Total" value={`R$ ${m.total_payroll.toLocaleString('pt-BR')}`} icon={DollarSign} tone="neutral" />
      </div>

      {/* Risk Distribution */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Distribuição de Risco</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{m.risk_low}</p>
            <p className="text-xs text-neutral-500 mt-1">Risco Baixo</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{m.risk_medium}</p>
            <p className="text-xs text-neutral-500 mt-1">Risco Médio</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50/30 p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{m.risk_high}</p>
            <p className="text-xs text-neutral-500 mt-1">Risco Alto</p>
          </div>
        </div>
      </div>

      {/* Top Performers & Declining */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><Award className="h-4 w-4 text-amber-500" /> Funcionários Destaque</h3>
          {data.top_performers?.length === 0 ? <p className="text-sm text-neutral-400 text-center py-4">Nenhum dado</p> : (
            <div className="space-y-2">
              {data.top_performers?.map((p, i) => {
                const sCfg = scoreColor(p.score);
                return (
                  <button key={p.employee_id} onClick={() => onSelectEmployee?.(p.employee_id)} className="w-full text-left flex items-center gap-2 rounded-lg border border-neutral-100 p-2 hover:bg-neutral-50">
                    <span className="text-sm font-bold text-neutral-300 w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800">{p.employee_name}</p>
                      <p className="text-xs text-neutral-400">{DEPARTMENT_CONFIG[p.department]?.label || p.department} · {p.position}</p>
                    </div>
                    <div className={`rounded-lg ${sCfg.bg} ${sCfg.text} px-2 py-1 text-sm font-bold`}>{p.score}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><TrendingDown className="h-4 w-4 text-red-500" /> Queda de Desempenho</h3>
          {data.declining?.length === 0 ? (
            <div className="text-center py-4"><p className="text-sm text-emerald-600">✓ Nenhum colaborador em declínio</p></div>
          ) : (
            <div className="space-y-2">
              {data.declining?.map((p) => {
                const sCfg = scoreColor(p.score);
                return (
                  <button key={p.employee_id} onClick={() => onSelectEmployee?.(p.employee_id)} className="w-full text-left flex items-center gap-2 rounded-lg border border-red-100 p-2 hover:bg-red-50/30">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800">{p.employee_name}</p>
                      <p className="text-xs text-red-400">{p.issues}</p>
                    </div>
                    <div className={`rounded-lg ${sCfg.bg} ${sCfg.text} px-2 py-1 text-sm font-bold`}>{p.score}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* By Department */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Análise por Departamento</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(data.by_department || {}).map(([dept, stats]) => {
            const dCfg = DEPARTMENT_CONFIG[dept] || {};
            return (
              <div key={dept} className="rounded-xl border border-neutral-100 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{dCfg.emoji}</span>
                  <span className="text-sm font-medium text-neutral-700">{dCfg.label || dept}</span>
                  <span className="text-xs text-neutral-400">({stats.count})</span>
                </div>
                <div className="space-y-1 text-xs text-neutral-500">
                  <div className="flex justify-between"><span>Folha:</span><span className="font-medium text-neutral-700">R$ {stats.salary.toLocaleString('pt-BR')}</span></div>
                  <div className="flex justify-between"><span>Banco de Horas:</span><span className={`font-medium ${stats.bankHours < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{stats.bankHours}min</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* By Shift */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Análise por Turno</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(data.by_shift || {}).map(([shift, stats]) => {
            const sCfg = SHIFT_CONFIG[shift] || {};
            return (
              <div key={shift} className="rounded-xl border border-neutral-100 p-3 text-center">
                <span className="text-2xl">{sCfg.emoji}</span>
                <p className="text-sm font-medium text-neutral-700 mt-1">{sCfg.label || shift}</p>
                <p className="text-xs text-neutral-400">{stats.count} colaboradores</p>
                <p className={`text-xs font-medium mt-1 ${stats.bankHours < 0 ? 'text-red-500' : 'text-emerald-500'}`}>{stats.bankHours}min</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Team Analysis */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-purple-600" />
          <h3 className="text-sm font-bold text-neutral-800">Análise IA da Equipe</h3>
          <div className="flex-1" />
          <button onClick={handleTeamAnalysis} disabled={analyzing} className="inline-flex items-center gap-1.5 rounded-md border border-purple-200 bg-white px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50">
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            {analyzing ? "Analisando..." : "Analisar Equipe"}
          </button>
        </div>
        {!teamAnalysis && !analyzing && <p className="text-sm text-neutral-400 text-center py-4">Gere uma análise completa da equipe com insights estratégicos, recomendações e identificação de talentos.</p>}
        {teamAnalysis?.analysis && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">{teamAnalysis.analysis.team_summary}</p>
            {teamAnalysis.analysis.key_insights?.length > 0 && (
              <div><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Insights Principais</p><ul className="space-y-1">{teamAnalysis.analysis.key_insights.map((ins, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-purple-400">•</span>{ins}</li>)}</ul></div>
            )}
            {teamAnalysis.analysis.recommendations?.length > 0 && (
              <div><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Recomendações Estratégicas</p><ul className="space-y-1">{teamAnalysis.analysis.recommendations.map((r, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-blue-400">•</span>{r}</li>)}</ul></div>
            )}
            {teamAnalysis.analysis.training_priorities?.length > 0 && (
              <div><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Prioridades de Treinamento</p><div className="flex flex-wrap gap-1">{teamAnalysis.analysis.training_priorities.map((t, i) => <span key={i} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{t}</span>)}</div></div>
            )}
            {teamAnalysis.analysis.retention_actions?.length > 0 && (
              <div><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Ações de Retenção</p><ul className="space-y-1">{teamAnalysis.analysis.retention_actions.map((r, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-emerald-400">•</span>{r}</li>)}</ul></div>
            )}
            {teamAnalysis.analysis.promotion_candidates?.length > 0 && (
              <div><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Candidatos a Promoção</p><ul className="space-y-1">{teamAnalysis.analysis.promotion_candidates.map((p, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-amber-400">🏆</span>{p}</li>)}</ul></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}