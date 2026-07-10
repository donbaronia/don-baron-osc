import React, { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductionDashboard from "@/components/producao/ProductionDashboard";
import ProductionOrders from "@/components/producao/ProductionOrders";
import RecipeManagement from "@/components/producao/RecipeManagement";
import SmartProduction from "@/components/producao/SmartProduction";
import ProductionReports from "@/components/producao/ProductionReports";

const TABS = [
  { v: "dashboard", l: "Painel Operacional", C: ProductionDashboard },
  { v: "ordens", l: "Ordens de Produção", C: ProductionOrders },
  { v: "receitas", l: "Receitas", C: RecipeManagement },
  { v: "sugestoes", l: "Produção Inteligente", C: SmartProduction },
  { v: "relatorios", l: "Relatórios", C: ProductionReports },
];

export default function Producao() {
  const [tab, setTab] = useState("dashboard");
  const Active = TABS.find(t => t.v === tab)?.C || ProductionDashboard;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader emoji="🏭" title="Centro de Produção Inteligente" subtitle="Controle de eficiência operacional, rendimento, custos e baixa automática de estoque." />
      <div className="mt-6 space-y-6">
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {TABS.map(t => <TabsTrigger key={t.v} value={t.v}>{t.l}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>
        <Active />
      </div>
    </div>
  );
}