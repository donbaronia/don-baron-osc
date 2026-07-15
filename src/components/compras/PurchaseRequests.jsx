import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/coreEngine";
import { brl } from "@/lib/purchasingCenter";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import FormField from "@/components/financial/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2, ArrowRight } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { useAuth } from "@/lib/AuthContext";

import { BaronSelect } from "@/design-system";
const EMPTY = { product_name: "", quantity: 0, unit: "un", reason: "", priority: "media", cost_center_name: "", due_date: "", notes: "" };

export default function PurchaseRequests() {
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
    try { setRows(await base44.entities.PurchaseRequest.list("-created_date", 300)); }
    catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => (tab === "todos" || r.status === tab) && (!search || (r.product_name || "").toLowerCase().includes(search.toLowerCase())));

  const openCreate = () => { setForm({ ...EMPTY, requester_name: user?.full_name || "" }); setEditing(null); setDialog(true); };
  const openEdit = (r) => { setForm({ ...EMPTY, ...r }); setEditing(r); setDialog(true); };

  const handleSave = async () => {
    if (!form.product_name || !form.quantity) { toast({ title: "Erro", description: "Produto e quantidade são obrigatórios", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.PurchaseRequest.update(editing.id, { ...form, version: (editing.version || 1) + 1 });
        await Core.audit({ audit_action: "update", module: "compras", entity_type: "PurchaseRequest", entity_id: editing.id, details: `Editou solicitação: ${form.product_name}` });
      } else {
        const count = rows.length + 1;
        const code = `SOL-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`;
        const c = await base44.entities.PurchaseRequest.create({ ...form, request_code: code, requester_name: user?.full_name || "Sistema" });
        await Core.audit({ audit_action: "create", module: "compras", entity_type: "PurchaseRequest", entity_id: c.id, details: `Criou solicitação: ${form.product_name} (${code})` });
      }
      toast({ title: "Sucesso!" });
      setDialog(false); load();
    } catch { toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const remove = async (r) => {
    try { await base44.entities.PurchaseRequest.update(r.id, { deleted_at: new Date().toISOString(), deleted_by: user?.full_name, status: "cancelada" }); await Core.audit({ audit_action: "delete", module: "compras", entity_type: "PurchaseRequest", entity_id: r.id, details: `Cancelou: ${r.product_name}` }); load(); }
    catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const convertToQuotation = (r) => {
    base44.entities.PurchaseRequest.update(r.id, { status: "em_cotacao" });
    load();
  };

  const columns = [
    { key: "request_code", label: "Código", render: r => <span className="font-medium text-neutral-900">{r.request_code || "—"}</span> },
    { key: "product_name", label: "Produto" },
    { key: "quantity", label: "Qtd", render: r => `${r.quantity} ${r.unit || ""}` },
    { key: "priority", label: "Prioridade", render: r => <StatusBadge status={r.priority} /> },
    { key: "requester_name", label: "Solicitante" },
    { key: "due_date", label: "Prazo", render: r => r.due_date ? new Date(r.due_date).toLocaleDateString("pt-BR") : "—" },
    { key: "quotation_count", label: "Cotações" },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "actions", label: "", render: r => (
      <div className="flex items-center gap-1">
        {r.status === "pendente" && <Button variant="ghost" size="icon" onClick={() => convertToQuotation(r)} title="Iniciar cotação"><ArrowRight className="h-4 w-4 text-blue-600" /></Button>}
        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
        {r.status !== "convertida" && <Button variant="ghost" size="icon" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>}
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("solicitacoes.csv", filtered)}>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova Solicitação</Button>
      </Toolbar>
      <div className="flex gap-2 flex-wrap">
        {[{ v: "todos", l: "Todos" }, { v: "pendente", l: "Pendentes" }, { v: "em_cotacao", l: "Em Cotação" }, { v: "aprovada", l: "Aprovadas" }, { v: "convertida", l: "Convertidas" }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)} className={`rounded-full px-3 py-1 text-xs font-medium ${tab === t.v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>{t.l}</button>
        ))}
      </div>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhuma solicitação" emptyDescription="Crie uma solicitação de compra para começar." />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Solicitação de Compra</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <FormField label="Produto *" className="col-span-2"><Input value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} /></FormField>
            <FormField label="Quantidade *"><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Unidade"><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></FormField>
            <FormField label="Prioridade"><BaronSelect value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={[{ value: "baixa", label: "Baixa" }, { value: "media", label: "Média" }, { value: "alta", label: "Alta" }, { value: "critica", label: "Crítica" }]} /></FormField>
            <FormField label="Centro de Custo"><Input value={form.cost_center_name} onChange={e => setForm({ ...form, cost_center_name: e.target.value })} /></FormField>
            <FormField label="Prazo"><Input type="date" value={form.due_date || ""} onChange={e => setForm({ ...form, due_date: e.target.value })} /></FormField>
            <FormField label="Motivo" className="col-span-2"><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></FormField>
            <FormField label="Observações" className="col-span-2"><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></FormField>
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