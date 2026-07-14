import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { rerouteDocument } from "@/lib/processamentoIA";
import { classificationMeta, CLASSIFICATION_THRESHOLD } from "@/lib/documentClassifier";
import { formatBRL, formatDate, isImageFile, isPDFFile } from "@/lib/documentUtils";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertTriangle, Brain, CheckCircle2, FileText, Eye, FileX,
  Receipt, Wallet, GitBranch, HelpCircle, Loader2, ShieldCheck,
} from "lucide-react";

const QUICK_DECISIONS = [
  { type: "boleto", label: "Apenas boleto", icon: Wallet, hint: "Financeiro" },
  { type: "nota_fiscal", label: "Apenas nota", icon: Receipt, hint: "Estoque + CMV" },
  { type: "nota_boleto", label: "Nota + boleto", icon: GitBranch, hint: "Híbrido" },
  { type: "outros", label: "Outro tipo", icon: HelpCircle, hint: "Arquivar" },
];

function classificationFromDoc(doc) {
  const type = doc.classification || (doc.extracted_data?.document_type) || "outros";
  const ed = doc.extracted_data || {};
  const signals = ed.classification_signals || {};
  const confidence = doc.classification_confidence ?? signals.confidence ?? ed.confidence_score ?? 0;
  const reasons = signals.reasons || (ed.confidence_reasons ? [ed.confidence_reasons] : []);
  return { type, confidence: Number(confidence), reasons };
}

function tierColor(confidence) {
  if (confidence >= CLASSIFICATION_THRESHOLD) return "text-baron-green bg-baron-green/15 border-baron-green/20";
  if (confidence >= 60) return "text-baron-yellow bg-baron-yellow/15 border-baron-yellow/20";
  return "text-destructive bg-destructive/15 border-destructive/20";
}

export default function PendenciasIA() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendencias, setPendencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await base44.entities.DBDocument.list("-created_date", 200);
      const pending = docs.filter(
        (d) =>
          !d.deleted_at &&
          d.status === "aguardando_confirmacao" &&
          (d.extracted_data?.pending_action === "classificacao" || !!d.pending_reason)
      );
      setPendencias(pending);
    } catch {
      setPendencias([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDecide = async (docId, chosenType) => {
    setBusy((b) => ({ ...b, [docId]: chosenType }));
    try {
      const route = await rerouteDocument(docId, chosenType, user);
      const meta = classificationMeta(chosenType);
      toast({
        title: "Documento re-roteado",
        description: `${meta.label} ${route.auto ? "processado automaticamente." : "enviado para revisão de dados."}`,
      });
      await load();
    } catch (e) {
      toast({ title: "Erro ao re-rotear", description: e.message, variant: "destructive" });
    } finally {
      setBusy((b) => {
        const next = { ...b };
        delete next[docId];
        return next;
      });
    }
  };

  const handleReject = async (docId) => {
    if (!rejectReason.trim()) {
      toast({ title: "Informe o motivo da rejeição", variant: "destructive" });
      return;
    }
    setBusy((b) => ({ ...b, [docId]: "reject" }));
    try {
      await base44.entities.DBDocument.update(docId, {
        status: "rejeitado",
        rejected_by: user?.full_name || "Operador",
        pending_reason: `Rejeitado: ${rejectReason.trim()}`,
        notes: (rejectReason.trim()),
      });
      toast({ title: "Documento rejeitado", description: "Motivo registrado." });
      setRejecting(null);
      setRejectReason("");
      await load();
    } catch (e) {
      toast({ title: "Erro ao rejeitar", description: e.message, variant: "destructive" });
    } finally {
      setBusy((b) => {
        const next = { ...b };
        delete next[docId];
        return next;
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title="Pendências da IA"
        subtitle="Documentos com classificação incerta. Confirme o tipo e o Baron continua o fluxo automaticamente — sem reenviar."
        actions={
          <Button variant="outline" onClick={load}>
            <Eye className="h-4 w-4" /> Atualizar
          </Button>
        }
      />

      {/* Regra obrigatória */}
      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-baron-yellow/20 bg-baron-yellow/5 p-3.5">
        <ShieldCheck className="h-5 w-5 text-baron-yellow shrink-0 mt-0.5" />
        <p className="text-xs text-secondary-info">
          <span className="font-semibold text-primary-info">Regra obrigatória:</span> nenhum documento permanece pendente
          sem motivo. Todo documento termina em <span className="text-baron-green font-medium">Processado</span>,{" "}
          <span className="text-baron-yellow font-medium">Revisão humana</span> (esta fila) ou{" "}
          <span className="text-destructive font-medium">Rejeitado com motivo</span>.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-secondary border border-border" />
            ))}
          </div>
        ) : pendencias.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nenhuma pendência de classificação"
            description="A IA classificou todos os documentos com confiança suficiente e seguiu o fluxo correto."
          />
        ) : (
          pendencias.map((doc) => {
            const cls = classificationFromDoc(doc);
            const meta = classificationMeta(cls.type);
            const Icon = meta.flow === "financeiro" ? Wallet : meta.flow === "estoque" ? Receipt : meta.flow === "híbrido" ? GitBranch : FileText;
            const tier = tierColor(cls.confidence);
            const docBusy = busy[doc.id];
            const products = doc.products || doc.extracted_data?.products || [];
            const isImg = isImageFile(doc.file_type, doc.file_url);
            const isPdf = isPDFFile(doc.file_type, doc.file_url);

            return (
              <div key={doc.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex flex-col lg:flex-row">
                  {/* Preview do arquivo */}
                  <div className="lg:w-56 shrink-0 bg-table-row border-b lg:border-b-0 lg:border-r border-table-border p-3 flex items-center justify-center">
                    {isImg ? (
                      <img src={doc.file_url} alt={doc.title} className="max-h-40 rounded-md object-contain" />
                    ) : isPdf ? (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="h-10 w-10" />
                        <span className="text-xs">PDF</span>
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Abrir</a>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="h-10 w-10" />
                        <span className="text-xs uppercase">{doc.file_type || "arquivo"}</span>
                      </div>
                    )}
                  </div>

                  {/* Detalhes */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-primary-info">{doc.title || "Documento"}</p>
                          <p className="text-xs text-muted-foreground">
                            Enviado por {doc.sent_by || "—"} · {formatDate(doc.created_date)}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${tier}`}>
                        <Brain className="h-3 w-3" />
                        {meta.label} · {cls.confidence}%
                      </span>
                    </div>

                    {/* Motivo da dúvida */}
                    <div className="mt-3 rounded-lg border border-baron-yellow/20 bg-baron-yellow/5 p-2.5">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-baron-yellow">
                        <AlertTriangle className="h-3.5 w-3.5" /> Motivo da dúvida
                      </p>
                      <p className="mt-1 text-xs text-secondary-info">
                        {doc.pending_reason || (cls.reasons.length ? cls.reasons.join("; ") : "Classificação abaixo do limiar de confiança.")}
                      </p>
                    </div>

                    {/* Dados extraídos */}
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <Detail label="Fornecedor" value={doc.supplier || "—"} />
                      <Detail label="Valor" value={doc.value ? formatBRL(doc.value) : "—"} />
                      <Detail label="Vencimento" value={doc.due_date ? formatDate(doc.due_date) : "—"} />
                      <Detail label="Produtos" value={products.length ? `${products.length} item(s)` : "nenhum"} />
                    </div>

                    {products.length > 0 && (
                      <div className="mt-2.5">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Produtos encontrados:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {products.slice(0, 6).map((p, i) => (
                            <span key={i} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-info border border-border">
                              {p.name}{p.quantity ? ` (${p.quantity})` : ""}
                            </span>
                          ))}
                          {products.length > 6 && <span className="text-xs text-muted-foreground self-center">+{products.length - 6}</span>}
                        </div>
                      </div>
                    )}

                    {/* Decisão rápida */}
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="text-xs font-semibold text-primary-info mb-2">Confirme o tipo para continuar o fluxo:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {QUICK_DECISIONS.map((d) => {
                          const DIcon = d.icon;
                          const isActive = docBusy === d.type;
                          return (
                            <Button
                              key={d.type}
                              variant={cls.type === d.type ? "default" : "outline"}
                              size="sm"
                              disabled={!!docBusy}
                              onClick={() => handleDecide(doc.id, d.type)}
                              className="flex-col h-auto py-2.5 gap-0.5"
                            >
                              {isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : <DIcon className="h-4 w-4" />}
                              <span className="text-xs font-semibold">{d.label}</span>
                              <span className="text-[10px] opacity-70">{d.hint}</span>
                            </Button>
                          );
                        })}
                      </div>

                      {/* Rejeitar */}
                      {rejecting === doc.id ? (
                        <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Motivo da rejeição (obrigatório)..."
                            rows={2}
                            className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-primary-info placeholder:text-muted-foreground focus:border-destructive focus:outline-none"
                          />
                          <div className="mt-2 flex gap-2">
                            <Button variant="destructive" size="sm" disabled={docBusy === "reject"} onClick={() => handleReject(doc.id)}>
                              {docBusy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileX className="h-4 w-4" />}
                              Confirmar rejeição
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setRejecting(null); setRejectReason(""); }}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRejecting(doc.id)}
                          disabled={!!docBusy}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <FileX className="h-3.5 w-3.5" /> Rejeitar documento
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg bg-secondary/40 border border-border px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-primary-info truncate">{value}</p>
    </div>
  );
}