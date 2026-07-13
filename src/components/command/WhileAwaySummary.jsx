import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function WhileAwaySummary() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const lastLogin = localStorage.getItem("baron_last_login");
    const since = lastLogin || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem("baron_last_login", new Date().toISOString());

    Promise.all([
      base44.entities.DBDocument.filter({ created_date: { $gte: since } }, "-created_date", 200).catch(() => []),
      base44.entities.Payment.filter({ created_date: { $gte: since } }, "-created_date", 100).catch(() => []),
      base44.entities.Product.filter({ updated_date: { $gte: since } }, "-updated_date", 500).catch(() => []),
    ]).then(([docs, payments, products]) => {
      const nfs = docs.filter((d) => d.category === "nota_fiscal" || d.category === "xml").length;
      setSummary({
        docsProcessed: docs.length,
        boletosRegistered: payments.length,
        nfsLancadas: nfs,
        stockUpdated: products.length > 0,
      });
    });
  }, []);

  if (!summary) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Analisando atividade recente...
      </div>
    );
  }

  const lines = [];
  if (summary.docsProcessed > 0) lines.push(`${summary.docsProcessed} documentos processados`);
  if (summary.boletosRegistered > 0) lines.push(`${summary.boletosRegistered} boletos cadastrados`);
  if (summary.nfsLancadas > 0) lines.push(`${summary.nfsLancadas} notas fiscais lançadas`);
  if (summary.stockUpdated) lines.push("Estoque atualizado");

  if (lines.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhuma atividade nova desde sua última visita.</p>;
  }

  return (
    <div className="space-y-1">
      {lines.map((line, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-baron-success shrink-0" />
          <span>{line}</span>
        </div>
      ))}
    </div>
  );
}