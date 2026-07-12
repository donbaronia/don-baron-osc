import React, { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductionDashboard from "@/components/producao/ProductionDashboard";
import ProductionOrders from "@/components/producao/ProductionOrders";
import RecipeManagement from "@/components/producao/RecipeManagement";
import RecipeDashboard from "@/components/producao/RecipeDashboard";
import RecipeSimulator from "@/components/producao/RecipeSimulator";
import RecipeAdditions from "@/components/producao/RecipeAdditions";
import RecipeCombos from "@/components/producao/RecipeCombos";
import SmartProduction from "@/components/producao/SmartProduction";
import ProductionReports from "@/components/producao/ProductionReports";

const TABS = [
  { v: "dashboard", l: "Painel Operacional", C: ProductionDashboard },
  { v: "ordens", l: "Ordens de Produção", C: ProductionOrders },
  { v: "receitas", l: "Fichas Técnicas", C: RecipeManagement },
  { v: "recipe_dash", l: "Rentabilidade", C: RecipeDashboard },
  { v: "simulador", l: "Simulador", C: RecipeSimulator },
  { v: "combos", l: "Combos", C: RecipeCombos },
  { v: "adicionais", l: "Adicionais", C: RecipeAdditions },
  { v: "sugestoes", l: "Produção Inteligente", C: SmartProduction },
  { v: "relatorios", l: "Relatórios", C: ProductionReports },
];

export default function Producao() {
  const [tab, setTab] = useState("dashboard");
  const Active = TABS.find(t => t.v === tab)?.C || ProductionDashboard;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="Produção" subtitle="Ordens de produção, fichas técnicas, custos e rendimento." />
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