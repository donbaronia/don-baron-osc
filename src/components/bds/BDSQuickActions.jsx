import React from "react"
import { cn } from "@/lib/utils"
import { Plus, Zap } from "lucide-react"

/**
 * Ações rápidas do Baron Design System — Regra dos 3 Cliques.
 * Exibe botões de acesso rápido para operações comuns do módulo.
 */
export default function BDSQuickActions({ actions = [], className }) {
  if (!actions.length) return null
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="flex items-center gap-1 text-xs font-medium text-neutral-400">
        <Zap className="h-3.5 w-3.5" />
        Ações rápidas
      </span>
      {actions.map((action, idx) => {
        const Icon = action.icon || Plus
        return (
          <button
            key={idx}
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              "flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50",
              action.primary && "border-amber-400 bg-amber-500 text-white hover:bg-amber-600 hover:text-white"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {action.label}
          </button>
        )
      })}
    </div>
  )
}