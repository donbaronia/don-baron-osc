import React, { useEffect, useState, useCallback } from "react";
import { EnterprisePlanning, KPI_CATEGORY_CONFIG, KPI_STATUS_CONFIG, formatBRL } from "@/lib/enterprisePlanning";
import StatCard from "@/components/dashboard/StatCard";
import { AlertTriangle, Brain, Loader2, Target, TrendingDown, TrendingUp, Wallet, Rocket, GitCompare } from "lucide-react";

export default function ExecutiveDashboard({ onSelectTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await EnterprisePlanning.getDashboard()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBriefing = async () => {
    setAnalyzing(true);
    try { setBriefing(await EnterprisePlanning.aiExecutiveBriefing()); }
    catch (e) { console.error(e); }
    finally { setAnalyzing(false); }
  };

  if (loading || !data) return <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;

  const profit = data.kpis.find(k => k.name === 'Lucro');
  const margin = data.kpis.find(k => k.name === 'Margem');
  const cashFlow = data.kpis.find(k => k.name === 'Fluxo de Caixa');

  return (
    <div className="space-y-6">
      {/* Core financial KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Lucro" value={formatBRL(profit?.value || 0)} icon={TrendingUp} tone={profit?.value >= 0 ? "positive" : "negative"} hint={`Meta: ${formatBRL(profit?.target_value || 0)}`} />
        <StatCard label="Margem" value={`${margin?.value || 0}%`} icon={Target} tone={margin?.value >= 30 ? "positive" : "warning"} hint={`Meta: ${margin?.target_value || 0}%`} />
        <StatCard label="Fluxo de Caixa" value={formatBRL(cashFlow?.value || 0)} icon={Wallet} tone={cashFlow?.value >= 0 ? "positive" : "negative"} />
        <StatCard label="Projetos Ativos" value={data.projects.active} icon={Rocket} tone="neutral" hint={`Investimento: ${formatBRL(data.projects.totalInvestment)}`} />
      </div>

      {/* Goals & Budget summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><Target className="h-4 w-4" /> Metas</h3>
            <button onClick={() => onSelectTab?.('metas')} className="text-xs text-blue-600 hover:underline">Ver tudo →</button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div><p className="text-2xl font-bold text-blue-600">{data.goals.active}</p><p className="text-xs text-neutral-400">Ativas</p></div>
            <div><p className="text-2xl font-bold text-emerald-600">{data.goals.completed}</p><p className="text-xs text-neutral-400">Concluídas</p></div>
            <div><p className="text-2xl font-bold text-red-600">{data.goals.overdue}</p><p className="text-xs text-neutral-400">Atrasadas</p></div>
            <div><p className="text-2xl font-bold text-neutral-700">{data.goals.avgProgress}%</p><p className="text-xs text-neutral-400">Progresso</p></div>
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><Wallet className="h-4 w-4" /> Orçamento</h3>
            <button onClick={() => onSelectTab?.('orcamento')} className="text-xs text-blue-600 hover:underline">Ver tudo →</button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-lg font-bold text-neutral-700">{formatBRL(data.budget.expected)}</p><p className="text-xs text-neutral-400">Previsto</p></div>
            <div><p className="text-lg font-bold text-neutral-700">{formatBRL(data.budget.actual)}</p><p className="text-xs text-neutral-400">Realizado</p></div>
            <div><p className={`text-lg font-bold ${data.budget.variance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{data.budget.variancePct}%</p><p className="text-xs text-neutral-400">Desvio</p></div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">KPIs Automáticos</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.kpis.map((kpi) => {
            const sCfg = KPI_STATUS_CONFIG[kpi.status] || {};
            const cCfg = KPI_CATEGORY_CONFIG[kpi.category] || {};
            return (
              <div key={kpi.name} className="rounded-xl border border-neutral-100 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">{cCfg.emoji} {kpi.name}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full ${sCfg.bg} ${sCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}><span className={`h-1.5 w-1.5 rounded-full ${sCfg.dot}`} />{sCfg.label}</span>
                </div>
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-xl font-bold text-neutral-800">{kpi.unit === 'R$' ? formatBRL(kpi.value) : `${kpi.value}${kpi.unit ? ' ' + kpi.unit : ''}`}</span>
                  {kpi.trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500 mb-1" />}
                  {kpi.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500 mb-1" />}
                </div>
                <p className="text-[10px] text-neutral-400">Meta: {kpi.unit === 'R$' ? formatBRL(kpi.target_value) : `${kpi.target_value}${kpi.unit ? ' ' + kpi.unit : ''}`}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deviations */}
      {data.deviations.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50/30 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-600"><AlertTriangle className="h-4 w-4" /> Desvios Orçamentários ({data.deviations.length})</h3>
          <div className="space-y-2">
            {data.deviations.map((d, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-red-100 bg-white p-2">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-neutral-700">{d.name}</p><p className="text-xs text-neutral-400 truncate">{d.justification || 'Sem justificativa'}</p></div>
                <div className="text-right"><p className="text-xs text-neutral-400">Prev: {formatBRL(d.expected)} → Real: {formatBRL(d.actual)}</p><p className={`text-xs font-bold ${d.variance_pct > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{d.variance_pct > 0 ? '+' : ''}{d.variance_pct}%</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Briefing */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-purple-600" />
          <h3 className="text-sm font-bold text-neutral-800">Briefing Executivo IA</h3>
          <div className="flex-1" />
          <button onClick={handleBriefing} disabled={analyzing} className="inline-flex items-center gap-1.5 rounded-md border border-purple-200 bg-white px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50">
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            {analyzing ? "Preparando..." : "Gerar Briefing"}
          </button>
        </div>
        {!briefing && !analyzing && <p className="text-sm text-neutral-400 text-center py-4">Gere um briefing executivo com resumo, destaques, preocupações, gargalos e prioridades para reunião de diretoria.</p>}
        {briefing?.briefing && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">{briefing.briefing.executive_summary}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {briefing.briefing.highlights?.length > 0 && <div><p className="text-xs font-semibold text-emerald-600 uppercase mb-1">✓ Destaques</p><ul className="space-y-1">{briefing.briefing.highlights.map((h, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-emerald-400">•</span>{h}</li>)}</ul></div>}
              {briefing.briefing.concerns?.length > 0 && <div><p className="text-xs font-semibold text-red-600 uppercase mb-1">⚠ Preocupações</p><ul className="space-y-1">{briefing.briefing.concerns.map((c, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-red-400">•</span>{c}</li>)}</ul></div>}
              {briefing.briefing.bottlenecks?.length > 0 && <div><p className="text-xs font-semibold text-amber-600 uppercase mb-1">🔄 Gargalos</p><ul className="space-y-1">{briefing.briefing.bottlenecks.map((b, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-amber-400">•</span>{b}</li>)}</ul></div>}
              {briefing.briefing.priorities?.length > 0 && <div><p className="text-xs font-semibold text-blue-600 uppercase mb-1">🎯 Prioridades</p><ul className="space-y-1">{briefing.briefing.priorities.map((p, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-blue-400">•</span>{p}</li>)}</ul></div>}
            </div>
            {briefing.briefing.meeting_agenda?.length > 0 && (
              <div className="rounded-lg border border-purple-100 bg-purple-50/30 p-3"><p className="text-xs font-semibold text-purple-600 uppercase mb-1">📋 Pauta da Reunião</p><ol className="space-y-1">{briefing.briefing.meeting_agenda.map((a, i) => <li key={i} className="text-xs text-neutral-600 flex gap-1.5"><span className="text-purple-400 font-medium">{i + 1}.</span>{a}</li>)}</ol></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}