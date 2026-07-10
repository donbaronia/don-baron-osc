import React, { useEffect, useState } from "react";
import { BI } from "@/lib/biEngine";
import StatCard from "@/components/dashboard/StatCard";
import { brl } from "@/lib/financialCenter";
import { TrendingUp, DollarSign, PiggyBank, Percent, Wallet, FileWarning, PackageX, ShoppingCart, Factory, Bot, Receipt, AlertTriangle } from "lucide-react";

export default function BIExecutive() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    BI.getExecutiveDashboard().then(r => { setData(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;
  }

  const cards = [
    { icon: DollarSign, label: "Receita do Dia", value: brl(data.receita_dia), accent: "bg-emerald-50 text-emerald-600" },
    { icon: TrendingUp, label: "Receita da Semana", value: brl(data.receita_semana), accent: "bg-blue-50 text-blue-600" },
    { icon: TrendingUp, label: "Receita do Mês", value: brl(data.receita_mes), accent: "bg-indigo-50 text-indigo-600" },
    { icon: PiggyBank, label: "Lucro", value: brl(data.lucro), tone: data.lucro >= 0 ? "positive" : "negative", accent: "bg-amber-50 text-amber-600" },
    { icon: Percent, label: "CMV", value: `${data.cmv.toFixed(1)}%`, tone: data.cmv > 35 ? "negative" : "neutral", accent: "bg-purple-50 text-purple-600" },
    { icon: Wallet, label: "Fluxo de Caixa", value: brl(data.fluxo_caixa), tone: data.fluxo_caixa >= 0 ? "positive" : "negative", accent: "bg-teal-50 text-teal-600" },
    { icon: Receipt, label: "Recebimento iFood", value: brl(data.ifood_recebimento), accent: "bg-rose-50 text-rose-600" },
    { icon: FileWarning, label: "Boletos do Dia", value: data.boletos_dia, tone: data.boletos_dia > 0 ? "warning" : "neutral", accent: "bg-orange-50 text-orange-600" },
    { icon: PackageX, label: "Estoque Crítico", value: data.estoque_critico, tone: data.estoque_critico > 0 ? "negative" : "neutral", accent: "bg-red-50 text-red-600" },
    { icon: ShoppingCart, label: "Compras Urgentes", value: data.compras_urgentes, tone: data.compras_urgentes > 0 ? "warning" : "neutral", accent: "bg-indigo-50 text-indigo-600" },
    { icon: Factory, label: "Produções Pendentes", value: data.producoes_pendentes, accent: "bg-cyan-50 text-cyan-600" },
    { icon: Bot, label: "Alertas da IA", value: data.alertas_ia, tone: data.alertas_ia > 0 ? "warning" : "neutral", accent: "bg-violet-50 text-violet-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>
      <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-sm font-semibold text-neutral-900">Resumo Executivo</h2>
        </div>
        <p className="mt-3 text-sm text-neutral-700">
          O mês atual registrou <strong>{brl(data.receita_mes)}</strong> em receita líquida, com CMV de <strong>{data.cmv.toFixed(1)}%</strong> e fluxo de caixa de <strong>{brl(data.fluxo_caixa)}</strong>.
          {data.estoque_critico > 0 && ` Há ${data.estoque_critico} item(ns) em estoque crítico.`}
          {data.compras_urgentes > 0 && ` ${data.compras_urgentes} compra(s) aguardam aprovação.`}
          {data.estoque_critico === 0 && data.compras_urgentes === 0 && " Operação saudável, sem alertas críticos."}
        </p>
      </div>
    </div>
  );
}