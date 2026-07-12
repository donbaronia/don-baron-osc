import React from "react";
import EmptyState from "./EmptyState";
import { Inbox } from "lucide-react";

export default function DataTable({ columns, rows, loading, emptyTitle, emptyDescription }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-card" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return <EmptyState icon={Inbox} title={emptyTitle || "Nenhum registro"} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {c.label || c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, idx) => (
              <tr key={row.id || idx} className="transition-colors hover:bg-secondary/40">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-foreground">
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