import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import WorkforceDashboard from "@/components/workforce/WorkforceDashboard";
import WorkerGrid from "@/components/workforce/WorkerGrid";
import WorkerDetail from "@/components/workforce/WorkerDetail";
import WorkerActivities from "@/components/workforce/WorkerActivities";
import WorkerAlerts from "@/components/workforce/WorkerAlerts";
import { DigitalWorkforce } from "@/lib/workforceEngine";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "workers", label: "Funcionários" },
  { id: "activities", label: "Atividades" },
  { id: "alerts", label: "Alertas" },
];

export default function FuncionariosDigitais() {
  const [tab, setTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedWorker, setSelectedWorker] = useState(null);

  useEffect(() => {
    DigitalWorkforce.init().then(() => setRefreshKey(k => k + 1)).catch(console.error);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="Funcionários Digitais" subtitle="Equipe de IA trabalhando 24/7 com análises e alertas." />
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
            <WorkforceDashboard refreshKey={refreshKey} onSelectWorker={(key) => { setSelectedWorker(key); setTab("workers"); }} />
          )}
          {tab === "workers" && (
            selectedWorker ? (
              <WorkerDetail workerKey={selectedWorker} onBack={() => setSelectedWorker(null)} />
            ) : (
              <WorkerGrid refreshKey={refreshKey} onSelectWorker={setSelectedWorker} />
            )
          )}
          {tab === "activities" && <WorkerActivities refreshKey={refreshKey} />}
          {tab === "alerts" && <WorkerAlerts refreshKey={refreshKey} />}
        </div>
      </div>
    </div>
  );
}