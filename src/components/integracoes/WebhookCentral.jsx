import React, { useEffect, useState, useCallback } from "react";
import { IntegrationHub } from "@/lib/integrationHub";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Webhook as WebhookIcon } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function WebhookCentral({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await IntegrationHub.listWebhooks({ limit: 50 });
      setItems(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleReprocess = async (id) => {
    try {
      await IntegrationHub.reprocessWebhook(id);
      toast({ title: "Webhook reprocessado" });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{items.length} webhook(s) recente(s)</p>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /> Atualizar</Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-200/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
          <WebhookIcon className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 text-sm text-neutral-400">Nenhum webhook recebido ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((w) => (
            <div key={w.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
              <div className={`h-2 w-2 rounded-full ${w.processing_status === 'completed' ? 'bg-emerald-500' : w.processing_status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-800">{w.event_name || 'Webhook'}</span>
                  <span className="text-xs text-neutral-400">·</span>
                  <span className="text-xs text-neutral-500">{w.integration_name}</span>
                  {w.verified && <span className="text-xs text-emerald-600">✓ verificado</span>}
                </div>
                <p className="text-xs text-neutral-400 truncate">{JSON.stringify(w.payload).substring(0, 80)}...</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelected(w)}>Ver</Button>
                <Button size="sm" variant="outline" onClick={() => handleReprocess(w.id)}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Webhook: {selected?.event_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-neutral-500">Integração:</span> {selected?.integration_name}</div>
              <div><span className="text-neutral-500">Tipo:</span> {selected?.webhook_type}</div>
              <div><span className="text-neutral-500">Origem IP:</span> {selected?.source_ip || '—'}</div>
              <div><span className="text-neutral-500">Verificado:</span> {selected?.verified ? 'Sim' : 'Não'}</div>
              <div><span className="text-neutral-500">Recebido:</span> {selected?.received_at ? new Date(selected.received_at).toLocaleString('pt-BR') : '—'}</div>
              <div><span className="text-neutral-500">Reprocessado:</span> {selected?.reprocess_count || 0}x</div>
            </div>
            <div>
              <span className="text-sm font-medium text-neutral-700">Payload:</span>
              <pre className="mt-1 max-h-60 overflow-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
                {JSON.stringify(selected?.payload, null, 2)}
              </pre>
            </div>
            {selected?.headers && (
              <div>
                <span className="text-sm font-medium text-neutral-700">Headers:</span>
                <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
                  {JSON.stringify(selected.headers, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}