import React, { useEffect, useState } from "react";
import { CMV, brl } from "@/lib/cmvEngine";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormField from "@/components/financial/FormField";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Upload, Check, RefreshCw, FileSpreadsheet } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import DataTable from "@/components/shared/DataTable";
import Toolbar from "@/components/shared/Toolbar";
import StatusBadge from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/AuthContext";

const SEL = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const EMPTY = { week: "", period_start: "", period_end: "", gross_value: 0, fees: 0, commissions: 0, campaigns: 0, chargebacks: 0, refunds: 0, cancellations: 0, order_count: 0 };

export default function CMVIFoodImport() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const recs = await base44.entities.IFoodReceipt.filter({ deleted_at: { $exists: false } }, "-created_date", 500).catch(() => []);
    setRows(recs);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => !search || (r.week || "").toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setForm({ ...EMPTY, week: getWeekStr() }); setDialog(true); };

  const handleSave = async () => {
    if (!form.week) { toast({ title: "Erro", description: "Semana é obrigatória", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await CMV.importIFood(form);
      toast({ title: "Importação registrada!", description: "Aguardando conferência" });
      setDialog(false); load();
    } catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    setSaving(false);
  };

  const handleConfirm = async (id) => {
    try {
      await CMV.confirmIFood(id, user?.full_name);
      toast({ title: "Confirmado!", description: "CMV será recalculado" });
      load();
    } catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, file_url: res.file_url, file_type: file.name.split(".").pop() }));
      toast({ title: "Arquivo enviado" });
    } catch { toast({ title: "Erro no upload", variant: "destructive" }); }
  };

  const netPreview = (form.gross_value || 0) - (form.fees || 0) - (form.commissions || 0) - (form.chargebacks || 0) - (form.refunds || 0) - (form.cancellations || 0) + (form.campaigns || 0);

  const columns = [
    { key: "week", label: "Semana", render: r => <span className="font-medium text-neutral-900">{r.week}</span> },
    { key: "gross_value", label: "Bruto", render: r => brl(r.gross_value) },
    { key: "fees", label: "Taxas", render: r => brl((r.fees || 0) + (r.commissions || 0)) },
    { key: "campaigns", label: "Campanhas", render: r => brl(r.campaigns) },
    { key: "net_value", label: "Líquido", render: r => <span className="font-medium">{brl(r.net_value)}</span> },
    { key: "order_count", label: "Pedidos" },
    { key: "average_ticket", label: "Ticket Médio", render: r => brl(r.average_ticket) },
    { key: "confirmed", label: "Conf.", render: r => r.confirmed ? <span className="text-xs text-emerald-600">Sim</span> : <span className="text-xs text-amber-600">Não</span> },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "actions", label: "", render: r => !r.confirmed && <Button variant="ghost" size="icon" onClick={() => handleConfirm(r.id)} title="Confirmar"><Check className="h-4 w-4 text-emerald-600" /></Button> },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("ifood.csv", filtered)}>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /></Button>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Importar</Button>
      </Toolbar>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhuma importação" emptyDescription="Importe relatórios do iFood." />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Importar Relatório iFood</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto">
            <FormField label="Semana *"><Input value={form.week} onChange={e => setForm({ ...form, week: e.target.value })} placeholder="2026-W28" /></FormField>
            <FormField label="Arquivo"><input type="file" accept=".pdf,.xlsx,.csv" onChange={handleFile} className="text-sm" /></FormField>
            <FormField label="Período Início"><Input type="date" value={form.period_start} onChange={e => setForm({ ...form, period_start: e.target.value })} /></FormField>
            <FormField label="Período Fim"><Input type="date" value={form.period_end} onChange={e => setForm({ ...form, period_end: e.target.value })} /></FormField>
            <FormField label="Receita Bruta"><Input type="number" step="0.01" value={form.gross_value} onChange={e => setForm({ ...form, gross_value: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Taxas"><Input type="number" step="0.01" value={form.fees} onChange={e => setForm({ ...form, fees: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Comissões"><Input type="number" step="0.01" value={form.commissions} onChange={e => setForm({ ...form, commissions: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Campanhas"><Input type="number" step="0.01" value={form.campaigns} onChange={e => setForm({ ...form, campaigns: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Estornos"><Input type="number" step="0.01" value={form.chargebacks} onChange={e => setForm({ ...form, chargebacks: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Reembolsos"><Input type="number" step="0.01" value={form.refunds} onChange={e => setForm({ ...form, refunds: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Cancelamentos"><Input type="number" step="0.01" value={form.cancellations} onChange={e => setForm({ ...form, cancellations: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Nº Pedidos"><Input type="number" value={form.order_count} onChange={e => setForm({ ...form, order_count: parseInt(e.target.value) || 0 })} /></FormField>
            <div className="col-span-2 rounded-lg bg-neutral-50 p-3 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Receita Líquida:</span><span className="font-bold">{brl(netPreview)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Ticket Médio:</span><span className="font-medium">{form.order_count > 0 ? brl(netPreview / form.order_count) : "—"}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Importando..." : "Importar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getWeekStr() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const days = Math.floor((now - start) / 86400000);
  const week = Math.ceil((days + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}