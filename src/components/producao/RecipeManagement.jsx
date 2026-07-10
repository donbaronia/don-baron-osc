import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { PE, brl } from "@/lib/productionEngine";
import { Core } from "@/lib/coreEngine";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import FormField from "@/components/financial/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Calculator, RefreshCw } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { useAuth } from "@/lib/AuthContext";

const SEL = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const CENTERS = ["blend", "molhos", "batata", "bacon", "cebola_crispy", "sobremesas", "bebidas", "pre_preparo", "limpeza", "outros"];

const EMPTY = { name: "", recipe_code: "", category: "", production_center: "blend", product_id: "", product_name: "", yield_quantity: 1, yield_unit: "un", preparation_time: 0, temperature: "", instructions: "", ingredients: [] };

export default function RecipeManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
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
    try {
      const [recs, prods] = await Promise.all([
        base44.entities.Recipe.filter({ active: true }, "name", 500).catch(() => []),
        base44.entities.Product.filter({ active: true }, "name", 500).catch(() => []),
      ]);
      setRows(recs); setProducts(prods);
    } catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => !search || (r.name || "").toLowerCase().includes(search.toLowerCase()) || (r.recipe_code || "").toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setDialog(true); };
  const openEdit = (r) => { setForm({ ...EMPTY, ...r }); setEditing(r); setDialog(true); };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const ingredients = (form.ingredients || []).map(ing => ({ ...ing, total_cost: (ing.quantity || 0) * (ing.unit_cost || 0) }));
      const costTotal = ingredients.reduce((s, i) => s + (i.total_cost || 0), 0);
      const costPerUnit = form.yield_quantity > 0 ? costTotal / form.yield_quantity : 0;
      const history = editing?.history || [];
      history.push({ action: editing ? "edicao" : "criacao", date: new Date().toISOString(), user: user?.full_name || "Sistema" });

      if (editing) {
        await base44.entities.Recipe.update(editing.id, { ...form, ingredients, cost_total: costTotal, cost_per_unit: costPerUnit, history, version: (editing.version || 1) + 1 });
        await Core.audit({ audit_action: "update", module: "producao", entity_type: "Recipe", entity_id: editing.id, details: `Editou receita: ${form.name}` });
      } else {
        const count = rows.length + 1;
        const code = `REC-${String(count).padStart(3, "0")}`;
        const c = await base44.entities.Recipe.create({ ...form, recipe_code: code, ingredients, cost_total: costTotal, cost_per_unit: costPerUnit, history });
        await Core.audit({ audit_action: "create", module: "producao", entity_type: "Recipe", entity_id: c.id, details: `Criou receita: ${form.name} (${code})` });
      }
      toast({ title: "Sucesso!" });
      setDialog(false); load();
    } catch { toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const recalcCost = async (r) => {
    try { await PE.calculateRecipeCost(r.id); toast({ title: "Custo recalculado!" }); load(); }
    catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const addIngredient = () => setForm(f => ({ ...f, ingredients: [...(f.ingredients || []), { ingredient_id: "", product_id: "", name: "", quantity: 0, unit: "un", unit_cost: 0, total_cost: 0 }] }));
  const updateIngredient = (idx, key, val) => setForm(f => ({ ...f, ingredients: f.ingredients.map((it, i) => { if (i !== idx) return it; const u = { ...it, [key]: val }; if (key === "quantity" || key === "unit_cost") u.total_cost = (u.quantity || 0) * (u.unit_cost || 0); return u; }) }));
  const removeIngredient = (idx) => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));

  const columns = [
    { key: "recipe_code", label: "Código", render: r => <span className="font-medium text-neutral-900">{r.recipe_code || "—"}</span> },
    { key: "name", label: "Receita", render: r => <span className="font-medium text-neutral-900">{r.name}</span> },
    { key: "production_center", label: "Centro", render: r => <span className="text-xs capitalize text-neutral-500">{(r.production_center || "geral").replace(/_/g, " ")}</span> },
    { key: "yield_quantity", label: "Rendimento", render: r => `${r.yield_quantity} ${r.yield_unit || "un"}` },
    { key: "ingredients", label: "Ingredientes", render: r => (r.ingredients || []).length },
    { key: "cost_total", label: "Custo Total", render: r => brl(r.cost_total) },
    { key: "cost_per_unit", label: "Custo/Un", render: r => <span className="font-medium">{brl(r.cost_per_unit)}</span> },
    { key: "preparation_time", label: "Tempo", render: r => r.preparation_time ? `${r.preparation_time}min` : "—" },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "actions", label: "", render: r => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => recalcCost(r)} title="Recalcular custo"><Calculator className="h-4 w-4 text-blue-600" /></Button>
        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("receitas.csv", filtered)}>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /></Button>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova Receita</Button>
      </Toolbar>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhuma receita" emptyDescription="Crie receitas para padronizar a produção." />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Receita</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto">
            <FormField label="Nome *" className="col-span-2"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></FormField>
            <FormField label="Centro de Produção"><select className={SEL} value={form.production_center} onChange={e => setForm({ ...form, production_center: e.target.value })}>{CENTERS.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}</select></FormField>
            <FormField label="Categoria"><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></FormField>
            <FormField label="Produto Resultante"><select className={SEL} value={form.product_id} onChange={e => { const p = products.find(x => x.id === e.target.value); setForm({ ...form, product_id: e.target.value, product_name: p?.name, yield_unit: p?.unit || form.yield_unit }); }}><option value="">Selecione...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></FormField>
            <FormField label="Rendimento"><Input type="number" step="0.01" value={form.yield_quantity} onChange={e => setForm({ ...form, yield_quantity: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Unidade"><Input value={form.yield_unit} onChange={e => setForm({ ...form, yield_unit: e.target.value })} /></FormField>
            <FormField label="Tempo de Preparo (min)"><Input type="number" value={form.preparation_time} onChange={e => setForm({ ...form, preparation_time: parseInt(e.target.value) || 0 })} /></FormField>
            <FormField label="Temperatura" className="col-span-2"><Input value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })} /></FormField>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-neutral-500">INGREDIENTES</span><Button variant="outline" size="sm" onClick={addIngredient} className="gap-1 h-7 text-xs"><Plus className="h-3.5 w-3.5" />Adicionar</Button></div>
              {(form.ingredients || []).map((it, i) => (
                <div key={i} className="grid grid-cols-12 items-center gap-1 mb-1">
                  <Input value={it.name} onChange={e => updateIngredient(i, "name", e.target.value)} placeholder="Ingrediente" className="col-span-5 h-8 text-xs" list="products-list" />
                  <datalist id="products-list">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
                  <Input type="number" step="0.01" value={it.quantity} onChange={e => updateIngredient(i, "quantity", parseFloat(e.target.value) || 0)} placeholder="Qtd" className="col-span-2 h-8 text-xs" />
                  <Input value={it.unit} onChange={e => updateIngredient(i, "unit", e.target.value)} placeholder="Un" className="col-span-1 h-8 text-xs" />
                  <Input type="number" step="0.01" value={it.unit_cost} onChange={e => updateIngredient(i, "unit_cost", parseFloat(e.target.value) || 0)} placeholder="Custo" className="col-span-2 h-8 text-xs" />
                  <span className="col-span-1 text-right text-xs font-medium text-neutral-700">{brl(it.total_cost)}</span>
                  <button onClick={() => removeIngredient(i)} className="col-span-1 flex justify-center text-neutral-400 hover:text-rose-500">✕</button>
                </div>
              ))}
              {(form.ingredients || []).length === 0 && <p className="py-2 text-center text-xs text-neutral-400">Nenhum ingrediente.</p>}
            </div>
            <FormField label="Modo de Preparo" className="col-span-2"><Textarea value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} rows={3} /></FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}