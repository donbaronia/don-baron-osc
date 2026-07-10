import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { exportToCsv } from "@/lib/exportCsv";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, Plus, ExternalLink } from "lucide-react";

const CATEGORIES = [
  { value: "nota_fiscal", label: "Nota Fiscal" },
  { value: "boleto", label: "Boleto" },
  { value: "planilha", label: "Planilha" },
  { value: "contrato", label: "Contrato" },
  { value: "recibo", label: "Recibo" },
  { value: "relatorio", label: "Relatório" },
  { value: "outro", label: "Outro" },
];

export default function Documentos() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", category: "outro", supplier: "", document_date: "", notes: "", file_url: "" });

  const load = () => {
    base44.entities.DBDocument.list("-created_date", 300).then((r) => {
      setRows(r);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, file_url, title: f.title || file.name }));
    setUploading(false);
  };

  const save = async () => {
    if (!form.title) return;
    setSaving(true);
    await base44.entities.DBDocument.create({ ...form, status: form.file_url ? "processado" : "pendente" });
    await logAudit({ user, module: "Documentos", action: "Criou documento", details: form.title });
    setSaving(false);
    setOpen(false);
    setForm({ title: "", category: "outro", supplier: "", document_date: "", notes: "", file_url: "" });
    load();
  };

  const filtered = rows.filter((r) => !search || (r.title || "").toLowerCase().includes(search.toLowerCase()) || (r.supplier || "").toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: "title", label: "Documento", render: (r) => <span className="font-medium text-neutral-900">{r.title}</span> },
    { key: "category", label: "Categoria", render: (r) => CATEGORIES.find((c) => c.value === r.category)?.label || r.category },
    { key: "supplier", label: "Fornecedor", render: (r) => r.supplier || "—" },
    { key: "document_date", label: "Data", render: (r) => (r.document_date ? new Date(r.document_date).toLocaleDateString("pt-BR") : "—") },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "file", label: "Arquivo",
      render: (r) => r.file_url ? (
        <a href={r.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700">
          Abrir <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : "—",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        emoji="📄"
        title="Centro de Documentos"
        subtitle="Repositório único: notas fiscais, boletos, planilhas, contratos e relatórios."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-neutral-900 hover:bg-neutral-800"><Plus className="h-4 w-4" /> Novo Documento</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Novo Documento</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Título</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: NF Fornecedor XYZ" className="mt-1.5" />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Fornecedor</Label>
                    <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Data</Label>
                    <Input type="date" value={form.document_date} onChange={(e) => setForm({ ...form, document_date: e.target.value })} className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={2} />
                </div>
                <div>
                  <Label>Arquivo (PDF, imagem, Excel, CSV, XML)</Label>
                  <label className="mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-600 hover:border-neutral-400">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Enviando..." : form.file_url ? "Arquivo anexado ✓" : "Selecionar arquivo"}
                    <input type="file" className="hidden" onChange={handleFile} />
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={save} disabled={saving || !form.title} className="bg-neutral-900 hover:bg-neutral-800">{saving ? "Salvando..." : "Salvar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="mt-6 space-y-4">
        <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("documentos.csv", filtered)} placeholder="Pesquisar documento..." />
        <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhum documento" emptyDescription="Envie notas, boletos e planilhas — a IA poderá interpretá-los futuramente." />
      </div>
    </div>
  );
}