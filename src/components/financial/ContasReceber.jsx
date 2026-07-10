import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/coreEngine";
import { brl, todayStr } from "@/lib/financialCenter";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import FormField from "@/components/financial/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Check, Pencil, Ban } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

const SEL = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const ORIGINS = [{ v: "balcao", l: "Balcão" }, { v: "ifood", l: "iFood" }, { v: "site", l: "Site" }, { v: "delivery", l: "Delivery" }, { v: "marketplace", l: "Marketplace" }, { v: "outros", l: "Outros" }];
const METHODS = [{ v: "pix", l: "PIX" }, { v: "dinheiro", l: "Dinheiro" }, { v: "transferencia", l: "Transferência" }, { v: "boleto", l: "Boleto" }, { v: "cartao_credito", l: "Cartão Crédito" }, { v: "cartao_debito", l: "Cartão Débito" }, { v: "outros", l: "Outros" }];
const EMPTY = { description: "", customer_name: "", origin: "balcao", amount: 0, expected_date: "", receipt_date: "", fees: 0, discounts: 0, commissions: 0, payment_method: "pix", status: "pendente", notes: "" };

export default function ContasReceber() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRows(await base44.entities.Receipt.list("-expected_date", 300)); }
    catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => (tab === "todos" || r.status === tab) && (!search || (r.description || "").toLowerCase().includes(search.toLowerCase()) || (r.customer_name || "").toLowerCase().includes(search.toLowerCase())));

  const openCreate = () => { setForm(EMPTY); setEditing(null); setDialogOpen(true); };
  const openEdit = (r) => { setForm({ ...EMPTY, ...r }); setEditing(r); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.description || !form.amount) { toast({ title: "Erro", description: "Descrição e valor são obrigatórios", variant: "destructive" }); return; }
    const net = (form.amount || 0) - (form.fees || 0) - (form.discounts || 0) - (form.commissions || 0);
    setSaving(true);
    try {
      const payload = { ...form, net_amount: net };
      if (editing) {
        await base44.entities.Receipt.update(editing.id, { ...payload, version: (editing.version || 1) + 1 });
        await Core.audit({ audit_action: "update", module: "financeiro", entity_type: "Receipt", entity_id: editing.id, details: `Editou: ${form.description}` });
      } else {
        const c = await base44.entities.Receipt.create(payload);
        await Core.audit({ audit_action: "create", module: "financeiro", entity_type: "Receipt", entity_id: c.id, details: `Criou: ${form.description} - ${brl(form.amount)}` });
      }
      toast({ title: "Sucesso!", description: editing ? "Atualizado" : "Criado" });
      setDialogOpen(false); load();
    } catch { toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const markReceived = async (r) => {
    try {
      await base44.entities.Receipt.update(r.id, { status: "recebido", receipt_date: todayStr() });
      await Core.audit({ audit_action: "confirm", module: "financeiro", entity_type: "Receipt", entity_id: r.id, details: `Recebeu: ${r.description} - ${brl(r.amount)}` });
      toast({ title: "Recebido!", description: r.description }); load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const cancel = async (r) => {
    try { await base44.entities.Receipt.update(r.id, { status: "cancelado" }); await Core.audit({ audit_action: "reject", module: "financeiro", entity_type: "Receipt", entity_id: r.id, details: `Cancelou: ${r.description}` }); load(); }
    catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const columns = [
    { key: "description", label: "Descrição", render: r => <span className="font-medium text-neutral-900">{r.description}</span> },
    { key: "customer_name", label: "Cliente" },
    { key: "origin", label: "Origem", render: r => (r.origin || "").replace(/_/g, " ") },
    { key: "amount", label: "Valor", render: r => <span className="font-medium">{brl(r.amount)}</span> },
    { key: "net_amount", label: "Líquido", render: r => brl(r.net_amount) },
    { key: "expected_date", label: "Previsão", render: r => r.expected_date ? new Date(r.expected_date).toLocaleDateString("pt-BR") : "—" },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "actions", label: "", render: r => (
      <div className="flex items-center gap-1">
        {r.status === "pendente" && <Button variant="ghost" size="icon" onClick={() => markReceived(r)} title="Recebido"><Check className="h-4 w-4 text-emerald-600" /></Button>}
        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
        {r.status === "pendente" && <Button variant="ghost" size="icon" onClick={() => cancel(r)}><Ban className="h-4 w-4 text-rose-600" /></Button>}
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("contas_receber.csv", filtered)}>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo</Button>
      </Toolbar>
      <div className="flex gap-2 flex-wrap">
        {[{ v: "todos", l: "Todos" }, { v: "pendente", l: "Pendentes" }, { v: "recebido", l: "Recebidos" }, { v: "cancelado", l: "Cancelados" }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)} className={`rounded-full px-3 py-1 text-xs font-medium ${tab === t.v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>{t.l}</button>
        ))}
      </div>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhuma conta a receber" emptyDescription="Crie um novo lançamento para começar." />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Conta a Receber</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto">
            <FormField label="Descrição *" className="col-span-2"><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></FormField>
            <FormField label="Cliente"><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></FormField>
            <FormField label="Origem"><select className={SEL} value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })}>{ORIGINS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select></FormField>
            <FormField label="Valor *"><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Forma de Pagamento"><select className={SEL} value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>{METHODS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}</select></FormField>
            <FormField label="Previsão"><Input type="date" value={form.expected_date || ""} onChange={e => setForm({ ...form, expected_date: e.target.value })} /></FormField>
            <FormField label="Recebimento"><Input type="date" value={form.receipt_date || ""} onChange={e => setForm({ ...form, receipt_date: e.target.value })} /></FormField>
            <FormField label="Taxas"><Input type="number" value={form.fees} onChange={e => setForm({ ...form, fees: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Descontos"><Input type="number" value={form.discounts} onChange={e => setForm({ ...form, discounts: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Comissões"><Input type="number" value={form.commissions} onChange={e => setForm({ ...form, commissions: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Observações" className="col-span-2"><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></FormField>
            <FormField label="Status"><select className={SEL} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="pendente">Pendente</option><option value="recebido">Recebido</option><option value="parcial">Parcial</option><option value="cancelado">Cancelado</option></select></FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}