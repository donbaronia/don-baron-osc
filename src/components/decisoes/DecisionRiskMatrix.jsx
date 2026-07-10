import React, { useEffect, useState } from "react";
import { DecisionEngine } from "@/lib/decisionEngine";
import { brl } from "@/lib/financialCenter";
import EmptyState from "@/components/shared/EmptyState";
import { ShieldAlert, AlertTriangle, Shield, ShieldCheck } from "lucide-react";

const RISK_CONFIG = {
  baixo: { label: "Baixo Risco", icon: ShieldCheck, color: "border-emerald-200 bg-emerald-50", badge: "bg-emerald-100 text-emerald-700" },
  medio: { label: "Médio Risco", icon: Shield, color: "border-amber-200 bg-amber-50", badge: "bg-amber-100 text-amber-700" },
  alto: { label: "Alto Risco", icon: AlertTriangle, color: "border-orange-200 bg-orange-50", badge: "bg-orange-100 text-orange-700" },
  muito_alto: { label: "Muito Alto Risco", icon: ShieldAlert, color: "border-rose-200 bg-rose-50", badge: "bg-rose-100 text-rose-700" },
};

export default function DecisionRiskMatrix() {
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DecisionEngine.getRiskMatrix().then(r => { setMatrix(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;
  }

  if (!matrix) return null;

  const hasAny = Object.values(matrix).some(arr => arr.length > 0);
  if (!hasAny) return <EmptyState icon={ShieldCheck} title="Sem riscos mapeados" description="Nenhuma decisão com risco identificado no momento." />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-xs text-neutral-500">Cada decisão é classificada por nível de risco, considerando probabilidade, impacto financeiro, operacional e comercial.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(RISK_CONFIG).map(([level, cfg]) => {
          const items = matrix[level] || [];
          if (items.length === 0) return null;
          const Icon = cfg.icon;
          return (
            <div key={level} className={`rounded-2xl border p-5 ${cfg.color}`}>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-neutral-700" />
                <h3 className="text-sm font-bold text-neutral-900">{cfg.label}</h3>
                <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>{items.length}</span>
              </div>

              <div className="mt-3 space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="rounded-lg bg-white/80 p-3">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-neutral-900">{item.title}</p>
                      <span className="ml-2 shrink-0 text-sm font-black text-neutral-700">{item.score}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-neutral-600">
                      <span>Prob: <strong>{item.probability.toFixed(0)}%</strong></span>
                      <span>Impacto: <strong>{brl(item.financial_impact)}</strong></span>
                      <span>Op: <strong className="capitalize">{item.operational_impact}</strong></span>
                      <span>Com: <strong className="capitalize">{item.commercial_impact}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}