import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import BrainDashboard from "@/components/brain/BrainDashboard";
import BrainChat from "@/components/brain/BrainChat";
import AgentRegistry from "@/components/brain/AgentRegistry";
import ProactiveAlerts from "@/components/brain/ProactiveAlerts";
import BrainLearning from "@/components/brain/BrainLearning";
import BrainAudit from "@/components/brain/BrainAudit";
import BrainMemory from "@/components/brain/BrainMemory";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "conversar", label: "Conversar" },
  { id: "simular", label: "Simulador" },
  { id: "agentes", label: "Agentes" },
  { id: "alertas", label: "Alertas" },
  { id: "aprendizado", label: "Aprendizado" },
  { id: "auditoria", label: "Auditoria" },
  { id: "memoria", label: "Memória" },
];

export default function BaronBrain() {
  const [tab, setTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="BARON Brain" subtitle="Plataforma multi-agente com análise, recomendações e auditoria." />
      <div className="mt-6 space-y-6">
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {TABS.map(t => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>

        <div>
          {tab === "dashboard" && <BrainDashboard refreshKey={refreshKey} onSelectConversation={() => setTab("conversar")} />}
          {tab === "conversar" && <BrainChat mode="question" />}
          {tab === "simular" && <BrainChat mode="simulation" />}
          {tab === "agentes" && <AgentRegistry refreshKey={refreshKey} />}
          {tab === "alertas" && <ProactiveAlerts refreshKey={refreshKey} />}
          {tab === "aprendizado" && <BrainLearning refreshKey={refreshKey} />}
          {tab === "auditoria" && <BrainAudit refreshKey={refreshKey} />}
          {tab === "memoria" && <BrainMemory refreshKey={refreshKey} />}
        </div>
      </div>
    </div>
  );
}