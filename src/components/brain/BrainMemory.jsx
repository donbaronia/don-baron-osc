import React, { useEffect, useState, useCallback } from "react";
import { BaronBrain, MEMORY_TYPE_LABELS, DIRECTORATE_CONFIG } from "@/lib/brainEngine";
import { Brain } from "lucide-react";

export default function BrainMemory({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BaronBrain.listMemory();
      setItems(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  // Group by agent_key
  const grouped = {};
  items.forEach((m) => {
    if (!grouped[m.agent_key]) grouped[m.agent_key] = [];
    grouped[m.agent_key].push(m);
  });

  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
        <Brain className="mx-auto h-8 w-8 text-neutral-300" />
        <p className="mt-2 text-sm text-neutral-400">Nenhuma memória corporativa registrada</p>
        <p className="text-xs text-neutral-400 mt-1">Memórias são criadas a partir de decisões e aprendizados</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">{items.length} memória(s) válida(s) · {Object.keys(grouped).length} agente(s)</p>
      {Object.entries(grouped).map(([agentKey, memories]) => {
        const first = memories[0];
        const dir = DIRECTORATE_CONFIG[first.directorate] || DIRECTORATE_CONFIG.dados;
        return (
          <div key={agentKey} className={`rounded-2xl border ${dir.border} bg-white p-4`}>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl">{first.avatar_emoji || '🤖'}</span>
              <h4 className="text-sm font-semibold text-neutral-800">{first.agent_name}</h4>
              <span className={`rounded-full ${dir.bg} ${dir.color} px-2 py-0.5 text-[10px]`}>{dir.label}</span>
              <span className="text-xs text-neutral-400">{memories.length} memória(s)</span>
            </div>
            <div className="space-y-2">
              {memories.map((m) => (
                <div key={m.id} className="rounded-lg border border-neutral-100 p-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">{MEMORY_TYPE_LABELS[m.memory_type] || m.memory_type}</span>
                    {m.importance && <span className={`text-[10px] font-semibold ${m.importance === 'alta' ? 'text-red-600' : m.importance === 'media' ? 'text-amber-600' : 'text-neutral-400'}`}>{m.importance}</span>}
                    {m.validity_end && (
                      <span className="text-[10px] text-neutral-400">válido até {new Date(m.validity_end).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                  <h5 className="mt-1.5 text-sm font-medium text-neutral-800">{m.title}</h5>
                  <p className="mt-1 text-xs text-neutral-600">{m.content}</p>
                  {m.impact_observed && (
                    <div className="mt-2 rounded bg-purple-50 p-1.5 text-xs text-purple-700">
                      <strong>Impacto:</strong> {m.impact_observed}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}