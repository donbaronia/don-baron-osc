import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { gatherBusinessData, generateExecutiveSummary } from "@/lib/baronAI";
import StatCard from "@/components/dashboard/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import { Receipt, FileText, Package, ShoppingCart, Factory, Wallet, DollarSign, AlertTriangle, Clock, Database } from "lucide-react";

const ICONS = {
  receipt: Receipt,
  file: FileText,
  package: Package,
  cart: ShoppingCart,
  factory: Factory,
  wallet: Wallet,
  dollar: DollarSign,
  alert: AlertTriangle,
  clock: Clock,
};

export default function ResumoExecutivo() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await gatherBusinessData();
      setSummary(generateExecutiveSummary(data, user));
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-neutral-200/60" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  if (!summary.hasData) {
    return (
      <EmptyState
        icon={Database}
        title="Sem dados suficientes para análise"
        description="A BARON AI precisa de dados cadastrados no sistema para gerar análises. Comece registrando produtos, transações financeiras e documentos."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6">
        <p className="text-lg font-semibold text-neutral-900">{summary.greeting}</p>
        <p className="mt-1 text-sm capitalize text-neutral-500">{summary.date} — {summary.time}</p>
        <p className="mt-3 text-sm text-neutral-700">{summary.daySummary}</p>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-neutral-700">Visão Geral</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {summary.cards.map((c) => {
            const Icon = ICONS[c.icon] || AlertTriangle;
            return <StatCard key={c.label} icon={Icon} label={c.label} value={c.value} hint={c.detail} tone={c.tone} accent={c.accent} />;
          })}
        </div>
      </div>

      {summary.alerts.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-rose-900">
            <AlertTriangle className="h-4 w-4" />
            Alertas Ativos ({summary.alerts.length})
          </h3>
          <ul className="mt-3 space-y-2">
            {summary.alerts.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-sm text-rose-800">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                <span><strong>{a.title}</strong> — {a.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.pendencias.length > 0 && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-purple-900">
            <Clock className="h-4 w-4" />
            Pendências ({summary.pendencias.length})
          </h3>
          <ul className="mt-3 space-y-2">
            {summary.pendencias.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-start gap-2 text-sm text-purple-800">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
                <span><strong>{p.title}</strong> — {p.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}