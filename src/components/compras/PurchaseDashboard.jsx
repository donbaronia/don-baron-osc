import React, { useEffect, useState } from "react";
import { PC, brl } from "@/lib/purchasingCenter";
import StatCard from "@/components/dashboard/StatCard";
import { Wallet, ShoppingCart, TrendingDown, Clock, Trophy, TrendingUp, Package, AlertTriangle, RefreshCw, Building2, Users } from "lucide-react";

export default function PurchaseDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await PC.getDashboardData()); }
    catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  if (!data) return null;
  const s = data.summary;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Compras do Mês" value={brl(s.monthTotal)} />
        <StatCard icon={ShoppingCart} label="Compras da Semana" value={brl(s.weekTotal)} />
        <StatCard icon={TrendingDown} label="Economia Obtida" value={brl(s.savings)} tone="positive" />
        <StatCard icon={Clock} label="Lead Time Médio" value={`${s.avgLeadTime.toFixed(0)} dias`} tone="warning" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Total de Pedidos" value={s.totalOrders} />
        <StatCard icon={Package} label="Solicitações Pendentes" value={s.pendingRequests} tone={s.pendingRequests > 0 ? "warning" : "neutral"} />
        <StatCard icon={Users} label="Fornecedores Ativos" value={s.activeSuppliers} />
        <StatCard icon={AlertTriangle} label="Pedidos Atrasados" value={data.pendingCount} tone={data.pendingCount > 0 ? "negative" : "neutral"} />
      </div>

      {data.alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-500">ALERTAS</h3>
          {data.alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 ${a.severity === "urgent" ? "border-rose-200 bg-rose-50" : a.severity === "warning" ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"}`}>
              <AlertTriangle className={`h-5 w-5 ${a.severity === "urgent" ? "text-rose-600" : a.severity === "warning" ? "text-amber-600" : "text-blue-600"}`} />
              <span className={`text-sm ${a.severity === "urgent" ? "text-rose-700" : a.severity === "warning" ? "text-amber-700" : "text-blue-700"}`}>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4"><Trophy className="h-5 w-5 text-amber-500" /><h3 className="text-sm font-semibold text-neutral-700">Ranking de Fornecedores</h3></div>
          <div className="space-y-2">
            {data.supplierRanking.map((sup, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700"><span className="text-neutral-400 mr-2">#{i + 1}</span>{sup.name}</span>
                <span className="font-medium text-neutral-900">{brl(sup.total)}</span>
              </div>
            ))}
            {data.supplierRanking.length === 0 && <p className="text-sm text-neutral-400">Nenhum fornecedor</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4"><Package className="h-5 w-5 text-blue-500" /><h3 className="text-sm font-semibold text-neutral-700">Produtos Mais Comprados</h3></div>
          <div className="space-y-2">
            {data.topProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700 truncate">{p.name}</span>
                <span className="font-medium text-neutral-900 ml-2 shrink-0">{brl(p.totalValue)}</span>
              </div>
            ))}
            {data.topProducts.length === 0 && <p className="text-sm text-neutral-400">Nenhuma compra</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4"><TrendingUp className="h-5 w-5 text-rose-500" /><h3 className="text-sm font-semibold text-neutral-700">Maior Aumento de Preço</h3></div>
          {data.biggestIncrease ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-700">{data.biggestIncrease.product_name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">{brl(data.biggestIncrease.old_price)} → {brl(data.biggestIncrease.new_price)}</span>
                <span className="text-sm font-semibold text-rose-600">+{data.biggestIncrease.change_pct.toFixed(0)}%</span>
              </div>
            </div>
          ) : <p className="text-sm text-neutral-400">Sem dados suficientes</p>}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4"><TrendingUp className="h-5 w-5 text-emerald-500" /><h3 className="text-sm font-semibold text-neutral-700">Maior Redução de Preço</h3></div>
          {data.biggestDecrease ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-700">{data.biggestDecrease.product_name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">{brl(data.biggestDecrease.old_price)} → {brl(data.biggestDecrease.new_price)}</span>
                <span className="text-sm font-semibold text-emerald-600">{data.biggestDecrease.change_pct.toFixed(0)}%</span>
              </div>
            </div>
          ) : <p className="text-sm text-neutral-400">Sem dados suficientes</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4"><Building2 className="h-5 w-5 text-neutral-500" /><h3 className="text-sm font-semibold text-neutral-700">Compras por Centro de Custo</h3></div>
        <div className="space-y-2">
          {Object.entries(data.byCostCenter).sort((a, b) => b[1] - a[1]).map(([cc, val]) => (
            <div key={cc} className="flex items-center justify-between text-sm">
              <span className="text-neutral-700">{cc}</span>
              <span className="font-medium text-neutral-900">{brl(val)}</span>
            </div>
          ))}
          {Object.keys(data.byCostCenter).length === 0 && <p className="text-sm text-neutral-400">Sem dados</p>}
        </div>
      </div>
    </div>
  );
}