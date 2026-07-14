import * as React from "react";
import { cn } from "@/lib/utils";

// Padrão único de status operacional
// Online, Sincronizando, Processando, Erro, Sucesso, Aguardando
const STATUS_MAP = {
  online: { color: "bg-baron-green", label: "Online", pulse: false },
  sincronizando: { color: "bg-baron-blue", label: "Sincronizando", pulse: true },
  processando: { color: "bg-baron-blue", label: "Processando", pulse: true },
  erro: { color: "bg-baron-red", label: "Erro", pulse: false },
  sucesso: { color: "bg-baron-green", label: "Sucesso", pulse: false },
  aguardando: { color: "bg-baron-yellow", label: "Aguardando", pulse: false },
  offline: { color: "bg-secondary-foreground/40", label: "Offline", pulse: false },
};

export function BaronStatus({ status = "online", label, size = "sm", showLabel = true }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.online;
  const dot = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";

  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex">
        {cfg.pulse && (
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", cfg.color)} />
        )}
        <span className={cn("relative inline-flex rounded-full", dot, cfg.color)} />
      </span>
      {showLabel && (
        <span className="text-secondary-info text-xs font-medium">
          {label || cfg.label}
        </span>
      )}
    </span>
  );
}