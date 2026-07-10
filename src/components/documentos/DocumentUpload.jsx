import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { analyzeDocument, mapExtractedToDocument } from "@/lib/documentAI";
import { runFullAnalysis } from "@/lib/documentCenter";
import { ACCEPTED_FILE_TYPES } from "@/lib/documentUtils";
import { Core } from "@/lib/coreEngine";
import { cn } from "@/lib/utils";
import { Upload, Camera, Loader2, CheckCircle, XCircle, FileText, AlertTriangle } from "lucide-react";

export default function DocumentUpload({ onUploaded }) {
  const { user } = useAuth();
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState([]);
  const inputRef = useRef(null);
  const cameraRef = useRef(null);

  const processFile = async (file, source = "upload") => {
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const updateEntry = (updates) =>
      setProcessing((prev) => prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f)));

    setProcessing((prev) => [...prev, { id: fileId, name: file.name, status: "uploading" }]);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const doc = await base44.entities.DBDocument.create({
        title: file.name,
        file_url,
        file_type: file.type || file.name.split(".").pop(),
        status: "em_analise",
        source,
        sent_by: user?.full_name || "Sistema",
        sent_at: new Date().toISOString(),
      });

      updateEntry({ status: "analyzing" });

      try {
        const extracted = await analyzeDocument(file_url);
        const mapped = mapExtractedToDocument(extracted);
        const title = mapped.supplier
          ? `${mapped.supplier}${mapped.document_date ? ` - ${mapped.document_date}` : ""}`
          : file.name;

        await base44.entities.DBDocument.update(doc.id, {
          ...mapped,
          extracted_data: extracted,
          status: "aguardando_confirmacao",
          title,
        });

        updateEntry({ status: "analyzing_deep" });

        const analysis = await runFullAnalysis({ ...doc, ...mapped });

        await base44.entities.DBDocument.update(doc.id, {
          ia_analysis: analysis.ia_analysis,
          alerts: analysis.alerts,
          duplicate_of: analysis.duplicate?.id || null,
        });

        await Core.audit({
          audit_action: "create",
          module: "documentos",
          entity_type: "DBDocument",
          entity_id: doc.id,
          details: `Documento processado: ${title}`,
        });

        if (analysis.alerts.length > 0) {
          updateEntry({ status: "done", alertCount: analysis.alerts.length });
        } else {
          updateEntry({ status: "done" });
        }
      } catch (aiError) {
        await base44.entities.DBDocument.update(doc.id, {
          status: "recebido",
          notes: "Falha na analise automatica — preencha manualmente.",
        });
        updateEntry({ status: "done" });
      }
    } catch (error) {
      updateEntry({ status: "error", error: error.message });
    }
  };

  const handleFiles = async (fileList, source = "upload") => {
    const files = Array.from(fileList);
    for (const file of files) {
      await processFile(file, source);
    }
    onUploaded?.();
    setTimeout(() => setProcessing([]), 5000);
  };

  return (
    <div>
      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files, "upload"); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        tabIndex={0}
        onPaste={(e) => {
          const items = e.clipboardData?.items;
          if (!items) return;
          const files = [];
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              const f = item.getAsFile();
              if (f) files.push(f);
            }
          }
          if (files.length) handleFiles(files, "paste");
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all",
          dragOver ? "border-amber-400 bg-amber-50" : "border-neutral-300 bg-white hover:border-neutral-400 hover:bg-neutral-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files, "upload"); e.target.value = ""; }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files, "camera"); e.target.value = ""; }}
        />
        <Upload className="mx-auto h-10 w-10 text-neutral-400" />
        <p className="mt-3 text-sm font-medium text-neutral-700">
          Arraste arquivos, cole uma imagem ou clique para selecionar
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          PDF · JPG · PNG · HEIC · XML · Excel · CSV · TXT · ZIP — multiplos arquivos suportados
        </p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
        >
          <Camera className="h-4 w-4" /> Fotografar
        </button>
      </div>

      {processing.length > 0 && (
        <div className="mt-4 space-y-2">
          {processing.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
              {(f.status === "uploading" || f.status === "analyzing" || f.status === "analyzing_deep") && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
              {f.status === "done" && <CheckCircle className="h-4 w-4 text-emerald-500" />}
              {f.status === "error" && <XCircle className="h-4 w-4 text-rose-500" />}
              <FileText className="h-4 w-4 text-neutral-400" />
              <span className="flex-1 truncate text-sm text-neutral-700">{f.name}</span>
              {f.alertCount > 0 && <AlertTriangle className="h-4 w-4 text-amber-500" />}
              <span className="text-xs font-medium text-neutral-500">
                {f.status === "uploading" ? "Enviando..." : f.status === "analyzing" ? "IA extraindo..." : f.status === "analyzing_deep" ? "IA analisando..." : f.status === "done" ? (f.alertCount > 0 ? `${f.alertCount} alerta(s)` : "Concluido") : "Erro"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}