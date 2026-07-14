import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { IE, brl, todayStr } from "@/lib/inventoryEngine";
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
import { Plus, RefreshCw, ClipboardCheck, Check, AlertTriangle } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { useAuth } from "@/lib/AuthContext";

const SEL = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const INV_TYPES = [
  { v: "completo", l: "Geral" },
  { v: "rotativo", l: "Rotativo" },
  { v: "parcial", l: "Parcial" },
  { v: "por_categoria", l: "Por Categoria" },
  { v: "por_localizacao", l: "Por Localização" },
  { v: "por_fornecedor", l: "Por Fornecedor" },
];

export default function InventoryCount() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);
  const [countDialog, setCountDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ inventory_type: "completo", filter_category: "", filter_location: "", notes: "" });
  const [countForm, setCountForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [invs, prods, stks] = await Promise.all([
        base44.entities.Inventory.filter({ deleted_at: null }, "-inventory_date", 100).catch(() => []),
        base44.entities.Product.filter({ active: true }, "name", 500).catch(() => []),
        base44.entities.Stock.filter({ deleted_at: null }, "product_name", 500).catch(() => []),
      ]);
      setRows(invs); setProducts(prods); setStocks(stks);
    } catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => !search || (r.inventory_code || "").toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setForm({ inventory_type: "completo", filter_category: "", filter_location: "", notes: "" }); setEditing(null); setDialog(true); };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const count = rows.length + 1;
      const code = `INV-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`;
      // Pre-popular itens com base no filtro
      let items = [];
      let filteredStocks = [...stocks];
      if (form.inventory_type === "por_categoria" && form.filter_category) {
        filteredStocks = stocks.filter(s => products.find(p => p.id === s.product_id)?.category === form.filter_category);
      } else if (form.inventory_type === "por_localizacao" && form.filter_location) {
        filteredStocks = stocks.filter(s => (s.physical_location || "").includes(form.filter_location));
      }

      items = filteredStocks.map(s => {
        const product = products.find(p => p.id === s.product_id);
        return {
          product_id: s.product_id,
          name: s.product_name,
          counted_quantity: 0,
          system_quantity: s.quantity || 0,
          difference: 0,
          unit_cost: s.average_cost || 0,
          total_difference: 0,
          reason: "",
        };
      });

      const c = await base44.entities.Inventory.create({
        ...form,
        inventory_code: code,
        inventory_date: todayStr(),
        responsible_name: user?.full_name || "Sistema",
        counted_by: user?.full_name || "Sistema",
        items,
        total_items: items.length,
        total_value_system: filteredStocks.reduce((s, st) => s + (st.total_value || 0), 0),
        status: "em_andamento",
      });
      await Core.audit({ audit_action: "create", module: "estoque", entity_type: "Inventory", entity_id: c.id, details: `Criou inventário: ${code}` });
      toast({ title: "Inventário criado!" });
      setDialog(false); load();
    } catch { toast({ title: "Erro", description: "Falha ao criar", variant: "destructive" }); }
    setSaving(false);
  };

  const openCount = (inv) => {
    setCountForm({ ...inv });
    setCountDialog(true);
  };

  const updateCounted = (idx, val) => {
    setCountForm(f => ({
      ...f,
      items: f.items.map((it, i) => {
        if (i !== idx) return it;
        const diff = val - (it.system_quantity || 0);
        return { ...it, counted_quantity: val, difference: diff, total_difference: diff * (it.unit_cost || 0) };
      }),
    }));
  };

  const handleSaveCount = async (approve = false) => {
    setSaving(true);
    try {
      const items = countForm.items || [];
      const divergenceCount = items.filter(it => it.difference !== 0).length;
      const totalDiff = items.reduce((s, it) => s + (it.total_difference || 0), 0);
      const totalValueCounted = items.reduce((s, it) => s + (it.counted_quantity || 0) * (it.unit_cost || 0), 0);

      const updates = {
        items,
        divergence_count: divergenceCount,
        total_difference: totalDiff,
        total_value_counted: totalValueCounted,
        status: approve ? "concluido" : "em_andamento",
        approval_status: approve ? "aprovado" : "pendente",
        approved_by: approve ? user?.full_name : null,
        approved_at: approve ? new Date().toISOString() : null,
      };

      await base44.entities.Inventory.update(countForm.id, { ...updates, version: (countForm.version || 1) + 1 });

      // Se aprovado, gerar movimentos de ajuste automaticamente via Inventory Engine
      if (approve) {
        for (const item of items.filter(it => it.difference !== 0)) {
          const isPositive = item.difference > 0;
          await IE.processMovement({
            product_id: item.product_id,
            product_name: item.name,
            movement_type: "inventario",
            quantity: Math.abs(item.difference),
            unit: "un",
            unit_cost: item.unit_cost || 0,
            reason: `Ajuste de inventário ${countForm.inventory_code}`,
            responsible_name: user?.full_name || "Sistema",
            origin_type: "Inventory",
            origin_id: countForm.id,
          }).catch(() => {});
        }
        await Core.audit({ audit_action: "confirm", module: "estoque", entity_type: "Inventory", entity_id: countForm.id, details: `Aprovou inventário: ${countForm.inventory_code} — ${divergenceCount} divergências` });
      }

      toast({ title: approve ? "Inventário aprovado e ajustado!" : "Contagem salva!" });
      setCountDialog(false); load();
    } catch (e) { toast({ title: "Erro", description: e.message || "Falha ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const columns = [
    { key: "inventory_code", label: "Código", render: r => <span className="font-medium text-neutral-900">{r.inventory_code}</span> },
    { key: "inventory_type", label: "Tipo", render: r => <span className="capitalize text-xs text-neutral-500">{(r.inventory_type || "completo").replace(/_/g, " ")}</span> },
    { key: "inventory_date", label: "Data", render: r => r.inventory_date ? new Date(r.inventory_date).toLocaleDateString("pt-BR") : "—" },
    { key: "total_items", label: "Itens" },
    { key: "divergence_count", label: "Divergências", render: r => r.divergence_count > 0 ? <span className="text-rose-600 font-medium">{r.divergence_count}</span> : <span className="text-emerald-600">0</span> },
    { key: "total_difference", label: "Diferença Total", render: r => <span className={r.total_difference < 0 ? "text-rose-600" : "text-neutral-900"}>{brl(r.total_difference)}</span> },
    { key: "approval_status", label: "Aprovação", render: r => <StatusBadge status={r.approval_status} /> },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "actions", label: "", render: r => r.status !== "concluido" && r.status !== "cancelado" ? <Button variant="ghost" size="sm" onClick={() => openCount(r)} className="gap-1"><ClipboardCheck className="h-4 w-4 text-blue-600" /> Contar</Button> : null },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("inventarios.csv", filtered)}>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /></Button>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo Inventário</Button>
      </Toolbar>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhum inventário" emptyDescription="Crie um inventário para conferir o estoque físico." />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Inventário</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <FormField label="Tipo de Inventário" className="col-span-2"><select className={SEL} value={form.inventory_type} onChange={e => setForm({ ...form, inventory_type: e.target.value })}>{INV_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</select></FormField>
            {form.inventory_type === "por_categoria" && <FormField label="Categoria" className="col-span-2"><Input value={form.filter_category} onChange={e => setForm({ ...form, filter_category: e.target.value })} /></FormField>}
            {form.inventory_type === "por_localizacao" && <FormField label="Localização" className="col-span-2"><Input value={form.filter_location} onChange={e => setForm({ ...form, filter_location: e.target.value })} /></FormField>}
            <FormField label="Observações" className="col-span-2"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></FormField>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button><Button onClick={handleCreate} disabled={saving}>{saving ? "Criando..." : "Criar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={countDialog} onOpenChange={setCountDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Contagem — {countForm?.inventory_code}</DialogTitle></DialogHeader>
          {countForm && (
            <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
                <div className="text-sm"><span className="text-neutral-500">Itens: </span><span className="font-medium">{countForm.total_items}</span></div>
                <div className="text-sm"><span className="text-neutral-500">Divergências: </span><span className="font-medium text-rose-600">{(countForm.items || []).filter(it => it.difference !== 0).length}</span></div>
                <div className="text-sm"><span className="text-neutral-500">Diferença: </span><span className="font-medium">{brl((countForm.items || []).reduce((s, it) => s + (it.total_difference || 0), 0))}</span></div>
              </div>
              <div className="space-y-1">
                {(countForm.items || []).map((it, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-neutral-100 p-2">
                    <span className="col-span-5 text-sm text-neutral-700">{it.name}</span>
                    <div className="col-span-2 text-xs text-neutral-500 text-center">Sistema: {it.system_quantity}</div>
                    <Input type="number" step="0.01" value={it.counted_quantity} onChange={e => updateCounted(i, parseFloat(e.target.value) || 0)} className="col-span-2 h-8 text-xs" placeholder="Qtd física" />
                    <div className="col-span-3 text-right">
                      {it.difference === 0
                        ? <span className="text-xs text-emerald-600">✓ OK</span>
                        : <span className={`text-xs font-medium ${it.difference < 0 ? "text-rose-600" : "text-amber-600"}`}>{it.difference > 0 ? `+${it.difference}` : it.difference} ({brl(it.total_difference)})</span>}
                    </div>
                  </div>
                ))}
                {(!countForm.items || countForm.items.length === 0) && <p className="py-4 text-center text-xs text-neutral-400">Nenhum item neste inventário.</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCountDialog(false)}>Fechar</Button>
            <Button variant="secondary" onClick={() => handleSaveCount(false)} disabled={saving}>{saving ? "Salvando..." : "Salvar Contagem"}</Button>
            <Button onClick={() => handleSaveCount(true)} disabled={saving} className="gap-2"><Check className="h-4 w-4" /> Aprovar e Ajustar Estoque</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}