import React, { useEffect, useState, useCallback } from "react";
import { BaronBrain, CONFIDENCE_CONFIG } from "@/lib/brainEngine";
import { Clock, FileSearch, ThumbsDown, ThumbsUp } from "lucide-react";

export default function BrainAudit({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BaronBrain.listConversations();
      setItems(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
        <FileSearch className="mx-auto h-8 w-8 text-neutral-300" />
        <p className="mt-2 text-neutral-400 text-sm">Nenhuma conversa registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((c) => {
        const conf = CONFIDENCE_CONFIG[c.confidence_level] || CONFIDENCE_CONFIG.media;
        return (
          <div key={c.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-neutral-800 line-clamp-1">{c.question}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${conf.bg} ${conf.color}`}>{conf.emoji} {conf.label}</span>
                  {c.is_council && <span className="rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600">Conselho</span>}
                  {c.conversation_type === 'simulation' && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">Simulação</span>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.total_response_time_ms || 0}ms</span>
                  <span>👥 {c.agents_consulted?.length || 0} especialistas</span>
                  <span>📊 {c.data_used?.length || 0} fontes</span>
                  <span>{c.created_date ? new Date(c.created_date).toLocaleString('pt-BR') : '—'}</span>
                  <span>por {c.user_name || '—'}</span>
                </div>
                {/* Agents consulted */}
                {c.agents_consulted?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.agents_consulted.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-0.5 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                        {a.avatar_emoji} {a.agent_name}
                      </span>
                    ))}
                  </div>
                )}
                {/* Feedback */}
                {c.user_feedback && c.user_feedback !== 'pending' && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-neutral-50 px-2 py-0.5 text-xs">
                    {c.user_feedback === 'positive' ? <><ThumbsUp className="h-3 w-3 text-emerald-600" /> <span className="text-emerald-600">Útil</span></> : <><ThumbsDown className="h-3 w-3 text-red-600" /> <span className="text-red-600">Não útil</span></>}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}