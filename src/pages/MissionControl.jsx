import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import MissionDashboard from "@/components/mission/MissionDashboard";
import MissionList from "@/components/mission/MissionList";
import MissionDetail from "@/components/mission/MissionDetail";
import WarRoom from "@/components/mission/WarRoom";
import { MissionControl } from "@/lib/missionEngine";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "missions", label: "Missões" },
  { id: "warroom", label: "Sala de Guerra" },
];

export default function MissionControlPage() {
  const [tab, setTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMission, setSelectedMission] = useState(null);

  useEffect(() => {
    MissionControl.init().then(() => setRefreshKey(k => k + 1)).catch(console.error);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="Missões" subtitle="Operação orientada por objetivos com tarefas, dependências e score." />
      <div className="mt-6 space-y-6">
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {TABS.map(t => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>

        <div>
          {tab === "dashboard" && (
            <MissionDashboard refreshKey={refreshKey} onSelectMission={(id) => { setSelectedMission(id); setTab("missions"); }} />
          )}
          {tab === "missions" && (
            selectedMission ? (
              <MissionDetail missionId={selectedMission} onBack={() => setSelectedMission(null)} />
            ) : (
              <MissionList refreshKey={refreshKey} onSelectMission={setSelectedMission} />
            )
          )}
          {tab === "warroom" && (
            <WarRoom refreshKey={refreshKey} onSelectMission={(id) => { setSelectedMission(id); setTab("missions"); }} />
          )}
        </div>
      </div>
    </div>
  );
}