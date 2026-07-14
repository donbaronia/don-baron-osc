import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/coreEngine";
import { Core as DBCore } from "@/lib/donBaronCore";
import { brl, todayStr } from "@/lib/financialCenter";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import FormField from "@/components/financial/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Check, Pencil, Ban, FileText, ExternalLink, Eye } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { isImageFile, isPDFFile, getCategoryEmoji } from "@/lib/documentUtils";
import MarkAsPaidDialog from "@/components/documentos/MarkAsPaidDialog";

const SEL = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const METHODS = [
  { v: "pix", l: "PIX" }, { v: "dinheiro", l: "Dinheiro" }, { v: "transferencia", l: "Transferência" },
  { v: "boleto", l: "Boleto" }, { v: "cartao_credito", l: "Cartão Crédito" }, { v: "cartao_debito", l: "Cartão Débito" }, { v: "outros", l: "Outros" },
];
const EMPTY = { description: "", supplier_name: "", category: "", cost_center_name: "", amount: 0, document_number: "", issue_date: "", due_date: "", payment_method: "pix", bank: "", pix_key: "", barcode: "", notes: "", status: "pendente" };

export default function ContasPagar() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [docMap, setDocMap] = useState({});
  const [paidDialog, setPaidDialog] = useState({ open: false, payment: null, doc: null });

  const load = async () => {
    setLoading(true);
    try {
      const [payments, docs] = await Promise.all([
        base44.entities.Payment.list("-due_date", 300),
        base44.entities.DBDocument.filter({ category: { $in: ["boleto", "comprovante_pix", "nota_fiscal", "recibo"] } }, "-created_date", 200),
      ]);
      setRows(payments);
      const map = {};
      docs.forEach(d => { if (d.id) map[d.id] = d; });
      // também indexa por payment.document_id
      payments.forEach(p => { if (p.document_id && map[p.document_id]) { /* ok */ } });
      setDocMap(map);
    } catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const getDocFor = (r) => (r.document_id && docMap[r.document_id]) || null;

  const filtered = rows.filter(r => (tab === "todos" || r.status === tab) && (!search || (r.description || "").toLowerCase().includes(search.toLowerCase()) || (r.supplier_name || "").toLowerCase().includes(search.toLowerCase())));

  const openCreate = () => { setForm(EMPTY); setEditing(null); setDialogOpen(true); };
  const openEdit = (r) => { setForm({ ...EMPTY, ...r }); setEditing(r); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.description || !form.amount) { toast({ title: "Erro", description: "Descrição e valor são obrigatórios", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editing) {
        await DBCore.update("Payment", editing.id, { ...form, version: (editing.version || 1) + 1 }, { module: "financeiro" });
        await Core.audit({ audit_action: "update", module: "financeiro", entity_type: "Payment", entity_id: editing.id, details: `Editou: ${form.description}` });
      } else {
        const result = await DBCore.save("Payment", form, { module: "financeiro" });
        await Core.audit({ audit_action: "create", module: "financeiro", entity_type: "Payment", entity_id: result.id, details: `Criou: ${form.description} - ${brl(form.amount)}` });
      }
      toast({ title: "Salvo com sucesso", description: `${form.description} — persistência confirmada pelo banco (read-back OK).` });
      setDialogOpen(false); load();
    } catch (e) { toast({ title: "Falha ao salvar", description: e.message, variant: "destructive" }); }
    setSaving(false);
  };

  const openPaidDialog = (r) => {
    setPaidDialog({ open: true, payment: r, doc: getDocFor(r) });
  };
  const onPaid = () => {
    setPaidDialog({ open: false, payment: null, doc: null });
    load();
  };

  const cancel = async (r) => {
    try {
      await DBCore.update("Payment", r.id, { status: "cancelado" }, { module: "financeiro" });
      await Core.audit({ audit_action: "reject", module: "financeiro", entity_type: "Payment", entity_id: r.id, details: `Cancelou: ${r.description}` });
      toast({ title: "Cancelado", description: `${r.description} — confirmação do banco recebida.` });
      load();
    } catch (e) { toast({ title: "Falha ao cancelar", description: e.message, variant: "destructive" }); }
  };

  const columns = [
    { key: "description", label: "Descrição", render: r => <span className="font-medium text-neutral-900">{r.description}</span> },
    { key: "supplier_name", label: "Fornecedor" },
    { key: "category", label: "Categoria" },
    { key: "amount", label: "Valor", render: r => <span className="font-medium">{brl(r.amount)}</span> },
    { key: "due_date", label: "Vencimento", render: r => r.due_date ? new Date(r.due_date).toLocaleDateString("pt-BR") : "—" },
    { key: "payment_method", label: "Forma", render: r => (r.payment_method || "").replace(/_/g, " ") },
    { key: "doc", label: "Boleto", render: r => {
      const doc = getDocFor(r);
      if (!doc && !r.attachment_url) return <span className="text-muted-foreground text-xs">—</span>;
      const url = doc?.file_url || r.attachment_url;
      return (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-primary hover:bg-secondary transition-colors" title="Abrir documento em nova aba">
          {isImageFile(doc?.file_type, url) ? <Eye className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
          <span className="max-w-[80px] truncate">{doc?.title || "Ver boleto"}</span>
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      );
    }},
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "actions", label: "", render: r => (
      <div className="flex items-center gap-1">
        {r.status === "pendente" && <Button variant="ghost" size="icon" onClick={() => openPaidDialog(r)} title="Marcar pago"><Check className="h-4 w-4 text-emerald-600" /></Button>}
        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
        {r.status === "pendente" && <Button variant="ghost" size="icon" onClick={() => cancel(r)}><Ban className="h-4 w-4 text-rose-600" /></Button>}
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("contas_pagar.csv", filtered)}>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo</Button>
      </Toolbar>
      <div className="flex gap-2 flex-wrap">
        {[{ v: "todos", l: "Todos" }, { v: "pendente", l: "Pendentes" }, { v: "pago", l: "Pagos" }, { v: "cancelado", l: "Cancelados" }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)} className={`rounded-full px-3 py-1 text-xs font-medium ${tab === t.v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>{t.l}</button>
        ))}
      </div>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhuma conta a pagar" emptyDescription="Crie um novo lançamento para começar." />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Conta a Pagar</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto">
            <FormField label="Descrição *" className="col-span-2"><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></FormField>
            <FormField label="Fornecedor"><Input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} /></FormField>
            <FormField label="Categoria"><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></FormField>
            <FormField label="Centro de Custo"><Input value={form.cost_center_name} onChange={e => setForm({ ...form, cost_center_name: e.target.value })} /></FormField>
            <FormField label="Valor *"><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Data Emissão"><Input type="date" value={form.issue_date || ""} onChange={e => setForm({ ...form, issue_date: e.target.value })} /></FormField>
            <FormField label="Vencimento"><Input type="date" value={form.due_date || ""} onChange={e => setForm({ ...form, due_date: e.target.value })} /></FormField>
            <FormField label="Forma de Pagamento"><select className={SEL} value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>{METHODS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}</select></FormField>
            <FormField label="Banco"><Input value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })} /></FormField>
            <FormField label="Chave PIX"><Input value={form.pix_key} onChange={e => setForm({ ...form, pix_key: e.target.value })} /></FormField>
            <FormField label="Código de Barras" className="col-span-2"><Input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} /></FormField>
            <FormField label="Observações" className="col-span-2"><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></FormField>
            <FormField label="Status"><select className={SEL} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="parcial">Parcial</option><option value="cancelado">Cancelado</option></select></FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MarkAsPaidDialog
        open={paidDialog.open}
        onClose={() => setPaidDialog({ open: false, payment: null, doc: null })}
        payment={paidDialog.payment}
        document={paidDialog.doc}
        onPaid={onPaid}
      />
    </div>
  );
}