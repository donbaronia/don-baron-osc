import React, { useEffect, useState } from "react";
import { CMV, brl } from "@/lib/cmvEngine";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import { RefreshCw } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

export default function CMVIngredientAnalysis() {
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

  const ingredients = (data?.breakdown_by_ingredient || []).filter(i => !search || (i.name || "").toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: "name", label: "Ingrediente", render: r => <span className="font-medium text-neutral-900">{r.name}</span> },
    { key: "consumed_qty", label: "Consumido", render: r => `${(r.consumed_qty || 0).toFixed(1)}` },
    { key: "purchased_qty", label: "Comprado", render: r => `${(r.purchased_qty || 0).toFixed(1)}` },
    { key: "losses", label: "Perdas", render: r => <span className={r.losses > 0 ? "text-rose-600" : "text-neutral-500"}>{(r.losses || 0).toFixed(1)}</span> },
    { key: "avg_price", label: "Preço Médio", render: r => brl(r.avg_price) },
    { key: "financial_impact", label: "Impacto Financeiro", render: r => <span className="font-medium">{brl(r.financial_impact)}</span> },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("cmv_por_ingrediente.csv", ingredients)}>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"><RefreshCw className="h-4 w-4" /></button>
      </Toolbar>
      <DataTable columns={columns} rows={ingredients} loading={loading} emptyTitle="Sem dados de ingredientes" emptyDescription="Calcule o CMV primeiro." />
    </div>
  );
}