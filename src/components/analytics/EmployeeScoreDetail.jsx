import React, { useEffect, useState, useCallback } from "react";
import { PeopleAnalytics, scoreColor, SCORE_DIMENSIONS, RISK_CONFIG, DEPARTMENT_CONFIG, PROMOTION_READINESS_CONFIG, LEADERSHIP_POTENTIAL_CONFIG } from "@/lib/peopleAnalytics";
import { ArrowLeft, Brain, Loader2, Rocket, TrendingUp } from "lucide-react";

function ScoreBar({ label, value, weight }) {
  const sCfg = scoreColor(value);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-500">{label} {weight && <span className="text-neutral-300">({weight})</span>}</span>
        <span className="font-medium text-neutral-700">{value}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div className={`h-full rounded-full ${sCfg.bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function EmployeeScoreDetail({ employeeId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await PeopleAnalytics.getEmployeeScore(employeeId)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try { setAnalysis(await PeopleAnalytics.aiAnalyze(employeeId)); }
    catch (e) { console.error(e); }
    finally { setAnalyzing(false); }
  };

  if (loading || !data) return <div className="h-96 animate-pulse rounded-2xl bg-neutral-200/60" />;

  const e = data.employee;
  const s = data.score;
  const sCfg = scoreColor(s.overall);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"><ArrowLeft className="h-4 w-4" /> Voltar</button>

      {/* Header with overall score */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-neutral-900">{e.full_name}</h2>
            <p className="text-sm text-neutral-500 mt-0.5">{e.position}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
              <span>{DEPARTMENT_CONFIG[e.department]?.emoji} {DEPARTMENT_CONFIG[e.department]?.label}</span>
              {e.hire_date && <span>· Admissão: {new Date(e.hire_date).toLocaleDateString('pt-BR')}</span>}
              {e.salary && <span>· R$ {e.salary.toLocaleString('pt-BR')}</span>}
            </div>
          </div>
          <div className={`flex h-20 w-20 flex-col items-center justify-center rounded-2xl ${sCfg.bg}`}>
            <span className={`text-3xl font-bold ${sCfg.text}`}>{s.overall}</span>
            <span className={`text-[10px] uppercase ${sCfg.text}`}>{sCfg.label}</span>
          </div>
        </div>
        {data.trend !== 0 && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {data.trend > 0 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />}
            <span className={data.trend > 0 ? 'text-emerald-600' : 'text-red-600'}>{data.trend > 0 ? '+' : ''}{data.trend} vs avaliação anterior</span>
          </div>
        )}
      </div>

      {/* Score dimensions */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Score por Dimensão</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SCORE_DIMENSIONS.map(d => <ScoreBar key={d.key} label={d.label} value={s.scores[d.key] || 0} weight={d.weight} />)}
        </div>
      </div>

      {/* Risk indicators */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Risco de Desligamento', value: s.turnoverRisk },
          { label: 'Sobrecarga', value: s.overloadRisk },
          { label: 'Absenteísmo', value: s.absenteeismRisk },
        ].map((r) => {
          const rCfg = RISK_CONFIG[r.value] || {};
          return (
            <div key={r.label} className="rounded-xl border border-neutral-200 bg-white p-4 text-center">
              <p className="text-xs text-neutral-500">{r.label}</p>
              <div className="mt-2 flex items-center justify-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${rCfg.dot}`} />
                <span className={`text-sm font-semibold ${rCfg.color}`}>{rCfg.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics summary */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">Indicadores</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-neutral-100 p-3"><p className="text-xs text-neutral-400">Atrasos</p><p className="text-sm font-bold text-neutral-800">{s.metrics.lateCount}</p><p className="text-[10px] text-neutral-400">{s.metrics.totalLate}min</p></div>
          <div className="rounded-lg border border-neutral-100 p-3"><p className="text-xs text-neutral-400">Ocorrências</p><p className="text-sm font-bold text-neutral-800">{s.metrics.occCount}</p></div>
          <div className="rounded-lg border border-neutral-100 p-3"><p className="text-xs text-neutral-400">Treinamentos</p><p className="text-sm font-bold text-neutral-800">{s.metrics.completedTrainings}/{s.metrics.totalTrainings}</p></div>
          <div className="rounded-lg border border-neutral-100 p-3"><p className="text-xs text-neutral-400">Reconhecimentos</p><p className="text-sm font-bold text-neutral-800">{s.metrics.recCount}</p></div>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-purple-600" />
          <h3 className="text-sm font-bold text-neutral-800">Análise IA - Plano de Desenvolvimento</h3>
          <div className="flex-1" />
          <button onClick={handleAnalyze} disabled={analyzing} className="inline-flex items-center gap-1.5 rounded-md border border-purple-200 bg-white px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50">
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            {analyzing ? "Analisando..." : "Gerar Análise"}
          </button>
        </div>
        {!analysis && !analyzing && <p className="text-sm text-neutral-400 text-center py-4">A IA vai analisar o perfil, identificar pontos fortes e fracos, sugerir treinamentos, avaliar prontidão para promoção e gerar um plano de desenvolvimento.</p>}
        {analysis?.analysis && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">{analysis.analysis.summary}</p>

            {analysis.analysis.promotion_readiness && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-neutral-100 p-3">
                  <p className="text-xs text-neutral-400">Prontidão para Promoção</p>
                  {(() => { const pCfg = PROMOTION_READINESS_CONFIG[analysis.analysis.promotion_readiness] || {}; return <div className="mt-1"><span className={`rounded-full ${pCfg.bg} ${pCfg.color} px-2 py-0.5 text-xs font-semibold`}>{pCfg.label}</span></div>; })()}
                </div>
                <div className="rounded-lg border border-neutral-100 p-3">
                  <p className="text-xs text-neutral-400">Potencial de Liderança</p>
                  {(() => { const lCfg = LEADERSHIP_POTENTIAL_CONFIG[analysis.analysis.leadership_potential] || {}; return <div className="mt-1"><span className={`rounded-full ${lCfg.bg} ${lCfg.color} px-2 py-0.5 text-xs font-semibold`}>{lCfg.label}</span></div>; })()}
                </div>
              </div>
            )}
            {analysis.analysis.promotion_reason && <p className="text-xs text-neutral-500 italic">"{analysis.analysis.promotion_reason}"</p>}

            {analysis.analysis.strengths?.length > 0 && (
              <div><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Pontos Fortes</p><div className="flex flex-wrap gap-1">{analysis.analysis.strengths.map((s, i) => <span key={i} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">{s}</span>)}</div></div>
            )}
            {analysis.analysis.weaknesses?.length > 0 && (
              <div><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Pontos de Melhoria</p><div className="flex flex-wrap gap-1">{analysis.analysis.weaknesses.map((w, i) => <span key={i} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">{w}</span>)}</div></div>
            )}
            {analysis.analysis.training_suggestions?.length > 0 && (
              <div><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Treinamentos Recomendados</p><div className="flex flex-wrap gap-1">{analysis.analysis.training_suggestions.map((t, i) => <span key={i} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{t}</span>)}</div></div>
            )}
            {analysis.analysis.development_plan && (
              <div className="rounded-lg border border-purple-100 bg-purple-50/30 p-3"><p className="text-xs font-semibold text-purple-600 uppercase mb-1">📋 Plano de Desenvolvimento</p><p className="text-sm text-neutral-600 whitespace-pre-wrap">{analysis.analysis.development_plan}</p></div>
            )}
            {analysis.analysis.risk_assessment && (
              <div className="rounded-lg border border-neutral-100 p-3"><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Avaliação de Risco</p><p className="text-sm text-neutral-600">{analysis.analysis.risk_assessment}</p></div>
            )}
            {analysis.analysis.recommended_actions?.length > 0 && (
              <div><p className="text-xs font-semibold text-neutral-500 uppercase mb-1">Ações Recomendadas</p><ul className="space-y-1">{analysis.analysis.recommended_actions.map((a, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-purple-400">→</span>{a}</li>)}</ul></div>
            )}
          </div>
        )}
      </div>

      {/* Recent reviews */}
      {data.reviews?.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">Avaliações Recentes</h3>
          <div className="space-y-2">
            {data.reviews.map((r) => (
              <div key={r.period} className="rounded-lg border border-neutral-100 p-3">
                <div className="flex items-center justify-between"><span className="text-sm font-medium text-neutral-700">{r.period}</span><span className="text-sm font-bold text-neutral-800">{r.average_score?.toFixed(1)}</span></div>
                {r.comments && <p className="text-xs text-neutral-500 mt-1">{r.comments}</p>}
                {r.strengths?.length > 0 && <p className="text-xs text-emerald-600 mt-1">💪 {r.strengths.join(', ')}</p>}
                {r.improvements?.length > 0 && <p className="text-xs text-amber-600 mt-0.5">📈 {r.improvements.join(', ')}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recognitions */}
      {data.recognitions?.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><Rocket className="h-4 w-4 text-amber-500" /> Reconhecimentos</h3>
          <div className="space-y-2">
            {data.recognitions.map((r, i) => (
              <div key={i} className="rounded-lg border border-neutral-100 p-2">
                <p className="text-sm font-medium text-neutral-700">{r.title}</p>
                {r.description && <p className="text-xs text-neutral-500">{r.description}</p>}
                <p className="text-[10px] text-neutral-400 mt-0.5">{r.awarded_by} · {r.date ? new Date(r.date).toLocaleDateString('pt-BR') : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}