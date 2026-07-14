import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/coreEngine";
import { PC, brl } from "@/lib/purchasingCenter";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import FormField from "@/components/financial/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trophy, Check, TrendingDown } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { useAuth } from "@/lib/AuthContext";

const SEL = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const EMPTY = { supplier_name: "", unit_price: 0, total_price: 0, freight: 0, delivery_days: 0, payment_terms: "", validity_date: "", min_quantity: 0, notes: "" };

export default function Quotations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [reqs, quotes, sups] = await Promise.all([
        base44.entities.PurchaseRequest.filter({ status: { $in: ["em_cotacao", "cotada"] }, deleted_at: null }, "-created_date", 100).catch(() => []),
        base44.entities.Quotation.list("-created_date", 300).catch(() => []),
        base44.entities.Supplier.filter({ active: true }, "-created_date", 500).catch(() => []),
      ]);
      setRequests(reqs); setRows(quotes); setSuppliers(sups);
      if (reqs.length > 0 && !selectedRequest) setSelectedRequest(reqs[0].id);
    } catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const reqQuotes = rows.filter(q => q.request_id === selectedRequest && q.status !== "cancelada");
  const filtered = reqQuotes.filter(q => !search || (q.supplier_name || "").toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    const req = requests.find(r => r.id === selectedRequest);
    setForm({ ...EMPTY, product_name: req?.product_name, quantity: req?.quantity, unit: req?.unit });
    setEditing(null); setDialog(true);
  };
  const openEdit = (r) => { setForm({ ...EMPTY, ...r }); setEditing(r); setDialog(true); };

  const handleSave = async () => {
    if (!form.supplier_name || !form.unit_price) { toast({ title: "Erro", description: "Fornecedor e preço são obrigatórios", variant: "destructive" }); return; }
    const total = (form.unit_price * (form.quantity || 1)) + (form.freight || 0);
    setSaving(true);
    try {
      const supplier = suppliers.find(s => s.name === form.supplier_name);
      const payload = { ...form, total_price: total, request_id: selectedRequest, supplier_overall_score: supplier?.overall_score || 0 };
      if (editing) {
        await base44.entities.Quotation.update(editing.id, { ...payload, version: (editing.version || 1) + 1 });
        await Core.audit({ audit_action: "update", module: "compras", entity_type: "Quotation", entity_id: editing.id, details: `Editou cotação: ${form.supplier_name}` });
      } else {
        const c = await base44.entities.Quotation.create({ ...payload, created_by_name: user?.full_name || "Sistema" });
        await Core.audit({ audit_action: "create", module: "compras", entity_type: "Quotation", entity_id: c.id, details: `Criou cotação: ${form.supplier_name} - ${brl(total)}` });
      }
      toast({ title: "Sucesso!" });
      setDialog(false); load();
    } catch { toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const setWinner = async (q) => {
    try {
      await base44.entities.Quotation.updateMany({ request_id: selectedRequest, is_winner: true }, { $set: { is_winner: false, status: "perdedora" } });
      await base44.entities.Quotation.update(q.id, { is_winner: true, status: "vencedora" });
      const req = requests.find(r => r.id === selectedRequest);
      if (req) await base44.entities.PurchaseRequest.update(req.id, { status: "cotada", quotation_count: reqQuotes.length });
      await Core.audit({ audit_action: "confirm", module: "compras", entity_type: "Quotation", entity_id: q.id, details: `Cotação vencedora: ${q.supplier_name} - ${brl(q.total_price)}` });
      toast({ title: "Vencedora selecionada!" });
      load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const comparison = PC.compareQuotations(reqQuotes);
  const columns = [
    { key: "supplier_name", label: "Fornecedor", render: r => (
      <div className="flex items-center gap-2">
        <span className="font-medium text-neutral-900">{r.supplier_name}</span>
        {r.is_winner && <Trophy className="h-4 w-4 text-amber-500" />}
      </div>
    ) },
    { key: "unit_price", label: "Preço Unit.", render: r => brl(r.unit_price) },
    { key: "total_price", label: "Total", render: r => <span className="font-medium">{brl(r.total_price)}</span> },
    { key: "freight", label: "Frete", render: r => brl(r.freight) },
    { key: "delivery_days", label: "Prazo", render: r => `${r.delivery_days || 0} dias` },
    { key: "payment_terms", label: "Pagamento" },
    { key: "validity_date", label: "Validade", render: r => r.validity_date ? new Date(r.validity_date).toLocaleDateString("pt-BR") : "—" },
    { key: "supplier_overall_score", label: "Score", render: r => r.supplier_overall_score ? `${r.supplier_overall_score}/100` : "—" },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "actions", label: "", render: r => (
      <div className="flex items-center gap-1">
        {!r.is_winner && <Button variant="ghost" size="icon" onClick={() => setWinner(r)} title="Selecionar vencedora"><Trophy className="h-4 w-4 text-amber-500" /></Button>}
        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("cotacoes.csv", filtered)}>
        <Button size="sm" onClick={openCreate} className="gap-2" disabled={!selectedRequest}><Plus className="h-4 w-4" /> Nova Cotação</Button>
      </Toolbar>

      <div className="flex gap-2 flex-wrap">
        {requests.map(r => (
          <button key={r.id} onClick={() => setSelectedRequest(r.id)} className={`rounded-full px-3 py-1 text-xs font-medium ${selectedRequest === r.id ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>
            {r.request_code} — {r.product_name}
          </button>
        ))}
        {requests.length === 0 && <p className="text-sm text-neutral-400">Nenhuma solicitação em cotação. Converta uma solicitação pendente.</p>}
      </div>

      {comparison.best && reqQuotes.length > 1 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingDown className="h-5 w-5 text-emerald-600" /><h3 className="text-sm font-semibold text-emerald-700">Melhor Opção (Preço + Prazo + Score)</h3></div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-900">{comparison.best.supplier_name}</span>
            <span className="text-sm text-neutral-600">{brl(comparison.best.total_price)} · {comparison.best.delivery_days || 0} dias · Score {comparison.best.supplier_overall_score || 0}/100</span>
          </div>
          <p className="mt-1 text-xs text-emerald-600">Economia vs cotação mais cara: {brl(comparison.ranking[comparison.ranking.length - 1]?.total_price - comparison.cheapest?.total_price || 0)}</p>
        </div>
      )}

      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhuma cotação" emptyDescription="Selecione uma solicitação e crie cotações de fornecedores." />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Cotação</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <FormField label="Fornecedor *" className="col-span-2">
              <Input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} list="suppliers-list" />
              <datalist id="suppliers-list">{suppliers.map(s => <option key={s.id} value={s.name} />)}</datalist>
            </FormField>
            <FormField label="Preço Unit. *"><Input type="number" step="0.01" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Frete"><Input type="number" step="0.01" value={form.freight} onChange={e => setForm({ ...form, freight: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Prazo de Entrega (dias)"><Input type="number" value={form.delivery_days} onChange={e => setForm({ ...form, delivery_days: parseInt(e.target.value) || 0 })} /></FormField>
            <FormField label="Qtd. Mínima"><Input type="number" value={form.min_quantity} onChange={e => setForm({ ...form, min_quantity: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Condição de Pagamento"><Input value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} /></FormField>
            <FormField label="Validade da Proposta"><Input type="date" value={form.validity_date || ""} onChange={e => setForm({ ...form, validity_date: e.target.value })} /></FormField>
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