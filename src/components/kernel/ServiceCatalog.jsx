import React, { useEffect, useState, useCallback } from "react";
import { BaronKernel } from "@/lib/kernelEngine";
import { Button } from "@/components/ui/button";
import { RefreshCw, Server } from "lucide-react";

export default function ServiceCatalog({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BaronKernel.listServices();
      setItems(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{items.length} serviço(s) registrado(s)</p>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /> Atualizar</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200/60" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((svc) => (
            <div key={svc.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${svc.status === 'active' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <Server className={`h-4 w-4 ${svc.status === 'active' ? 'text-emerald-600' : 'text-red-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-neutral-800">{svc.name}</h4>
                    {svc.auto_registered && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">AUTO</span>}
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">{svc.engine}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-neutral-400">
                    <span>Module: {svc.module_key}</span>
                    <span>·</span>
                    <span>{svc.response_time_ms}ms</span>
                  </div>
                  {svc.endpoints && svc.endpoints.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {svc.endpoints.map((ep) => (
                        <span key={ep} className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">{ep}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}