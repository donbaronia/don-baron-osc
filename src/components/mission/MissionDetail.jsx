import React, { useEffect, useState, useCallback } from "react";
import { MissionControl, MISSION_TYPE_CONFIG, MISSION_STATUS_CONFIG, PRIORITY_CONFIG, DEPARTMENT_CONFIG, TASK_STATUS_CONFIG, CHECKLIST_TYPE_CONFIG, SCORE_NOTE_CONFIG } from "@/lib/missionEngine";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, Calendar, Check, Clock, Crown, Link2, Loader2, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { BaronSelect } from "@/design-system";

function ScoreBar({ label, value }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-blue-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-500">{label}</span>
        <span className="font-medium text-neutral-700">{value}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function MissionDetail({ missionId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decomposing, setDecomposing] = useState(false);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await MissionControl.getMission(missionId);
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [missionId]);

  useEffect(() => { load(); }, [load]);

  const handleDecompose = async () => {
    setDecomposing(true);
    try {
      const res = await MissionControl.decomposeMission(missionId);
      toast({ title: "Missão decomposta", description: `${res.items?.length || 0} tarefas criadas pela IA` });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setDecomposing(false); }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await MissionControl.completeMission(missionId);
      toast({ title: "Missão concluída", description: `Nota: ${res.score?.note || '—'}` });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setCompleting(false); }
  };

  const handleUpdateTask = async (taskId, status) => {
    try {
      await MissionControl.updateTask(taskId, { status });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleChecklist = async (id) => {
    try {
      await MissionControl.toggleChecklist(id);
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (loading || !data) {
    return <div className="h-96 animate-pulse rounded-2xl bg-neutral-200/60" />;
  }

  const m = data.item;
  const tCfg = MISSION_TYPE_CONFIG[m.type] || {};
  const sCfg = MISSION_STATUS_CONFIG[m.status] || {};
  const pCfg = PRIORITY_CONFIG[m.priority] || {};
  const score = m.score || {};
  const scoreCfg = SCORE_NOTE_CONFIG[score.note] || {};
  const today = new Date().toISOString().split('T')[0];
  const daysLeft = m.end_date ? Math.ceil((new Date(m.end_date) - new Date(today)) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800">
        <ArrowLeft className="h-4 w-4" /> Voltar para missões
      </button>

      {/* Header */}
      <div className={`rounded-2xl border ${pCfg.border || 'border-neutral-200'} bg-white p-6`}>
        <div className="flex items-start gap-3">
          <span className="text-4xl">{tCfg.emoji}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-neutral-900">{m.name}</h2>
              <span className={`rounded-full ${tCfg.bg} ${tCfg.color} px-2 py-0.5 text-xs font-semibold`}>{tCfg.label}</span>
              <span className={`rounded-full ${pCfg.bg} ${pCfg.color} px-2 py-0.5 text-xs font-semibold`}>{pCfg.label}</span>
              <span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-2 py-0.5 text-xs font-medium`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${sCfg.dot} mr-1`} />{sCfg.label}
              </span>
              {m.is_auto_created && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600">🤖 Criada por IA</span>}
            </div>
            {m.description && <p className="mt-2 text-sm text-neutral-500">{m.description}</p>}
            {m.objective && <p className="mt-1 text-sm font-medium text-neutral-700">🎯 {m.objective}</p>}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            <div className="h-2.5 flex-1 rounded-full bg-neutral-100 overflow-hidden">
              <div className={`h-full rounded-full ${m.progress_pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${m.progress_pct}%` }} />
            </div>
            <span className="text-sm font-bold text-neutral-700">{m.progress_pct}%</span>
          </div>
        </div>
      </div>

      {/* Timeline + Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase text-neutral-500">Cronograma</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-neutral-400" /><span className="text-neutral-600">Início: {m.start_date ? new Date(m.start_date).toLocaleDateString('pt-BR') : '—'}</span></div>
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-neutral-400" /><span className="text-neutral-600">Prazo: {m.end_date ? new Date(m.end_date).toLocaleDateString('pt-BR') : '—'}</span></div>
            {daysLeft !== null && m.status !== 'concluida' && (
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-neutral-400" /><span className={daysLeft < 0 ? 'text-red-600 font-medium' : daysLeft <= 1 ? 'text-orange-600 font-medium' : 'text-neutral-600'}>{daysLeft < 0 ? `Atrasada ${Math.abs(daysLeft)}d` : daysLeft === 0 ? 'Vence hoje' : `${daysLeft}d restante`}</span></div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase text-neutral-500">Equipe</h4>
          <div className="flex flex-wrap gap-1">
            {(m.team || []).map((t, i) => <span key={i} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{t}</span>)}
          </div>
          {m.digital_workers?.length > 0 && (
            <div className="mt-2 border-t border-neutral-50 pt-2">
              <p className="text-[10px] text-neutral-400 mb-1">Funcionários Digitais:</p>
              <div className="flex flex-wrap gap-1">
                {m.digital_workers.map((w, i) => <span key={i} className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-600">{w}</span>)}
              </div>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase text-neutral-500">Ações</h4>
          <div className="space-y-2">
            {m.tasks_count === 0 && (
              <Button onClick={handleDecompose} disabled={decomposing} size="sm" className="w-full">
                {decomposing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Decompor com IA
              </Button>
            )}
            {m.status !== 'concluida' && m.tasks_count > 0 && (
              <Button onClick={handleComplete} disabled={completing} size="sm" variant="outline" className="w-full">
                {completing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Award className="h-3.5 w-3.5" />}
                Concluir Missão
              </Button>
            )}
            <div className="text-center text-[10px] text-neutral-400">Responsável: {m.responsible_name || '—'}</div>
          </div>
        </div>
      </div>

      {/* Tasks by department */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Tarefas por Departamento</h3>
        {data.tasks?.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-400">Nenhuma tarefa criada ainda</p>
            <Button onClick={handleDecompose} disabled={decomposing} size="sm" className="mt-3">
              {decomposing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Decompor com IA
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(data.grouped || {}).map(([dept, tasks]) => {
              const dCfg = DEPARTMENT_CONFIG[dept] || {};
              return (
                <div key={dept} className={`rounded-xl border border-neutral-100 p-3 ${dCfg.bg}`}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg">{dCfg.emoji}</span>
                    <h4 className={`text-sm font-semibold ${dCfg.color}`}>{dCfg.label}</h4>
                    <span className="text-xs text-neutral-400">({tasks.filter(t => t.status === 'concluida').length}/{tasks.length})</span>
                  </div>
                  <div className="space-y-2">
                    {tasks.map((task) => {
                      const tStatus = TASK_STATUS_CONFIG[task.status] || {};
                      const cType = CHECKLIST_TYPE_CONFIG[task.checklist_type] || {};
                      return (
                        <div key={task.id} className="rounded-lg border border-neutral-100 bg-white p-3">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-medium text-neutral-800">{task.name}</h5>
                              {task.description && <p className="text-xs text-neutral-400 mt-0.5">{task.description}</p>}
                              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                <span className={`rounded-full ${tStatus.bg} ${tStatus.color} px-1.5 py-0.5 text-[10px] font-medium`}>{tStatus.label}</span>
                                <span className={`rounded-full ${cType.bg} ${cType.color} px-1.5 py-0.5 text-[10px] font-medium`}>{cType.emoji} {cType.label}</span>
                                {task.depends_on_names?.length > 0 && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-600">
                                    <Link2 className="h-2.5 w-2.5" /> Depende de: {task.depends_on_names.join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                            {m.status !== 'concluida' && (
                              <div className="w-36"><BaronSelect size="sm" value={task.status} onChange={(v) => handleUpdateTask(task.id, v)} options={Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} /></div>
                            )}
                          </div>
                          {task.progress_pct > 0 && task.status !== 'concluida' && (
                            <div className="mt-2 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                              <div className="h-full rounded-full bg-blue-400" style={{ width: `${task.progress_pct}%` }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Checklist */}
      {data.checklist?.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Checklist da Missão</h3>
          <div className="space-y-2">
            {data.checklist.map((item) => {
              const cType = CHECKLIST_TYPE_CONFIG[item.type] || {};
              const done = item.status === 'concluido';
              return (
                <button key={item.id} onClick={() => handleToggleChecklist(item.id)} className="flex w-full items-center gap-3 rounded-lg border border-neutral-100 p-3 hover:bg-neutral-50 transition-colors text-left">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${done ? 'bg-emerald-500 border-emerald-500' : 'border-neutral-300'}`}>
                    {done && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className={`text-sm flex-1 ${done ? 'text-neutral-400 line-through' : 'text-neutral-700'}`}>{item.title}</span>
                  <span className={`rounded-full ${cType.bg} ${cType.color} px-1.5 py-0.5 text-[10px] font-medium`}>{cType.emoji} {cType.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Score (if completed) */}
      {m.status === 'concluida' && score.overall !== undefined && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-neutral-800">Score da Missão</h3>
            <div className="flex-1" />
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${scoreCfg.bg || 'bg-neutral-100'} ${scoreCfg.color || 'text-neutral-700'}`}>
              <span className="text-lg font-bold">{score.note || '—'}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ScoreBar label="Eficiência" value={score.efficiency || 0} />
            <ScoreBar label="Prazo" value={score.deadline || 0} />
            <ScoreBar label="Qualidade" value={score.quality || 0} />
            <ScoreBar label="Economia" value={score.savings || 0} />
            <ScoreBar label="Impacto Financeiro" value={score.financial_impact || 0} />
            <ScoreBar label="Geral" value={score.overall || 0} />
          </div>
        </div>
      )}

      {/* Learning (if completed) */}
      {m.status === 'concluida' && m.learning && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/30 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5 text-purple-600" />
            <h3 className="text-sm font-bold text-neutral-800">Aprendizado</h3>
          </div>
          <p className="text-sm text-neutral-600">{m.learning}</p>
          {m.actual_result && (
            <div className="mt-3 rounded-lg bg-white p-3">
              <p className="text-xs font-semibold text-neutral-400 uppercase">Resultado Obtido</p>
              <p className="text-sm text-neutral-700 mt-1">{m.actual_result}</p>
            </div>
          )}
        </div>
      )}

      {/* Expected result */}
      {m.expected_result && m.status !== 'concluida' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4">
          <p className="text-xs font-semibold text-blue-600 uppercase">Resultado Esperado</p>
          <p className="text-sm text-neutral-700 mt-1">{m.expected_result}</p>
        </div>
      )}
    </div>
  );
}