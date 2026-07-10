import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/coreEngine";
import { brl } from "@/lib/financialCenter";
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
const EMPTY = { week: "", gross_value: 0, fees: 0, campaigns: 0, chargebacks: 0, refunds: 0, net_value: 0, expected_date: "", receipt_date: "", difference: 0, status: "pendente", notes: "" };

export default function IFoodReceipts() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRows(await base44.entities.IFoodReceipt.list("-created_date", 100)); }
    catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => !search || (r.week || "").toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setForm(EMPTY); setEditing(null); setDialogOpen(true); };
  const openEdit = (r) => { setForm({ ...EMPTY, ...r }); setEditing(r); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.week) { toast({ title: "Erro", description: "Semana é obrigatória", variant: "destructive" }); return; }
    const net = (form.gross_value || 0) - (form.fees || 0) - (form.chargebacks || 0) - (form.refunds || 0) + (form.campaigns || 0);
    setSaving(true);
    try {
      const payload = { ...form, net_value: net };
      if (editing) {
        await base44.entities.IFoodReceipt.update(editing.id, { ...payload, version: (editing.version || 1) + 1 });
        await Core.audit({ audit_action: "update", module: "financeiro", entity_type: "IFoodReceipt", entity_id: editing.id, details: `Editou iFood: ${form.week}` });
      } else {
        const c = await base44.entities.IFoodReceipt.create(payload);
        await Core.audit({ audit_action: "create", module: "financeiro", entity_type: "IFoodReceipt", entity_id: c.id, details: `Criou iFood: ${form.week} - ${brl(net)}` });
      }
      toast({ title: "Sucesso!", description: editing ? "Atualizado" : "Criado" });
      setDialogOpen(false); load();
    } catch { toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const markReceived = async (r) => {
    try {
      const diff = (r.receipt_date ? 0 : 0); // difference calculated on save
      await base44.entities.IFoodReceipt.update(r.id, { status: "recebido", receipt_date: new Date().toISOString().slice(0, 10), difference: r.difference || 0 });
      await Core.audit({ audit_action: "confirm", module: "financeiro", entity_type: "IFoodReceipt", entity_id: r.id, details: `Recebido iFood: ${r.week}` });
      toast({ title: "Recebido!", description: r.week }); load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const cancel = async (r) => {
    try { await base44.entities.IFoodReceipt.update(r.id, { status: "cancelado" }); await Core.audit({ audit_action: "reject", module: "financeiro", entity_type: "IFoodReceipt", entity_id: r.id, details: `Cancelou iFood: ${r.week}` }); load(); }
    catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const columns = [
    { key: "week", label: "Semana", render: r => <span className="font-medium text-neutral-900">{r.week}</span> },
    { key: "gross_value", label: "Bruto", render: r => brl(r.gross_value) },
    { key: "fees", label: "Taxas", render: r => brl(r.fees) },
    { key: "campaigns", label: "Campanhas", render: r => brl(r.campaigns) },
    { key: "refunds", label: "Reembolsos", render: r => brl(r.refunds) },
    { key: "net_value", label: "Líquido", render: r => <span className="font-medium">{brl(r.net_value)}</span> },
    { key: "expected_date", label: "Previsto", render: r => r.expected_date ? new Date(r.expected_date).toLocaleDateString("pt-BR") : "—" },
    { key: "receipt_date", label: "Realizado", render: r => r.receipt_date ? new Date(r.receipt_date).toLocaleDateString("pt-BR") : "—" },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "actions", label: "", render: r => (
      <div className="flex items-center gap-1">
        {r.status === "pendente" && <Button variant="ghost" size="icon" onClick={() => markReceived(r)}><Check className="h-4 w-4 text-emerald-600" /></Button>}
        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
        {r.status === "pendente" && <Button variant="ghost" size="icon" onClick={() => cancel(r)}><Ban className="h-4 w-4 text-rose-600" /></Button>}
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("ifood.csv", filtered)}>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo</Button>
      </Toolbar>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhum recebimento iFood" emptyDescription="Registre os recebimentos semanais do iFood." />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Recebimento iFood</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto">
            <FormField label="Semana *" className="col-span-2"><Input value={form.week} placeholder="ex: 2026-W28" onChange={e => setForm({ ...form, week: e.target.value })} /></FormField>
            <FormField label="Valor Bruto"><Input type="number" value={form.gross_value} onChange={e => setForm({ ...form, gross_value: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Taxas"><Input type="number" value={form.fees} onChange={e => setForm({ ...form, fees: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Campanhas"><Input type="number" value={form.campaigns} onChange={e => setForm({ ...form, campaigns: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Estornos"><Input type="number" value={form.chargebacks} onChange={e => setForm({ ...form, chargebacks: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Reembolsos"><Input type="number" value={form.refunds} onChange={e => setForm({ ...form, refunds: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Data Prevista"><Input type="date" value={form.expected_date || ""} onChange={e => setForm({ ...form, expected_date: e.target.value })} /></FormField>
            <FormField label="Data Realizada"><Input type="date" value={form.receipt_date || ""} onChange={e => setForm({ ...form, receipt_date: e.target.value })} /></FormField>
            <FormField label="Observações" className="col-span-2"><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></FormField>
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