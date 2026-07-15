/** Utilitários de exportação do DataGrid (CSV/Excel + PDF). */
import { jsPDF } from "jspdf";

function cellValue(row, col) {
  if (col.value) return col.value(row);
  return row[col.key];
}

function toText(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  return String(v);
}

export function exportCSV(filename, columns, rows) {
  const head = columns.map((c) => `"${c.header || c.key}"`).join(",");
  const body = rows
    .map((r) => columns.map((c) => `"${toText(cellValue(r, c)).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const csv = "\uFEFF" + head + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function exportPDF(title, columns, rows) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);

  const startY = 24;
  const colW = Math.floor((doc.internal.pageSize.getWidth() - 28) / columns.length);
  // Cabeçalho
  doc.setFont(undefined, "bold");
  columns.forEach((c, i) => {
    doc.text(String(c.header || c.key).slice(0, 22), 14 + i * colW, startY);
  });
  // Linhas
  doc.setFont(undefined, "normal");
  rows.slice(0, 40).forEach((r, ri) => {
    const y = startY + 6 + ri * 6;
    columns.forEach((c, ci) => {
      doc.text(toText(cellValue(r, c)).slice(0, 22), 14 + ci * colW, y);
    });
  });
  if (rows.length > 40) doc.text(`... +${rows.length - 40} registros`, 14, startY + 6 + 40 * 6);
  doc.save(filenameSafe(title) + ".pdf");
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function filenameSafe(s) {
  return String(s || "export").replace(/[^\w\- ]/g, "").replace(/\s+/g, "_");
}