import React, { useEffect, useState } from "react";
import { BI } from "@/lib/biEngine";
import StatCard from "@/components/dashboard/StatCard";
import DataTable from "@/components/shared/DataTable";
import { brl } from "@/lib/financialCenter";
import { PackageX, Clock, AlertCircle, BarChart3, TrendingDown, ShoppingCart, Package } from "lucide-react";

export default function BIStock() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    BI.getStockDashboard().then(r => { setData(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;
  }

  const cards = [
    { icon: Package, label: "Valor Total", value: brl(data.valor_total), accent: "bg-blue-50 text-blue-600" },
    { icon: PackageX, label: "Itens Críticos", value: data.itens_criticos, tone: data.itens_criticos > 0 ? "negative" : "neutral", accent: "bg-red-50 text-red-600" },
    { icon: Clock, label: "Itens Parados", value: data.itens_parados, tone: data.itens_parados > 0 ? "warning" : "neutral", accent: "bg-amber-50 text-amber-600" },
    { icon: AlertCircle, label: "Validades Próximas", value: data.validades, tone: data.validades > 0 ? "warning" : "neutral", accent: "bg-orange-50 text-orange-600" },
    { icon: BarChart3, label: "Cobertura Média", value: `${data.cobertura_media.toFixed(0)} dias`, accent: "bg-teal-50 text-teal-600" },
    { icon: TrendingDown, label: "Perdas", value: brl(data.perdas), tone: "negative", accent: "bg-rose-50 text-rose-600" },
  ];

  const abcData = [
    { class: "A (Alto Valor)", count: data.curva_abc.A, pct: data.curva_abc.A + data.curva_abc.B + data.curva_abc.C > 0 ? ((data.curva_abc.A / (data.curva_abc.A + data.curva_abc.B + data.curva_abc.C)) * 100).toFixed(0) : 0 },
    { class: "B (Médio Valor)", count: data.curva_abc.B, pct: data.curva_abc.A + data.curva_abc.B + data.curva_abc.C > 0 ? ((data.curva_abc.B / (data.curva_abc.A + data.curva_abc.B + data.curva_abc.C)) * 100).toFixed(0) : 0 },
    { class: "C (Baixo Valor)", count: data.curva_abc.C, pct: data.curva_abc.A + data.curva_abc.B + data.curva_abc.C > 0 ? ((data.curva_abc.C / (data.curva_abc.A + data.curva_abc.B + data.curva_abc.C)) * 100).toFixed(0) : 0 },
  ];

  const columns = [
    { key: "product_name", label: "Produto" },
    { key: "current", label: "Atual", render: r => r.current },
    { key: "min", label: "Mínimo", render: r => r.min },
    { key: "suggested", label: "Sugestão", render: r => Math.max(0, r.suggested).toFixed(0) },
    { key: "coverage_days", label: "Cobertura", render: r => `${r.coverage_days.toFixed(0)} dias` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-neutral-900">Curva ABC</h3>
          <div className="mt-4 space-y-3">
            {abcData.map(a => (
              <div key={a.class}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">{a.class}</span>
                  <span className="font-semibold text-neutral-900">{a.count} ({a.pct}%)</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-neutral-100">
                  <div className={`h-2 rounded-full ${a.class.startsWith("A") ? "bg-rose-500" : a.class.startsWith("B") ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${a.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-neutral-900">Compras Sugeridas</h3>
          </div>
          <DataTable columns={columns} rows={data.compras_sugeridas} emptyTitle="Nenhuma compra sugerida" emptyDescription="Estoque em níveis adequados." />
        </div>
      </div>
    </div>
  );
}