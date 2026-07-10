import React, { useEffect, useState } from "react";
import { CMV, brl } from "@/lib/cmvEngine";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import { RefreshCw } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

export default function CMVProductAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const latest = await CMV.getLatest("monthly");
      setData(latest);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const products = (data?.breakdown_by_product || []).filter(p => !search || (p.name || "").toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: "name", label: "Produto", render: r => <span className="font-medium text-neutral-900">{r.name}</span> },
    { key: "quantity", label: "Qtd. Vendida", render: r => r.quantity || 0 },
    { key: "revenue", label: "Receita", render: r => brl(r.revenue) },
    { key: "cost", label: "Custo Total", render: r => brl(r.cost) },
    { key: "cmv_pct", label: "CMV %", render: r => <span className={r.cmv_pct > 40 ? "font-medium text-rose-600" : "text-neutral-700"}>{r.cmv_pct.toFixed(1)}%</span> },
    { key: "profit", label: "Lucro", render: r => <span className={`font-medium ${r.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{brl(r.profit)}</span> },
    { key: "margin_pct", label: "Margem", render: r => `${r.margin_pct.toFixed(1)}%` },
    { key: "revenue_share", label: "% Faturamento", render: r => `${r.revenue_share.toFixed(1)}%` },
    { key: "profit_share", label: "% Lucro", render: r => `${r.profit_share.toFixed(1)}%` },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("cmv_por_produto.csv", products)}>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"><RefreshCw className="h-4 w-4" /></button>
      </Toolbar>
      <DataTable columns={columns} rows={products} loading={loading} emptyTitle="Sem dados de produtos" emptyDescription="Calcule o CMV primeiro." />
    </div>
  );
}