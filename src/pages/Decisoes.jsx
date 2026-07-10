import React, { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DecisionRecommendations from "@/components/decisoes/DecisionRecommendations";
import DecisionSimulator from "@/components/decisoes/DecisionSimulator";
import DecisionRiskMatrix from "@/components/decisoes/DecisionRiskMatrix";
import DecisionHistory from "@/components/decisoes/DecisionHistory";

const TABS = [
  { v: "recommendations", l: "Recomendações", C: DecisionRecommendations },
  { v: "simulator", l: "Simulador", C: DecisionSimulator },
  { v: "risks", l: "Matriz de Risco", C: DecisionRiskMatrix },
  { v: "history", l: "Histórico", C: DecisionHistory },
];

export default function Decisoes() {
  const [tab, setTab] = useState("recommendations");
  const Active = TABS.find(t => t.v === tab)?.C || DecisionRecommendations;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        emoji="🎯"
        title="Motor de Decisões"
        subtitle="Análise, simulação e priorização de decisões estratégicas — com IA explicativa, matriz de risco e histórico de aprendizado."
      />
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