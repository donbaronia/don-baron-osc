import React from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Cabeçalho padrão do Baron Design System.
 * Toda tela deverá possuir: Título, Subtítulo, Breadcrumb e Ações.
 */
export default function BDSPageHeader({ title, subtitle, breadcrumbs = [], actions, className }) {
  return (
    <div className={cn("flex flex-col gap-3 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {breadcrumbs.length > 0 && (
          <nav className="mb-1.5 flex items-center gap-1 text-xs text-neutral-400">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <React.Fragment key={idx}>
                  {crumb.href && !isLast ? (
                    <Link to={crumb.href} className="transition-colors hover:text-neutral-700">{crumb.label}</Link>
                  ) : (
                    <span className={cn(isLast && "font-medium text-neutral-600")}>{crumb.label}</span>
                  )}
                  {!isLast && <ChevronRight className="h-3 w-3 text-neutral-300" />}
                </React.Fragment>
              )
            })}
          </nav>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}