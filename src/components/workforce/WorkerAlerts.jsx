import React, { useEffect, useState, useCallback } from "react";
import { DigitalWorkforce, SEVERITY_CONFIG } from "@/lib/workforceEngine";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function WorkerAlerts({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await DigitalWorkforce.listAlerts(50, 'active');
      setItems(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleAcknowledge = async (id, status) => {
    try {
      await DigitalWorkforce.acknowledgeAlert(id, status);
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;
  }

  const sorted = [...items].sort((a, b) => {
    const order = { critica: 0, alta: 1, media: 2, baixa: 3 };
    return (order[a.severity] || 3) - (order[b.severity] || 3);
  });

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-neutral-300" />
        <p className="mt-2 text-sm text-neutral-400">Nenhum alerta ativo</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((a) => {
        const sev = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.media;
        const borderColor = a.severity === 'critica' ? '#ef4444' : a.severity === 'alta' ? '#f97316' : a.severity === 'media' ? '#f59e0b' : '#3b82f6';
        return (
          <div key={a.id} className="rounded-xl border border-neutral-200 bg-white p-4 border-l-4" style={{ borderLeftColor: borderColor }}>
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${sev.bg}`}>
                <span className="text-lg">{sev.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-neutral-800">{a.title}</h4>
                  <span className={`rounded-full ${sev.bg} ${sev.color} px-1.5 py-0.5 text-[10px] font-semibold`}>{sev.label}</span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">{a.worker_name}</p>
                <p className="mt-2 text-sm text-neutral-600">{a.message}</p>
                {a.action_suggested && (
                  <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                    <strong>💡 Ação sugerida:</strong> {a.action_suggested}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAcknowledge(a.id, 'acknowledged')} title="Reconhecer">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAcknowledge(a.id, 'dismissed')} title="Dispensar">
                  <X className="h-3.5 w-3.5 text-neutral-400" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}