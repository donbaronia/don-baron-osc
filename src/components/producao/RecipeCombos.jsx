import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { RE, brl } from "@/lib/recipeEngine";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import FormField from "@/components/financial/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, RefreshCw, Trash2, Package } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

const SEL = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function RecipeCombos() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", sale_price: 0, combo_items: [] });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [combos, recs] = await Promise.all([
      base44.entities.Recipe.filter({ is_combo: true, deleted_at: null }, "name", 500).catch(() => []),
      base44.entities.Recipe.filter({ active: true, is_combo: { $ne: true }, is_addition: { $ne: true }, deleted_at: null }, "name", 500).catch(() => []),
    ]);
    setRows(combos); setRecipes(recs);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => !search || (r.name || "").toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setForm({ name: "", description: "", sale_price: 0, combo_items: [] }); setEditing(null); setDialog(true); };
  const openEdit = (r) => { setForm({ name: r.name, description: r.description || "", sale_price: r.sale_price || 0, combo_items: (r.combo_items || []).map(i => ({ recipe_id: i.recipe_id, quantity: i.quantity })) }); setEditing(r); setDialog(true); };

  const addItem = () => setForm(f => ({ ...f, combo_items: [...(f.combo_items || []), { recipe_id: "", quantity: 1 }] }));
  const updateItem = (idx, key, val) => setForm(f => ({ ...f, combo_items: f.combo_items.map((it, i) => i === idx ? { ...it, [key]: val } : it) }));
  const removeItem = (idx) => setForm(f => ({ ...f, combo_items: f.combo_items.filter((_, i) => i !== idx) }));

  const calculateComboCost = () => {
    let total = 0;
    for (const item of (form.combo_items || [])) {
      const r = recipes.find(x => x.id === item.recipe_id);
      total += (r?.cost_per_unit || 0) * (item.quantity || 1);
    }
    return total;
  };

  const handleSave = async () => {
    if (!form.name || !form.combo_items || form.combo_items.length === 0) { toast({ title: "Erro", description: "Nome e itens são obrigatórios", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const combo_items = form.combo_items.map(item => {
        const r = recipes.find(x => x.id === item.recipe_id);
        return { recipe_id: item.recipe_id, quantity: item.quantity || 1 };
      });

      if (editing) {
        const items = [];
        let totalCost = 0;
        for (const item of combo_items) {
          const r = recipes.find(x => x.id === item.recipe_id);
          const cost = (r?.cost_per_unit || 0) * item.quantity;
          totalCost += cost;
          items.push({ recipe_id: item.recipe_id, name: r?.name, quantity: item.quantity, unit_cost: r?.cost_per_unit, total_cost: cost });
        }
        const grossProfit = form.sale_price - totalCost;
        await base44.entities.Recipe.update(editing.id, {
          name: form.name, description: form.description, sale_price: form.sale_price,
          combo_items: items, cost_total: totalCost, cost_per_unit: totalCost,
          gross_profit: grossProfit,
          margin_pct: form.sale_price > 0 ? (grossProfit / form.sale_price) * 100 : 0,
          markup: totalCost > 0 ? form.sale_price / totalCost : 0,
          cmv_pct: form.sale_price > 0 ? (totalCost / form.sale_price) * 100 : 0,
          version: (editing.version || 1) + 1,
        });
      } else {
        await RE.createCombo({ name: form.name, description: form.description, sale_price: form.sale_price, combo_items });
      }
      toast({ title: "Combo salvo!" });
      setDialog(false); load();
    } catch { toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const comboCost = calculateComboCost();
  const comboProfit = (form.sale_price || 0) - comboCost;
  const comboMargin = (form.sale_price || 0) > 0 ? (comboProfit / (form.sale_price || 0)) * 100 : 0;

  const columns = [
    { key: "recipe_code", label: "Código", render: r => <span className="font-medium text-neutral-900">{r.recipe_code}</span> },
    { key: "name", label: "Combo", render: r => <span className="font-medium text-neutral-900">{r.name}</span> },
    { key: "combo_items", label: "Itens", render: r => (r.combo_items || []).length },
    { key: "cost_total", label: "Custo", render: r => brl(r.cost_total) },
    { key: "sale_price", label: "Preço", render: r => <span className="font-medium">{brl(r.sale_price)}</span> },
    { key: "gross_profit", label: "Lucro", render: r => <span className="text-emerald-600 font-medium">{brl(r.gross_profit)}</span> },
    { key: "margin_pct", label: "Margem", render: r => `${(r.margin_pct || 0).toFixed(0)}%` },
    { key: "actions", label: "", render: r => <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button> },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("combos.csv", filtered)}>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /></Button>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo Combo</Button>
      </Toolbar>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhum combo" emptyDescription="Crie combos compostos por múltiplas receitas." />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Combo</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto">
            <FormField label="Nome *" className="col-span-2"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Combo Don Baron" /></FormField>
            <FormField label="Preço de Venda" className="col-span-2"><Input type="number" step="0.01" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Descrição" className="col-span-2"><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></FormField>

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-neutral-500">ITENS DO COMBO</span><Button variant="outline" size="sm" onClick={addItem} className="gap-1 h-7 text-xs"><Plus className="h-3.5 w-3.5" />Adicionar</Button></div>
              {(form.combo_items || []).map((item, i) => (
                <div key={i} className="grid grid-cols-12 items-center gap-1 mb-1">
                  <select className={`${SEL} col-span-8 h-8 text-xs`} value={item.recipe_id} onChange={e => updateItem(i, "recipe_id", e.target.value)}>
                    <option value="">Selecione...</option>
                    {recipes.map(r => <option key={r.id} value={r.id}>{r.name} — {brl(r.cost_per_unit)}</option>)}
                  </select>
                  <Input type="number" step="0.01" value={item.quantity} onChange={e => updateItem(i, "quantity", parseFloat(e.target.value) || 1)} className="col-span-3 h-8 text-xs" />
                  <button onClick={() => removeItem(i)} className="col-span-1 flex justify-center text-neutral-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {(form.combo_items || []).length === 0 && <p className="py-2 text-center text-xs text-neutral-400">Adicione receitas ao combo.</p>}
            </div>

            <div className="col-span-2 rounded-lg bg-neutral-50 p-3 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Custo Total:</span><span className="font-medium">{brl(comboCost)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Lucro:</span><span className="font-medium text-emerald-600">{brl(comboProfit)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Margem:</span><span className="font-medium">{comboMargin.toFixed(0)}%</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">CMV:</span><span className="font-medium">{form.sale_price > 0 ? `${((comboCost / form.sale_price) * 100).toFixed(0)}%` : "—"}</span></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}