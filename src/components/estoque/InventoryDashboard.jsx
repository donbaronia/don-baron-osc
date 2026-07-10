import React, { useEffect, useState } from "react";
import { IE, brl } from "@/lib/inventoryEngine";
import StatCard from "@/components/dashboard/StatCard";
import { Package, AlertTriangle, Calendar, TrendingDown, RefreshCw, ShoppingCart, Clock, Layers, AlertTriangle as Warning, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function InventoryDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await IE.getOperationalDashboard()); }
    catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  if (!data) return null;
  const s = data.summary;

  const urgencyColor = { critica: "text-rose-600 bg-rose-50 border-rose-200", alta: "text-orange-600 bg-orange-50 border-orange-200", media: "text-amber-600 bg-amber-50 border-amber-200", baixa: "text-blue-600 bg-blue-50 border-blue-200" };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Valor Total do Estoque" value={brl(s.totalStockValue)} />
        <StatCard icon={AlertTriangle} label="Itens Críticos" value={s.criticalCount} tone={s.criticalCount > 0 ? "negative" : "neutral"} />
        <StatCard icon={TrendingDown} label="Perdas da Semana" value={brl(s.weekLossValue)} tone={s.weekLossValue > 0 ? "negative" : "neutral"} />
        <StatCard icon={ShoppingCart} label="Compras Sugeridas" value={s.suggestedPurchasesCount} tone={s.suggestedPurchasesCount > 0 ? "warning" : "neutral"} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Vencendo" value={s.expiringCount} tone={s.expiringCount > 0 ? "warning" : "neutral"} />
        <StatCard icon={Warning} label="Vencidos" value={s.expiredCount} tone={s.expiredCount > 0 ? "negative" : "neutral"} />
        <StatCard icon={Clock} label="Sem Movimentação (30d)" value={s.stoppedCount} tone="warning" />
        <StatCard icon={Layers} label="Consumo da Semana" value={brl(s.weekConsumptionValue)} />
      </div>

      {data.alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-500">ALERTAS OPERACIONAIS</h3>
          {data.alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 ${a.severity === "urgent" ? "border-rose-200 bg-rose-50" : a.severity === "warning" ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"}`}>
              <AlertTriangle className={`h-5 w-5 ${a.severity === "urgent" ? "text-rose-600" : a.severity === "warning" ? "text-amber-600" : "text-blue-600"}`} />
              <span className={`text-sm ${a.severity === "urgent" ? "text-rose-700" : a.severity === "warning" ? "text-amber-700" : "text-blue-700"}`}>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* COMPRAS SUGERIDAS */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="h-5 w-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-neutral-700">Compras Sugeridas (Inteligência Automática)</h3>
        </div>
        <div className="space-y-2">
          {data.suggestedPurchases.slice(0, 8).map((sug, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-neutral-100 p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900">{sug.product_name}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${urgencyColor[sug.urgency]}`}>{sug.urgency}</span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-400">{sug.reason}</p>
                <p className="mt-0.5 text-xs text-neutral-400">Atual: {sug.current_qty} {sug.unit} · Cobertura: {sug.coverage_days} dias · Consumo: {sug.avg_daily_consumption.toFixed(1)}/dia</p>
              </div>
              <div className="flex items-center gap-3 ml-3 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold text-neutral-900">Comprar {sug.suggested_qty} {sug.unit}</p>
                  <p className="text-xs text-neutral-400">{brl(sug.estimated_cost)}</p>
                </div>
                <Link to="/compras" className="rounded-lg bg-neutral-900 p-2 text-white hover:bg-neutral-700"><ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          ))}
          {data.suggestedPurchases.length === 0 && <p className="py-4 text-center text-sm text-neutral-400">Nenhuma compra sugerida no momento.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ITENS CRÍTICOS */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4"><AlertTriangle className="h-5 w-5 text-rose-500" /><h3 className="text-sm font-semibold text-neutral-700">Itens Críticos (Abaixo do Mínimo)</h3></div>
          <div className="space-y-2">
            {data.criticalItems.slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">{item.product_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-rose-600 font-medium">{item.quantity} {item.unit}</span>
                  <span className="text-xs text-neutral-400">mín: {item.min_quantity}</span>
                </div>
              </div>
            ))}
            {data.criticalItems.length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Nenhum item crítico</p>}
          </div>
        </div>

        {/* ITENS VENCENDO */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4"><Calendar className="h-5 w-5 text-amber-500" /><h3 className="text-sm font-semibold text-neutral-700">Vencimento Próximo</h3></div>
          <div className="space-y-2">
            {data.expiringSoon.filter(s => s.expiry_alert_level !== "vencido").slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">{item.product_name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.expiry_alert_level === "alerta_1" ? "bg-rose-100 text-rose-700" : item.expiry_alert_level === "alerta_3" || item.expiry_alert_level === "alerta_7" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{item.expiry_alert_level.replace("alerta_", "")} dias</span>
              </div>
            ))}
            {data.expiringSoon.length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Nenhum item vencendo</p>}
          </div>
        </div>
      </div>

      {/* ITENS MAOS/MENOS UTILIZADOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4"><Layers className="h-5 w-5 text-emerald-500" /><h3 className="text-sm font-semibold text-neutral-700">Itens Mais Utilizados</h3></div>
          <div className="space-y-2">
            {data.mostUsed.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700 truncate">{p.name}</span>
                <span className="font-medium text-neutral-900 ml-2 shrink-0">{brl(p.totalValue)}</span>
              </div>
            ))}
            {data.mostUsed.length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Sem dados</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4"><Clock className="h-5 w-5 text-neutral-400" /><h3 className="text-sm font-semibold text-neutral-700">Itens Menos Utilizados</h3></div>
          <div className="space-y-2">
            {data.leastUsed.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700 truncate">{p.name}</span>
                <span className="font-medium text-neutral-900 ml-2 shrink-0">{brl(p.totalValue)}</span>
              </div>
            ))}
            {data.leastUsed.length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Sem dados</p>}
          </div>
        </div>
      </div>
    </div>
  );
}