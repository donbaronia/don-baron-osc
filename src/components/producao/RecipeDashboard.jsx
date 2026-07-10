import React, { useEffect, useState } from "react";
import { RE, brl } from "@/lib/recipeEngine";
import StatCard from "@/components/dashboard/StatCard";
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Percent, ChefHat, Package, Crown } from "lucide-react";

export default function RecipeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await RE.getDashboard()); }
    catch { console.error("Erro"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  if (!data) return null;
  const s = data.summary;

  const Row = ({ r, metric, metricLabel, tone = "neutral" }) => (
    <div className="flex items-center justify-between border-b border-neutral-50 py-2 text-sm last:border-0">
      <span className="text-neutral-700 truncate max-w-[60%]">{r.name}</span>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-neutral-400">{brl(r.cost_total)}</span>
        <span className="text-xs text-neutral-400">{brl(r.sale_price)}</span>
        <span className={`font-medium ${tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-rose-600" : "text-neutral-700"}`}>{metric}</span>
      </div>
    </div>
  );

  const Card = ({ title, icon: Icon, children, action }) => (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-neutral-400" />
        <h4 className="text-sm font-semibold text-neutral-700">{title}</h4>
        {action}
      </div>
      <div className="space-y-0">{children}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ChefHat} label="Total de Receitas" value={s.totalRecipes} />
        <StatCard icon={Percent} label="Margem Média" value={`${s.avgMargin.toFixed(0)}%`} tone={s.avgMargin >= 30 ? "positive" : "warning"} />
        <StatCard icon={TrendingUp} label="CMV Médio" value={`${s.avgCMV.toFixed(0)}%`} tone={s.avgCMV <= 40 ? "positive" : "negative"} />
        <StatCard icon={DollarSign} label="Lucro Total" value={brl(s.totalProfit)} tone="positive" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Combos" value={s.totalCombos} />
        <StatCard icon={Package} label="Adicionais" value={s.totalAdditions} />
        <StatCard icon={AlertTriangle} label="Receitas Críticas" value={s.criticalCount} tone={s.criticalCount > 0 ? "negative" : "neutral"} />
        <StatCard icon={AlertTriangle} label="Sem Preço" value={s.noPriceCount} tone={s.noPriceCount > 0 ? "warning" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Mais Lucrativas" icon={Crown}>
          {data.mostProfitable.map((r, i) => <Row key={i} r={r} metric={brl(r.gross_profit)} metricLabel="Lucro" tone="positive" />)}
          {data.mostProfitable.length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Sem dados</p>}
        </Card>
        <Card title="Menos Lucrativas" icon={TrendingDown}>
          {data.leastProfitable.map((r, i) => <Row key={i} r={r} metric={brl(r.gross_profit)} metricLabel="Lucro" tone="negative" />)}
          {data.leastProfitable.length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Sem dados</p>}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Maior CMV" icon={TrendingUp}>
          {data.highestCMV.map((r, i) => <Row key={i} r={r} metric={`${(r.cmv_pct || 0).toFixed(0)}%`} metricLabel="CMV" tone="negative" />)}
          {data.highestCMV.length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Sem dados</p>}
        </Card>
        <Card title="Maior Margem" icon={Percent}>
          {data.highestMargin.map((r, i) => <Row key={i} r={r} metric={`${(r.margin_pct || 0).toFixed(0)}%`} metricLabel="Margem" tone="positive" />)}
          {data.highestMargin.length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Sem dados</p>}
        </Card>
      </div>

      {data.critical.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle className="h-5 w-5 text-rose-600" /><h4 className="text-sm font-semibold text-rose-700">Receitas Críticas</h4></div>
          <div className="space-y-1">
            {data.critical.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-rose-700">{r.name}</span>
                <span className="text-xs text-rose-500">CMV: {(r.cmv_pct || 0).toFixed(0)}% · Margem: {(r.margin_pct || 0).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}