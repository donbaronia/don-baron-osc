import React, { useEffect, useState } from "react";
import { EventBus } from "@/lib/eventBus";
import { BaronSelect } from "@/design-system";
import { Button } from "@/components/ui/button";
import { Radio, RefreshCw, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUS_CFG = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  dispatched: { label: "Despachado", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluído", color: "bg-emerald-100 text-emerald-700" },
  failed: { label: "Falhou", color: "bg-rose-100 text-rose-700" },
  processing: { label: "Processando", color: "bg-violet-100 text-violet-700" },
  retrying: { label: "Retentando", color: "bg-orange-100 text-orange-700" },
};

const PRIORITY_CFG = {
  critica: { color: "bg-rose-50 text-rose-600" },
  alta: { color: "bg-orange-50 text-orange-600" },
  media: { color: "bg-blue-50 text-blue-600" },
  baixa: { color: "bg-neutral-50 text-neutral-500" },
};

export default function EventStream() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterModule, setFilterModule] = useState("all");
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    EventBus.getStream({
      event_status: filterStatus !== "all" ? filterStatus : undefined,
      module: filterModule !== "all" ? filterModule : undefined,
      limit: 50,
    }).then(r => { setEvents(r.events || []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus, filterModule]);

  const handleRetry = async (eventId) => {
    await EventBus.retry(eventId);
    toast({ title: "Retentativa iniciada", description: "O evento foi reenviado para processamento." });
    load();
  };

  const handleReplay = async (eventId) => {
    await EventBus.replay(eventId);
    toast({ title: "Replay executado", description: "O evento foi reprocessado a partir do Event Store." });
    load();
  };

  const modules = [...new Set(events.map(e => e.module))].sort();

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-[160px]"><BaronSelect value={filterStatus} onChange={setFilterStatus} options={[{ value: "all", label: "Todos os status" }, ...Object.entries(STATUS_CFG).map(([k, v]) => ({ value: k, label: v.label }))]} placeholder="Status" /></div>
        <div className="w-[160px]"><BaronSelect value={filterModule} onChange={setFilterModule} options={[{ value: "all", label: "Todos os módulos" }, ...modules.map((m) => ({ value: m, label: m }))]} placeholder="Módulo" /></div>
        <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
        <span className="flex items-center gap-1.5 text-xs text-neutral-500">
          <Radio className="h-3.5 w-3.5 text-emerald-500" /> {events.length} eventos
        </span>
      </div>

      {/* Stream */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {loading ? (
          <div className="space-y-1 p-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded bg-neutral-100" />)}</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">Nenhum evento encontrado</div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {events.map(e => {
              const sCfg = STATUS_CFG[e.event_status] || STATUS_CFG.pending;
              const pCfg = PRIORITY_CFG[e.priority] || PRIORITY_CFG.media;
              return (
                <div key={e.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-neutral-50/60">
                  <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${pCfg.color}`}>{e.priority}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-bold text-neutral-900">{e.event_name || e.event_type}</code>
                      <span className="text-[10px] text-neutral-400">via {e.origin}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-neutral-500">
                      <span>📁 {e.module}</span>
                      <span>📦 {e.queue}</span>
                      <span>👤 {e.user_name || "Sistema"}</span>
                      {e.entity_type && <span>🔗 {e.entity_type}</span>}
                      <span>⏱ {e.processing_time_ms}ms</span>
                      {e.retry_count > 0 && <span className="text-orange-500">↻ {e.retry_count} retentativa(s)</span>}
                      {e.ai_processed && <span className="text-violet-500">🤖 IA</span>}
                      <span className="text-neutral-400">{e.created_date ? new Date(e.created_date).toLocaleString("pt-BR") : ""}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sCfg.color}`}>{sCfg.label}</span>
                    {(e.event_status === "failed" || e.event_status === "pending") && (
                      <div className="flex gap-1">
                        <button onClick={() => handleRetry(e.id)} title="Retentativa" className="rounded p-1 text-orange-500 hover:bg-orange-50">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleReplay(e.id)} title="Replay" className="rounded p-1 text-blue-500 hover:bg-blue-50">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}