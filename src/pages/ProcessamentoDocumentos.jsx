import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Core } from "@/lib/coreEngine";
import { generateBaronInsights } from "@/lib/processamentoIA";
import { getDueAlert } from "@/lib/documentConferencia";
import { formatBRL, formatDate, getCategoryEmoji } from "@/lib/documentUtils";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import ProcessamentoUpload from "@/components/documentos/ProcessamentoUpload";
import FinancialDocumentDrawer from "@/components/documentos/FinancialDocumentDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, FileText, AlertTriangle, CheckCircle2, Brain,
  Clock, Eye, Zap,
} from "lucide-react";

export default function ProcessamentoDocumentos() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerDoc, setDrawerDoc] = useState(null);

  const load = useCallback(async () => {
    try {
      const [docs, pays] = await Promise.all([
        base44.entities.DBDocument.list("-created_date", 200),
        base44.entities.Payment.list("-created_date", 100),
      ]);
      setDocuments(docs.filter((d) => !d.deleted_at));
      setPayments(pays);
      const insights = await generateBaronInsights(docs.filter((d) => !d.deleted_at), pays);
      setInsights(insights);
    } catch {
      setDocuments([]);
      setPayments([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const recent = documents.slice(0, 12);
  const pendingCount = documents.filter((d) => d.status === "aguardando_confirmacao").length;
  const autoCount = documents.filter((d) => d.status === "processado" && d.confirmed_by === "BARON IA").length;
  const alertCount = documents.filter((d) => (d.alerts || []).length > 0).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title="Centro de Processamento Inteligente"
        subtitle="A única porta de entrada — anexe o documento e a IA identifica, extrai, valida e encaminha automaticamente."
        actions={
          <Button variant="outline" onClick={() => load()}>
            <Zap className="h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      <div className="mt-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Processados</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{documents.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-baron-success" />
              <p className="text-xs text-muted-foreground">Auto-roteados (IA)</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-baron-success">{autoCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">Pendências</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-500">{pendingCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-xs text-muted-foreground">Com Alertas</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-destructive">{alertCount}</p>
          </div>
        </div>

        {/* BARON Insights */}
        {insights.length > 0 && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">BARON — Insights Automáticos</h3>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-card p-2.5 text-sm">
                  <span className="text-lg shrink-0">{ins.icon}</span>
                  <span className="text-foreground">{ins.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload / Pipeline */}
        <ProcessamentoUpload onProcessed={load} />

        {/* Recent processed documents */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Documentos Recentes</h3>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState icon={FileText} title="Nenhum documento processado" description="Anexe um documento acima para começar." />
          ) : (
            <div className="space-y-2">
              {recent.map((doc) => {
                const dueAlert = getDueAlert(doc.due_date);
                const isAuto = doc.confirmed_by === "BARON IA";
                const docAlerts = doc.alerts || [];

                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setDrawerDoc(doc)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary shrink-0">
                      <span className="text-lg">{getCategoryEmoji(doc.category)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                        {isAuto && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-baron-success/15 px-1.5 py-0.5 text-[10px] font-medium text-baron-success shrink-0">
                            <Zap className="h-2.5 w-2.5" /> IA
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {doc.supplier || "—"} · {doc.value ? formatBRL(doc.value) : "—"}
                        {doc.due_date && ` · Vence: ${formatDate(doc.due_date)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {docAlerts.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-500">
                          <AlertTriangle className="h-3 w-3" /> {docAlerts.length}
                        </span>
                      )}
                      {dueAlert && dueAlert.level === "urgent" && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                          <Clock className="h-3 w-3" /> {dueAlert.label}
                        </span>
                      )}
                      <StatusBadge status={doc.status} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <FinancialDocumentDrawer
        open={!!drawerDoc}
        document={drawerDoc}
        onClose={() => setDrawerDoc(null)}
        onLinked={load}
      />
    </div>
  );
}