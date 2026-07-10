import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { PC, brl } from "@/lib/purchasingCenter";
import { exportToCsv } from "@/lib/exportCsv";
import { formatBRL } from "@/lib/documentUtils";
import { RefreshCw, Download, ShoppingCart, TrendingDown, Clock, Trophy } from "lucide-react";

export default function PurchaseReports() {
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

  const Card = ({ icon: Icon, title, value, subtitle, color = "neutral" }) => (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-500">{title}</span>
        <Icon className={`h-5 w-5 text-${color}-500`} />
      </div>
      <p className="mt-2 text-2xl font-bold text-neutral-900">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-neutral-400">{subtitle}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-neutral-900">Relatórios de Compras</h3>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"><RefreshCw className="h-4 w-4" /> Atualizar</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={ShoppingCart} title="Total de Pedidos" value={s.totalOrders} color="blue" />
        <Card icon={TrendingDown} title="Economia Obtida" value={brl(s.savings)} color="emerald" subtitle="Diferença vs cotação mais cara" />
        <Card icon={Clock} title="Lead Time Médio" value={`${s.avgLeadTime.toFixed(0)} dias`} color="amber" />
        <Card icon={Trophy} title="Fornecedor Líder" value={data.topSupplier?.name || "—"} subtitle={data.topSupplier ? brl(data.topSupplier.total) : ""} color="amber" />
      </div>

      {/* Ranking */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-neutral-700">Ranking de Fornecedores</h4>
          <button onClick={() => exportToCsv("ranking_fornecedores.csv", data.supplierRanking.map(s => ({ fornecedor: s.name, compras: s.count, total: s.total })))} className="text-xs text-neutral-500 hover:text-neutral-700 inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> CSV</button>
        </div>
        <div className="space-y-2">
          {data.supplierRanking.map((sup, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-neutral-700"><span className="text-neutral-400 mr-2">#{i + 1}</span>{sup.name}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-neutral-400">{sup.count} pedidos</span>
                <span className="font-medium text-neutral-900">{brl(sup.total)}</span>
              </div>
            </div>
          ))}
          {data.supplierRanking.length === 0 && <p className="text-sm text-neutral-400">Sem dados</p>}
        </div>
      </div>

      {/* Produtos */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-neutral-700">Produtos Mais Comprados</h4>
          <button onClick={() => exportToCsv("produtos_comprados.csv", data.topProducts.map(p => ({ produto: p.name, compras: p.count, quantidade: p.totalQty, valor: p.totalValue })))} className="text-xs text-neutral-500 hover:text-neutral-700 inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> CSV</button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {data.topProducts.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-neutral-700 truncate">{p.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400">{p.totalQty} un</span>
                <span className="font-medium text-neutral-900">{brl(p.totalValue)}</span>
              </div>
            </div>
          ))}
          {data.topProducts.length === 0 && <p className="text-sm text-neutral-400">Sem dados</p>}
        </div>
      </div>

      {/* Compras por centro de custo */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-neutral-700">Compras por Centro de Custo</h4>
          <button onClick={() => exportToCsv("compras_centro_custo.csv", Object.entries(data.byCostCenter).map(([k, v]) => ({ centro: k, valor: v })))} className="text-xs text-neutral-500 hover:text-neutral-700 inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> CSV</button>
        </div>
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