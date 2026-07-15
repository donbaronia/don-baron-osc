import React, { useMemo, useState, useEffect } from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Download, Settings2, Inbox, FileText, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { exportCSV, exportPDF } from "./grid/exportGrid";

/**
 * DataGrid Enterprise — único componente de tabela do Don Baron.
 * Pesquisa instantânea, ordenação, paginação, colunas ocultáveis,
 * exportação CSV/PDF, hover, linha selecionada, badges e ações rápidas.
 *
 * columns: [{ key, header, width?, align?, sortable?, type?, render?, value?, badge?, exportable? }]
 */
export function DataGrid({
  columns,
  data = [],
  title = "Registros",
  rowKey = "id",
  searchable = true,
  pageSize = 10,
  exportable = true,
  onRowClick,
  loading = false,
  emptyText = "Nenhum registro encontrado.",
  storageKey,
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState(() => {
    if (!storageKey) return {};
    try { return JSON.parse(localStorage.getItem(`dg:${storageKey}`) || "{}"); } catch { return {}; }
  });
  const [selectedId, setSelectedId] = useState(null);
  const [showCols, setShowCols] = useState(false);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (storageKey) localStorage.setItem(`dg:${storageKey}`, JSON.stringify(hidden));
  }, [hidden, storageKey]);

  const visibleCols = useMemo(() => columns.filter((c) => !hidden[c.key]), [columns, hidden]);

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      columns.some((c) => {
        const v = c.value ? c.value(row) : row[c.key];
        return v !== null && v !== undefined && String(v).toLowerCase().includes(q);
      })
    );
  }, [data, query, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    const get = (r) => (col?.value ? col.value(r) : r[sortKey]);
    return [...filtered].sort((a, b) => {
      const va = get(a), vb = get(b);
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (col) => {
    if (col.sortable === false) return;
    if (sortKey === col.key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(col.key); setSortDir("asc"); }
  };

  const renderCell = (row, col) => {
    if (col.render) return col.render(row);
    const v = col.value ? col.value(row) : row[col.key];
    if (col.badge) {
      const map = col.badge;
      const variant = typeof map === "function" ? map(v, row) : map[v] || "gray";
      return <Badge variant={variant}>{v}</Badge>;
    }
    if (col.type === "currency" && v != null && !isNaN(Number(v))) return <span className="text-foreground font-medium">{Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>;
    if (col.type === "qty" && v != null) return <span className="text-baron-green font-semibold">{v}</span>;
    if (col.type === "code") return <span className="text-secondary-info">{v}</span>;
    return <span className="text-foreground">{v ?? "—"}</span>;
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
        <h3 className="text-sm font-semibold text-foreground">{title} <span className="text-secondary-info font-normal">({sorted.length})</span></h3>
        <div className="flex items-center gap-2">
          {searchable && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-small-info" />
              <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Buscar..." className="h-9 w-56 rounded-[10px] pl-9 text-sm" />
            </div>
          )}
          <div className="relative">
            <Button variant="outline" size="small" onClick={() => { setShowCols((s) => !s); setShowExport(false); }}>
              <Settings2 className="h-4 w-4" /> Colunas
            </Button>
            {showCols && (
              <div className="absolute right-0 z-30 mt-1 w-52 rounded-[10px] border border-border bg-card p-2 shadow-lg">
                {columns.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-table-hover">
                    <input type="checkbox" checked={!hidden[c.key]} onChange={() => setHidden((h) => ({ ...h, [c.key]: !h[c.key] }))} className="accent-baron-orange" />
                    {c.header || c.key}
                  </label>
                ))}
              </div>
            )}
          </div>
          {exportable && (
            <div className="relative">
              <Button variant="outline" size="small" onClick={() => { setShowExport((s) => !s); setShowCols(false); }}>
                <Download className="h-4 w-4" /> Exportar
              </Button>
              {showExport && (
                <div className="absolute right-0 z-30 mt-1 w-44 rounded-[10px] border border-border bg-card p-1 shadow-lg">
                  <button onClick={() => { exportCSV(title, visibleCols, sorted); setShowExport(false); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-table-hover">
                    <FileSpreadsheet className="h-4 w-4 text-baron-green" /> Excel (CSV)
                  </button>
                  <button onClick={() => { exportPDF(title, visibleCols, sorted); setShowExport(false); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-table-hover">
                    <FileText className="h-4 w-4 text-baron-red" /> PDF
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="baron-table">
          <thead>
            <tr>
              {visibleCols.map((c) => (
                <th key={c.key} style={{ width: c.width, textAlign: c.align || "left" }} onClick={() => toggleSort(c)} className={c.sortable === false ? "" : "cursor-pointer select-none"}>
                  <span className="inline-flex items-center gap-1">
                    {c.header || c.key}
                    {c.sortable !== false && (sortKey === c.key ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-baron-orange" /> : <ArrowDown className="h-3 w-3 text-baron-orange" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={visibleCols.length} className="py-10 text-center text-secondary-info">Carregando...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={visibleCols.length} className="py-12 text-center"><div className="flex flex-col items-center gap-2 text-secondary-info"><Inbox className="h-8 w-8 opacity-40" /><span className="text-sm">{emptyText}</span></div></td></tr>
            ) : (
              pageRows.map((row, i) => (
                <tr key={row[rowKey] ?? i} onClick={() => { setSelectedId(row[rowKey]); onRowClick?.(row); }} className={`cursor-pointer ${selectedId === row[rowKey] ? "!bg-baron-orange/10" : ""}`}>
                  {visibleCols.map((c) => (
                    <td key={c.key} style={{ textAlign: c.align || "left" }} className={c.type === "currency" ? "col-value" : c.type === "code" ? "col-code" : c.type === "qty" ? "col-qty" : ""}>
                      {renderCell(row, c)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {sorted.length > pageSize && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-secondary-info">
          <span>Página {currentPage} de {totalPages} · {sorted.length} registros</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataGrid;