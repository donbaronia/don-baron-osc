import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BaronSelect } from "@/design-system";
import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const ENTITY_OPTIONS = [
  { value: "Product", label: "Produtos" },
  { value: "Supplier", label: "Fornecedores" },
  { value: "Customer", label: "Clientes" },
  { value: "FinancialTransaction", label: "Transações Financeiras" },
  { value: "Purchase", label: "Compras" },
  { value: "ProductionRecord", label: "Produção" },
];

const FORMAT_OPTIONS = [
  { value: "json", label: "JSON", icon: FileJson },
  { value: "csv", label: "CSV", icon: FileSpreadsheet },
  { value: "xml", label: "XML", icon: FileText },
];

export default function UniversalExporter() {
  const [entity, setEntity] = useState("Product");
  const [format, setFormat] = useState("json");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const items = await base44.entities[entity].list('-created_date', 500);

      if (format === "json") {
        const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
        downloadBlob(blob, `${entity}.json`);
      } else if (format === "csv") {
        const csv = convertToCSV(items);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        downloadBlob(blob, `${entity}.csv`);
      } else if (format === "xml") {
        const xml = convertToXML(items, entity);
        const blob = new Blob([xml], { type: "application/xml" });
        downloadBlob(blob, `${entity}.xml`);
      }

      toast({ title: `${items.length} registro(s) exportado(s)` });
    } catch (err) {
      toast({ title: "Erro na exportação", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (items) => {
    if (!items || items.length === 0) return "";
    const keys = Object.keys(items[0]).filter((k) => typeof items[0][k] !== "object" || items[0][k] === null);
    const header = keys.join(",");
    const rows = items.map((item) =>
      keys.map((k) => {
        const val = item[k] ?? "";
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(",")
    );
    return [header, ...rows].join("\n");
  };

  const convertToXML = (items, rootName) => {
    const escapeXml = (s) => String(s ?? "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
    const itemToXml = (item, depth = 2) => {
      const pad = "  ".repeat(depth);
      return Object.entries(item)
        .filter(([, v]) => typeof v !== "object" || v === null)
        .map(([k, v]) => `${pad}<${k}>${escapeXml(v)}</${k}>`)
        .join("\n");
    };
    return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}List>\n${items.map((item) => `  <${rootName}>\n${itemToXml(item)}\n  </${rootName}>`).join("\n")}\n</${rootName}List>`;
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
      <h3 className="text-sm font-semibold text-neutral-800">Exportar Dados</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Entidade</Label>
          <BaronSelect value={entity} onChange={setEntity} options={ENTITY_OPTIONS} />
        </div>
        <div>
          <Label>Formato</Label>
          <BaronSelect value={format} onChange={setFormat} options={FORMAT_OPTIONS.map((f) => ({ value: f.value, label: f.label, icon: f.icon }))} />
        </div>
      </div>
      <Button onClick={handleExport} disabled={loading}>
        <Download className="h-4 w-4" /> Exportar
      </Button>
    </div>
  );
}