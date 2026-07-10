import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Core } from "@/lib/coreEngine";
import { PC, brl } from "@/lib/purchasingCenter";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Star, TrendingUp, AlertTriangle, ShieldCheck, ShieldAlert, Award } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";

export default function SupplierScorecard() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try { setRows(await base44.entities.Supplier.filter({ active: true }, "name", 500)); }
    catch { toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => !search || (r.name || "").toLowerCase().includes(search.toLowerCase()));

  const recalcAll = async () => {
    toast({ title: "Recalculando scores..." });
    for (const s of rows.slice(0, 50)) {
      await PC.recalculateSupplierScore(s.id).catch(() => {});
    }
    await load();
    toast({ title: "Scores atualizados!" });
  };

  const scoreColor = (score) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-rose-600";
  };

  const columns = [
    { key: "name", label: "Fornecedor", render: r => (
      <div className="flex items-center gap-2">
        <span className="font-medium text-neutral-900">{r.name}</span>
        {r.is_strategic && <Award className="h-4 w-4 text-violet-500" />}
      </div>
    ) },
    { key: "overall_score", label: "Nota Geral", render: r => (
      <div className="flex items-center gap-1.5">
        <Star className={`h-4 w-4 ${scoreColor(r.overall_score)}`} />
        <span className={`font-semibold ${scoreColor(r.overall_score)}`}>{r.overall_score || 0}/100</span>
      </div>
    ) },
    { key: "pontuality_score", label: "Pontualidade", render: r => <span className={scoreColor(r.pontuality_score)}>{r.pontuality_score || 0}%</span> },
    { key: "price_score", label: "Preço", render: r => <span className={scoreColor(r.price_score)}>{r.price_score || 0}</span> },
    { key: "quality_score", label: "Qualidade", render: r => <span className={scoreColor(r.quality_score)}>{r.quality_score || 0}</span> },
    { key: "reliability_score", label: "Confiabilidade", render: r => <span className={scoreColor(r.reliability_score)}>{r.reliability_score || 0}</span> },
    { key: "total_purchases", label: "Compras", render: r => r.total_purchases || 0 },
    { key: "total_amount_purchased", label: "Total Comprado", render: r => brl(r.total_amount_purchased) },
    { key: "complaint_count", label: "Reclamações", render: r => (r.complaint_count || 0) > 0 ? <span className="text-rose-600">{r.complaint_count}</span> : "0" },
    { key: "risk_level", label: "Risco", render: r => {
      const icon = r.risk_level === "alto" ? <ShieldAlert className="h-4 w-4 text-rose-600" /> : r.risk_level === "medio" ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <ShieldCheck className="h-4 w-4 text-emerald-600" />;
      return <div className="flex items-center gap-1">{icon}<span className="capitalize">{r.risk_level || "baixo"}</span></div>;
    } },
    { key: "last_purchase_date", label: "Última Compra", render: r => r.last_purchase_date ? new Date(r.last_purchase_date).toLocaleDateString("pt-BR") : "—" },
  ];

  return (
    <div className="space-y-4">
      <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("fornecedores_score.csv", filtered)}>
        <Button variant="outline" size="sm" onClick={recalcAll} className="gap-2"><RefreshCw className="h-4 w-4" /> Recalcular Scores</Button>
      </Toolbar>
      <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhum fornecedor" emptyDescription="Cadastre fornecedores no Cadastro Mestre." />
    </div>
  );
}