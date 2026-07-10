import React, { useEffect, useState } from "react";
import { BI } from "@/lib/biEngine";
import DataTable from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import { brl } from "@/lib/financialCenter";
import { Bell, CheckCircle, ShieldAlert, AlertTriangle } from "lucide-react";

const SEVERITY_BADGE = {
  critical: { label: "Crítica", color: "bg-rose-100 text-rose-700" },
  high: { label: "Alta", color: "bg-orange-100 text-orange-700" },
  medium: { label: "Média", color: "bg-amber-100 text-amber-700" },
  low: { label: "Baixa", color: "bg-blue-100 text-blue-700" },
};

export default function BIAlertCenter() {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    BI.getAlerts().then(r => { setAlerts(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;
  }

  if (!alerts || alerts.length === 0) {
    return <EmptyState icon={CheckCircle} title="Nenhum alerta ativo" description="Todos os indicadores estão saudáveis. Operação dentro dos parâmetros." />;
  }

  const columns = [
    {
      key: "severity",
      label: "Prioridade",
      render: (r) => {
        const s = SEVERITY_BADGE[r.severity] || SEVERITY_BADGE.medium;
        return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.color}`}>{s.label}</span>;
      },
    },
    { key: "origin", label: "Origem", render: r => <span className="capitalize">{r.origin}</span> },
    { key: "message", label: "Descrição" },
    { key: "responsible", label: "Responsável" },
    { key: "suggestion", label: "Sugestão da IA" },
    {
      key: "impact",
      label: "Impacto Financeiro",
      render: r => r.impact ? <span className="font-semibold text-neutral-900">{brl(r.impact)}</span> : <span className="text-neutral-400">—</span>,
    },
    {
      key: "status",
      label: "Status",
      render: r => <span className="inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 capitalize">{r.status}</span>,
    },
  ];

  const counts = {
    critical: alerts.filter(a => a.severity === "critical").length,
    high: alerts.filter(a => a.severity === "high").length,
    medium: alerts.filter(a => a.severity === "medium").length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
            <span className="text-sm font-semibold text-rose-900">Críticos</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-rose-700">{counts.critical}</p>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-semibold text-orange-900">Altos</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-orange-700">{counts.high}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-semibold text-amber-900">Médios</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-700">{counts.medium}</p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">Todos os Alertas</h3>
        <DataTable columns={columns} rows={alerts} emptyTitle="Nenhum alerta" emptyDescription="Operação saudável." />
      </div>
    </div>
  );
}