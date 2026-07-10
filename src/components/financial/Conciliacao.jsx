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
import { Plus, Pencil, Check } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

const SEL = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const SOURCES = [{ v: "pix", l: "PIX" }, { v: "ted", l: "TED" }, { v: "doc", l: "DOC" }, { v: "cartao", l: "Cartão" }, { v: "dinheiro", l: "Dinheiro" }, { v: "ifood", l: "iFood" }, { v: "mercado_pago", l: "Mercado Pago" }, { v: "pagbank", l: "PagBank" }, { v: "stone", l: "Stone" }, { v: "cielo", l: "Cielo" }, { v: "rede", l: "Rede" }, { v: "outros", l: "Outros" }];
const EMPTY = { conciliation_date: "", source: "pix", reference: "", expected_value: 0, actual_value: 0, difference: 0, status: "pendente", notes: "" };

export default function Conciliacao() {
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
    try { setRows(await base44.entities.Conciliation.list("-conciliation_date", 200)); }
    catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => !search || (r.reference || "").toLowerCase().includes(search.toLowerCase()) || (r.source || "").toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setForm(EMPTY); setEditing(null); setDialogOpen(true); };
  const openEdit = (r) => { setForm({ ...EMPTY, ...r }); setEditing(r); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.conciliation_date || !form.source) { toast({ title: "Erro", description: "Data e origem são obrigatórias", variant: "destructive" }); return; }
    const diff = (form.actual_value || 0) - (form.expected_value || 0);
    const status = diff === 0 ? "conciliado" : "divergente";
    setSaving(true);
    try {
      const payload = { ...form, difference: diff, status: form.status === "pendente" ? status : form.status };
      if (editing) {
        await base44.entities.Conciliation.update(editing.id, { ...payload, version: (editing.version || 1) + 1 });
        await Core.audit({ audit_action: "update", module: "financeiro", entity_type: "Conciliation", entity_id: editing.id, details: `Editou conciliação: ${form.reference}` });
      } else {
        const c = await base44.entities.Conciliation.create(payload);
        await Core.audit({ audit_action: "create", module: "financeiro", entity_type: "Conciliation", entity_id: c.id, details: `Criou conciliação: ${form.reference}` });
      }
      toast({ title: "Sucesso!", description: status === "divergente" ? "Divergência detectada" : "Conciliado" });
      setDialogOpen(false); load();
    } catch { toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const markConciliado = async (r) => {
    try { await base44.entities.Conciliation.update(r.id, { status: "conciliado" }); await Core.audit({ audit_action: "confirm", module: "financeiro", entity_type: "Conciliation", entity_id: r.id, details: `Conciliou: ${r.reference}` }); load(); }
    catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const columns = [
    { key: "conciliation_date", label: "Data", render: r => r.conciliation_date ? new Date(r.conciliation_date).toLocaleDateString("pt-BR") : "—" },
    { key: "source", label: "Origem", render: r => <span className="font-medium capitalize">{(r.source || "").replace(/_/g, " ")}</span> },
    { key: "reference", label: "Referência" },
    { key: "expected_value", label: "Esperado", render: r => brl(r.expected_value) },
    { key: "actual_value", label: "Realizado", render: r => brl(r.actual_value) },
    { key: "difference", label: "Diferença", render: r => <span className={r.difference !== 0 ? "font-medium text-rose-600" : "text-neutral-500"}>{brl(r.difference)}</span> },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "actions", label: "", render: r => (
      <div className="flex items-center gap-1">
        {r.status !== "conciliado" && <Button variant="ghost" size="icon" onClick={() => markConciliado(r)} title="Conciliar"><Check className="h-4 w-4 text-emerald-600" /></Button>}
        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("conciliacao.csv", filtered)}>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo</Button>
      </Toolbar>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhuma conciliação" emptyDescription="Registre conciliações para identificar divergências." />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Conciliação</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <FormField label="Data *"><Input type="date" value={form.conciliation_date || ""} onChange={e => setForm({ ...form, conciliation_date: e.target.value })} /></FormField>
            <FormField label="Origem *"><select className={SEL} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>{SOURCES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}</select></FormField>
            <FormField label="Referência" className="col-span-2"><Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></FormField>
            <FormField label="Valor Esperado"><Input type="number" value={form.expected_value} onChange={e => setForm({ ...form, expected_value: parseFloat(e.target.value) || 0 })} /></FormField>
            <FormField label="Valor Realizado"><Input type="number" value={form.actual_value} onChange={e => setForm({ ...form, actual_value: parseFloat(e.target.value) || 0 })} /></FormField>
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