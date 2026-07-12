import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import {
  TrendingUp, DollarSign, PiggyBank, Percent, Wallet, ArrowDownCircle,
  ArrowUpCircle, FileWarning, PackageX, ShoppingCart, Factory, Sparkles,
} from "lucide-react";

const brl = (n) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ transactions: [], products: [], purchases: [], production: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [transactions, products, purchases, production] = await Promise.all([
        base44.entities.FinancialTransaction.list("-created_date", 200),
        base44.entities.Product.list("-created_date", 200),
        base44.entities.Purchase.list("-created_date", 200),
        base44.entities.ProductionRecord.list("-created_date", 200),
      ]);
      setData({ transactions, products, purchases, production });
      setLoading(false);
    })();
  }, []);

  const aPagar = data.transactions.filter((t) => t.type === "a_pagar" && t.status !== "pago");
  const aReceber = data.transactions.filter((t) => t.type === "a_receber" && t.status !== "recebido");
  const totalPagar = aPagar.reduce((s, t) => s + (t.amount || 0), 0);
  const totalReceber = aReceber.reduce((s, t) => s + (t.amount || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const boletosVencendo = aPagar.filter((t) => t.due_date && t.due_date <= today).length;
  const estoqueCritico = data.products.filter((p) => (p.stock_quantity || 0) <= (p.min_quantity || 0)).length;
  const comprasPendentes = data.purchases.filter((p) => p.status === "pendente").length;
  const producaoHoje = data.production.filter((p) => p.production_date === today).length;

  const receita = totalReceber;
  const lucro = totalReceber - totalPagar;

  const cards = [
    { icon: TrendingUp, label: "Venda da Semana", value: brl(receita * 0.4), hint: "Estimativa" },
    { icon: DollarSign, label: "Receita Líquida", value: brl(receita) },
    { icon: PiggyBank, label: "Lucro Estimado", value: brl(lucro), tone: lucro >= 0 ? "positive" : "negative" },
    { icon: Percent, label: "CMV", value: "—", hint: "Aguardando dados" },
    { icon: Wallet, label: "Fluxo de Caixa", value: brl(lucro), tone: lucro >= 0 ? "positive" : "negative" },
    { icon: ArrowUpCircle, label: "Contas a Pagar", value: brl(totalPagar), tone: "negative", hint: `${aPagar.length} pendentes` },
    { icon: ArrowDownCircle, label: "Contas a Receber", value: brl(totalReceber), tone: "positive", hint: `${aReceber.length} pendentes` },
    { icon: FileWarning, label: "Boletos Vencendo", value: boletosVencendo, tone: boletosVencendo > 0 ? "warning" : "neutral" },
    { icon: PackageX, label: "Estoque Crítico", value: estoqueCritico, tone: estoqueCritico > 0 ? "negative" : "neutral" },
    { icon: ShoppingCart, label: "Compras Pendentes", value: comprasPendentes },
    { icon: Factory, label: "Produção do Dia", value: producaoHoje },
  ];

  const alerts = [];
  if (boletosVencendo > 0) alerts.push(`${boletosVencendo} boleto(s) vencendo ou vencidos precisam de atenção.`);
  if (estoqueCritico > 0) alerts.push(`${estoqueCritico} item(ns) em nível crítico de estoque.`);
  if (comprasPendentes > 0) alerts.push(`${comprasPendentes} compra(s) aguardando aprovação.`);
  if (alerts.length === 0) alerts.push("Nenhum alerta crítico no momento. Operação saudável.");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title={`Olá, ${(user?.full_name || "Gestor").split(" ")[0]}`}
        subtitle="Visão executiva do seu negócio."
      />

      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((c) => (
              <StatCard key={c.label} {...c} />
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Alertas Inteligentes</h2>
            </div>
            <ul className="mt-4 space-y-2">
              {alerts.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}