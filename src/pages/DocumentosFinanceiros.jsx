import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Core } from "@/lib/coreEngine";
import { searchDocuments, formatBRL, formatDate, getCategoryEmoji, isImageFile } from "@/lib/documentUtils";
import { getDueAlert } from "@/lib/documentConferencia";
import PageHeader from "@/components/shared/PageHeader";
import Toolbar from "@/components/shared/Toolbar";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import DocumentUpload from "@/components/documentos/DocumentUpload";
import FinancialDocumentDrawer from "@/components/documentos/FinancialDocumentDrawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BaronSelect } from "@/design-system";
import {
  FileText, Search, Eye, Trash2, AlertTriangle, CheckCircle2, Clock, FilePlus,
} from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

const CATEGORY_FILTERS = [
  { value: "all", label: "Todos", emoji: "📂" },
  { value: "boleto", label: "Boletos", emoji: "📄" },
  { value: "nota_fiscal", label: "Notas Fiscais", emoji: "🧾" },
  { value: "recibo", label: "Recibos", emoji: "🧾" },
  { value: "comprovante_pix", label: "PIX", emoji: "💸" },
  { value: "contrato", label: "Contratos", emoji: "📋" },
  { value: "comprovante_bancario", label: "Comprovantes", emoji: "🏦" },
  { value: "outros", label: "Outros", emoji: "📎" },
];

export default function DocumentosFinanceiros() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [drawerDoc, setDrawerDoc] = useState(null);

  const load = useCallback(async () => {
    try {
      const [docs, pays] = await Promise.all([
        base44.entities.DBDocument.list("-created_date", 500),
        base44.entities.Payment.list("-created_date", 300),
      ]);
      setDocuments(docs.filter((d) => !d.deleted_at));
      setPayments(pays);
    } catch {
      setDocuments([]);
      setPayments([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const paymentByDocId = {};
  payments.forEach((p) => {
    if (p.document_id && !paymentByDocId[p.document_id]) paymentByDocId[p.document_id] = p;
  });

  const filtered = (() => {
    let results = documents;
    if (catFilter !== "all") {
      if (catFilter === "outros") {
        const financialCats = ["boleto", "nota_fiscal", "recibo", "comprovante_pix", "contrato", "comprovante_bancario", "xml"];
        results = results.filter((d) => !financialCats.includes(d.category));
      } else if (catFilter === "nota_fiscal") {
        results = results.filter((d) => ["nota_fiscal", "xml"].includes(d.category));
      } else {
        results = results.filter((d) => d.category === catFilter);
      }
    }
    if (search) results = searchDocuments(results, search);
    return results;
  })();

  const overdueCount = documents.filter((d) => {
    const a = getDueAlert(d.due_date);
    return a && a.level === "urgent";
  }).length;

  const pendingCount = documents.filter((d) => d.status === "aguardando_confirmacao").length;

  const handleDelete = async (doc) => {
    await base44.entities.DBDocument.update(doc.id, {
      deleted_at: new Date().toISOString(),
      deleted_by: user?.full_name || "Sistema",
    });
    await Core.audit({ audit_action: "delete", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Soft delete: ${doc.title}` });
    load();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title="Centro de Documentos Financeiros"
        subtitle="Repositório seguro e auditável de boletos, notas, recibos e comprovantes."
        actions={
          <Button variant="outline" onClick={() => load()}>
            <FilePlus className="h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total de Documentos</p>
          <p className="text-2xl font-bold text-foreground">{documents.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Aguardando Conferência</p>
          <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Vencidos / Urgentes</p>
          <p className="text-2xl font-bold text-destructive">{overdueCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Vinculados a Pagamentos</p>
          <p className="text-2xl font-bold text-baron-success">{Object.keys(paymentByDocId).length}</p>
        </div>
      </div>

      {/* Upload */}
      <div className="mt-6">
        <DocumentUpload onUploaded={load} />
      </div>

      {/* Filtros + Busca */}
      <div className="mt-6 space-y-3">
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Pesquisar por fornecedor, CNPJ, linha digitável, número, valor, banco, OCR..."
          onExport={() => exportToCsv("documentos_financeiros.csv", filtered.map((d) => ({
            titulo: d.title, categoria: d.category, fornecedor: d.supplier, cnpj: d.cnpj,
            valor: d.value, vencimento: d.due_date, status: d.status,
          })))}
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c.value}
              onClick={() => setCatFilter(c.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                catFilter === c.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <span>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-secondary" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhum documento encontrado" description="Envie boletos, notas ou recibos para começar." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((doc) => {
              const linkedPayment = paymentByDocId[doc.id];
              const dueAlert = getDueAlert(doc.due_date);
              const alertCount = (doc.alerts || []).length;
              const allTags = [...new Set([...(doc.auto_tags || []), ...(doc.tags || [])])];

              return (
                <div
                  key={doc.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg cursor-pointer"
                  onClick={() => setDrawerDoc(doc)}
                >
                  <div className="relative flex h-32 items-center justify-center overflow-hidden bg-secondary">
                    {isImageFile(doc.file_type, doc.file_url) ? (
                      <img src={doc.file_url} alt={doc.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <FileText className="h-8 w-8" />
                        <span className="text-xs uppercase">{(doc.file_type || "arquivo").split("/").pop()}</span>
                      </div>
                    )}
                    <div className="absolute left-2 top-2">
                      <StatusBadge status={doc.status} />
                    </div>
                    <div className="absolute right-2 top-2 flex gap-1">
                      {linkedPayment && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-baron-success px-2 py-0.5 text-xs font-medium text-white" title="Vinculado a conta a pagar">
                          <CheckCircle2 className="h-3 w-3" /> Pago?
                        </span>
                      )}
                      {alertCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white" title={`${alertCount} alerta(s)`}>
                          <AlertTriangle className="h-3 w-3" /> {alertCount}
                        </span>
                      )}
                      {dueAlert && dueAlert.level === "urgent" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-white" title={dueAlert.label}>
                          <Clock className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium text-foreground">{doc.title}</p>
                      <span className="shrink-0 text-lg">{getCategoryEmoji(doc.category)}</span>
                    </div>

                    <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      {doc.supplier && <p><span className="font-medium text-foreground/70">Fornecedor:</span> {doc.supplier}</p>}
                      {doc.value > 0 && <p className="font-semibold text-foreground">{formatBRL(doc.value)}</p>}
                      {doc.due_date && (
                        <p className={dueAlert?.level === "urgent" ? "text-destructive font-medium" : ""}>
                          Vence: {formatDate(doc.due_date)}
                          {dueAlert && ` · ${dueAlert.label}`}
                        </p>
                      )}
                    </div>

                    {allTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {allTags.slice(0, 3).map((t) => (
                          <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-1 border-t border-border pt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDrawerDoc(doc); }}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                      >
                        <Eye className="h-3.5 w-3.5" /> Visualizar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                        className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Excluir (soft delete)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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