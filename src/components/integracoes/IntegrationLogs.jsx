import React, { useEffect, useState, useCallback } from "react";
import { IntegrationHub } from "@/lib/integrationHub";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, ScrollText } from "lucide-react";

export default function IntegrationLogs({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await IntegrationHub.getLogs({ limit: 50 });
      setItems(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{items.length} log(s) recente(s)</p>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /> Atualizar</Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-neutral-200/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
          <ScrollText className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 text-sm text-neutral-400">Nenhum log registrado</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/80">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Integração</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Direção</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Método</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Tempo</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Origem</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Horário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((log) => (
                  <tr key={log.id} className="cursor-pointer hover:bg-neutral-50/60" onClick={() => setSelected(log)}>
                    <td className="px-4 py-2.5 text-neutral-700">{log.integration_name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium ${log.direction === 'outbound' ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {log.direction === 'outbound' ? '↑ Saída' : '↓ Entrada'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">{log.method}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold ${log.response_status >= 200 && log.response_status < 300 ? 'text-emerald-600' : log.response_status >= 400 ? 'text-red-600' : 'text-neutral-400'}`}>
                        {log.response_status || (log.error ? 'ERR' : '—')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">{log.duration_ms}ms</td>
                    <td className="px-4 py-2.5 text-neutral-500">{log.origin}{log.sandbox ? ' (sandbox)' : ''}</td>
                    <td className="px-4 py-2.5 text-neutral-400 text-xs">{log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-neutral-500">Integração:</span> {selected?.integration_name}</div>
              <div><span className="text-neutral-500">Endpoint:</span> {selected?.endpoint}</div>
              <div><span className="text-neutral-500">Usuário:</span> {selected?.user_name}</div>
              <div><span className="text-neutral-500">Duração:</span> {selected?.duration_ms}ms</div>
              <div><span className="text-neutral-500">Status:</span> {selected?.response_status}</div>
              <div><span className="text-neutral-500">Sandbox:</span> {selected?.sandbox ? 'Sim' : 'Não'}</div>
            </div>
            {selected?.error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Erro: {selected.error}</div>
            )}
            <div>
              <span className="text-sm font-medium text-neutral-700">Request:</span>
              <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
                {JSON.stringify(selected?.request_payload, null, 2)}
              </pre>
            </div>
            {selected?.response_payload && (
              <div>
                <span className="text-sm font-medium text-neutral-700">Response:</span>
                <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
                  {selected.response_payload}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}