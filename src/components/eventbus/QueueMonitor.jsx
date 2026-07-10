import React, { useEffect, useState } from "react";
import { EventBus } from "@/lib/eventBus";
import { Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const QUEUE_LABELS = {
  finance: { label: "Finance", icon: "💰" },
  inventory: { label: "Inventory", icon: "📦" },
  production: { label: "Production", icon: "🏭" },
  purchasing: { label: "Purchasing", icon: "🛒" },
  hr: { label: "RH", icon: "👥" },
  courier: { label: "Courier", icon: "🛵" },
  crm: { label: "CRM", icon: "🤝" },
  documents: { label: "Documents", icon: "📄" },
  ai: { label: "AI", icon: "🤖" },
  notifications: { label: "Notifications", icon: "🔔" },
  analytics: { label: "Analytics", icon: "📊" },
};

export default function QueueMonitor() {
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    EventBus.getQueues().then(r => { setQueues(r.queues || []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">11 filas independentes — eventos críticos são processados primeiro.</p>
        <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={load}><RefreshCw className="h-4 w-4" /> Atualizar</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(loading ? Array.from({ length: 11 }) : queues).map((q, i) => {
          const cfg = QUEUE_LABELS[q?.name] || { label: q?.name, icon: "📋" };
          const total = q?.total || 0;
          const pending = q?.pending || 0;
          const failed = q?.failed || 0;
          const completed = q?.completed || 0;
          const backlogPct = total > 0 ? (pending / total) * 100 : 0;
          const errorPct = total > 0 ? (failed / total) * 100 : 0;

          return (
            <div key={q?.name || i} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cfg.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{cfg.label}</p>
                    <p className="text-[10px] text-neutral-400">{q?.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-neutral-900">{total}</p>
                  <p className="text-[10px] text-neutral-400">eventos</p>
                </div>
              </div>

              {/* Status Bar */}
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-neutral-100">
                {completed > 0 && <div className="bg-emerald-400" style={{ width: `${(completed / Math.max(total, 1)) * 100}%` }} />}
                {pending > 0 && <div className="bg-amber-400" style={{ width: `${(pending / Math.max(total, 1)) * 100}%` }} />}
                {failed > 0 && <div className="bg-rose-400" style={{ width: `${(failed / Math.max(total, 1)) * 100}%` }} />}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-emerald-50 p-1.5">
                  <p className="text-sm font-bold text-emerald-600">{completed}</p>
                  <p className="text-[9px] text-neutral-500">OK</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-1.5">
                  <p className="text-sm font-bold text-amber-600">{pending}</p>
                  <p className="text-[9px] text-neutral-500">Pend.</p>
                </div>
                <div className="rounded-lg bg-rose-50 p-1.5">
                  <p className="text-sm font-bold text-rose-600">{failed}</p>
                  <p className="text-[9px] text-neutral-500">Erro</p>
                </div>
              </div>

              {q?.avg_processing_time > 0 && (
                <p className="mt-2 text-center text-[10px] text-neutral-400">~{Math.round(q.avg_processing_time)}ms/evento</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}