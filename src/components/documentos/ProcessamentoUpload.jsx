import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { processDocument } from "@/lib/processamentoIA";
import { ACCEPTED_FILE_TYPES, formatBRL, getCategoryEmoji } from "@/lib/documentUtils";
import { cn } from "@/lib/utils";
import {
  Upload, Camera, Loader2, CheckCircle2, XCircle, FileText,
  AlertTriangle, Sparkles, ArrowRight, Zap, ScanLine,
} from "lucide-react";

const STAGES = [
  { key: "upload", label: "Recebendo arquivo" },
  { key: "extract", label: "IA identificando e extraindo" },
  { key: "validate", label: "Validando dados" },
  { key: "route", label: "Roteando para módulo" },
];

export default function ProcessamentoUpload({ onProcessed }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState([]);
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const cameraRef = useRef(null);
  const isBusy = processing.some((f) => !f.done && f.stage !== -1);

  const processFile = async (file, source = "upload") => {
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const updateEntry = (updates) =>
      setProcessing((prev) => prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f)));

    setProcessing((prev) => [...prev, { id: fileId, name: file.name, stage: 0 }]);

    try {
      updateEntry({ stage: 0 });
      const result = await processDocument(file, user);

      updateEntry({ stage: 3, done: true });
      setResults((prev) => [
        {
          id: fileId,
          name: file.name,
          doc: result.doc,
          route: result.route,
          extracted: result.extracted,
          processId: result.processId,
        },
        ...prev,
      ]);
      onProcessed?.();
    } catch (error) {
      updateEntry({ stage: -1, error: error.message });
    }
  };

  const handleFiles = async (fileList, source = "upload") => {
    if (processing.some((f) => !f.done && f.stage !== -1)) {
      // Já tem arquivo em processamento — ignora novo envio para não duplicar
      // (mesmo arquivo processado 2x com resultados diferentes por IA).
      return;
    }
    const files = Array.from(fileList);
    for (const file of files) {
      await processFile(file, source);
    }
    setTimeout(() => setProcessing([]), 4000);
  };

  const routeLabel = (route) => {
    if (!route) return "";
    const labels = {
      contas_pagar: "Contas a Pagar",
      estoque: "Entrada de Estoque",
      pendencia: "Pendência de Conferência",
      documento: "Documento Arquivado",
    };
    return labels[route.routed] || route.routed;
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!isBusy) handleFiles(e.dataTransfer.files, "upload"); }}
        onDragOver={(e) => { e.preventDefault(); if (!isBusy) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => { if (!isBusy) inputRef.current?.click(); }}
        className={cn(
          "cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all",
          isBusy && "pointer-events-none opacity-60 cursor-not-allowed",
          dragOver ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"
        )}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPTED_FILE_TYPES} className="hidden"
          onChange={(e) => { handleFiles(e.target.files, "upload"); e.target.value = ""; }} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { handleFiles(e.target.files, "camera"); e.target.value = ""; }} />

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Zap className="h-8 w-8 text-primary" />
        </div>
        <p className="mt-4 text-lg font-semibold text-foreground">Processar Documento</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Arraste um arquivo, tire foto ou selecione — a IA identifica, extrai e encaminha automaticamente
        </p>
        <p className="mt-2 text-xs text-muted-foreground/70">
          PDF · JPG · PNG · HEIC · XML · Boletos · Notas Fiscais · Comprovantes PIX · Recibos · Contratos
        </p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
        >
          <Camera className="h-4 w-4" /> Fotografar com a Câmera
        </button>
      </div>

      {/* Processing pipeline */}
      {processing.length > 0 && (
        <div className="mt-4 space-y-3">
          {processing.map((f) => (
            <div key={f.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                {f.stage >= 0 && f.stage < 3 && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {f.done && <CheckCircle2 className="h-4 w-4 text-baron-success" />}
                {f.stage === -1 && <XCircle className="h-4 w-4 text-destructive" />}
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate text-sm font-medium text-foreground">{f.name}</span>
              </div>
              {f.stage >= 0 && (
                <div className="mt-3 flex items-center gap-1">
                  {STAGES.map((s, i) => (
                    <React.Fragment key={s.key}>
                      <div className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                        i < f.stage ? "bg-baron-success/15 text-baron-success" :
                        i === f.stage ? "bg-primary/15 text-primary" :
                        "bg-secondary text-muted-foreground"
                      )}>
                        {i < f.stage ? <CheckCircle2 className="h-3 w-3" /> : i === f.stage ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="h-3 w-3 rounded-full border border-current" />}
                        {s.label}
                      </div>
                      {i < STAGES.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
                    </React.Fragment>
                  ))}
                </div>
              )}
              {f.error && <p className="mt-2 text-xs text-destructive">Erro: {f.error}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Documentos Processados</h3>
          {results.map((r) => {
            const route = r.route || {};
            const auto = route.auto;
            const divs = route.divergencias || [];
            const alerts = route.alerts || [];

            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary shrink-0">
                    <span className="text-lg">{getCategoryEmoji(r.doc?.category)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">{r.doc?.title || r.name}</p>
                      {auto ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-baron-success/15 px-2 py-0.5 text-xs font-medium text-baron-success">
                          <CheckCircle2 className="h-3 w-3" /> Auto-processado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-500">
                          <AlertTriangle className="h-3 w-3" /> Pendência
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <ArrowRight className="h-3 w-3" /> {routeLabel(route)}
                      </span>
                    </div>

                    {r.doc?.supplier && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.doc.supplier} · {r.doc.value ? formatBRL(r.doc.value) : "—"} · {r.doc.due_date || r.doc.document_date || ""}
                      </p>
                    )}

                    {/* Divergências */}
                    {divs.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {divs.map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-amber-600">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            {d.message}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Alerts */}
                    {alerts.filter((a) => !divs.find((d) => d.message === a.message)).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {alerts.filter((a) => !divs.find((d) => d.message === a.message)).slice(0, 3).map((a, i) => (
                          <div key={i} className={`flex items-center gap-1.5 text-xs ${a.severity === "urgent" ? "text-destructive" : a.severity === "warning" ? "text-amber-600" : "text-primary"}`}>
                            <Sparkles className="h-3 w-3 shrink-0" />
                            {a.message}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Product matches (NF) */}
                    {route.productMatches && route.productMatches.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">Produtos:</p>
                        {route.productMatches.map((m, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">{m.noteProduct.name}</span>
                            {m.match?.product ? (
                              <span className="text-baron-success">→ {m.match.product.name} ({Math.round(m.match.confidence * 100)}%)</span>
                            ) : (
                              <span className="text-amber-600">→ Produto novo</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Ação direta — não precisa caçar em outra tela */}
                    {!auto && r.processId && (
                      <button
                        onClick={() => navigate(`/processos?open=${r.processId}`)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-baron-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-baron-orange-hover transition-colors"
                      >
                        Resolver agora <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}