import React, { useEffect, useState } from "react";
import { EventBus } from "@/lib/eventBus";
import EmptyState from "@/components/shared/EmptyState";
import { Network } from "lucide-react";

export default function SubscriptionMap() {
  const [subs, setSubs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    EventBus.getSubscriptions().then(r => { setSubs(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;
  }

  if (!subs) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <Network className="mt-0.5 h-5 w-5 text-blue-500" />
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Mapa de Subscrições</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Cada módulo assina eventos específicos. A BARON AI escuta TODOS os eventos. Novos módulos podem ser conectados apenas assinando eventos, sem alterar módulos existentes.
            </p>
          </div>
        </div>
      </div>

      {/* BARON AI banner */}
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <p className="text-sm font-bold text-violet-900">BARON AI — Listener Global</p>
            <p className="text-xs text-violet-700">A IA escuta todos os {Object.keys(subs.subscriptions || {}).reduce((acc, k) => acc + (subs.subscriptions[k]?.length || 0), 0)} eventos. Cria memória operacional, detecta padrões, aprende e gera recomendações. Nunca executa ações automaticamente.</p>
          </div>
        </div>
      </div>

      {/* Subscription list */}
      <div className="space-y-3">
        {Object.entries(subs.subscriptions || {}).sort().map(([module, events]) => (
          <div key={module} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold capitalize text-neutral-900">{module}</h4>
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">{events.length} evento(s)</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {events.map(e => (
                <span key={e.event} className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
                  e.priority === "critica" ? "border-rose-200 bg-rose-50 text-rose-600" :
                  e.priority === "alta" ? "border-orange-200 bg-orange-50 text-orange-600" :
                  e.priority === "media" ? "border-blue-200 bg-blue-50 text-blue-600" :
                  "border-neutral-200 bg-neutral-50 text-neutral-500"
                }`}>
                  {e.event}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}