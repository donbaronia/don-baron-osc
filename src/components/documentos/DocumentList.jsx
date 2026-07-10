import React from "react";
import {
  formatBRL, formatDate, getCategoryLabel, getCategoryEmoji,
  isImageFile,
} from "@/lib/documentUtils";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import {
  Eye, CheckCircle, Trash2, RotateCcw, FileText, Archive, XCircle,
} from "lucide-react";

export default function DocumentList({ documents, loading, onView, onConfirm, onReject, onArchive, onDelete, onRestore }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-neutral-200/60" />
        ))}
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return <EmptyState icon={FileText} title="Nenhum documento" description="Os documentos enviados aparecerão aqui." />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => (
        <div key={doc.id} className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all hover:shadow-lg hover:shadow-neutral-200/50">
          {/* Thumbnail */}
          <div className="relative flex h-36 items-center justify-center overflow-hidden bg-neutral-100">
            {isImageFile(doc.file_type, doc.file_url) ? (
              <img src={doc.file_url} alt={doc.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-neutral-400">
                <FileText className="h-8 w-8" />
                <span className="text-xs uppercase">{(doc.file_type || "arquivo").split("/").pop()}</span>
              </div>
            )}
            <div className="absolute left-2 top-2">
              <StatusBadge status={doc.status} />
            </div>
            {doc.deleted_at && (
              <div className="absolute right-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-medium text-white">Na Lixeira</div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-1 flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-sm font-medium text-neutral-900">{doc.title}</p>
              <span className="shrink-0 text-lg">{getCategoryEmoji(doc.category)}</span>
            </div>
            <div className="mt-2 space-y-1 text-xs text-neutral-500">
              <p><span className="font-medium text-neutral-600">Categoria:</span> {getCategoryLabel(doc.category)}</p>
              {doc.supplier && <p><span className="font-medium text-neutral-600">Fornecedor:</span> {doc.supplier}</p>}
              {doc.value > 0 && <p className="font-semibold text-neutral-900">{formatBRL(doc.value)}</p>}
              <p>{formatDate(doc.document_date || doc.sent_at || doc.created_date)}</p>
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-1 border-t border-neutral-100 pt-3">
              {doc.deleted_at ? (
                <button onClick={() => onRestore?.(doc)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50">
                  <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                </button>
              ) : (
                <>
                  <button onClick={() => onView?.(doc)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100" title="Visualizar">
                    <Eye className="h-3.5 w-3.5" /> Ver
                  </button>
                  {doc.status === "aguardando_confirmacao" && (
                    <>
                      <button onClick={() => onConfirm?.(doc)} className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1.5 text-xs font-medium text-white hover:bg-amber-600" title="Conferir">
                        <CheckCircle className="h-3.5 w-3.5" /> Conferir
                      </button>
                      <button onClick={() => onReject?.(doc)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600" title="Rejeitar">
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  {doc.status === "processado" && (
                    <button onClick={() => onArchive?.(doc)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600" title="Arquivar">
                      <Archive className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={() => onDelete?.(doc)} className="ml-auto rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600" title="Excluir">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}