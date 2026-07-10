import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { exportToCsv } from "@/lib/exportCsv";
import { formatBRL, formatDate, getCategoryLabel, getCategoryEmoji } from "@/lib/documentUtils";
import { RefreshCw, Download, FileText, AlertTriangle, TrendingUp, Copy, FileCheck, FolderOpen, Tag } from "lucide-react";

export default function DocumentReports() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setDocs(await base44.entities.DBDocument.list("-created_date", 500));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const active = docs.filter((d) => !d.deleted_at);
    const byCategory = {};
    const bySupplier = {};
    const byStatus = {};
    const duplicates = active.filter((d) => d.duplicate_of);
    const withAlerts = active.filter((d) => (d.alerts || []).length > 0);
    const priceChanges = active.flatMap((d) => (d.ia_analysis?.price_changes || []).map((pc) => ({ ...pc, doc: d.title })));
    const pendingBoletos = active.filter((d) => (d.category === "boleto" || d.category === "comprovante_pix") && d.status !== "processado");
    const contracts = active.filter((d) => d.category === "contrato");
    const xmls = active.filter((d) => d.category === "xml" || (d.file_type || "").includes("xml"));
    const failedOcr = active.filter((d) => d.status === "recebido" && d.notes?.includes("Falha"));
    const totalValue = active.filter((d) => d.status === "processado").reduce((s, d) => s + (d.value || 0), 0);

    for (const d of active) {
      byCategory[d.category] = (byCategory[d.category] || 0) + 1;
      if (d.supplier) bySupplier[d.supplier] = (bySupplier[d.supplier] || 0) + 1;
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    }

    const allTags = active.flatMap((d) => [...(d.auto_tags || []), ...(d.tags || [])]);
    const tagCounts = {};
    for (const t of allTags) tagCounts[t] = (tagCounts[t] || 0) + 1;

    return {
      total: active.length,
      byCategory, bySupplier, byStatus,
      duplicates, withAlerts, priceChanges, pendingBoletos, contracts, xmls, failedOcr,
      totalValue, tagCounts,
    };
  }, [docs]);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;

  const Card = ({ icon: Icon, title, value, color = "neutral", subtitle }) => (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-500">{title}</span>
        <Icon className={`h-5 w-5 text-${color}-500`} />
      </div>
      <p className="mt-2 text-2xl font-bold text-neutral-900">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-neutral-400">{subtitle}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-neutral-900">Relatorios do Centro de Documentos</h3>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={FileText} title="Total de Documentos" value={stats.total} color="neutral" />
        <Card icon={FileCheck} title="Processados" value={stats.byStatus["processado"] || 0} color="emerald" subtitle={`Valor total: ${formatBRL(stats.totalValue)}`} />
        <Card icon={AlertTriangle} title="Com Alertas" value={stats.withAlerts.length} color="amber" />
        <Card icon={Copy} title="Duplicatas" value={stats.duplicates.length} color="purple" />
      </div>

      {/* By category */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-neutral-700">Documentos por Categoria</h4>
          <button onClick={() => exportToCsv("docs_por_categoria.csv", Object.entries(stats.byCategory).map(([k, v]) => ({ categoria: k, quantidade: v })))} className="text-xs text-neutral-500 hover:text-neutral-700 inline-flex items-center gap-1">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
            <div key={cat} className="flex items-center justify-between">
              <span className="text-sm text-neutral-700">{getCategoryEmoji(cat)} {getCategoryLabel(cat)}</span>
              <span className="text-sm font-medium text-neutral-900">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By supplier */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-neutral-700">Documentos por Fornecedor</h4>
          <button onClick={() => exportToCsv("docs_por_fornecedor.csv", Object.entries(stats.bySupplier).map(([k, v]) => ({ fornecedor: k, quantidade: v })))} className="text-xs text-neutral-500 hover:text-neutral-700 inline-flex items-center gap-1">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {Object.entries(stats.bySupplier).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([sup, count]) => (
            <div key={sup} className="flex items-center justify-between">
              <span className="text-sm text-neutral-700">{sup}</span>
              <span className="text-sm font-medium text-neutral-900">{count}</span>
            </div>
          ))}
          {Object.keys(stats.bySupplier).length === 0 && <p className="text-sm text-neutral-400">Nenhum fornecedor</p>}
        </div>
      </div>

      {/* Price changes */}
      {stats.priceChanges.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-amber-500" /><h4 className="text-sm font-semibold text-neutral-700">Alteracoes de Preco Detectadas</h4></div>
            <button onClick={() => exportToCsv("alteracoes_preco.csv", stats.priceChanges.map(pc => ({ produto: pc.product_name, preco_anterior: pc.old_price, preco_novo: pc.new_price, variacao_pct: pc.change_pct.toFixed(1), documento: pc.doc })))} className="text-xs text-neutral-500 hover:text-neutral-700 inline-flex items-center gap-1">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {stats.priceChanges.slice(0, 20).map((pc, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">{pc.product_name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-neutral-400">{formatBRL(pc.old_price)} → {formatBRL(pc.new_price)}</span>
                  <span className={`font-medium ${pc.change_pct > 0 ? "text-rose-600" : "text-emerald-600"}`}>{pc.change_pct > 0 ? "+" : ""}{pc.change_pct.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {Object.keys(stats.tagCounts).length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4"><Tag className="h-5 w-5 text-neutral-500" /><h4 className="text-sm font-semibold text-neutral-700">Tags em Uso</h4></div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.tagCounts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => (
              <span key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
                {tag} <span className="rounded-full bg-neutral-300 px-1.5 text-neutral-700 font-medium">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pending items */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card icon={FolderOpen} title="Boletos Pendentes" value={stats.pendingBoletos.length} color="amber" />
        <Card icon={FileText} title="Contratos" value={stats.contracts.length} color="blue" />
        <Card icon={AlertTriangle} title="Falhas de OCR" value={stats.failedOcr.length} color="rose" />
      </div>
    </div>
  );
}