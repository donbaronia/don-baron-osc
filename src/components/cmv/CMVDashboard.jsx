import React, { useEffect, useState } from "react";
import { CMV, brl } from "@/lib/cmvEngine";
import StatCard from "@/components/dashboard/StatCard";
import { RefreshCw, DollarSign, TrendingUp, TrendingDown, Percent, AlertTriangle, Target, Calendar } from "lucide-react";

const periodLabels = { daily: "Diário", weekly: "Semanal", monthly: "Mensal", annual: "Anual" };

export default function CMVDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly");
  const [calculating, setCalculating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      await CMV.calculate(period, null, "manual");
      const latest = await CMV.getLatest(period);
      setData(latest);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [period]);

  const recalculate = async () => {
    setCalculating(true);
    try { await load(); } catch (e) { console.error(e); }
    setCalculating(false);
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  if (!data) return (
    <div className="text-center py-20">
      <p className="text-neutral-400">Nenhum cálculo de CMV encontrado.</p>
      <button onClick={recalculate} className="mt-3 text-sm text-blue-600 hover:underline">Recalcular agora</button>
    </div>
  );

  const d = data;
  const comp = d.comparison || {};
  const goal = d.goal_status || {};
  const cmvAbove = goal.cmv_above_goal;

  const Diff = ({ value, isPct = false, invert = false }) => {
    if (!value && value !== 0) return null;
    const positive = invert ? value < 0 : value > 0;
    const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : null;
    const fmt = isPct ? `${value.toFixed(1)}pp` : brl(value);
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${positive ? "text-emerald-600" : value < 0 ? "text-rose-600" : "text-neutral-500"}`}>
        {Icon && <Icon className="h-3 w-3" />}{value > 0 ? "+" : ""}{fmt}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {Object.entries(periodLabels).map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)} className={`rounded-full px-3 py-1 text-xs font-medium ${period === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>{l}</button>
          ))}
        </div>
        <button onClick={recalculate} disabled={calculating} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50">
          <RefreshCw className={`h-4 w-4 ${calculating ? "animate-spin" : ""}`} /> Recalcular
        </button>
      </div>

      {/* Executive Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Receita Líquida" value={brl(d.revenue_net)} tone="positive" hint={comp.revenue_diff !== undefined ? <Diff value={comp.revenue_diff} /> : `Bruto: ${brl(d.revenue_gross)}`} />
        <StatCard icon={Percent} label="CMV Atual" value={`${d.cmv_pct.toFixed(1)}%`} tone={cmvAbove ? "negative" : "positive"} hint={goal.max_cmv ? `Meta: ${goal.max_cmv}%` : (comp.cmv_diff !== undefined ? <Diff value={comp.cmv_diff} isPct invert /> : undefined)} />
        <StatCard icon={TrendingUp} label="Lucro Bruto" value={brl(d.gross_profit)} tone="positive" hint={comp.profit_diff !== undefined ? <Diff value={comp.profit_diff} /> : undefined} />
        <StatCard icon={Percent} label="Margem" value={`${d.margin_pct.toFixed(1)}%`} tone={d.margin_pct >= 30 ? "positive" : "warning"} hint={goal.target_margin ? `Meta: ${goal.target_margin}%` : (comp.margin_diff !== undefined ? <Diff value={comp.margin_diff} isPct /> : undefined)} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Pedidos" value={d.order_count || 0} />
        <StatCard icon={DollarSign} label="Ticket Médio" value={brl(d.average_ticket || 0)} />
        <StatCard icon={AlertTriangle} label="Perdas" value={brl(d.losses_value || 0)} tone={d.losses_value > 0 ? "negative" : "neutral"} />
        <StatCard icon={DollarSign} label="Taxas" value={brl(d.fees || 0)} />
      </div>

      {/* Alerts */}
      {d.alerts && d.alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-500">ALERTAS</h3>
          {d.alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 ${a.severity === "urgent" ? "border-rose-200 bg-rose-50" : a.severity === "high" ? "border-orange-200 bg-orange-50" : "border-amber-200 bg-amber-50"}`}>
              <AlertTriangle className={`h-5 w-5 shrink-0 ${a.severity === "urgent" ? "text-rose-600" : a.severity === "high" ? "text-orange-600" : "text-amber-600"}`} />
              <span className={`text-sm ${a.severity === "urgent" ? "text-rose-700" : a.severity === "high" ? "text-orange-700" : "text-amber-700"}`}>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Breakdown by Channel */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h4 className="text-sm font-semibold text-neutral-700 mb-4">Análise por Canal de Venda</h4>
        <div className="space-y-2">
          {(d.breakdown_by_channel || []).map((c, i) => (
            <div key={i} className="flex items-center justify-between border-b border-neutral-50 pb-1 text-sm last:border-0">
              <span className="text-neutral-700 capitalize">{c.channel}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-neutral-400">{c.orders} pedidos</span>
                <span className="text-xs text-neutral-500">{brl(c.net_revenue)}</span>
                <span className="font-medium text-neutral-900">{brl(c.revenue)}</span>
              </div>
            </div>
          ))}
          {(!d.breakdown_by_channel || d.breakdown_by_channel.length === 0) && <p className="py-2 text-center text-sm text-neutral-400">Sem dados</p>}
        </div>
      </div>

      {/* Top Products */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h4 className="text-sm font-semibold text-neutral-700 mb-4">Top Produtos por Receita</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {(d.breakdown_by_product || []).slice(0, 10).map((p, i) => (
            <div key={i} className="flex items-center justify-between border-b border-neutral-50 pb-1 text-sm last:border-0">
              <span className="text-neutral-700 truncate max-w-[40%]">#{i + 1} {p.name}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-neutral-400">{p.quantity} un</span>
                <span className="text-xs text-neutral-400">CMV {p.cmv_pct.toFixed(0)}%</span>
                <span className="font-medium text-neutral-900">{brl(p.revenue)}</span>
                <span className={`text-xs font-medium ${p.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{brl(p.profit)}</span>
              </div>
            </div>
          ))}
          {(!d.breakdown_by_product || d.breakdown_by_product.length === 0) && <p className="py-2 text-center text-sm text-neutral-400">Sem dados</p>}
        </div>
      </div>

      {/* Losses by Type */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h4 className="text-sm font-semibold text-neutral-700 mb-4">Perdas por Tipo</h4>
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(d.losses_by_type || {}).map(([type, value]) => (
            <div key={type} className="rounded-xl border border-neutral-100 p-3 text-center">
              <p className="text-xs capitalize text-neutral-500">{type.replace(/_/g, " ")}</p>
              <p className="mt-1 text-sm font-bold text-rose-600">{brl(value)}</p>
            </div>
          ))}
          {(!d.losses_by_type || Object.keys(d.losses_by_type).length === 0) && <p className="col-span-full py-2 text-center text-sm text-neutral-400">Sem perdas</p>}
        </div>
      </div>
    </div>
  );
}