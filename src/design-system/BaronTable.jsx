import * as React from "react";
import { cn } from "@/lib/utils";
import { VALUE_COLORS } from "./colors";

// ============================================================
// BaronTable — tabela enterprise completa
// Cabeçalho fixo, hover, seleção, ordenação, busca, paginação, responsividade
// Destaque semântico por tipo de valor (valueColor em colunas)
// ============================================================

const SortIcon = ({ active, dir }) => (
  <span className={cn("ml-1 inline-block transition-opacity", active ? "opacity-100" : "opacity-30")}>
    {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
  </span>
);

export function BaronTable({
  columns, // [{ key, label, sortable?, valueColor?, render?, className? }]
  data, // array de registros
  loading = false,
  searchable = true,
  searchPlaceholder = "Buscar...",
  searchKeys, // chaves para buscar (default: todas as chaves de columns)
  pageSize = 10,
  emptyTitle = "Nenhum registro",
  emptyDescription = "Não há dados para exibir no momento.",
  emptyAction,
  onRowClick,
  initialSort, // { key, dir: "asc" | "desc" }
}) {
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState(initialSort || null);
  const [page, setPage] = React.useState(0);
  const [selected, setSelected] = React.useState(null);

  const keys = searchKeys || columns.map((c) => c.key);

  // Filtragem
  const filtered = React.useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      keys.some((k) => String(row[k] ?? "").toLowerCase().includes(q))
    );
  }, [data, search, keys]);

  // Ordenação
  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return sort.dir === "asc" ? av - bv : bv - av;
      }
      return sort.dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [filtered, sort, columns]);

  // Paginação
  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageData = sorted.slice(page * pageSize, page * pageSize + pageSize);

  const handleSort = (col) => {
    if (!col.sortable) return;
    setSort((prev) => {
      if (prev?.key === col.key) {
        return { key: col.key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key: col.key, dir: "asc" };
    });
    setPage(0);
  };

  // Skeleton loading
  if (loading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-card border border-border" />
        ))}
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-small-info">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <div>
          <p className="text-primary-info text-sm font-semibold">{emptyTitle}</p>
          <p className="text-small-info mt-1 text-xs">{emptyDescription}</p>
        </div>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Busca + Info */}
      {searchable && (
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-small-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-primary-info transition-all placeholder:text-small-info focus-visible:border-baron-orange focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-baron-orange"
            />
          </div>
          <p className="text-small-info whitespace-nowrap text-xs">
            {sorted.length} {sorted.length === 1 ? "registro" : "registros"}
          </p>
        </div>
      )}

      {/* Tabela — wrapper responsivo */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-header">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col)}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-small-info whitespace-nowrap",
                      col.sortable && "cursor-pointer select-none hover:text-primary-info"
                    )}
                  >
                    {col.label}
                    {col.sortable && <SortIcon active={sort?.key === col.key} dir={sort?.dir} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  onClick={() => { setSelected(row.id || idx); onRowClick?.(row); }}
                  className={cn(
                    "border-b border-border transition-colors duration-150 last:border-0 cursor-default",
                    selected === (row.id || idx) ? "bg-baron-orange/5" : "hover:bg-card-hover"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 whitespace-nowrap",
                        col.valueColor ? VALUE_COLORS[col.valueColor] : "text-primary-info",
                        col.className
                      )}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <p className="text-small-info">
            Página {page + 1} de {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md border border-border px-3 py-1.5 text-secondary-info transition-colors hover:bg-card-hover disabled:opacity-30"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-md border border-border px-3 py-1.5 text-secondary-info transition-colors hover:bg-card-hover disabled:opacity-30"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}