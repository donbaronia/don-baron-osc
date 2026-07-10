import React, { useEffect, useState, useCallback } from "react";
import { BaronBrain } from "@/lib/brainEngine";
import StatCard from "@/components/dashboard/StatCard";
import { AlertTriangle, Brain, Clock, GraduationCap, MessageSquare, ThumbsUp, Users, Zap } from "lucide-react";

export default function BrainDashboard({ refreshKey, onSelectConversation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BaronBrain.getDashboard();
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />
        ))}
      </div>
    );
  }

  const m = data.metrics;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Agentes Ativos" value={`${m.active_agents}/${m.total_agents}`} icon={Brain} tone="positive" />
        <StatCard label="Conversas" value={m.total_conversations} icon={MessageSquare} tone="neutral" />
        <StatCard label="Alertas Ativos" value={m.active_alerts} icon={AlertTriangle} tone={m.critical_alerts > 0 ? "negative" : "neutral"} hint={m.critical_alerts > 0 ? `${m.critical_alerts} críticos` : "Tudo OK"} />
        <StatCard label="Aprendizados" value={m.total_learnings} icon={GraduationCap} tone="neutral" />
        <StatCard label="Memórias Válidas" value={m.total_memories} icon={Users} tone="neutral" />
        <StatCard label="Taxa de Aprovação" value={`${m.positive_feedback_rate}%`} icon={ThumbsUp} tone={m.positive_feedback_rate >= 70 ? "positive" : "neutral"} />
        <StatCard label="Tempo Médio" value={`${m.avg_response_time}ms`} icon={Clock} tone="neutral" />
        <StatCard label="Confiança Alta" value={m.confidence_distribution?.alta || 0} icon={Zap} tone="positive" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Diretorias</h3>
          <div className="space-y-3">
            {Object.entries(data.agents_by_directorate || {}).map(([dir, agents]) => (
              <div key={dir} className="flex items-center justify-between rounded-lg border border-neutral-100 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{agents[0]?.avatar_emoji || "🤖"}</span>
                  <span className="text-sm font-medium text-neutral-800 capitalize">{dir}</span>
                </div>
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">{agents.length} agentes</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Conversas Recentes</h3>
          {data.recent_conversations?.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-8">Nenhuma conversa ainda</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.recent_conversations?.map((c) => (
                <button key={c.id} onClick={() => onSelectConversation?.(c.id)} className="w-full text-left rounded-lg border border-neutral-100 p-3 hover:bg-neutral-50 transition-colors">
                  <p className="text-sm font-medium text-neutral-800 line-clamp-1">{c.question}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                    <span>{c.agents_consulted?.length || 0} especialistas</span>
                    <span>·</span>
                    <span>{c.confidence_level || '—'}</span>
                    <span>·</span>
                    <span>{c.created_date ? new Date(c.created_date).toLocaleDateString('pt-BR') : '—'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}