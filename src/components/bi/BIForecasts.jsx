import React, { useEffect, useState } from "react";
import { BI } from "@/lib/biEngine";
import StatCard from "@/components/dashboard/StatCard";
import { brl } from "@/lib/financialCenter";
import { TrendingUp, TrendingDown, DollarSign, Wallet, ShoppingCart, Factory, Receipt, Percent } from "lucide-react";

export default function BIForecasts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    BI.getForecasts().then(r => { setData(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;
  }

  const trendUp = data.vendas.tendencia >= 0;
  const cards = [
    { icon: trendUp ? TrendingUp : TrendingDown, label: "Previsão de Vendas", value: brl(data.vendas.previsto), hint: `Tendência: ${data.vendas.tendencia.toFixed(1)}%`, tone: trendUp ? "positive" : "negative", accent: "bg-blue-50 text-blue-600" },
    { icon: Wallet, label: "Previsão de Caixa", value: brl(data.caixa.previsto), tone: data.caixa.previsto >= 0 ? "positive" : "negative", accent: "bg-teal-50 text-teal-600" },
    { icon: DollarSign, label: "Previsão de Despesas", value: brl(data.despesas.previsto), tone: "negative", accent: "bg-rose-50 text-rose-600" },
    { icon: TrendingUp, label: "Previsão de Lucro", value: brl(data.lucro.previsto), tone: data.lucro.previsto >= 0 ? "positive" : "negative", accent: "bg-emerald-50 text-emerald-600" },
    { icon: Percent, label: "Cobertura de Estoque", value: `${data.estoque.cobertura_dias.toFixed(0)} dias`, accent: "bg-amber-50 text-amber-600" },
    { icon: Factory, label: "Previsão de Produção", value: data.producao.previsto, accent: "bg-cyan-50 text-cyan-600" },
    { icon: Receipt, label: "Previsão iFood", value: brl(data.ifood.previsto), accent: "bg-rose-50 text-rose-600" },
    { icon: ShoppingCart, label: "Previsão de Compras", value: brl(data.compras.previsto), accent: "bg-indigo-50 text-indigo-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6">
        <h3 className="text-sm font-semibold text-neutral-900">Metodologia</h3>
        <p className="mt-2 text-sm text-neutral-600">
          As previsões utilizam média móvel ponderada dos últimos 3 meses (pesos: 50%, 30%, 20%), projetando tendências com base no histórico operacional.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>
    </div>
  );
}