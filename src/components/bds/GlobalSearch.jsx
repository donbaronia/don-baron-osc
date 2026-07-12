import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search, User, Package, Truck, Target, FileText, Wallet, Bike, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SEARCH_SOURCES = [
  { entity: "Employee", label: "RH", sublabel: "Colaboradores", field: "full_name", route: "/rh", icon: User },
  { entity: "Product", label: "Estoque", sublabel: "Produtos", field: "name", route: "/estoque", icon: Package },
  { entity: "Supplier", label: "Compras", sublabel: "Fornecedores", field: "name", route: "/compras", icon: Truck },
  { entity: "Mission", label: "Missões", sublabel: "Missão", field: "name", route: "/missions", icon: Target },
  { entity: "FinancialTransaction", label: "Financeiro", sublabel: "Transação", field: "description", route: "/financeiro", icon: Wallet },
  { entity: "Courier", label: "Motoboys", sublabel: "Entregador", field: "name", route: "/motoboys", icon: Bike },
  { entity: "DBDocument", label: "Documentos", sublabel: "Documento", field: "title", route: "/documentos", icon: FileText },
];

export default function GlobalSearch({ className }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query.trim();
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
        );
        const combined = [];
        settled.forEach((res, idx) => {
          if (res.status === "fulfilled" && Array.isArray(res.value)) {
            res.value.forEach((item) => {
              combined.push({
                label: item[SEARCH_SOURCES[idx].field] || "Sem nome",
                type: SEARCH_SOURCES[idx].label,
                sublabel: SEARCH_SOURCES[idx].sublabel,
                route: SEARCH_SOURCES[idx].route,
                icon: SEARCH_SOURCES[idx].icon,
              });
            });
          }
        });
        setResults(combined.slice(0, 12));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item) => {
    setOpen(false);
    setQuery("");
    navigate(item.route);
  };

  return (
    <div ref={containerRef} className={cn("relative flex-1 max-w-md", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Pesquisar..."
          data-bds-search
          className="h-9 w-full rounded-lg border border-border bg-secondary pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          {results.length === 0 && !loading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado para "{query}"
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <li key={idx}>
                    <button
                      onClick={() => handleSelect(item)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-secondary"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground">{item.type} · {item.sublabel}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}