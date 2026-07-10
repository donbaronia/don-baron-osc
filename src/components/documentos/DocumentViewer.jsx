import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Core } from "@/lib/coreEngine";
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
import { Input } from "@/components/ui/input";
import {
  Download, ZoomIn, ZoomOut, Save, User, Clock, AlertTriangle,
  TrendingUp, Copy, GitBranch, Sparkles, Tag, Plus, X, Link2,
} from "lucide-react";

const SEL = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1";

export default function DocumentViewer({ open, onClose, document: doc }) {
  const { user } = useAuth();
  const [zoom, setZoom] = useState(1);
  const [annotations, setAnnotations] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    if (open && doc) {
      setAnnotations(doc.annotations || "");
      setTags([...(doc.auto_tags || []), ...(doc.tags || [])]);
      setZoom(1);
      loadVersions(doc);
    }
  }, [open, doc]);

  const loadVersions = async (d) => {
    if (!d.parent_document_id && !(d.version_number > 1)) { setVersions([]); return; }
    const parentId = d.parent_document_id || d.id;
    const all = await base44.entities.DBDocument.filter(
      { $or: [{ id: parentId }, { parent_document_id: parentId }] },
      "-version_number",
      20
    ).catch(() => []);
    setVersions(all);
  };

  if (!doc) return null;

  const saveAnnotations = async () => {
    setSavingNotes(true);
    await base44.entities.DBDocument.update(doc.id, { annotations, edited_by: user?.full_name, edited_at: new Date().toISOString() });
    await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: "Adicionou anotacao" });
    setSavingNotes(false);
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    const updated = [...new Set([...tags, newTag.trim()])];
    setTags(updated);
    setNewTag("");
    await base44.entities.DBDocument.update(doc.id, { tags: updated.filter(t => !(doc.auto_tags || []).includes(t)) });
    await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Adicionou tag: ${newTag.trim()}` });
  };

  const removeTag = async (tag) => {
    const updated = tags.filter(t => t !== tag);
    setTags(updated);
    await base44.entities.DBDocument.update(doc.id, { tags: updated.filter(t => !(doc.auto_tags || []).includes(t)) });
  };

  const auditRows = [
    { label: "Enviado por", value: doc.sent_by, date: doc.sent_at },
    { label: "Confirmado por", value: doc.confirmed_by, date: doc.confirmed_at },
    { label: "Editado por", value: doc.edited_by, date: doc.edited_at },
    { label: "Rejeitado por", value: doc.rejected_by, date: null },
  ].filter((r) => r.value);

  const ia = doc.ia_analysis || {};
  const alerts = doc.alerts || [];
  const flow = doc.classification_flow || [];
  const related = doc.related_entities || [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden p-0">
        <DialogHeader className="border-b border-neutral-200 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <span>{getCategoryEmoji(doc.category)}</span>
            <span className="truncate">{doc.title}</span>
            {doc.version_number > 1 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                <GitBranch className="h-3 w-3" /> v{doc.version_number}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[calc(92vh-140px)] grid-cols-1 overflow-hidden lg:grid-cols-3">
          {/* File preview */}
          <div className="flex flex-col border-r border-neutral-200 bg-neutral-50 p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-neutral-500">Visualizacao</span>
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
                  <p className="text-sm">Pre-visualizacao nao disponivel</p>
                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-amber-600 hover:underline">Abrir arquivo</a>
                </div>
              )}
            </div>
          </div>

          {/* Right panel */}
          <div className="overflow-y-auto p-6">
            <div className="space-y-5">
              {/* Status + summary */}
              <div className="flex items-center gap-2">
                <StatusBadge status={doc.status} />
                {doc.duplicate_of && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                    <Copy className="h-3 w-3" /> Duplicata
                  </span>
                )}
              </div>

              {doc.ia_summary && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                    <span className="text-xs font-semibold uppercase text-violet-700">Resumo da IA</span>
                  </div>
                  <p className="text-xs text-neutral-700">{doc.ia_summary}</p>
                </div>
              )}

              {/* Alerts */}
              {alerts.length > 0 && (
                <div className="space-y-2">
                  {alerts.map((a, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg border p-2.5 ${a.severity === "urgent" ? "border-rose-200 bg-rose-50" : a.severity === "warning" ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"}`}>
                      <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${a.severity === "urgent" ? "text-rose-600" : a.severity === "warning" ? "text-amber-600" : "text-blue-600"}`} />
                      <span className={`text-xs ${a.severity === "urgent" ? "text-rose-700" : a.severity === "warning" ? "text-amber-700" : "text-blue-700"}`}>{a.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs font-semibold uppercase text-neutral-500">Categoria</p><p className="mt-1 text-sm text-neutral-900">{getCategoryEmoji(doc.category)} {getCategoryLabel(doc.category)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-neutral-500">Valor</p><p className="mt-1 text-sm font-semibold text-neutral-900">{doc.value ? formatBRL(doc.value) : "—"}</p></div>
                <div><p className="text-xs font-semibold uppercase text-neutral-500">Fornecedor</p><p className="mt-1 text-sm text-neutral-900">{doc.supplier || "—"}</p></div>
                <div><p className="text-xs font-semibold uppercase text-neutral-500">CNPJ</p><p className="mt-1 text-sm text-neutral-900">{doc.cnpj || "—"}</p></div>
                <div><p className="text-xs font-semibold uppercase text-neutral-500">Nº Documento</p><p className="mt-1 text-sm text-neutral-900">{doc.document_number || "—"}</p></div>
                <div><p className="text-xs font-semibold uppercase text-neutral-500">Chave NFe</p><p className="mt-1 text-sm text-neutral-900 truncate">{doc.chave_nota || "—"}</p></div>
                <div><p className="text-xs font-semibold uppercase text-neutral-500">Data</p><p className="mt-1 text-sm text-neutral-900">{formatDate(doc.document_date)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-neutral-500">Vencimento</p><p className="mt-1 text-sm text-neutral-900">{formatDate(doc.due_date)}</p></div>
              </div>

              {/* Classification flow */}
              {flow.length > 0 && (
                <div className="rounded-xl border border-neutral-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-neutral-500">Fluxo de Classificacao</p>
                  <div className="flex flex-wrap items-center gap-1">
                    {flow.map((s, i) => (
                      <React.Fragment key={i}>
                        <span className="rounded-lg bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">{s.step}</span>
                        {i < flow.length - 1 && <span className="text-neutral-400">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* IA Analysis */}
              {(ia.price_changes?.length > 0 || ia.new_products?.length > 0) && (
                <div className="rounded-xl border border-neutral-200 p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase text-neutral-500">Analise da IA</p>
                  {ia.price_changes?.map((pc, i) => (
                    <div key={`pc-${i}`} className="flex items-center gap-2 text-xs">
                      <TrendingUp className={`h-3.5 w-3.5 ${pc.change_pct > 0 ? "text-rose-500" : "text-emerald-500"}`} />
                      <span className="flex-1 text-neutral-700">{pc.product_name}</span>
                      <span className="text-neutral-400">{formatBRL(pc.old_price)} → {formatBRL(pc.new_price)}</span>
                      <span className={`font-medium ${pc.change_pct > 0 ? "text-rose-600" : "text-emerald-600"}`}>{pc.change_pct > 0 ? "+" : ""}{pc.change_pct.toFixed(0)}%</span>
                    </div>
                  ))}
                  {ia.new_products?.map((np, i) => (
                    <div key={`np-${i}`} className="flex items-center gap-2 text-xs">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-neutral-700">Produto novo: <strong>{np}</strong></span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Tag className="h-3.5 w-3.5 text-neutral-500" />
                  <p className="text-xs font-semibold uppercase text-neutral-500">Tags</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                      {t}
                      <button onClick={() => removeTag(t)} className="text-neutral-400 hover:text-rose-500"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                  {tags.length === 0 && <span className="text-xs text-neutral-400">Nenhuma tag</span>}
                </div>
                <div className="mt-2 flex gap-1">
                  <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} placeholder="Nova tag..." className="h-8 text-xs" />
                  <Button onClick={addTag} size="icon" variant="outline" className="h-8 w-8 shrink-0"><Plus className="h-3.5 w-3.5" /></Button>
                </div>
              </div>

              {/* Versions */}
              {versions.length > 0 && (
                <div className="rounded-xl border border-neutral-200 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <GitBranch className="h-3.5 w-3.5 text-neutral-500" />
                    <p className="text-xs font-semibold uppercase text-neutral-500">Versoes ({versions.length})</p>
                  </div>
                  <div className="space-y-1">
                    {versions.map((v) => (
                      <div key={v.id} className="flex items-center justify-between text-xs">
                        <span className="text-neutral-700">v{v.version_number || 1} — {v.title}</span>
                        <span className="text-neutral-400">{formatDateTime(v.sent_at || v.created_date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related entities */}
              {related.length > 0 && (
                <div className="rounded-xl border border-neutral-200 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Link2 className="h-3.5 w-3.5 text-neutral-500" />
                    <p className="text-xs font-semibold uppercase text-neutral-500">Relacionamentos</p>
                  </div>
                  <div className="space-y-1">
                    {related.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-neutral-700">{r.entity_type}: <strong>{r.entity_name}</strong></span>
                        <span className="text-neutral-400">{r.relationship}</span>
                      </div>
                    ))}
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
                <Label className="text-xs">Anotacoes</Label>
                <Textarea value={annotations} onChange={(e) => setAnnotations(e.target.value)} className="mt-1.5" rows={3} placeholder="Adicione anotacoes sobre este documento..." />
                <Button onClick={saveAnnotations} disabled={savingNotes} size="sm" className="mt-2 gap-2 bg-neutral-900 hover:bg-neutral-800">
                  <Save className="h-3.5 w-3.5" /> {savingNotes ? "Salvando..." : "Salvar Anotacao"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}