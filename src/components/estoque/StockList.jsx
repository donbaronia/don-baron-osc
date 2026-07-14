import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { brl } from "@/lib/inventoryEngine";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { RefreshCw, MapPin } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

const STOCK_TYPES = [
  { v: "materia_prima", l: "Matéria-Prima" },
  { v: "producao", l: "Produção" },
  { v: "produto_acabado", l: "Produto Acabado" },
  { v: "em_transito", l: "Em Trânsito" },
  { v: "perdas", l: "Perdas" },
  { v: "consumo_interno", l: "Consumo Interno" },
  { v: "marketing", l: "Marketing" },
  { v: "manutencao", l: "Manutenção" },
  { v: "limpeza", l: "Limpeza" },
  { v: "escritorio", l: "Escritório" },
];

const abcBadge = (cls) => {
  const map = { A: "bg-rose-100 text-rose-700", B: "bg-amber-100 text-amber-700", C: "bg-blue-100 text-blue-700" };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[cls] || map.C}`}>{cls || "C"}</span>;
};

const expiryBadge = (level) => {
  if (!level || level === "normal") return <span className="text-xs text-neutral-400">—</span>;
  const map = {
    vencido: "bg-rose-100 text-rose-700", alerta_1: "bg-rose-100 text-rose-700",
    alerta_3: "bg-orange-100 text-orange-700", alerta_7: "bg-amber-100 text-amber-700",
    alerta_15: "bg-yellow-100 text-yellow-700", alerta_30: "bg-blue-100 text-blue-700", alerta_60: "bg-blue-100 text-blue-700",
  };
  const label = level === "vencido" ? "Vencido" : level.replace("alerta_", "") + "d";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[level]}`}>{label}</span>;
};

export default function StockList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");

  const load = async () => {
    setLoading(true);
    try { setRows(await base44.entities.Stock.filter({ deleted_at: null }, "product_name", 500)); }
    catch { }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r =>
    (typeFilter === "todos" || r.stock_type === typeFilter) &&
    (!search || (r.product_name || "").toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    { key: "product_name", label: "Produto", render: r => <span className="font-medium text-neutral-900">{r.product_name}</span> },
    { key: "stock_type", label: "Tipo", render: r => <span className="text-xs text-neutral-500 capitalize">{(r.stock_type || "materia_prima").replace(/_/g, " ")}</span> },
    { key: "quantity", label: "Quantidade", render: r => <span className={`font-medium ${(r.quantity || 0) <= (r.min_quantity || 0) && r.min_quantity > 0 ? "text-rose-600" : "text-neutral-900"}`}>{r.quantity || 0} {r.unit || ""}</span> },
    { key: "min_quantity", label: "Mín/Ideal", render: r => <span className="text-xs text-neutral-500">{r.min_quantity || 0}/{r.ideal_quantity || 0}</span> },
    { key: "coverage_days", label: "Cobertura", render: r => {
      const days = r.coverage_days || 0;
      const color = days === 0 ? "text-neutral-400" : days <= 2 ? "text-rose-600" : days <= 5 ? "text-amber-600" : "text-emerald-600";
      return <span className={`text-sm font-medium ${color}`}>{days > 0 ? `${days}d` : "—"}</span>;
    }},
    { key: "average_cost", label: "Custo Médio", render: r => brl(r.average_cost) },
    { key: "total_value", label: "Valor Total", render: r => <span className="font-medium">{brl(r.total_value)}</span> },
    { key: "abc_class", label: "ABC", render: r => abcBadge(r.abc_class) },
    { key: "expiry_alert_level", label: "Validade", render: r => expiryBadge(r.expiry_alert_level) },
    { key: "physical_location", label: "Localização", render: r => r.physical_location ? <span className="inline-flex items-center gap-1 text-xs text-neutral-500"><MapPin className="h-3 w-3" />{r.physical_location}</span> : "—" },
  ];

  const totalValue = filtered.reduce((s, r) => s + (r.total_value || 0), 0);

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("estoque_atual.csv", filtered)}>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /> Atualizar</Button>
      </Toolbar>
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTypeFilter("todos")} className={`rounded-full px-3 py-1 text-xs font-medium ${typeFilter === "todos" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>Todos</button>
          {STOCK_TYPES.map(t => (
            <button key={t.v} onClick={() => setTypeFilter(t.v)} className={`rounded-full px-3 py-1 text-xs font-medium ${typeFilter === t.v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>{t.l}</button>
          ))}
        </div>
        <span className="text-sm font-medium text-neutral-900">Total: {brl(totalValue)}</span>
      </div>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhum estoque" emptyDescription="Registre movimentações para criar estoques automaticamente." />
    </div>
  );
}