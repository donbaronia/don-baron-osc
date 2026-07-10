import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { logAudit } from "@/lib/audit";
import {
  formatBRL, formatDate, formatDateTime, getCategoryLabel, getCategoryEmoji,
  isImageFile, isPDFFile,
} from "@/lib/documentUtils";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Download, ZoomIn, ZoomOut, Save, User, Clock } from "lucide-react";

export default function DocumentViewer({ open, onClose, document: doc }) {
  const { user } = useAuth();
  const [zoom, setZoom] = useState(1);
  const [annotations, setAnnotations] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (open && doc) {
      setAnnotations(doc.annotations || "");
      setZoom(1);
    }
  }, [open, doc]);

  if (!doc) return null;

  const saveAnnotations = async () => {
    setSavingNotes(true);
    await base44.entities.DBDocument.update(doc.id, { annotations });
    await logAudit({ user, module: "Documentos", action: "Adicionou anotação", details: doc.title });
    setSavingNotes(false);
  };

  const auditRows = [
    { label: "Enviado por", value: doc.sent_by, date: doc.sent_at },
    { label: "Confirmado por", value: doc.confirmed_by, date: doc.confirmed_at },
    { label: "Rejeitado por", value: doc.rejected_by, date: null },
  ].filter((r) => r.value);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden p-0">
        <DialogHeader className="border-b border-neutral-200 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <span>{getCategoryEmoji(doc.category)}</span>
            <span className="truncate">{doc.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[calc(92vh-140px)] grid-cols-1 overflow-hidden lg:grid-cols-3">
          {/* File preview */}
          <div className="flex flex-col border-r border-neutral-200 bg-neutral-50 p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-neutral-500">Visualização</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-200"><ZoomOut className="h-4 w-4" /></button>
                <span className="w-10 text-center text-xs text-neutral-500">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-200"><ZoomIn className="h-4 w-4" /></button>
                <a href={doc.file_url} target="_blank" rel="noreferrer" download className="ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-200">
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto rounded-xl border border-neutral-200 bg-white p-2">
              {isImageFile(doc.file_type, doc.file_url) ? (
                <img src={doc.file_url} alt={doc.title} style={{ transform: `scale(${zoom})`, transformOrigin: "center" }} className="max-h-full max-w-full object-contain transition-transform" />
              ) : isPDFFile(doc.file_type, doc.file_url) ? (
                <iframe src={doc.file_url} title={doc.title} className="h-full w-full" style={{ minHeight: "400px" }} />
              ) : (
                <div className="flex flex-col items-center gap-2 py-12 text-neutral-400">
                  <span className="text-4xl">📎</span>
                  <p className="text-sm">Pré-visualização não disponível</p>
                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-amber-600 hover:underline">Abrir arquivo</a>
                </div>
              )}
            </div>
          </div>

          {/* Metadata + Audit + Annotations */}
          <div className="overflow-y-auto p-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-neutral-500">Status</p>
                <div className="mt-1.5"><StatusBadge status={doc.status} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-neutral-500">Categoria</p>
                  <p className="mt-1 text-sm text-neutral-900">{getCategoryEmoji(doc.category)} {getCategoryLabel(doc.category)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-neutral-500">Valor</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">{doc.value ? formatBRL(doc.value) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-neutral-500">Fornecedor</p>
                  <p className="mt-1 text-sm text-neutral-900">{doc.supplier || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-neutral-500">CNPJ</p>
                  <p className="mt-1 text-sm text-neutral-900">{doc.cnpj || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-neutral-500">Nº Documento</p>
                  <p className="mt-1 text-sm text-neutral-900">{doc.document_number || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-neutral-500">Data</p>
                  <p className="mt-1 text-sm text-neutral-900">{formatDate(doc.document_date)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-neutral-500">Vencimento</p>
                  <p className="mt-1 text-sm text-neutral-900">{formatDate(doc.due_date)}</p>
                </div>
              </div>

              {doc.tags?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-neutral-500">Tags</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {doc.tags.map((t) => <span key={t} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{t}</span>)}
                  </div>
                </div>
              )}

              {/* Audit */}
              <div className="rounded-xl border border-neutral-200 p-4">
                <p className="mb-3 text-xs font-semibold uppercase text-neutral-500">Auditoria</p>
                <div className="space-y-2">
                  {auditRows.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-neutral-600">
                      <User className="h-3.5 w-3.5 text-neutral-400" />
                      <span className="font-medium text-neutral-700">{r.label}:</span>
                      <span>{r.value}</span>
                      {r.date && <span className="text-neutral-400">· {formatDateTime(r.date)}</span>}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-xs text-neutral-600">
                    <Clock className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Recebido em {formatDateTime(doc.sent_at || doc.created_date)}</span>
                  </div>
                </div>
              </div>

              {/* Annotations */}
              <div>
                <Label className="text-xs">Anotações</Label>
                <Textarea value={annotations} onChange={(e) => setAnnotations(e.target.value)} className="mt-1.5" rows={3} placeholder="Adicione anotações sobre este documento..." />
                <Button onClick={saveAnnotations} disabled={savingNotes} size="sm" className="mt-2 gap-2 bg-neutral-900 hover:bg-neutral-800">
                  <Save className="h-3.5 w-3.5" /> {savingNotes ? "Salvando..." : "Salvar Anotação"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}