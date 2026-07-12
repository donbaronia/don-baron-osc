import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Wallet, Package, Factory, ShoppingCart, TrendingUp, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Relatorios() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.FinancialTransaction.list("-created_date", 100).catch(() => []),
      base44.entities.Stock.list("-created_date", 50).catch(() => []),
      base44.entities.ProductionRecord.list("-created_date", 50).catch(() => []),
      base44.entities.Purchase.list("-created_date", 50).catch(() => []),
    ]).then(([transactions, stocks, production, purchases]) => {
      const pagar = (transactions || []).filter(t => t.type === "a_pagar" && t.status === "pendente").reduce((s, t) => s + (t.amount || 0), 0);
      const receber = (transactions || []).filter(t => t.type === "a_receber" && t.status === "pendente").reduce((s, t) => s + (t.amount || 0), 0);
      const pago = (transactions || []).filter(t => t.status === "pago").reduce((s, t) => s + (t.amount || 0), 0);
      const stockValue = (stocks || []).reduce((s, item) => s + ((item.quantity || 0) * (item.cost_price || item.average_cost || 0)), 0);
      const lowStock = (stocks || []).filter(s => (s.quantity || 0) <= (s.min_quantity || 0)).length;
      const produced = (production || []).reduce((s, p) => s + (p.produced_quantity || 0), 0);
      const lost = (production || []).reduce((s, p) => s + (p.lost_quantity || 0), 0);
      const purchasesTotal = (purchases || []).reduce((s, p) => s + (p.total_amount || p.amount || 0), 0);

      setData({
        pagar, receber, pago, stockValue, lowStock, produced, lost, purchasesTotal,
        transactionsCount: (transactions || []).length,
        stockCount: (stocks || []).length,
        productionCount: (production || []).length,
        purchasesCount: (purchases || []).length,
      });
    }).finally(() => setLoading(false));
  }, []);

  const brl = (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const cards = [
    { title: "Financeiro", icon: Wallet, items: [
      { label: "A Pagar", value: brl(data?.pagar) },
      { label: "A Receber", value: brl(data?.receber) },
      { label: "Pago", value: brl(data?.pago) },
      { label: "Transações", value: data?.transactionsCount || 0 },
    ]},
    { title: "Estoque", icon: Package, items: [
      { label: "Valor em Estoque", value: brl(data?.stockValue) },
      { label: "Itens Abaixo do Mínimo", value: data?.lowStock || 0 },
      { label: "Total de Itens", value: data?.stockCount || 0 },
    ]},
    { title: "Produção", icon: Factory, items: [
      { label: "Itens Produzidos", value: data?.produced || 0 },
      { label: "Itens Perdidos", value: data?.lost || 0 },
      { label: "Ordens", value: data?.productionCount || 0 },
    ]},
    { title: "Compras", icon: ShoppingCart, items: [
      { label: "Total Comprado", value: brl(data?.purchasesTotal) },
      { label: "Pedidos", value: data?.purchasesCount || 0 },
    ]},
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title="Relatórios"
        subtitle="Visão consolidada de todos os módulos do sistema."
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <FileDown className="h-4 w-4" />
            Exportar
          </Button>
        }
      />
      <div className="mt-6">
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-card" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {cards.map(section => {
              const Icon = section.icon;
              return (
                <div key={section.title} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                  </div>
                  <div className="mt-4 space-y-3">
                    {section.items.map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-medium text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}