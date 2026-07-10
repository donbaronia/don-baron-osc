import React, { useEffect, useState } from "react";
import { gatherBusinessData, generateAlerts } from "@/lib/baronAI";
import EmptyState from "@/components/shared/EmptyState";
import { AlertTriangle, AlertCircle, Info, ShieldCheck } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { icon: AlertCircle, color: "border-rose-200 bg-rose-50 text-rose-900", dot: "bg-rose-500", label: "Crítico" },
  warning: { icon: AlertTriangle, color: "border-amber-200 bg-amber-50 text-amber-900", dot: "bg-amber-500", label: "Atenção" },
  info: { icon: Info, color: "border-blue-200 bg-blue-50 text-blue-900", dot: "bg-blue-500", label: "Informação" },
};

export default function Alertas() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await gatherBusinessData();
      setAlerts(generateAlerts(data));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Nenhum alerta ativo"
        description="A operação está estável. Nenhum item crítico foi identificado nos dados do sistema."
      />
    );
  }

  const critical = alerts.filter((a) => a.severity === "critical");
  const warning = alerts.filter((a) => a.severity === "warning");
  const info = alerts.filter((a) => a.severity === "info");

  const groups = [
    { key: "critical", items: critical },
    { key: "warning", items: warning },
    { key: "info", items: info },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500">
        {alerts.length} alerta(s) gerado(s) automaticamente com base nos dados cadastrados no sistema.
      </p>
      {groups.map((group) => {
        const config = SEVERITY_CONFIG[group.key];
        const Icon = config.icon;
        return (
          <div key={group.key}>
            <div className="mb-3 flex items-center gap-2">
              <Icon className="h-4 w-4 text-neutral-500" />
              <h3 className="text-sm font-semibold text-neutral-700">{config.label} ({group.items.length})</h3>
            </div>
            <div className="space-y-2">
              {group.items.map((a) => (
                <div key={a.id} className={`rounded-xl border p-4 ${config.color}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
                    <div className="flex-1">
                      <p className="font-medium">{a.title}</p>
                      <p className="mt-0.5 text-sm opacity-80">{a.description}</p>
                      <span className="mt-2 inline-block rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium">
                        {a.module}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}