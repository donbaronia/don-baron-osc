import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/coreEngine";
import { brl, todayStr } from "@/lib/purchasingCenter";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import FormField from "@/components/financial/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Check, PackageCheck, Ban } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { useAuth } from "@/lib/AuthContext";

const SEL = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const METHODS = [{ v: "pix", l: "PIX" }, { v: "boleto", l: "Boleto" }, { v: "transferencia", l: "Transferência" }, { v: "cartao_credito", l: "Cartão Crédito" }, { v: "dinheiro", l: "Dinheiro" }, { v: "prazo", l: "A Prazo" }];
const EMPTY = { supplier: "", description: "", items: [], total_amount: 0, discounts: 0, freight: 0, taxes: 0, payment_method: "", payment_terms: "", cost_center_name: "", priority: "media", order_date: todayStr(), expected_delivery_date: "", notes: "" };

export default function PurchaseOrders() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("todos");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRows(await base44.entities.Purchase.list("-order_date", 300)); }
    catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => (tab === "todos" || r.status === tab) && (!search || (r.supplier || "").toLowerCase().includes(search.toLowerCase()) || (r.purchase_code || "").toLowerCase().includes(search.toLowerCase())));

  const openCreate = () => { setForm({ ...EMPTY, order_date: todayStr(), requester_name: user?.full_name || "" }); setEditing(null); setDialog(true); };
  const openEdit = (r) => { setForm({ ...EMPTY, ...r }); setEditing(r); setDialog(true); };

  const handleSave = async () => {
    if (!form.supplier) { toast({ title: "Erro", description: "Fornecedor é obrigatório", variant: "destructive" }); return; }
    const total = (form.items || []).reduce((s, i) => s + (i.total || 0), 0) + (form.freight || 0) + (form.taxes || 0) - (form.discounts || 0);
    setSaving(true);
    try {
      const payload = { ...form, total_amount: total };
      if (editing) {
        await base44.entities.Purchase.update(editing.id, { ...payload, version: (editing.version || 1) + 1 });
        await Core.audit({ audit_action: "update", module: "compras", entity_type: "Purchase", entity_id: editing.id, details: `Editou pedido: ${form.supplier}` });
      } else {
        const count = rows.length + 1;
        const code = `PED-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`;
        const c = await base44.entities.Purchase.create({ ...payload, purchase_code: code, requester_name: user?.full_name || "Sistema" });
        await Core.audit({ audit_action: "create", module: "compras", entity_type: "Purchase", entity_id: c.id, details: `Criou pedido: ${code} - ${form.supplier} - ${brl(total)}` });
      }
      toast({ title: "Sucesso!" });
      setDialog(false); load();
    } catch { toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const approve = async (r) => {
    try {
      await base44.entities.Purchase.update(r.id, { status: "aprovada", approved_by: user?.full_name, approved_at: new Date().toISOString() });
      await Core.audit({ audit_action: "confirm", module: "compras", entity_type: "Purchase", entity_id: r.id, details: `Aprovou pedido: ${r.purchase_code}` });
      toast({ title: "Pedido aprovado!" }); load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const cancel = async (r) => {
    try { await base44.entities.Purchase.update(r.id, { status: "cancelada" }); await Core.audit({ audit_action: "reject", module: "compras", entity_type: "Purchase", entity_id: r.id, details: `Cancelou: ${r.purchase_code}` }); load(); }
    catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const addItem = () => setForm(f => ({ ...f, items: [...(f.items || []), { name: "", quantity: 0, unit: "un", unit_price: 0, total: 0 }] }));
  const updateItem = (idx, key, val) => setForm(f => ({ ...f, items: f.items.map((it, i) => { if (i !== idx) return it; const u = { ...it, [key]: val }; if (key === "quantity" || key === "unit_price") u.total = (u.quantity || 0) * (u.unit_price || 0); return u; }) }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const columns = [
    { key: "purchase_code", label: "Código", render: r => <span className="font-medium text-neutral-900">{r.purchase_code || "—"}</span> },
    { key: "supplier", label: "Fornecedor" },
    { key: "total_amount", label: "Valor", render: r => <span className="font-medium">{brl(r.total_amount)}</span> },
    { key: "order_date", label: "Data", render: r => r.order_date ? new Date(r.order_date).toLocaleDateString("pt-BR") : "—" },
    { key: "expected_delivery_date", label: "Previsto", render: r => r.expected_delivery_date ? new Date(r.expected_delivery_date).toLocaleDateString("pt-BR") : "—" },
    { key: "priority", label: "Prioridade", render: r => <StatusBadge status={r.priority} /> },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "actions", label: "", render: r => (
      <div className="flex items-center gap-1">
        {r.status === "pendente_aprovacao" && <Button variant="ghost" size="icon" onClick={() => approve(r)} title="Aprovar"><Check className="h-4 w-4 text-emerald-600" /></Button>}
        {r.status === "aprovada" && <Button variant="ghost" size="icon" title="Recebimento"><PackageCheck className="h-4 w-4 text-blue-600" /></Button>}
        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
        {r.status !== "cancelada" && r.status !== "recebida" && <Button variant="ghost" size="icon" onClick={() => cancel(r)}><Ban className="h-4 w-4 text-rose-600" /></Button>}
      </div>
    ) },
  ];

  const itemsTotal = (form.items || []).reduce((s, i) => s + (i.total || 0), 0);
  const grandTotal = itemsTotal + (form.freight || 0) + (form.taxes || 0) - (form.discounts || 0);

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("pedidos.csv", filtered)}>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo Pedido</Button>
      </Toolbar>
      <div className="flex gap-2 flex-wrap">
        {[{ v: "todos", l: "Todos" }, { v: "pendente_aprovacao", l: "Pendentes" }, { v: "aprovada", l: "Aprovados" }, { v: "recebida", l: "Recebidos" }, { v: "cancelada", l: "Cancelados" }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)} className={`rounded-full px-3 py-1 text-xs font-medium ${tab === t.v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>{t.l}</button>
        ))}
      </div>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhum pedido" emptyDescription="Crie um pedido de compra para começar." />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Pedido de Compra</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto">
            <FormField label="Fornecedor *" className="col-span-2"><Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></FormField>
            <FormField label="Descrição" className="col-span-2"><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></FormField>
            <FormField label="Centro de Custo"><Input value={form.cost_center_name} onChange={e => setForm({ ...form, cost_center_name: e.target.value })} /></FormField>
            <FormField label="Prioridade"><select className={SEL} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></FormField>
            <FormField label="Data do Pedido"><Input type="date" value={form.order_date || ""} onChange={e => setForm({ ...form, order_date: e.target.value })} /></FormField>
            <FormField label="Entrega Prevista"><Input type="date" value={form.expected_delivery_date || ""} onChange={e => setForm({ ...form, expected_delivery_date: e.target.value })} /></FormField>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-neutral-500">ITENS</span><Button variant="outline" size="sm" onClick={addItem} className="gap-1 h-7 text-xs"><Plus className="h-3.5 w-3.5" />Adicionar</Button></div>
              {(form.items || []).map((it, i) => (
                <div key={i} className="grid grid-cols-12 items-center gap-1 mb-1">
                  <Input value={it.name} onChange={e => updateItem(i, "name", e.target.value)} placeholder="Produto" className="col-span-5 h-8 text-xs" />
                  <Input type="number" step="0.01" value={it.quantity} onChange={e => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} placeholder="Qtd" className="col-span-2 h-8 text-xs" />
                  <Input type="number" step="0.01" value={it.unit_price} onChange={e => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)} placeholder="Vl. Unit" className="col-span-2 h-8 text-xs" />
                  <span className="col-span-2 text-right text-xs font-medium text-neutral-700">{brl(it.total)}</span>
                  <button onClick={() => removeItem(i)} className="col-span-1 flex justify-center text-neutral-400 hover:text-rose-500">✕</button>
                </div>
              ))}
              {(form.items || []).length === 0 && <p className="py-2 text-center text-xs text-neutral-400">Nenhum item.</p>}
            </div>
            <FormField label="Descontos"><Input type="number" step="0.01" value={form.discounts} onChange={e => setForm({ ...form, discounts: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Frete"><Input type="number" step="0.01" value={form.freight} onChange={e => setForm({ ...form, freight: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Impostos"><Input type="number" step="0.01" value={form.taxes} onChange={e => setForm({ ...form, taxes: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Forma de Pagamento"><select className={SEL} value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>{METHODS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}</select></FormField>
            <FormField label="Observações" className="col-span-2"><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></FormField>
            <div className="col-span-2 flex justify-end border-t pt-2">
              <span className="text-sm font-semibold text-neutral-900">Total: {brl(grandTotal)}</span>
            </div>
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