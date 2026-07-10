import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { RE, brl } from "@/lib/recipeEngine";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import FormField from "@/components/financial/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, RefreshCw, PlusCircle } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

const SEL = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const EMPTY = { name: "", product_id: "", product_name: "", quantity: 1, unit: "un", unit_cost: 0, addition_price: 0, category: "adicionais" };

export default function RecipeAdditions() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [adcs, prods] = await Promise.all([
      base44.entities.Recipe.filter({ is_addition: true, deleted_at: { $exists: false } }, "name", 500).catch(() => []),
      base44.entities.Product.filter({ active: true }, "name", 500).catch(() => []),
    ]);
    setRows(adcs); setProducts(prods);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => !search || (r.name || "").toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setDialog(true); };
  const openEdit = (r) => { setForm({ name: r.name, product_id: r.product_id, product_name: r.product_name, quantity: r.yield_quantity, unit: r.yield_unit, unit_cost: r.ingredients?.[0]?.unit_cost || 0, addition_price: r.addition_price || r.sale_price || 0, category: r.category }); setEditing(r); setDialog(true); };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editing) {
        const totalCost = (form.quantity || 0) * (form.unit_cost || 0);
        const grossProfit = (form.addition_price || 0) - totalCost;
        const marginPct = (form.addition_price || 0) > 0 ? (grossProfit / (form.addition_price || 0)) * 100 : 0;
        await base44.entities.Recipe.update(editing.id, {
          name: form.name, product_id: form.product_id, product_name: form.product_name,
          yield_quantity: form.quantity, yield_unit: form.unit,
          addition_price: form.addition_price, sale_price: form.addition_price,
          ingredients: [{ product_id: form.product_id, name: form.product_name || form.name, quantity: form.quantity, unit: form.unit, unit_cost: form.unit_cost, total_cost: totalCost }],
          cost_total: totalCost, cost_per_unit: totalCost,
          gross_profit: grossProfit, margin_pct: marginPct,
          markup: totalCost > 0 ? (form.addition_price || 0) / totalCost : 0,
          cmv_pct: (form.addition_price || 0) > 0 ? (totalCost / (form.addition_price || 0)) * 100 : 0,
          version: (editing.version || 1) + 1,
        });
      } else {
        await RE.createAddition(form);
      }
      toast({ title: "Sucesso!" });
      setDialog(false); load();
    } catch { toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const columns = [
    { key: "recipe_code", label: "Código", render: r => <span className="font-medium text-neutral-900">{r.recipe_code}</span> },
    { key: "name", label: "Adicional", render: r => <span className="font-medium text-neutral-900">{r.name}</span> },
    { key: "quantity", label: "Qtd", render: r => `${r.yield_quantity} ${r.yield_unit || "un"}` },
    { key: "cost_total", label: "Custo", render: r => brl(r.cost_total) },
    { key: "addition_price", label: "Preço", render: r => <span className="font-medium">{brl(r.addition_price || r.sale_price)}</span> },
    { key: "gross_profit", label: "Lucro", render: r => <span className="text-emerald-600 font-medium">{brl(r.gross_profit)}</span> },
    { key: "margin_pct", label: "Margem", render: r => `${(r.margin_pct || 0).toFixed(0)}%` },
    { key: "actions", label: "", render: r => <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button> },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("adicionais.csv", filtered)}>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /></Button>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo Adicional</Button>
      </Toolbar>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhum adicional" emptyDescription="Crie adicionais como bacon, cheddar, catupiry, etc." />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Adicional</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <FormField label="Nome *" className="col-span-2"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Bacon, Cheddar, Catupiry..." /></FormField>
            <FormField label="Produto" className="col-span-2"><select className={SEL} value={form.product_id} onChange={e => { const p = products.find(x => x.id === e.target.value); setForm({ ...form, product_id: e.target.value, product_name: p?.name, unit: p?.unit || form.unit }); }}><option value="">Selecione...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></FormField>
            <FormField label="Quantidade"><Input type="number" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Unidade"><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></FormField>
            <FormField label="Custo Unitário"><Input type="number" step="0.01" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Preço de Venda"><Input type="number" step="0.01" value={form.addition_price} onChange={e => setForm({ ...form, addition_price: parseFloat(e.target.value) || 0 })} /></FormField>
            <div className="col-span-2 rounded-lg bg-neutral-50 p-3 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Custo Total:</span><span className="font-medium">{brl((form.quantity || 0) * (form.unit_cost || 0))}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Lucro:</span><span className="font-medium text-emerald-600">{brl((form.addition_price || 0) - ((form.quantity || 0) * (form.unit_cost || 0)))}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Margem:</span><span className="font-medium">{form.addition_price > 0 ? `${(((form.addition_price - ((form.quantity || 0) * (form.unit_cost || 0))) / form.addition_price) * 100).toFixed(0)}%` : "—"}</span></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}