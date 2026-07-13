import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Core } from "@/lib/coreEngine";
import {
  formatBRL, formatDate, formatDateTime, getCategoryLabel, getCategoryEmoji,
  isImageFile, isPDFFile,
} from "@/lib/documentUtils";
import { compareDocumentVsPayment, getDueAlert } from "@/lib/documentConferencia";
import StatusBadge from "@/components/shared/StatusBadge";
import DocumentReviewActions from "@/components/documentos/DocumentReviewActions";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Download, ZoomIn, ZoomOut, Save, User, Clock, AlertTriangle,
  CheckCircle2, XCircle, FileText, CreditCard, History, ShieldCheck,
  Sparkles, Link2, Unlink,
} from "lucide-react";

export default function FinancialDocumentDrawer({ open, onClose, document: doc, onLinked }) {
  const { user } = useAuth();
  const [zoom, setZoom] = useState(1);
  const [annotations, setAnnotations] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [payment, setPayment] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [liveDoc, setLiveDoc] = useState(doc);

  useEffect(() => {
    setLiveDoc(doc);
    if (open && doc) {
      setAnnotations(doc.annotations || "");
      setZoom(1);
      loadPayment(doc);
    }
  }, [open, doc]);

  const reloadDoc = async () => {
    if (!doc?.id) return;
    try {
      const updated = await base44.entities.DBDocument.get(doc.id);
      setLiveDoc(updated);
      setAnnotations(updated.annotations || "");
      loadPayment(updated);
    } catch { /* ignore */ }
  };

  const loadPayment = async (d) => {
    if (!d) return;
    setLoadingPayment(true);
    try {
      const linked = await base44.entities.Payment.filter({ document_id: d.id }, "-created_date", 5);
      setPayment(linked[0] || null);
    } catch {
      setPayment(null);
    }
    setLoadingPayment(false);
  };

  if (!doc) return null;
  const d = liveDoc || doc;

  const conferencia = compareDocumentVsPayment(d, payment);
  const dueAlert = getDueAlert(d.due_date);

  const saveAnnotations = async () => {
    setSavingNotes(true);
    await base44.entities.DBDocument.update(doc.id, {
      annotations,
      edited_by: user?.full_name,
      edited_at: new Date().toISOString(),
    });
    await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: "Anotação atualizada" });
    setSavingNotes(false);
    reloadDoc();
  };

  const linkToPayment = async (paymentId) => {
    await base44.entities.Payment.update(paymentId, { document_id: doc.id });
    await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Vinculado ao pagamento ${paymentId}` });
    reloadDoc();
    onLinked?.();
  };

  const unlinkPayment = async () => {
    if (!payment) return;
    await base44.entities.Payment.update(payment.id, { document_id: null });
    await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Desvinculado do pagamento ${payment.id}` });
    setPayment(null);
    reloadDoc();
    onLinked?.();
  };

  const auditRows = [
    { label: "Anexado por", value: d.sent_by, date: d.sent_at, icon: FileText },
    { label: "Conferido por", value: d.confirmed_by, date: d.confirmed_at, icon: CheckCircle2 },
    { label: "Editado por", value: d.edited_by, date: d.edited_at, icon: User },
    { label: "Rejeitado por", value: d.rejected_by, date: null, icon: XCircle },
    { label: "Pago por", value: payment?.status === "pago" ? user?.full_name : null, date: payment?.payment_date, icon: CreditCard },
  ].filter((r) => r.value);

  const alerts = d.alerts || [];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-5xl p-0 flex flex-col">
        <SheetHeader className="border-b border-border px-6 py-4 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <span className="text-lg">{getCategoryEmoji(d.category)}</span>
            <span className="truncate">{d.title}</span>
            <StatusBadge status={d.status} />
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
          {/* Documento original */}
          <div className="flex flex-col border-r border-border bg-secondary/30 p-4 overflow-hidden">
            <div className="mb-3 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold uppercase text-muted-foreground">📄 Documento Original</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"><ZoomOut className="h-4 w-4" /></button>
                <span className="w-10 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"><ZoomIn className="h-4 w-4" /></button>
                <a href={d.file_url} target="_blank" rel="noreferrer" download className="ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
                  <Download className="h-3.5 w-3.5" /> Baixar
                </a>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto rounded-xl border border-border bg-background p-2">
              {isImageFile(d.file_type, d.file_url) ? (
                <img src={d.file_url} alt={d.title} style={{ transform: `scale(${zoom})`, transformOrigin: "center" }} className="max-h-full max-w-full object-contain transition-transform" />
              ) : isPDFFile(d.file_type, d.file_url) ? (
                <iframe src={d.file_url} title={d.title} className="h-full w-full" style={{ minHeight: "400px" }} />
              ) : (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <FileText className="h-10 w-10" />
                  <p className="text-sm">Pré-visualização não disponível</p>
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">Abrir arquivo original</a>
                </div>
              )}
            </div>
          </div>

          {/* Painel lateral */}
          <div className="overflow-y-auto p-6 space-y-5">
            {/* Alerta de vencimento */}
            {dueAlert && (
              <div className={`flex items-center gap-2 rounded-lg border p-3 ${dueAlert.level === "urgent" ? "border-destructive/30 bg-destructive/10" : "border-amber-500/30 bg-amber-500/10"}`}>
                <AlertTriangle className={`h-4 w-4 shrink-0 ${dueAlert.level === "urgent" ? "text-destructive" : "text-amber-500"}`} />
                <span className={`text-sm font-medium ${dueAlert.level === "urgent" ? "text-destructive" : "text-amber-600"}`}>{dueAlert.label}</span>
              </div>
            )}

            {/* Alertas da IA */}
            {alerts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Análise da IA (BARON)</span>
                </div>
                {alerts.map((a, i) => (
                  <div key={i} className={`flex items-start gap-2 rounded-lg border p-2.5 ${a.severity === "urgent" ? "border-destructive/30 bg-destructive/10" : a.severity === "warning" ? "border-amber-500/30 bg-amber-500/10" : "border-primary/30 bg-primary/10"}`}>
                    <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${a.severity === "urgent" ? "text-destructive" : a.severity === "warning" ? "text-amber-500" : "text-primary"}`} />
                    <span className={`text-xs ${a.severity === "urgent" ? "text-destructive" : a.severity === "warning" ? "text-amber-600" : "text-primary"}`}>{a.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Ações de Revisão — Aprovar / Editar / Reprocessar / Rejeitar */}
            <DocumentReviewActions
              doc={d}
              onAction={() => { reloadDoc(); onLinked?.(); }}
            />

            {/* Dados extraídos */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Dados Extraídos (OCR + IA)</p>
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border p-3">
                <div><p className="text-[10px] uppercase text-muted-foreground">Categoria</p><p className="text-sm font-medium">{getCategoryEmoji(d.category)} {getCategoryLabel(d.category)}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Valor</p><p className="text-sm font-semibold">{d.value ? formatBRL(d.value) : "—"}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Fornecedor</p><p className="text-sm">{d.supplier || "—"}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">CNPJ</p><p className="text-sm">{d.cnpj || "—"}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Nº Documento</p><p className="text-sm">{d.document_number || "—"}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Vencimento</p><p className="text-sm">{formatDate(d.due_date)}</p></div>
                {d.bank && <div><p className="text-[10px] uppercase text-muted-foreground">Banco</p><p className="text-sm">{d.bank}</p></div>}
                {d.beneficiario && <div><p className="text-[10px] uppercase text-muted-foreground">Beneficiário</p><p className="text-sm">{d.beneficiario}</p></div>}
                {d.linha_digitavel && <div className="col-span-2"><p className="text-[10px] uppercase text-muted-foreground">Linha Digitável</p><p className="text-xs font-mono break-all">{d.linha_digitavel}</p></div>}
                {d.pix_copia_cola && <div className="col-span-2"><p className="text-[10px] uppercase text-muted-foreground">PIX Copia e Cola</p><p className="text-xs font-mono break-all">{d.pix_copia_cola}</p></div>}
              </div>
            </div>

            {/* Conferência */}
            {conferencia && (
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Conferência</span>
                  </div>
                  {conferencia.allMatch ? (
                    <Badge className="gap-1 bg-baron-success text-white"><CheckCircle2 className="h-3 w-3" /> Confere</Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Divergência</Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {conferencia.checks.map((c, i) => (
                    <div key={i} className="grid grid-cols-3 items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{c.field}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground/60 text-[10px]">Doc:</span>
                        <span className="font-medium truncate">{c.docLabel}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground/60 text-[10px]">Sis:</span>
                        <span className="font-medium truncate">{c.sysLabel}</span>
                        {c.match ? <CheckCircle2 className="h-3 w-3 text-baron-success shrink-0" /> : (c.docValue || c.sysValue) ? <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" /> : null}
                      </div>
                    </div>
                  ))}
                </div>
                {payment && (
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                    <span className="text-xs text-muted-foreground">Conta a pagar vinculada</span>
                    <Button variant="ghost" size="sm" onClick={unlinkPayment} className="h-7 text-xs gap-1 text-destructive hover:text-destructive">
                      <Unlink className="h-3 w-3" /> Desvincular
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Pagamento vinculado */}
            {payment && (
              <div className="rounded-xl border border-border p-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Pagamento</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-muted-foreground">Descrição</p><p className="font-medium">{payment.description}</p></div>
                  <div><p className="text-muted-foreground">Valor</p><p className="font-medium">{formatBRL(payment.amount)}</p></div>
                  <div><p className="text-muted-foreground">Vencimento</p><p className="font-medium">{formatDate(payment.due_date)}</p></div>
                  <div><p className="text-muted-foreground">Status</p><StatusBadge status={payment.status} /></div>
                </div>
              </div>
            )}

            {/* Histórico / Auditoria */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <History className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase text-muted-foreground">Histórico & Auditoria</span>
              </div>
              <div className="space-y-2.5">
                {auditRows.map((r, i) => {
                  const Icon = r.icon;
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground">{r.label}:</span>
                      <span className="text-muted-foreground">{r.value}</span>
                      {r.date && <span className="text-muted-foreground/60">· {formatDateTime(r.date)}</span>}
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Recebido em {formatDateTime(d.sent_at || d.created_date)}</span>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea value={annotations} onChange={(e) => setAnnotations(e.target.value)} className="mt-1.5" rows={3} placeholder="Adicione observações sobre este documento..." />
              <Button onClick={saveAnnotations} disabled={savingNotes} size="sm" className="mt-2 gap-2">
                <Save className="h-3.5 w-3.5" /> {savingNotes ? "Salvando..." : "Salvar Observação"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}