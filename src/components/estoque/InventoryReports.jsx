import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { IE, brl } from "@/lib/inventoryEngine";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, TrendingDown, Package } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };

export default function InventoryReports() {
  const { toast } = useToast();
  const [dash, setDash] = useState(null);
  const [losses, setLosses] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [d, l] = await Promise.all([
        IE.getOperationalDashboard(),
        IE.getLosses(monthStart(), todayStr()),
      ]);
      setDash(d); setLosses(l);
    } catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  if (!dash || !losses) return null;
  const s = dash.summary;

  const Card = ({ title, value, subtitle, icon: Icon }) => (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-500">{title}</span>
        {Icon && <Icon className="h-5 w-5 text-neutral-400" />}
      </div>
      <p className="mt-2 text-2xl font-bold text-neutral-900">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-neutral-400">{subtitle}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-neutral-900">Relatórios de Estoque</h3>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"><RefreshCw className="h-4 w-4" /> Atualizar</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Valor do Estoque" value={brl(s.totalStockValue)} icon={Package} />
        <Card title="Perdas do Mês" value={brl(s.monthLossValue)} subtitle={`${losses.totalCount} movimentos`} icon={TrendingDown} />
        <Card title="Itens Críticos" value={s.criticalCount} icon={Package} />
        <Card title="Vencidos" value={s.expiredCount} icon={TrendingDown} />
      </div>

      {/* PERDAS POR TIPO */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-neutral-700">Perdas do Mês por Tipo</h4>
          <button onClick={() => exportToCsv("perdas_tipo.csv", Object.entries(losses.byType).map(([k, v]) => ({ tipo: k, valor: v })))} className="text-xs text-neutral-500 hover:text-neutral-700">CSV</button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(losses.byType).map(([type, value]) => (
            <div key={type} className="rounded-xl border border-neutral-100 p-4 text-center">
              <p className="text-xs capitalize text-neutral-500">{type}</p>
              <p className="mt-1 text-lg font-bold text-rose-600">{brl(value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PERDAS POR PRODUTO */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-neutral-700">Perdas por Produto</h4>
          <button onClick={() => exportToCsv("perdas_produto.csv", losses.byProduct)} className="text-xs text-neutral-500 hover:text-neutral-700">CSV</button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {losses.byProduct.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b border-neutral-50 pb-1">
              <span className="text-neutral-700">{p.name}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-neutral-400">{p.count}x · {p.totalQty} un</span>
                <span className="font-medium text-rose-600">{brl(p.totalValue)}</span>
              </div>
            </div>
          ))}
          {losses.byProduct.length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Sem perdas no período</p>}
        </div>
      </div>

      {/* ITENS PARADOS */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h4 className="text-sm font-semibold text-neutral-700 mb-4">Produtos Parados (sem movimentação há +30 dias)</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {dash.stoppedItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b border-neutral-50 pb-1">
              <span className="text-neutral-700">{item.product_name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400">{item.quantity} {item.unit}</span>
                <span className="text-xs text-amber-600">Parado</span>
                <span className="font-medium">{brl(item.total_value)}</span>
              </div>
            </div>
          ))}
          {dash.stoppedItems.length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Nenhum produto parado</p>}
        </div>
      </div>

      {/* COBERTURA DOS PRINCIPAIS */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h4 className="text-sm font-semibold text-neutral-700 mb-4">Cobertura dos Principais Produtos</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {dash.criticalItems.concat(dash.mostUsed.slice(0, 5).map(m => ({ product_name: m.name, coverage_days: 0, quantity: 0, unit: "un" }))).slice(0, 15).map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b border-neutral-50 pb-1">
              <span className="text-neutral-700">{item.product_name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400">{item.quantity} {item.unit || "un"}</span>
                <span className={`text-xs font-medium ${(item.coverage_days || 0) <= 2 ? "text-rose-600" : (item.coverage_days || 0) <= 5 ? "text-amber-600" : "text-emerald-600"}`}>{(item.coverage_days || 0) > 0 ? `${item.coverage_days}d` : "—"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}