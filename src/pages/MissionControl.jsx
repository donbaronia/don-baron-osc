import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Target, ListChecks, Shield } from "lucide-react";
import MissionDashboard from "@/components/mission/MissionDashboard";
import MissionList from "@/components/mission/MissionList";
import MissionDetail from "@/components/mission/MissionDetail";
import WarRoom from "@/components/mission/WarRoom";
import { MissionControl } from "@/lib/missionEngine";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: Target },
  { id: "missions", label: "Missões", icon: ListChecks },
  { id: "warroom", label: "Sala de Guerra", icon: Shield },
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
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-indigo-900 via-purple-900 to-neutral-900 p-6 text-white sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Mission Control Engine</h1>
            <p className="text-sm text-neutral-300">
              Operação orientada por objetivos · Missões · Tarefas · Dependências · Score · Aprendizado
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
          <span className="rounded-full bg-white/5 px-3 py-1">🎯 6 Tipos de Missão</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🔗 Dependências Automáticas</span>
          <span className="rounded-full bg-white/5 px-3 py-1">✅ Checklist Inteligente</span>
          <span className="rounded-full bg-white/5 px-3 py-1">📊 Score & Aprendizado</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🤖 IA Cria Missões</span>
          <span className="rounded-full bg-white/5 px-3 py-1">⚔️ Sala de Guerra</span>
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

        <TabsContent value="dashboard" className="mt-6">
          <MissionDashboard refreshKey={refreshKey} onSelectMission={(id) => { setSelectedMission(id); setTab("missions"); }} />
        </TabsContent>
        <TabsContent value="missions" className="mt-6">
          {selectedMission ? (
            <MissionDetail missionId={selectedMission} onBack={() => setSelectedMission(null)} />
          ) : (
            <MissionList refreshKey={refreshKey} onSelectMission={setSelectedMission} />
          )}
        </TabsContent>
        <TabsContent value="warroom" className="mt-6">
          <WarRoom refreshKey={refreshKey} onSelectMission={(id) => { setSelectedMission(id); setTab("missions"); }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}