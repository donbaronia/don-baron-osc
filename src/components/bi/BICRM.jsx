import React, { useEffect, useState } from "react";
import { BI } from "@/lib/biEngine";
import StatCard from "@/components/dashboard/StatCard";
import DataTable from "@/components/shared/DataTable";
import { brl } from "@/lib/financialCenter";
import { Users, UserX, Repeat, DollarSign, Percent, Cake, Clock, TrendingUp } from "lucide-react";

export default function BICRM() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    BI.getCRMDashboard().then(r => { setData(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;
  }

  const cards = [
    { icon: Users, label: "Clientes Ativos", value: data.ativos, accent: "bg-emerald-50 text-emerald-600" },
    { icon: UserX, label: "Inativos", value: data.inativos, accent: "bg-neutral-50 text-neutral-500" },
    { icon: Repeat, label: "Recorrentes", value: data.recorrentes, tone: "positive", accent: "bg-blue-50 text-blue-600" },
    { icon: Percent, label: "Retenção", value: `${data.retencao.toFixed(1)}%`, accent: "bg-purple-50 text-purple-600" },
    { icon: TrendingUp, label: "Frequência Média", value: data.frequencia.toFixed(1), accent: "bg-indigo-50 text-indigo-600" },
    { icon: DollarSign, label: "Ticket Médio", value: brl(data.ticket_medio), accent: "bg-teal-50 text-teal-600" },
    { icon: DollarSign, label: "LTV", value: brl(data.ltv), accent: "bg-amber-50 text-amber-600" },
    { icon: Clock, label: "Sem Comprar 30d+", value: data.sem_comprar, tone: data.sem_comprar > 0 ? "warning" : "neutral", accent: "bg-orange-50 text-orange-600" },
    { icon: Cake, label: "Aniversariantes", value: data.aniversariantes, accent: "bg-rose-50 text-rose-600" },
  ];

  const columns = [
    { key: "name", label: "Cliente" },
    { key: "orders", label: "Pedidos", render: r => r.orders },
    { key: "total", label: "Total", render: r => brl(r.total) },
    { key: "last_date", label: "Última Compra" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">Top 10 Clientes</h3>
        <DataTable columns={columns} rows={data.top_customers} emptyTitle="Nenhum cliente" emptyDescription="Ainda não há vendas registradas." />
      </div>
    </div>
  );
}