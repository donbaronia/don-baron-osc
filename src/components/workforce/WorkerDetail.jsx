import React, { useEffect, useState, useCallback } from "react";
import { DigitalWorkforce, DEPARTMENT_CONFIG, WORKER_STATUS_CONFIG, AUTONOMY_CONFIG, CONFIDENCE_CONFIG, ACTIVITY_TYPE_LABELS } from "@/lib/workforceEngine";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, DollarSign, Loader2, Play, Shield, Target, TrendingUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/components/ui/use-toast";

export default function WorkerDetail({ workerKey, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [expandedActivity, setExpandedActivity] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await DigitalWorkforce.getWorker(workerKey);
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [workerKey]);

  useEffect(() => { load(); }, [load]);

  const handleExecuteRoutine = async (routineAction) => {
    setExecuting(true);
    try {
      const res = await DigitalWorkforce.executeRoutine(workerKey, routineAction);
      toast({ title: "Rotina executada", description: `${res.alerts?.length || 0} alerta(s) gerado(s)` });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setExecuting(false); }
  };

  if (loading || !data) {
    return <div className="h-96 animate-pulse rounded-2xl bg-neutral-200/60" />;
  }

  const w = data.item;
  const dir = DEPARTMENT_CONFIG[w.department] || {};
  const status = WORKER_STATUS_CONFIG[w.status] || WORKER_STATUS_CONFIG.idle;
  const autonomy = AUTONOMY_CONFIG[w.autonomy_level] || AUTONOMY_CONFIG.baixo;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800">
        <ArrowLeft className="h-4 w-4" /> Voltar para a equipe
      </button>

      {/* Profile header */}
      <div className={`overflow-hidden rounded-2xl border ${dir.border} bg-white p-6`}>
        <div className="flex items-start gap-4">
          <span className="text-5xl">{w.avatar_emoji}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-neutral-900">{w.name}</h2>
              <span className={`rounded-full ${dir.bg} ${dir.color} px-2 py-0.5 text-xs font-semibold`}>{dir.label}</span>
              <span className={`rounded-full ${status.bg} ${status.color} px-2 py-0.5 text-xs font-medium`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${status.dot} mr-1 ${w.status === 'working' ? 'animate-pulse' : ''}`} />
                {status.label}
              </span>
              <span className={`rounded-full ${autonomy.bg} ${autonomy.color} px-2 py-0.5 text-xs font-medium`}>
                <Shield className="inline h-3 w-3 mr-1" />Autonomia {autonomy.label}
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-600">{w.objective}</p>
            <p className="mt-1 text-xs text-neutral-400">{w.specialty}</p>
          </div>
        </div>
        {w.description && <p className="mt-4 text-sm text-neutral-500 border-t border-neutral-100 pt-4">{w.description}</p>}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {[
          { label: 'Análises', value: w.analyses_count || 0, icon: TrendingUp, tone: 'text-neutral-800' },
          { label: 'Sugestões', value: w.suggestions_count || 0, icon: Target, tone: 'text-neutral-800' },
          { label: 'Aprovações', value: w.approvals_count || 0, icon: TrendingUp, tone: 'text-emerald-600' },
          { label: 'Rejeições', value: w.rejections_count || 0, icon: Target, tone: 'text-red-600' },
          { label: 'Precisão', value: `${w.precision_pct || 0}%`, icon: Target, tone: 'text-blue-600' },
          { label: 'Economia', value: `R$ ${(w.savings_generated || 0).toFixed(0)}`, icon: DollarSign, tone: 'text-emerald-600' },
          { label: 'Tempo', value: `${(w.time_saved_hours || 0).toFixed(1)}h`, icon: Clock, tone: 'text-neutral-800' },
        ].map((m, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
            <m.icon className="mx-auto h-4 w-4 text-neutral-400" />
            <p className={`mt-1 text-lg font-bold ${m.tone}`}>{m.value}</p>
            <p className="text-[10px] text-neutral-400">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Info: indicators, permissions, capabilities */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase text-neutral-500">Indicadores Monitorados</h4>
          <div className="flex flex-wrap gap-1">
            {(w.indicators_monitored || []).map((ind, i) => (
              <span key={i} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{ind}</span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase text-neutral-500">Permissões</h4>
          <div className="flex flex-wrap gap-1">
            {(w.permissions || []).map((p, i) => (
              <span key={i} className="rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{p}</span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase text-neutral-500">Capacidades</h4>
          <div className="flex flex-wrap gap-1">
            {(w.capabilities || []).map((c, i) => (
              <span key={i} className="rounded-md bg-purple-50 px-2 py-0.5 text-xs text-purple-600">{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Routines */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Rotinas</h3>
        <div className="space-y-2">
          {(w.routines || []).map((r, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3">
              <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-neutral-100">
                <span className="text-[10px] font-mono font-bold text-neutral-600">{r.time}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-neutral-800">{r.action}</h4>
                <p className="text-xs text-neutral-400">{r.description}</p>
                {r.last_executed_at && (
                  <p className="mt-0.5 text-[10px] text-neutral-400">
                    Última execução: {new Date(r.last_executed_at).toLocaleString('pt-BR')} · {r.execution_count || 0}x
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => handleExecuteRoutine(r.action)} disabled={executing}>
                {executing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Executar
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Activities */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Atividades Recentes</h3>
        {data.activities?.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-8">Nenhuma atividade registrada</p>
        ) : (
          <div className="space-y-2">
            {data.activities?.map((a) => {
              const conf = CONFIDENCE_CONFIG[a.confidence_level] || CONFIDENCE_CONFIG.media;
              const isExpanded = expandedActivity === a.id;
              return (
                <div key={a.id} className="rounded-xl border border-neutral-100 p-3">
                  <button onClick={() => setExpandedActivity(isExpanded ? null : a.id)} className="w-full text-left">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-neutral-800 line-clamp-1 flex-1">{a.title}</h4>
                      <span className={`rounded-full ${conf.bg} ${conf.color} px-1.5 py-0.5 text-[10px] font-medium`}>{conf.emoji} {conf.label}</span>
                    </div>
                    {a.summary && <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{a.summary}</p>}
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-400">
                      <span>{ACTIVITY_TYPE_LABELS[a.activity_type] || a.activity_type}</span>
                      {a.savings_identified > 0 && <span>· R$ {a.savings_identified.toFixed(0)}</span>}
                      <span>· {a.created_date ? new Date(a.created_date).toLocaleString('pt-BR') : ''}</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="mt-3 border-t border-neutral-100 pt-3 space-y-2">
                      {a.findings?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-neutral-400">Descobertas</p>
                          <ul className="mt-1 space-y-1">
                            {a.findings.map((f, i) => <li key={i} className="text-xs text-neutral-600">• {f}</li>)}
                          </ul>
                        </div>
                      )}
                      {a.recommendations?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-neutral-400">Recomendações</p>
                          <ul className="mt-1 space-y-1">
                            {a.recommendations.map((r, i) => <li key={i} className="text-xs text-neutral-600">• {r}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active alerts */}
      {data.alerts?.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-600">Alertas Ativos</h3>
          <div className="space-y-2">
            {data.alerts.map((a) => (
              <div key={a.id} className="rounded-xl border border-neutral-100 bg-white p-3">
                <h4 className="text-sm font-medium text-neutral-800">{a.title}</h4>
                <p className="mt-1 text-xs text-neutral-500">{a.message}</p>
                {a.action_suggested && <p className="mt-1 text-xs text-amber-700">💡 {a.action_suggested}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}