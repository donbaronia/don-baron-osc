import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { brl, todayStr } from "@/lib/financialCenter";
import { FileText, AlertTriangle, PackageX, Wallet, TrendingUp } from "lucide-react";

export default function CommandPriorities() {
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const today = todayStr();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);

    Promise.all([
      base44.entities.Payment.filter({ due_date: today, status: "pendente" }, "-created_date", 50).catch(() => []),
      base44.entities.DBDocument.filter({ status: "aguardando_confirmacao", deleted_at: { $exists: false } }, "-created_date", 50).catch(() => []),
      base44.entities.Product.filter({ active: true, status: "ativo" }, "-created_date", 200).catch(() => []),
      base44.entities.Payment.filter({ status: "pendente" }, "-due_date", 100).catch(() => []),
      base44.entities.Sale.list("-created_date", 50).catch(() => []),
    ]).then(([dueToday, pendingDocs, products, allPending, sales]) => {
      const list = [];

      if (dueToday.length > 0) {
        const total = dueToday.reduce((s, p) => s + (p.amount || 0), 0);
        list.push({
          icon: FileText,
          color: "text-amber-400",
          text: `${dueToday.length} boleto(s) vencem hoje (${brl(total)})`,
          route: "/financeiro",
        });
      }

      const notasPendentes = pendingDocs.filter((d) =>
        (d.category === "nota_fiscal" || d.category === "xml") &&
        (d.alerts || []).some((a) => a.type === "produtos_novos" || a.type === "preco_alterado")
      );
      if (notasPendentes.length > 0) {
        list.push({
          icon: AlertTriangle,
          color: "text-amber-400",
          text: `${notasPendentes.length} nota(s) fiscal(is) aguardando aprovação`,
          route: "/processamento",
        });
      }

      const lowStock = products.filter((p) =>
        p.controls_stock && (p.stock_quantity || 0) <= (p.min_quantity || 0) && (p.min_quantity || 0) > 0
      );
      if (lowStock.length > 0) {
        const names = lowStock.slice(0, 3).map((p) => p.short_name || p.name);
        list.push({
          icon: PackageX,
          color: "text-destructive",
          text: `Estoque baixo: ${names.join(", ")}${lowStock.length > 3 ? "..." : ""}`,
          route: "/estoque",
        });
      }

      const fluxoHoje = allPending
        .filter((p) => p.due_date === today)
        .reduce((s, p) => s + (p.amount || 0), 0);
      if (fluxoHoje > 0) {
        list.push({
          icon: Wallet,
          color: "text-primary",
          text: `Fluxo de caixa previsto hoje: ${brl(fluxoHoje)}`,
          route: "/financeiro",
        });
      }

      const ySales = (sales || []).filter((s) => s.created_date?.startsWith(yStr));
      const fatOntem = ySales.reduce((s, sale) => s + (sale.total || sale.amount || 0), 0);
      if (fatOntem > 0) {
        list.push({
          icon: TrendingUp,
          color: "text-baron-success",
          text: `Faturamento de ontem: ${brl(fatOntem)}`,
          route: "/relatorios",
        });
      }

      setPriorities(list);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-6 animate-pulse rounded-lg bg-secondary" />
        ))}
      </div>
    );
  }

  if (priorities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma prioridade crítica no momento. Tudo sob controle.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Hoje encontrei algumas prioridades:
      </p>
      {priorities.map((p, i) => {
        const Icon = p.icon;
        return (
          <button
            key={i}
            onClick={() => navigate(p.route)}
            className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-secondary"
          >
            <Icon className={`h-4 w-4 shrink-0 ${p.color}`} />
            <span>{p.text}</span>
          </button>
        );
      })}
    </div>
  );
}