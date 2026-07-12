import React, { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CMVDashboard from "@/components/cmv/CMVDashboard";
import CMVProductAnalysis from "@/components/cmv/CMVProductAnalysis";
import CMVIngredientAnalysis from "@/components/cmv/CMVIngredientAnalysis";
import CMVLossAnalysis from "@/components/cmv/CMVLossAnalysis";
import CMVSimulator from "@/components/cmv/CMVSimulator";
import CMVIFoodImport from "@/components/cmv/CMVIFoodImport";
import CMVReports from "@/components/cmv/CMVReports";

const TABS = [
  { v: "dashboard", l: "Painel Executivo", C: CMVDashboard },
  { v: "produtos", l: "Por Produto", C: CMVProductAnalysis },
  { v: "ingredientes", l: "Por Ingrediente", C: CMVIngredientAnalysis },
  { v: "perdas", l: "Análise de Perdas", C: CMVLossAnalysis },
  { v: "simulador", l: "Simulador", C: CMVSimulator },
  { v: "ifood", l: "Importação iFood", C: CMVIFoodImport },
  { v: "relatorios", l: "Metas e Relatórios", C: CMVReports },
];

export default function CMV() {
  const [tab, setTab] = useState("dashboard");
  const Active = TABS.find(t => t.v === tab)?.C || CMVDashboard;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="CMV" subtitle="Cálculo do custo dos produtos vendidos, análise de perdas e simulações." />
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