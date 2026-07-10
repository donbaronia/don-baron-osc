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
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Check, PackageCheck, RefreshCw, AlertTriangle, Search } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const SEL = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function ReceiptManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRows(await base44.entities.Purchase.filter({ status: { $in: ["aprovada", "enviada", "em_transito", "recebida", "conferida"] } }, "-order_date", 200)); }
    catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => !search || (r.supplier || "").toLowerCase().includes(search.toLowerCase()) || (r.purchase_code || "").toLowerCase().includes(search.toLowerCase()));

  const openReceipt = (r) => {
    const items = (r.items || []).map(it => ({ ...it, received_qty: it.quantity || 0, difference: 0 }));
    setForm({ ...r, received_items: items, received_date: todayStr(), receipt_notes: "", conference_status: "pendente" });
    setEditing(r); setDialog(true);
  };

  const updateReceivedQty = (idx, val) => {
    setForm(f => ({
      ...f,
      received_items: f.received_items.map((it, i) => {
        if (i !== idx) return it;
        const diff = val - (it.quantity || 0);
        return { ...it, received_qty: val, difference: diff };
      }),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const divergences = (form.received_items || []).filter(it => it.difference !== 0);
      const hasDivergence = divergences.length > 0;
      const receivedDate = form.received_date || todayStr();
      const orderDate = form.order_date || receivedDate;
      const leadTime = Math.ceil((new Date(receivedDate) - new Date(orderDate)) / 86400000);

      await base44.entities.Purchase.update(editing.id, {
        received_items: form.received_items,
        missing_items: divergences.filter(d => d.difference < 0),
        received_date: receivedDate,
        received_by: user?.full_name || "Sistema",
        receipt_notes: form.receipt_notes,
        conference_status: hasDivergence ? "divergente" : "conferido",
        divergences,
        lead_time_days: leadTime,
        status: hasDivergence ? "recebida" : "conferida",
        version: (editing.version || 1) + 1,
      });

      await Core.audit({ audit_action: "confirm", module: "compras", entity_type: "Purchase", entity_id: editing.id, details: `Recebimento: ${editing.purchase_code} — ${hasDivergence ? "com divergências" : "conferido"}` });

      // Recalcular score do fornecedor
      if (editing.supplier_id) {
        await import("@/lib/purchasingCenter").then(m => m.PC.recalculateSupplierScore(editing.supplier_id));
      }

      toast({ title: hasDivergence ? "Recebido com divergências" : "Recebido e conferido!", description: editing.purchase_code });
      setDialog(false); load();
    } catch { toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const columns = [
    { key: "purchase_code", label: "Código", render: r => <span className="font-medium text-neutral-900">{r.purchase_code || "—"}</span> },
    { key: "supplier", label: "Fornecedor" },
    { key: "total_amount", label: "Valor", render: r => brl(r.total_amount) },
    { key: "expected_delivery_date", label: "Previsto", render: r => r.expected_delivery_date ? new Date(r.expected_delivery_date).toLocaleDateString("pt-BR") : "—" },
    { key: "received_date", label: "Recebido", render: r => r.received_date ? new Date(r.received_date).toLocaleDateString("pt-BR") : "—" },
    { key: "conference_status", label: "Conferência", render: r => <StatusBadge status={r.conference_status || "pendente"} /> },
    { key: "lead_time_days", label: "Lead Time", render: r => r.lead_time_days ? `${r.lead_time_days}d` : "—" },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "actions", label: "", render: r => (
      r.status === "aprovada" || r.status === "enviada" || r.status === "em_transito"
        ? <Button variant="ghost" size="sm" onClick={() => openReceipt(r)} className="gap-1"><PackageCheck className="h-4 w-4 text-blue-600" /> Receber</Button>
        : r.status === "recebida"
        ? <Button variant="ghost" size="sm" onClick={() => openReceipt(r)} className="gap-1"><AlertTriangle className="h-4 w-4 text-amber-600" /> Conferir</Button>
        : null
    ) },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch}>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /> Atualizar</Button>
      </Toolbar>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhum recebimento pendente" emptyDescription="Pedidos aprovados aparecerão aqui para recebimento." />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Recebimento — {form?.purchase_code}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div><p className="text-xs font-semibold text-neutral-500">Fornecedor</p><p className="text-sm text-neutral-900">{form.supplier}</p></div>
                <div><p className="text-xs font-semibold text-neutral-500">Data Recebimento</p><Input type="date" value={form.received_date} onChange={e => setForm({ ...form, received_date: e.target.value })} /></div>
                <div><p className="text-xs font-semibold text-neutral-500">Conferência</p><StatusBadge status={form.conference_status} /></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500 mb-2">ITENS — confira as quantidades recebidas</p>
                <div className="space-y-1">
                  {form.received_items?.map((it, i) => (
                    <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-neutral-100 p-2">
                      <span className="col-span-5 text-sm text-neutral-700">{it.name}</span>
                      <div className="col-span-2 text-xs text-neutral-500">Esperado: {it.quantity}</div>
                      <Input type="number" step="0.01" value={it.received_qty} onChange={e => updateReceivedQty(i, parseFloat(e.target.value) || 0)} className="col-span-2 h-8 text-xs" />
                      <div className="col-span-3 text-right">
                        {it.difference === 0
                          ? <span className="text-xs text-emerald-600">✓ OK</span>
                          : <span className={`text-xs font-medium ${it.difference < 0 ? "text-rose-600" : "text-amber-600"}`}>{it.difference > 0 ? `+${it.difference}` : it.difference} (divergência)</span>}
                      </div>
                    </div>
                  ))}
                  {(!form.received_items || form.received_items.length === 0) && <p className="py-2 text-center text-xs text-neutral-400">Nenhum item.</p>}
                </div>
              </div>
              <FormField label="Observações do Recebimento"><Textarea value={form.receipt_notes || ""} onChange={e => setForm({ ...form, receipt_notes: e.target.value })} rows={2} /></FormField>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2"><Check className="h-4 w-4" /> {saving ? "Salvando..." : "Confirmar Recebimento"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}