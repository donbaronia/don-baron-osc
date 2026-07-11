import React from "react"
import { Search, Download, Printer, ArrowUpDown, Table, LayoutGrid, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Toolbar padrão para listagens do Baron Design System.
 * Inclui: pesquisa instantânea, ordenação, exportar, imprimir e alternância de visualização.
 */
export default function BDSListToolbar({
  search = "",
  onSearchChange,
  view = "table",
  onViewChange,
  onExport,
  onPrint,
  sortLabel = "Ordenar",
  onSortClick,
  rightSlot,
  className,
}) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Pesquisar..."
            className="h-8 w-full rounded-md border border-neutral-200 bg-white pl-8 pr-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
        {onSortClick && (
          <button
            onClick={onSortClick}
            className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{sortLabel}</span>
          </button>
        )}
        {rightSlot}
      </div>

      <div className="flex items-center gap-1.5">
        {onViewChange && (
          <div className="flex items-center rounded-md border border-neutral-200 bg-white p-0.5">
            <button
              onClick={() => onViewChange("table")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded transition-colors",
                view === "table" ? "bg-amber-50 text-amber-700" : "text-neutral-400 hover:text-neutral-700"
              )}
              title="Visualização em tabela"
            >
              <Table className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onViewChange("cards")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded transition-colors",
                view === "cards" ? "bg-amber-50 text-amber-700" : "text-neutral-400 hover:text-neutral-700"
              )}
              title="Visualização em cartões"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="flex h-8 items-center gap-1.5 rounded-md bg-bds-export px-3 text-xs font-medium text-bds-export-fg shadow transition-colors hover:brightness-110"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        )}
        {onPrint && (
          <button
            onClick={onPrint}
            className="flex h-8 items-center gap-1.5 rounded-md bg-bds-print px-3 text-xs font-medium text-bds-print-fg shadow transition-colors hover:brightness-110"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        )}
      </div>
    </div>
  )
}