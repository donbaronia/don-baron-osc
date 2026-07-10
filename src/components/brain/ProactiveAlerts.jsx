import React, { useEffect, useState, useCallback } from "react";
import { BaronBrain, SEVERITY_CONFIG, ALERT_TYPE_LABELS } from "@/lib/brainEngine";
import { Button } from "@/components/ui/button";
import { Bell, Check, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ProactiveAlerts({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BaronBrain.listAlerts();
      setItems(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await BaronBrain.generateAlerts();
      toast({ title: "Alertas gerados", description: `${res.created} novo(s) alerta(s)` });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleAcknowledge = async (id, status) => {
    try {
      await BaronBrain.acknowledgeAlert(id, status);
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const activeAlerts = items.filter(a => a.status === 'active');
  const sortedAlerts = [...activeAlerts].sort((a, b) => {
    const order = { critica: 0, alta: 1, media: 2, baixa: 3 };
    return (order[a.severity] || 3) - (order[b.severity] || 3);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{activeAlerts.length} alerta(s) ativo(s)</p>
        <Button onClick={handleGenerate} disabled={generating} size="sm">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          {generating ? "Gerando..." : "Gerar Alertas"}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200/60" />
          ))}
        </div>
      ) : sortedAlerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 text-sm text-neutral-400">Nenhum alerta ativo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedAlerts.map((alert) => {
            const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.media;
            return (
              <div key={alert.id} className={`rounded-xl border border-neutral-200 bg-white p-4 border-l-4`} style={{ borderLeftColor: alert.severity === 'critica' ? '#ef4444' : alert.severity === 'alta' ? '#f97316' : alert.severity === 'media' ? '#f59e0b' : '#3b82f6' }}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${sev.bg}`}>
                    <span className="text-lg">{sev.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-neutral-800">{alert.title}</h4>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${sev.bg} ${sev.color}`}>{sev.label}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">{alert.agent_name} · {ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type}</p>
                    <p className="text-sm text-neutral-600 mt-2">{alert.message}</p>
                    {alert.action_suggested && (
                      <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                        <strong>💡 Ação sugerida:</strong> {alert.action_suggested}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAcknowledge(alert.id, 'acknowledged')} title="Reconhecer">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAcknowledge(alert.id, 'dismissed')} title="Dispensar">
                      <X className="h-3.5 w-3.5 text-neutral-400" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}