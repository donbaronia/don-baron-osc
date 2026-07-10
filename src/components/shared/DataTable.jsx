import React from "react";
import EmptyState from "./EmptyState";
import { Inbox } from "lucide-react";

// Tabela padrão usada em todos os centros.
// columns: [{ key, label, render? , className? }]
export default function DataTable({ columns, rows, loading, emptyTitle, emptyDescription }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-200/60" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return <EmptyState icon={Inbox} title={emptyTitle || "Nenhum registro"} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/80">
              {columns.map((c) => (
                <th key={c.key} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-neutral-50/60">
                {columns.map((c) => (
                  <td key={c.key} className={`px-5 py-3.5 text-neutral-700 ${c.className || ""}`}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}