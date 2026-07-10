import React, { useEffect, useState } from "react";
import { BI } from "@/lib/biEngine";
import StatCard from "@/components/dashboard/StatCard";
import { Factory, TrendingUp, Clock, AlertTriangle, Percent, ChefHat, Users, Gauge } from "lucide-react";

export default function BIProduction() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    BI.getProductionDashboard().then(r => { setData(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;
  }

  const cards = [
    { icon: Factory, label: "Ordens Totais", value: data.ordens_total, accent: "bg-blue-50 text-blue-600" },
    { icon: TrendingUp, label: "Concluídas", value: data.ordens_concluidas, tone: "positive", accent: "bg-emerald-50 text-emerald-600" },
    { icon: Clock, label: "Pendentes", value: data.ordens_pendentes, tone: data.ordens_pendentes > 0 ? "warning" : "neutral", accent: "bg-amber-50 text-amber-600" },
    { icon: Gauge, label: "Eficiência", value: `${data.eficiencia.toFixed(1)}%`, tone: data.eficiencia >= 90 ? "positive" : "warning", accent: "bg-purple-50 text-purple-600" },
    { icon: Clock, label: "Tempo Médio", value: `${data.tempo_medio.toFixed(0)} min`, accent: "bg-teal-50 text-teal-600" },
    { icon: AlertTriangle, label: "Perdas", value: data.perdas.toFixed(1), tone: data.perdas > 0 ? "negative" : "neutral", accent: "bg-rose-50 text-rose-600" },
    { icon: Percent, label: "Rendimento", value: `${data.rendimento.toFixed(1)}%`, accent: "bg-indigo-50 text-indigo-600" },
    { icon: ChefHat, label: "Receitas", value: data.receitas, accent: "bg-orange-50 text-orange-600" },
    { icon: Users, label: "Funcionários", value: data.funcionarios, accent: "bg-cyan-50 text-cyan-600" },
    { icon: Gauge, label: "Produtividade", value: data.produtividade.toFixed(1), accent: "bg-violet-50 text-violet-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-neutral-900">Resumo de Produção</h3>
        <p className="mt-3 text-sm text-neutral-700">
          Foram registradas <strong>{data.ordens_total}</strong> ordens de produção no período, com <strong>{data.ordens_concluidas}</strong> concluídas.
          A eficiência média foi de <strong>{data.eficiencia.toFixed(1)}%</strong> com tempo médio de <strong>{data.tempo_medio.toFixed(0)} minutos</strong> por produção.
          {data.perdas > 0 && ` Foram contabilizadas ${data.perdas.toFixed(1)} unidades perdidas.`}
        </p>
      </div>
    </div>
  );
}