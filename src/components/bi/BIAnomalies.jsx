import React, { useEffect, useState } from "react";
import { BI } from "@/lib/biEngine";
import EmptyState from "@/components/shared/EmptyState";
import { brl } from "@/lib/financialCenter";
import { AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { label: "Crítica", color: "bg-rose-50 text-rose-600 border-rose-200", icon: ShieldAlert },
  high: { label: "Alta", color: "bg-orange-50 text-orange-600 border-orange-200", icon: AlertTriangle },
  medium: { label: "Média", color: "bg-amber-50 text-amber-600 border-amber-200", icon: AlertTriangle },
  low: { label: "Baixa", color: "bg-blue-50 text-blue-600 border-blue-200", icon: AlertTriangle },
};

const TYPE_LABELS = {
  queda_vendas: "Queda de Vendas",
  aumento_custo: "Aumento de Custo",
  cmv_elevado: "CMV Elevado",
  desperdicio: "Desperdício Anormal",
  fluxo_negativo: "Fluxo Negativo",
  ticket_baixo: "Ticket Médio Baixo",
  margem_baixa: "Margem Abaixo da Meta",
  estoque_critico: "Estoque Crítico",
  estoque_inconsistente: "Estoque Inconsistente",
  fornecedor_aumento: "Fornecedor com Aumento",
  funcionario_improdutivo: "Funcionário Improdutivo",
};

export default function BIAnomalies() {
  const [anomalies, setAnomalies] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    BI.detectAnomalies().then(r => { setAnomalies(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;
  }

  if (!anomalies || anomalies.length === 0) {
    return <EmptyState icon={CheckCircle} title="Nenhuma anomalia detectada" description="Todos os indicadores estão dentro dos parâmetros normais." />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-semibold text-neutral-900">{anomalies.length} Anomalia(s) Detectada(s)</h3>
        </div>
        <p className="mt-1 text-xs text-neutral-500">O motor de BI analisa automaticamente padrões anômalos em todos os indicadores.</p>
      </div>

      {anomalies.map((a, i) => {
        const cfg = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.medium;
        const Icon = cfg.icon;
        return (
          <div key={i} className={`flex items-start gap-4 rounded-2xl border p-5 ${cfg.color}`}>
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-900">{TYPE_LABELS[a.type] || a.type}</span>
                <span className="text-xs font-semibold uppercase tracking-wider">{cfg.label}</span>
              </div>
              <p className="mt-1 text-sm text-neutral-700">{a.message}</p>
              {a.impact !== 0 && (
                <p className="mt-2 text-xs text-neutral-600">
                  Impacto financeiro estimado: <strong>{brl(a.impact)}</strong>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}