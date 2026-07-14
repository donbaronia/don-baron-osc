import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Core } from "@/lib/coreEngine";
import { generateBaronInsights } from "@/lib/processamentoIA";
import { getDueAlert } from "@/lib/documentConferencia";
import { formatBRL, formatDate, getCategoryEmoji } from "@/lib/documentUtils";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ProcessamentoUpload from "@/components/documentos/ProcessamentoUpload";
import FinancialDocumentDrawer from "@/components/documentos/FinancialDocumentDrawer";
import AutomationConfigPanel from "@/components/documentos/AutomationConfigPanel";
import { Button } from "@/components/ui/button";
import {
  Sparkles, FileText, AlertTriangle, CheckCircle2, Brain,
  Clock, Eye, Zap, Lock, ShieldCheck, TrendingUp, GraduationCap, Timer, Target,
} from "lucide-react";

function getConfidence(doc) {
  const ed = doc.extracted_data || {};
  const score = ed.confidence_score;
  if (score == null) {
    // Infer from legacy status
    if (doc.status === "processado" && doc.confirmed_by === "BARON IA") return { score: 98, tier: "green" };
    if (doc.status === "aguardando_confirmacao") {
      const hasUrgent = (doc.alerts || []).some((a) => a.severity === "urgent");
      return { score: hasUrgent ? 40 : 75, tier: hasUrgent ? "red" : "yellow" };
    }
    return { score: 75, tier: "yellow" };
  }
  return { score, tier: ed.confidence_tier || (score >= 95 ? "green" : score >= 70 ? "yellow" : "red") };
}

function tierStyle(tier) {
  if (tier === "green") return { dot: "🟢", label: "Aprovado", color: "text-baron-success", bg: "bg-baron-success/15", border: "border-baron-success/20" };
  if (tier === "yellow") return { dot: "🟡", label: "Revisão", color: "text-amber-500", bg: "bg-amber-500/15", border: "border-amber-500/20" };
  return { dot: "🔴", label: "Bloqueado", color: "text-destructive", bg: "bg-destructive/15", border: "border-destructive/20" };
}

function exceptionType(doc) {
  const alerts = doc.alerts || [];
  if (alerts.some((a) => a.type === "duplicate" || a.type === "linha_duplicada" || a.type === "boleto_igual")) return { label: "Possível duplicidade", emoji: "⚠️" };
  if (alerts.some((a) => a.type === "ilegivel")) return { label: "Documento ilegível", emoji: "📵" };
  if (doc.ia_analysis?.new_products?.length > 0) return { label: "Produto novo", emoji: "📦" };
  if (alerts.some((a) => a.type === "valor_atipico")) return { label: "Valor atípico", emoji: "💰" };
  if (alerts.some((a) => a.type === "cnpj_divergente")) return { label: "CNPJ divergente", emoji: "🏢" };
  if (alerts.some((a) => a.type === "preco_alterado")) return { label: "Preço alterado", emoji: "📈" };
  if (alerts.some((a) => a.type === "manual_review")) return { label: "Revisão manual", emoji: "📝" };
  return { label: "Revisão geral", emoji: "🔍" };
}

export default function ProcessamentoDocumentos() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [learnings, setLearnings] = useState(0);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerDoc, setDrawerDoc] = useState(null);

  const load = useCallback(async () => {
    try {
      const [docs, pays, productsWithAliases] = await Promise.all([
        base44.entities.DBDocument.list("-created_date", 200),
        base44.entities.Payment.list("-created_date", 100),
        base44.entities.Product.filter({ aliases: { $exists: true, $ne: [] } }, "-created_date", 500).catch(() => []),
      ]);
      const active = docs.filter((d) => !d.deleted_at);
      setDocuments(active);
      setPayments(pays);
      setLearnings(productsWithAliases.reduce((s, p) => s + (p.aliases?.length || 0), 0));
      const ins = await generateBaronInsights(active, pays);
      setInsights(ins);
    } catch {
      setDocuments([]);
      setPayments([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (drawerDoc && documents.length > 0) {
      const updated = documents.find((d) => d.id === drawerDoc.id);
      if (updated && updated.status !== drawerDoc.status) setDrawerDoc(updated);
    }
  }, [documents]);

  const today = new Date().toISOString().slice(0, 10);
  const receivedToday = documents.filter((d) => (d.created_date || "").startsWith(today));
  const autoApproved = documents.filter((d) => {
    const c = getConfidence(d);
    return c.tier === "green" && d.status === "processado";
  });
  const needReview = documents.filter(
    (d) => d.status === "aguardando_confirmacao" && d.extracted_data?.pending_action !== "classificacao"
  );
  const exceptions = needReview;
  const classificacaoPendentes = documents.filter(
    (d) => d.status === "aguardando_confirmacao" && d.extracted_data?.pending_action === "classificacao"
  ).length;
  const processingTimes = documents.map((d) => d.extracted_data?.processing_time_ms).filter(Boolean);
  const avgTimeMs = processingTimes.length > 0 ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0;
  const precision = autoApproved.length + needReview.length > 0
    ? Math.round((autoApproved.length / (autoApproved.length + needReview.length)) * 100)
    : 0;

  const stats = [
    { label: "Recebidos hoje", value: receivedToday.length, icon: FileText, color: "text-foreground" },
    { label: "Aprovados (IA)", value: autoApproved.length, icon: CheckCircle2, color: "text-baron-success" },
    { label: "Necessitam revisão", value: needReview.length, icon: AlertTriangle, color: "text-amber-500" },
    { label: "Tempo médio", value: avgTimeMs > 0 ? `${(avgTimeMs / 1000).toFixed(1)}s` : "—", icon: Timer, color: "text-blue-400" },
    { label: "Precisão da IA", value: `${precision}%`, icon: Target, color: "text-primary" },
    { label: "Aprendizados", value: learnings, icon: GraduationCap, color: "text-violet-400" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title="BARON — Central de Processamento"
        subtitle="A IA trabalha como analista financeiro: identifica, extrai, valida e aprova sozinha. Você revisa apenas exceções."
        actions={
          <Button variant="outline" onClick={() => load()}>
            <Zap className="h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      <div className="mt-6 space-y-6">
        {/* Dashboard de Estatísticas */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${s.color}`} />
                  <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
                </div>
                <p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            );
          })}
        </div>

        {/* Fila de Exceções — apenas o que precisa de decisão humana */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">Fila de Exceções</h3>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-500">{exceptions.length}</span>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">O BARON já processou o restante automaticamente.</p>
              {classificacaoPendentes > 0 && (
                <Link
                  to="/pendencias-ia"
                  className="inline-flex items-center gap-1.5 rounded-full border border-baron-yellow/30 bg-baron-yellow/10 px-2.5 py-1 text-xs font-medium text-baron-yellow hover:bg-baron-yellow/15 transition-colors"
                >
                  <Brain className="h-3 w-3" />
                  {classificacaoPendentes} pendência(s) de classificação
                </Link>
              )}
            </div>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
              ))}
            </div>
          ) : exceptions.length === 0 ? (
            <div className="rounded-xl border border-baron-success/20 bg-baron-success/5 p-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-baron-success mb-2" />
              <p className="text-sm font-medium text-foreground">Nenhuma exceção pendente</p>
              <p className="text-xs text-muted-foreground mt-1">O BARON processou tudo. Anexe novos documentos acima.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {exceptions.slice(0, 12).map((doc) => {
                const conf = getConfidence(doc);
                const ts = tierStyle(conf.tier);
                const exc = exceptionType(doc);
                const dueAlert = getDueAlert(doc.due_date);
                return (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-3 rounded-xl border ${ts.border} bg-card p-3 cursor-pointer hover:border-primary/30 transition-colors`}
                    onClick={() => setDrawerDoc(doc)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary shrink-0">
                      <span className="text-lg">{exc.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                        <span className={`inline-flex items-center gap-0.5 rounded-full ${ts.bg} px-1.5 py-0.5 text-[10px] font-medium ${ts.color} shrink-0`}>
                          {ts.dot} {ts.label} {conf.score != null && `· ${conf.score}%`}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {exc.label} · {doc.supplier || "—"} · {doc.value ? formatBRL(doc.value) : "—"}
                        {doc.due_date && ` · Vence: ${formatDate(doc.due_date)}`}
                      </p>
                    </div>
                    {dueAlert && dueAlert.level === "urgent" && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive shrink-0">
                        <Clock className="h-3 w-3" /> {dueAlert.label}
                      </span>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
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

        {/* Configuração de Autonomia */}
        <AutomationConfigPanel />

        {/* Documentos recentes (todos) */}
        <div>
          <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Histórico de Documentos</h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <EmptyState icon={FileText} title="Nenhum documento processado" description="Anexe um documento acima para começar." />
          ) : (
            <div className="space-y-1.5">
              {documents.slice(0, 15).map((doc) => {
                const conf = getConfidence(doc);
                const ts = tierStyle(conf.tier);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setDrawerDoc(doc)}
                  >
                    <span className="text-sm shrink-0">{ts.dot}</span>
                    <span className="text-base shrink-0">{getCategoryEmoji(doc.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {doc.supplier || "—"} · {doc.value ? formatBRL(doc.value) : "—"} · {ts.label}
                        {conf.score != null && ` (${conf.score}%)`}
                      </p>
                    </div>
                    {doc.confirmed_by === "BARON IA" && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-baron-success/15 px-1.5 py-0.5 text-[10px] font-medium text-baron-success shrink-0">
                        <Sparkles className="h-2.5 w-2.5" /> IA
                      </span>
                    )}
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