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
      base44.entities.ProductionRecord.filter({ created_date: { $gte: since } }, "-created_date", 100).catch(() => []),
    ]).then(([docs, payments, products, production]) => {
      const nfProcessed = docs.filter((d) => d.status === "processado" && (d.category === "nota_fiscal" || d.category === "xml")).length;
      const boletosRegistered = payments.filter((p) => p.status === "pendente" || p.status === "pago").length;
      setSummary({
        docsAnalyzed: docs.length,
        boletosRegistered,
        productsUpdated: products.length,
        nfsProcessed: nfProcessed,
        production: production.length,
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

  const items = [
    summary.docsAnalyzed > 0 && { text: `Analisei ${summary.docsAnalyzed} documento(s).` },
    summary.boletosRegistered > 0 && { text: `Cadastrei ${summary.boletosRegistered} boleto(s).` },
    summary.productsUpdated > 0 && { text: `Atualizei ${summary.productsUpdated} produto(s).` },
    summary.nfsProcessed > 0 && { text: `Processamos ${summary.nfsProcessed} nota(s) fiscal(is).` },
    summary.production > 0 && { text: `Registramos ${summary.production} produção(ões).` },
  ].filter(Boolean);

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhuma atividade nova desde sua última visita.</p>;
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-baron-success shrink-0" />
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}