import React from "react";
import EmptyState from "./EmptyState";
import { Inbox } from "lucide-react";

export default function DataTable({ columns, rows, loading, emptyTitle, emptyDescription }) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-md bg-table-row border border-table-border" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return <EmptyState icon={Inbox} title={emptyTitle || "Nenhum registro"} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-table-border bg-table-header">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-small-info">
                  {c.label || c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id || idx} className="border-b border-table-border bg-table-row transition-colors duration-150 hover:bg-table-hover last:border-0">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3.5 text-primary-info">
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