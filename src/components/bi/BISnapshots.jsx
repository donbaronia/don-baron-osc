import React, { useEffect, useState } from "react";
import { BI } from "@/lib/biEngine";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl } from "@/lib/financialCenter";
import { Database, RefreshCw, Download } from "lucide-react";

export default function BISnapshots() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState("daily");
  const [generating, setGenerating] = useState(false);

  const load = () => {
    setLoading(true);
    BI.getSnapshots(periodType, 50).then(r => { setSnapshots(r); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [periodType]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await BI.generateSnapshot(periodType, "manual");
      load();
    } catch (e) { /* ignore */ }
    setGenerating(false);
  };

  const handleExport = async () => {
    const csv = await BI.exportData("bi_kpis", "csv");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bi_snapshot_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { key: "period_date", label: "Data", render: r => r.period_date },
    { key: "period_type", label: "Tipo", render: r => <span className="capitalize">{r.period_type}</span> },
    { key: "receita_liquida", label: "Receita Líquida", render: r => brl(r.data?.receita_liquida || 0) },
    { key: "lucro_bruto", label: "Lucro Bruto", render: r => brl(r.data?.lucro_bruto || 0) },
    { key: "cmv_pct", label: "CMV %", render: r => `${(r.data?.cmv_pct || 0).toFixed(1)}%` },
    { key: "margem_pct", label: "Margem %", render: r => `${(r.data?.margem_pct || 0).toFixed(1)}%` },
    { key: "pedidos", label: "Pedidos", render: r => r.data?.pedidos || 0 },
    { key: "triggered_by", label: "Origem", render: r => <span className="capitalize">{r.triggered_by}</span> },
    { key: "calculated_at", label: "Gerado em", render: r => new Date(r.calculated_at).toLocaleString("pt-BR") },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6">
        <div className="flex items-start gap-3">
          <Database className="mt-0.5 h-5 w-5 text-blue-500" />
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Data Warehouse</h3>
            <p className="mt-1 text-sm text-neutral-600">
              Banco analítico separado do operacional. Snapshots são imutáveis — nunca recalculados.
              Cada snapshot armazena o estado completo da empresa naquele momento.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-48">
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
              <SelectItem value="annual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 bg-white">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={generating} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Gerando..." : "Gerar Snapshot"}
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={snapshots}
        loading={loading}
        emptyTitle="Nenhum snapshot"
        emptyDescription="Gere o primeiro snapshot para iniciar o data warehouse."
      />
    </div>
  );
}