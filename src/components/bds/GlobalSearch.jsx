import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { base44 } from "@/api/base44Client"
import { Search, User, Package, Truck, Target, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const SEARCH_SOURCES = [
  { entity: "Employee", label: "Funcionário", field: "full_name", route: "/rh", icon: User },
  { entity: "Product", label: "Produto", field: "name", route: "/cadastro", icon: Package },
  { entity: "Supplier", label: "Fornecedor", field: "name", route: "/cadastro", icon: Truck },
  { entity: "Mission", label: "Missão", field: "name", route: "/missions", icon: Target },
]

export default function GlobalSearch({ className }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query.trim()
    const timer = setTimeout(async () => {
      try {
        const settled = await Promise.allSettled(
          SEARCH_SOURCES.map((src) =>
            base44.entities[src.entity].filter(
              { [src.field]: { $regex: q, $options: "i" } },
              "-created_date",
              3
            )
          )
        )
        const combined = []
        settled.forEach((res, idx) => {
          if (res.status === "fulfilled" && Array.isArray(res.value)) {
            res.value.forEach((item) => {
              combined.push({
                label: item[SEARCH_SOURCES[idx].field] || "Sem nome",
                type: SEARCH_SOURCES[idx].label,
                route: SEARCH_SOURCES[idx].route,
                icon: SEARCH_SOURCES[idx].icon,
              })
            })
          }
        })
        setResults(combined.slice(0, 12))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (item) => {
    setOpen(false)
    setQuery("")
    navigate(item.route)
  }

  return (
    <div ref={containerRef} className={cn("relative flex-1 max-w-md", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Pesquisar funcionários, produtos, fornecedores, missões..."
          data-bds-search
          className="h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm text-neutral-700 placeholder:text-neutral-400 transition-colors focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          {results.length === 0 && !loading ? (
            <div className="px-4 py-6 text-center text-sm text-neutral-400">
              Nenhum resultado encontrado para "{query}"
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((item, idx) => {
                const Icon = item.icon
                return (
                  <li key={idx}>
                    <button
                      onClick={() => handleSelect(item)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-neutral-50"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="min-w-0 flex-1 truncate text-sm text-neutral-700">{item.label}</span>
                      <span className="shrink-0 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-500">{item.type}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}