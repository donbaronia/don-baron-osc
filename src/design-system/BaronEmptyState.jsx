import * as React from "react";
import { cn } from "@/lib/utils";

// Empty state padronizado — nunca mostrar tabela vazia
export function BaronEmptyState({
  icon: Icon,
  title = "Nenhum registro",
  description = "Não há dados para exibir no momento.",
  action, // elemento (botão) de ação
  className,
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center", className)}>
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-small-info">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <div>
        <p className="text-primary-info text-sm font-semibold">{title}</p>
        <p className="text-small-info mt-1.5 text-xs">{description}</p>
      </div>
      {action}
    </div>
  );
}