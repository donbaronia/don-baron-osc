import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { searchProducts } from "@/lib/masterData";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import ProductForm from "./ProductForm";
import PriceHistoryDialog from "./PriceHistoryDialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, History, Trash2, Package } from "lucide-react";

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);

  const loadAll = async () => {
    const [p, s, c, u, t] = await Promise.all([
      base44.entities.Product.list("-created_date", 500),
      base44.entities.Supplier.list("-created_date", 200),
      base44.entities.Category.list("-created_date", 200),
      base44.entities.UnitOfMeasure.list("-created_date", 200),
      base44.entities.Tag.list("-created_date", 200),
    ]);
    setProducts(p); setSuppliers(s); setCategories(c); setUnits(u); setTags(t);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleEdit = (product) => { setEditProduct(product); setFormOpen(true); };
  const handleNew = () => { setEditProduct(null); setFormOpen(true); };
  const handleDelete = async (product) => {
    if (!confirm(`Excluir "${product.name}"?`)) return;
    await base44.entities.Product.delete(product.id);
    loadAll();
  };

  const filtered = searchProducts(
    catFilter === "all" ? products : products.filter((p) => p.category === catFilter),
    search
  );

  const columns = [
    {
      key: "image", label: "",
      render: (r) => r.image_url
        ? <img src={r.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
        : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100"><Package className="h-5 w-5 text-neutral-400" /></div>,
    },
    {
      key: "name", label: "Produto",
      render: (r) => (
        <div>
          <p className="font-medium text-neutral-900">{r.name}</p>
          <p className="text-xs text-neutral-500">{r.internal_code} {r.short_name ? `· ${r.short_name}` : ""}</p>
        </div>
      ),
    },
    { key: "category", label: "Categoria", render: (r) => r.category || "—" },
    { key: "primary_supplier_name", label: "Fornecedor", render: (r) => r.primary_supplier_name || "—" },
    { key: "unit", label: "Un.", render: (r) => r.unit || "—" },
    {
      key: "tags", label: "Tags",
      render: (r) => (r.tags?.length > 0
        ? <div className="flex flex-wrap gap-1">{r.tags.slice(0, 3).map((t) => <span key={t} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{t}</span>)}{r.tags.length > 3 && <span className="text-xs text-neutral-400">+{r.tags.length - 3}</span>}</div>
        : "—"),
    },
    {
      key: "active", label: "Status",
      render: (r) => r.active
        ? <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Ativo</span>
        : <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">Inativo</span>,
    },
    {
      key: "actions", label: "",
      render: (r) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setHistoryProduct(r)} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" title="Histórico de preços"><History className="h-4 w-4" /></button>
          <button onClick={() => handleEdit(r)} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" title="Editar"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => handleDelete(r)} className="rounded-md p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600" title="Excluir"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} placeholder="Pesquisar por nome, código, fornecedor, tags, categoria, barras...">
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={handleNew} className="gap-2 bg-neutral-900 hover:bg-neutral-800"><Plus className="h-4 w-4" /> Novo Produto</Button>
      </Toolbar>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhum produto cadastrado" emptyDescription="Cadastre produtos para reutilizá-los em todos os módulos do sistema." />
      <ProductForm open={formOpen} onClose={() => setFormOpen(false)} product={editProduct} onSaved={loadAll} suppliers={suppliers} categories={categories} units={units} tags={tags} />
      <PriceHistoryDialog open={!!historyProduct} onClose={() => setHistoryProduct(null)} product={historyProduct} suppliers={suppliers} />
    </div>
  );
}