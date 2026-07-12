import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import ExecutiveDashboard from "@/components/planning/ExecutiveDashboard";
import PlanningManager from "@/components/planning/PlanningManager";
import GoalManager from "@/components/planning/GoalManager";
import BudgetManager from "@/components/planning/BudgetManager";
import ProjectManager from "@/components/planning/ProjectManager";
import ScenarioSimulator from "@/components/planning/ScenarioSimulator";
import OKRManager from "@/components/planning/OKRManager";
import RoadmapView from "@/components/planning/RoadmapView";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "planejamento", label: "Planejamento" },
  { id: "metas", label: "Metas" },
  { id: "orcamento", label: "Orçamento" },
  { id: "projetos", label: "Projetos" },
  { id: "simulador", label: "Simulador" },
  { id: "okrs", label: "OKRs" },
  { id: "roadmap", label: "Roadmap" },
];

export default function EnterprisePlanningPage() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="Planejamento" subtitle="Metas, orçamento, projetos, simulações e OKRs." />
      <div className="mt-6 space-y-6">
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {TABS.map(t => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>
        <div>
          {tab === "dashboard" && <ExecutiveDashboard onSelectTab={setTab} />}
          {tab === "planejamento" && <PlanningManager />}
          {tab === "metas" && <GoalManager />}
          {tab === "orcamento" && <BudgetManager />}
          {tab === "projetos" && <ProjectManager />}
          {tab === "simulador" && <ScenarioSimulator />}
          {tab === "okrs" && <OKRManager />}
          {tab === "roadmap" && <RoadmapView />}
        </div>
      </div>
    </div>
  );
}