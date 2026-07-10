import React, { useEffect, useState, useCallback } from "react";
import { BaronBrain, DIRECTORATE_CONFIG, DIRECTORATE_ORDER } from "@/lib/brainEngine";
import { RefreshCw } from "lucide-react";

export default function AgentRegistry({ refreshKey }) {
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BaronBrain.listAgents();
      setGrouped(res.grouped || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="space-y-4">
          {DIRECTORATE_ORDER.map((d) => (
            <div key={d} className="h-32 animate-pulse rounded-2xl bg-neutral-200/60" />
          ))}
        </div>
      ) : (
        DIRECTORATE_ORDER.map((dirKey) => {
          const agents = grouped[dirKey] || [];
          if (agents.length === 0) return null;
          const cfg = DIRECTORATE_CONFIG[dirKey];
          return (
            <div key={dirKey} className={`rounded-2xl border ${cfg.border} bg-white p-5`}>
              <div className="mb-4 flex items-center gap-2">
                <span className="text-2xl">{cfg.emoji}</span>
                <h3 className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</h3>
                <span className={`rounded-full ${cfg.bg} ${cfg.color} px-2 py-0.5 text-xs font-semibold`}>{agents.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {agents.map((agent) => (
                  <div key={agent.id} className="rounded-xl border border-neutral-100 p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">{agent.avatar_emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-neutral-800 leading-tight">{agent.name}</h4>
                        <p className="text-xs text-neutral-500 mt-0.5">{agent.specialization}</p>
                      </div>
                    </div>
                    {agent.description && (
                      <p className="mt-2 text-xs text-neutral-400 line-clamp-2">{agent.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {agent.capabilities?.map((c) => (
                        <span key={c} className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">{c}</span>
                      ))}
                    </div>
                    {agent.data_access?.length > 0 && (
                      <div className="mt-2 border-t border-neutral-50 pt-2">
                        <div className="text-[10px] text-neutral-400 mb-1">Acesso a dados:</div>
                        <div className="flex flex-wrap gap-1">
                          {agent.data_access.slice(0, 4).map((d, i) => (
                            <span key={i} className="rounded bg-neutral-50 px-1 py-0.5 text-[10px] text-neutral-400">{d}</span>
                          ))}
                          {agent.data_access.length > 4 && <span className="text-[10px] text-neutral-400">+{agent.data_access.length - 4}</span>}
                        </div>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400">
                      <span>💬 {agent.conversations_count || 0}</span>
                      <span>🧠 {agent.memory_count || 0}</span>
                      <span className={agent.active ? "text-emerald-600" : "text-neutral-400"}>{agent.active ? "● ativo" : "○ inativo"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}