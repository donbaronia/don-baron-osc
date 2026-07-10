import React, { useEffect, useState } from "react";
import { DecisionEngine } from "@/lib/decisionEngine";
import DataTable from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import { brl } from "@/lib/financialCenter";
import { History, CheckCircle, XCircle, Clock, FlaskConical } from "lucide-react";

const STATUS_CONFIG = {
  pendente: { label: "Pendente", icon: Clock, color: "bg-amber-100 text-amber-700" },
  aceita: { label: "Aceita", icon: CheckCircle, color: "bg-emerald-100 text-emerald-700" },
  rejeitada: { label: "Rejeitada", icon: XCircle, color: "bg-rose-100 text-rose-700" },
  arquivada: { label: "Arquivada", icon: Clock, color: "bg-neutral-100 text-neutral-600" },
  simulada: { label: "Simulada", icon: FlaskConical, color: "bg-blue-100 text-blue-700" },
};

export default function DecisionHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DecisionEngine.getHistory(50).then(r => { setRecords(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: "title",
      label: "Decisão",
      render: r => (
        <div>
          <p className="font-medium text-neutral-900">{r.title}</p>
          <p className="text-xs text-neutral-400">{r.question}</p>
        </div>
      ),
    },
    {
      key: "score",
      label: "Nota",
      render: r => <span className="font-bold text-neutral-700">{r.score}/100</span>,
    },
    {
      key: "recommendation",
      label: "Recomendação",
      render: r => <span className="text-xs capitalize text-neutral-600">{r.recommendation?.replace(/_/g, " ")}</span>,
    },
    {
      key: "risk_level",
      label: "Risco",
      render: r => <span className="text-xs capitalize text-neutral-600">{r.risk_level?.replace(/_/g, " ")}</span>,
    },
    {
      key: "financial_impact",
      label: "Impacto",
      render: r => <span className="font-medium text-neutral-700">{brl(r.financial_impact)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: r => {
        const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pendente;
        const Icon = cfg.icon;
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
            <Icon className="h-3 w-3" /> {cfg.label}
          </span>
        );
      },
    },
    {
      key: "accuracy_score",
      label: "Acurácia",
      render: r => r.accuracy_score ? (
        <span className={`text-xs font-bold ${r.accuracy_score >= 80 ? "text-emerald-600" : r.accuracy_score >= 50 ? "text-amber-600" : "text-rose-600"}`}>
          {r.accuracy_score}%
        </span>
      ) : <span className="text-xs text-neutral-400">—</span>,
    },
    {
      key: "created_date",
      label: "Data",
      render: r => r.created_date ? new Date(r.created_date).toLocaleDateString("pt-BR") : "—",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
        <div className="flex items-start gap-3">
          <History className="mt-0.5 h-5 w-5 text-blue-500" />
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Histórico e Aprendizado</h3>
            <p className="mt-1 text-xs text-neutral-600">
              Todas as recomendações e decisões são armazenadas. Resultados previstos são comparados com resultados reais para aprendizado contínuo.
            </p>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={records}
        loading={loading}
        emptyTitle="Nenhuma decisão registrada"
        emptyDescription="As decisões aceitas ou rejeitadas aparecerão aqui para acompanhamento."
      />
    </div>
  );
}