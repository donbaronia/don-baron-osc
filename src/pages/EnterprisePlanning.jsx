import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, Map, Target, Wallet, Rocket, GitCompare, CheckCircle } from "lucide-react";
import ExecutiveDashboard from "@/components/planning/ExecutiveDashboard";
import PlanningManager from "@/components/planning/PlanningManager";
import GoalManager from "@/components/planning/GoalManager";
import BudgetManager from "@/components/planning/BudgetManager";
import ProjectManager from "@/components/planning/ProjectManager";
import ScenarioSimulator from "@/components/planning/ScenarioSimulator";
import OKRManager from "@/components/planning/OKRManager";
import RoadmapView from "@/components/planning/RoadmapView";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "planejamento", label: "Planejamento", icon: CheckCircle },
  { id: "metas", label: "Metas", icon: Target },
  { id: "orcamento", label: "Orçamento", icon: Wallet },
  { id: "projetos", label: "Projetos", icon: Rocket },
  { id: "simulador", label: "Simulador", icon: GitCompare },
  { id: "okrs", label: "OKRs", icon: Target },
  { id: "roadmap", label: "Roadmap", icon: Map },
];

export default function EnterprisePlanningPage() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-indigo-900 via-purple-900 to-neutral-900 p-6 text-white sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Enterprise Planning Engine</h1>
            <p className="text-sm text-neutral-300">Planejamento estratégico · Metas · Orçamento · Projetos · Simulações · OKRs · Roadmap · IA</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
          <span className="rounded-full bg-white/5 px-3 py-1">🎯 Metas Multi-Escopo</span>
          <span className="rounded-full bg-white/5 px-3 py-1">💰 Orçamento Previsto × Realizado</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🚀 Projetos com ROI</span>
          <span className="rounded-full bg-white/5 px-3 py-1">📊 Simulador de Cenários</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🔑 OKRs</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🗺️ Roadmap 2026-2030</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🤖 IA Executiva</span>
          <span className="rounded-full bg-white/5 px-3 py-1">📋 Auditoria & Versionamento</span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.id} value={t.id} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs sm:text-sm">
                <Icon className="h-4 w-4 shrink-0" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="dashboard" className="mt-6"><ExecutiveDashboard onSelectTab={setTab} /></TabsContent>
        <TabsContent value="planejamento" className="mt-6"><PlanningManager /></TabsContent>
        <TabsContent value="metas" className="mt-6"><GoalManager /></TabsContent>
        <TabsContent value="orcamento" className="mt-6"><BudgetManager /></TabsContent>
        <TabsContent value="projetos" className="mt-6"><ProjectManager /></TabsContent>
        <TabsContent value="simulador" className="mt-6"><ScenarioSimulator /></TabsContent>
        <TabsContent value="okrs" className="mt-6"><OKRManager /></TabsContent>
        <TabsContent value="roadmap" className="mt-6"><RoadmapView /></TabsContent>
      </Tabs>
    </div>
  );
}