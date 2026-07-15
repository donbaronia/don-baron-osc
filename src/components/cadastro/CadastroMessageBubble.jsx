import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Wrench } from "lucide-react";

const statusMeta = {
  pending: { icon: Loader2, cls: "text-small-info", spin: true, label: "preparando" },
  running: { icon: Loader2, cls: "text-baron-blue", spin: true, label: "executando" },
  in_progress: { icon: Loader2, cls: "text-baron-blue", spin: true, label: "executando" },
  completed: { icon: CheckCircle2, cls: "text-baron-green", label: "ok" },
  success: { icon: CheckCircle2, cls: "text-baron-green", label: "ok" },
  failed: { icon: XCircle, cls: "text-baron-red", label: "falhou" },
  error: { icon: XCircle, cls: "text-baron-red", label: "erro" },
};

function ToolCall({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const status = toolCall.status || "pending";
  const meta = statusMeta[status] || statusMeta.pending;
  const Icon = meta.icon;
  const isFailed = status === "failed" || status === "error";
  let results = toolCall.results;
  let parsed;
  try { parsed = typeof results === "string" ? JSON.parse(results) : results; } catch { parsed = results; }
  const failedResult = parsed && (parsed.success === false || /error|failed/i.test(JSON.stringify(parsed)));
  const showResults = !isFailed && !failedResult;

  const proj = toolCall.display_projection || {};
  if (proj.hide_details && proj.details_redacted) {
    return (
      <div className="mt-1.5 text-xs text-small-info flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${meta.cls} ${meta.spin ? "animate-spin" : ""}`} />
        <span>{isFailed ? (proj.error_label || "falhou") : (status === "pending" || status === "running" || status === "in_progress" ? (proj.active_label || meta.label) : (proj.label || meta.label))}</span>
      </div>
    );
  }

  const label = toolCall.name || "ferramenta";
  let prettyArgs = toolCall.arguments_string;
  try { prettyArgs = JSON.stringify(JSON.parse(toolCall.arguments_string || "{}"), null, 2); } catch {}

  return (
    <div className="mt-1.5 text-xs rounded-md border border-border bg-secondary/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-table-hover transition-colors"
      >
        {expanded ? <ChevronRight className="h-3 w-3 rotate-90 text-small-info" /> : <ChevronRight className="h-3 w-3 text-small-info" />}
        <Icon className={`h-3.5 w-3.5 ${meta.cls} ${meta.spin ? "animate-spin" : ""}`} />
        <span className="text-secondary-info font-medium">{label}</span>
        <span className={isFailed || failedResult ? "text-baron-red" : "text-small-info"}>· {isFailed || failedResult ? "falhou" : meta.label}</span>
      </button>
      {expanded && (
        <div className="px-2.5 pb-2 pt-1 space-y-1.5 border-t border-border">
          {prettyArgs && prettyArgs !== "{}" && (
            <div>
              <div className="text-small-info mb-0.5">Parametros:</div>
              <pre className="text-secondary-info whitespace-pre-wrap break-all font-mono text-[11px]">{prettyArgs}</pre>
            </div>
          )}
          {showResults && parsed != null && (
            <div>
              <div className="text-small-info mb-0.5">Resultado:</div>
              <pre className="text-secondary-info whitespace-pre-wrap break-all font-mono text-[11px]">{JSON.stringify(parsed, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CadastroMessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${isUser ? "bg-baron-orange text-white" : "bg-card border border-border text-foreground"}`}>
        {message.content && (
          isUser
            ? <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            : <ReactMarkdown className="text-sm prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0">{message.content}</ReactMarkdown>
        )}
        {message.tool_calls?.map((tc, idx) => <ToolCall key={idx} toolCall={tc} />)}
      </div>
    </div>
  );
}