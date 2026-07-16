import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { brl } from "@/lib/inventoryEngine";
import { useAuth } from "@/lib/AuthContext";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { RefreshCw, MapPin, TrendingUp, Package, Pencil } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import ProductForm from "@/components/cadastro/ProductForm";

const STOCK_TYPES = [
  { v: "materia_prima", l: "Matéria-Prima", tag: "tag-materia" },
  { v: "producao", l: "Produção", tag: "tag-producao" },
  { v: "produto_acabado", l: "Produto Acabado", tag: "tag-acabado" },
  { v: "em_transito", l: "Em Trânsito", tag: "tag-materia" },
  { v: "perdas", l: "Perdas", tag: "tag-perdas" },
  { v: "consumo_interno", l: "Consumo Interno", tag: "tag-escritorio" },
  { v: "marketing", l: "Marketing", tag: "tag-marketing" },
  { v: "manutencao", l: "Manutenção", tag: "tag-escritorio" },
  { v: "limpeza", l: "Limpeza", tag: "tag-escritorio" },
  { v: "escritorio", l: "Escritório", tag: "tag-escritorio" },
];

const typeTagMap = {
  materia_prima: "tag-materia",
  producao: "tag-producao",
  produto_acabado: "tag-acabado",
  em_transito: "tag-materia",
  perdas: "tag-perdas",
  consumo_interno: "tag-escritorio",
  marketing: "tag-marketing",
  manutencao: "tag-escritorio",
  limpeza: "tag-escritorio",
  escritorio: "tag-escritorio",
};

const abcBadge = (cls) => {
  const map = {
    A: "bg-baron-red/15 text-baron-red border-baron-red/30",
    B: "bg-baron-yellow/15 text-baron-yellow border-baron-yellow/30",
    C: "bg-baron-blue/15 text-baron-blue border-baron-blue/30",
  };
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${map[cls] || map.C}`}>{cls || "C"}</span>;
};

const expiryBadge = (level) => {
  if (!level || level === "normal") return <span className="text-xs text-small-info">—</span>;
  const map = {
    vencido: "bg-baron-red/15 text-baron-red border-baron-red/30",
    alerta_1: "bg-baron-red/15 text-baron-red border-baron-red/30",
    alerta_3: "bg-baron-orange/15 text-baron-orange border-baron-orange/30",
    alerta_7: "bg-baron-yellow/15 text-baron-yellow border-baron-yellow/30",
    alerta_15: "bg-baron-yellow/15 text-baron-yellow border-baron-yellow/30",
    alerta_30: "bg-baron-blue/15 text-baron-blue border-baron-blue/30",
    alerta_60: "bg-baron-blue/15 text-baron-blue border-baron-blue/30",
  };
  const label = level === "vencido" ? "Vencido" : level.replace("alerta_", "") + "d";
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${map[level]}`}>{label}</span>;
};

export default function StockList() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [editingProduct, setEditingProduct] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [stock, prods, sup, cat, uni, tg] = await Promise.all([
        base44.entities.Stock.filter({ deleted_at: null }, "product_name", 500).catch(() => []),
        base44.entities.Product.filter({ active: true }, "name", 1000).catch(() => []),
        base44.entities.Supplier.list("-created_date", 200).catch(() => []),
        base44.entities.Category.list("-created_date", 200).catch(() => []),
        base44.entities.UnitOfMeasure.list("-created_date", 200).catch(() => []),
        base44.entities.Tag.list("-created_date", 200).catch(() => []),
      ]);
      setRows(stock);
      setProducts(prods);
      setSuppliers(sup); setCategories(cat); setUnits(uni); setTags(tg);
    } catch { }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openEdit = (stockRow) => {
    const product = products.find((p) => p.id === stockRow.product_id);
    if (!product) {
      alert(`Não achei o cadastro do produto "${stockRow.product_name}". Ele pode ter sido criado só no estoque, sem cadastro completo — abra em Cadastro > Produtos para criar do zero.`);
      return;
    }
    setEditingProduct(product);
  };

  const filtered = rows.filter(r =>
    (typeFilter === "todos" || r.stock_type === typeFilter) &&
    (!search || (r.product_name || "").toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    { key: "product_name", label: "Produto", render: r => <span className="font-semibold text-title">{r.product_name}</span> },
    { key: "stock_type", label: "Tipo", render: r => {
      const tag = typeTagMap[r.stock_type || "materia_prima"] || "tag-escritorio";
      return <span className={`tag-baron ${tag}`}>{(r.stock_type || "materia_prima").replace(/_/g, " ")}</span>;
    }},
    { key: "quantity", label: "Quantidade", render: r => {
      const low = (r.quantity || 0) <= (r.min_quantity || 0) && r.min_quantity > 0;
      return <span className={`font-semibold ${low ? "text-baron-red" : "text-baron-green"}`}>{r.quantity || 0} <span className="text-small-info font-normal">{r.unit || ""}</span></span>;
    }},
    { key: "min_quantity", label: "Mín/Ideal", render: r => <span className="text-small-info">{r.min_quantity || 0}/{r.ideal_quantity || 0}</span> },
    { key: "coverage_days", label: "Cobertura", render: r => {
      const days = r.coverage_days || 0;
      const color = days === 0 ? "text-small-info" : days <= 2 ? "text-baron-red" : days <= 5 ? "text-baron-yellow" : "text-baron-blue";
      return <span className={`text-sm font-semibold ${color}`}>{days > 0 ? `${days}d` : "—"}</span>;
    }},
    { key: "average_cost", label: "Custo Médio", render: r => <span className="text-secondary-info">{brl(r.average_cost)}</span> },
    { key: "total_value", label: "Valor Total", render: r => <span className="font-semibold text-baron-orange">{brl(r.total_value)}</span> },
    { key: "abc_class", label: "ABC", render: r => abcBadge(r.abc_class) },
    { key: "expiry_alert_level", label: "Validade", render: r => expiryBadge(r.expiry_alert_level) },
    { key: "physical_location", label: "Localização", render: r => r.physical_location ? <span className="inline-flex items-center gap-1 text-xs text-small-info"><MapPin className="h-3 w-3" />{r.physical_location}</span> : <span className="text-small-info">—</span> },
    { key: "_actions", label: "", render: r => (
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => openEdit(r)}>
        <Pencil className="h-3.5 w-3.5" /> Editar
      </Button>
    )},
  ];

  const totalValue = filtered.reduce((s, r) => s + (r.total_value || 0), 0);
  const totalItems = filtered.length;

  return (
    <div className="space-y-5">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("estoque_atual.csv", filtered)}>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /> Atualizar</Button>
      </Toolbar>

      {/* Card de total — destaque */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-small-info">
            <TrendingUp className="h-4 w-4 text-baron-orange" />
            Valor Total
          </div>
          <div className="mt-2 text-3xl font-bold text-baron-orange">{brl(totalValue)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-small-info">
            <Package className="h-4 w-4 text-baron-blue" />
            Itens
          </div>
          <div className="mt-2 text-3xl font-bold text-title">{totalItems}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-small-info">
            <Package className="h-4 w-4 text-baron-green" />
            Tipos Ativos
          </div>
          <div className="mt-2 text-3xl font-bold text-baron-green">{typeFilter === "todos" ? STOCK_TYPES.length : 1}</div>
        </div>
      </div>

      {/* Filtros por tipo */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilter("todos")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${typeFilter === "todos" ? "bg-baron-orange text-white shadow-lg shadow-baron-orange/20" : "bg-secondary/50 text-secondary-info border border-border hover:bg-table-hover hover:text-primary-info"}`}
        >
          Todos
        </button>
        {STOCK_TYPES.map(t => (
          <button
            key={t.v}
            onClick={() => setTypeFilter(t.v)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${typeFilter === t.v ? "bg-baron-orange text-white shadow-lg shadow-baron-orange/20" : "bg-secondary/50 text-secondary-info border border-border hover:bg-table-hover hover:text-primary-info"}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhum estoque" emptyDescription="Registre movimentações para criar estoques automaticamente." />

      <ProductForm
        open={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        onSaved={() => { setEditingProduct(null); load(); }}
        suppliers={suppliers}
        categories={categories}
        units={units}
        tags={tags}
      />
    </div>
  );
}