import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ShoppingCart, Factory, Wallet, Bike, Bell, Target } from "lucide-react";

export default function DailySummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      base44.entities.Sale.list("-created_date", 50).catch(() => []),
      base44.entities.ProductionRecord.filter({ production_date: today }).catch(() => []),
      base44.entities.FinancialTransaction.filter({ status: "pendente" }).catch(() => []),
      base44.entities.IFoodReceipt.filter({ status: "pendente" }).catch(() => []),
      base44.entities.Notification.filter({}, "-created_date", 10).catch(() => []),
      base44.entities.Mission.filter({ status: "em_andamento" }).catch(() => []),
    ]).then(([sales, production, transactions, ifood, notifications, missions]) => {
      const todaySales = (sales || []).filter(s => s.created_date?.startsWith(today));
      const caixaPagar = (transactions || []).filter(t => t.type === "a_pagar").reduce((s, t) => s + (t.amount || 0), 0);
      const ifoodReceber = (ifood || []).reduce((s, r) => s + (r.amount || r.net_amount || 0), 0);
      const alertCount = (notifications || []).filter(n => n.category === "urgent" || n.category === "warning").length;

      setData({
        pedidos: todaySales.length,
        producao: (production || []).length,
        caixa: caixaPagar,
        ifood: ifoodReceber,
        alertas: alertCount,
        missoes: (missions || []).length,
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-card" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Pedidos Hoje", value: data.pedidos, icon: ShoppingCart, color: "text-primary" },
    { label: "Produção", value: data.producao, icon: Factory, color: "text-baron-success" },
    { label: "Caixa", value: `R$ ${(data.caixa / 1000).toFixed(1)}k`, icon: Wallet, color: "text-baron-alert" },
    { label: "Receber iFood", value: `R$ ${(data.ifood / 1000).toFixed(1)}k`, icon: Bike, color: "text-baron-success" },
    { label: "Alertas", value: data.alertas, icon: Bell, color: "text-baron-error" },
    { label: "Missões", value: data.missoes, icon: Target, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30">
            <Icon className={`h-5 w-5 ${c.color}`} />
            <p className="mt-3 text-xl font-bold text-foreground">{c.value}</p>
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
          </div>
        );
      })}
    </div>
  );
}