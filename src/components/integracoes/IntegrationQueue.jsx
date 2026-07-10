import React, { useEffect, useState, useCallback } from "react";
import { IntegrationHub } from "@/lib/integrationHub";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, CheckCircle2, XCircle, Clock, Inbox } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const STATUS_ICONS = {
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  processing: { icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50" },
  completed: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  dead_letter: { icon: AlertCircle, color: "text-red-700", bg: "bg-red-100" },
};

export default function IntegrationQueue({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await IntegrationHub.listQueue({ limit: 50 });
      setItems(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleReprocess = async (id) => {
    try {
      const res = await IntegrationHub.reprocessQueue(id);
      if (res.success) {
        toast({ title: "Item reprocessado com sucesso" });
      } else {
        toast({ title: "Falha ao reprocessar", description: res.error, variant: "destructive" });
      }
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{items.length} item(ns) na fila</p>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /> Atualizar</Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-200/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
          <Inbox className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 text-sm text-neutral-400">Fila vazia — tudo em dia</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((q) => {
            const cfg = STATUS_ICONS[q.status] || STATUS_ICONS.pending;
            const Icon = cfg.icon;
            return (
              <div key={q.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cfg.bg}`}>
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-800">{q.integration_name}</span>
                    <span className="text-xs text-neutral-400">·</span>
                    <span className="text-xs text-neutral-500">{q.queue_type}</span>
                    <span className={`text-xs font-semibold ${cfg.color}`}>{q.status}</span>
                  </div>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">
                    {q.last_error || JSON.stringify(q.payload).substring(0, 80)}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Tentativas: {q.retry_count}/{q.max_retries}
                    {q.next_retry_at && ` · Próxima: ${new Date(q.next_retry_at).toLocaleString('pt-BR')}`}
                  </p>
                </div>
                {(q.status === 'pending' || q.status === 'failed') && (
                  <Button size="sm" variant="outline" onClick={() => handleReprocess(q.id)}>
                    <RefreshCw className="h-3.5 w-3.5" /> Reprocessar
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}