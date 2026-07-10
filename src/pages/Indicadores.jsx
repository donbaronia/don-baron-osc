import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import { DollarSign, TrendingUp, Percent, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

const brl = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Indicadores() {
  const [tx, setTx] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.FinancialTransaction.list("-created_date", 500).then((r) => {
      setTx(r);
      setLoading(false);
    });
  }, []);

  const pagar = tx.filter((t) => t.type === "a_pagar").reduce((s, t) => s + (t.amount || 0), 0);
  const receber = tx.filter((t) => t.type === "a_receber").reduce((s, t) => s + (t.amount || 0), 0);
  const lucro = receber - pagar;
  const margem = receber > 0 ? ((lucro / receber) * 100).toFixed(1) + "%" : "—";

  const cards = [
    { icon: DollarSign, label: "Receita Total", value: brl(receber), accent: "bg-emerald-50 text-emerald-600" },
    { icon: ArrowUpCircle, label: "Despesas Totais", value: brl(pagar), tone: "negative", accent: "bg-rose-50 text-rose-600" },
    { icon: Wallet, label: "Resultado", value: brl(lucro), tone: lucro >= 0 ? "positive" : "negative", accent: "bg-amber-50 text-amber-600" },
    { icon: Percent, label: "Margem", value: margem, accent: "bg-purple-50 text-purple-600" },
    { icon: TrendingUp, label: "Ticket Médio (est.)", value: brl(receber / Math.max(tx.filter((t) => t.type === "a_receber").length, 1)), accent: "bg-blue-50 text-blue-600" },
    { icon: ArrowDownCircle, label: "Lançamentos", value: tx.length, accent: "bg-teal-50 text-teal-600" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader emoji="📊" title="Centro de Indicadores" subtitle="DRE, CMV, fluxo de caixa e indicadores estratégicos — consolidados automaticamente." />
      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />)}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {cards.map((c) => <StatCard key={c.label} {...c} />)}
        </div>
      )}
    </div>
  );
}