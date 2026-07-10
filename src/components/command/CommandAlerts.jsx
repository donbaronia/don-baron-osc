import React from "react";
import SectionCard from "./SectionCard";
import { brl } from "@/lib/financialCenter";
import { Bell, ShieldAlert, AlertTriangle, CheckCircle } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { label: "Crítica", color: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", icon: ShieldAlert },
  high: { label: "Alta", color: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500", icon: AlertTriangle },
  medium: { label: "Média", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", icon: AlertTriangle },
  low: { label: "Baixa", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", icon: Bell },
};

export default function CommandAlerts({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <SectionCard icon={Bell} title="Central de Alertas" accent="text-amber-500">
        <div className="flex items-center gap-3 py-4">
          <CheckCircle className="h-8 w-8 text-emerald-500" />
          <div>
            <p className="text-sm font-semibold text-neutral-900">Nenhum alerta ativo</p>
            <p className="text-xs text-neutral-500">Operação saudável. Sem pendências críticas.</p>
          </div>
        </div>
      </SectionCard>
    );
  }

  const counts = {
    critical: alerts.filter(a => a.severity === "critical").length,
    high: alerts.filter(a => a.severity === "high").length,
    medium: alerts.filter(a => a.severity === "medium").length,
  };

  return (
    <SectionCard icon={Bell} title={`Central de Alertas — ${alerts.length} ativo(s)`} accent="text-amber-500">
      <div className="mb-4 flex gap-2">
        {counts.critical > 0 && <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">{counts.critical} críticas</span>}
        {counts.high > 0 && <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">{counts.high} altas</span>}
        {counts.medium > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{counts.medium} médias</span>}
      </div>

      <div className="space-y-3">
        {alerts.map((a, i) => {
          const cfg = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.medium;
          const Icon = cfg.icon;
          return (
            <div key={i} className={`rounded-xl border p-4 ${cfg.color}`}>
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900">{a.title}</span>
                    <span className="text-xs font-semibold uppercase tracking-wider">{cfg.label}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-neutral-700">{a.description}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
                    <span>Origem: <strong className="capitalize">{a.origin}</strong></span>
                    <span>Responsável: <strong>{a.responsible}</strong></span>
                    {a.impact ? <span>Impacto: <strong>{brl(a.impact)}</strong></span> : null}
                  </div>
                  <p className="mt-2 text-xs text-neutral-600">
                    <span className="font-medium">Ação recomendada:</span> {a.suggestion}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}