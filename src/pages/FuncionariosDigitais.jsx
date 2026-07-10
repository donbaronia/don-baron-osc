import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Briefcase, Activity, AlertTriangle } from "lucide-react";
import WorkforceDashboard from "@/components/workforce/WorkforceDashboard";
import WorkerGrid from "@/components/workforce/WorkerGrid";
import WorkerDetail from "@/components/workforce/WorkerDetail";
import WorkerActivities from "@/components/workforce/WorkerActivities";
import WorkerAlerts from "@/components/workforce/WorkerAlerts";
import { DigitalWorkforce } from "@/lib/workforceEngine";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: Briefcase },
  { id: "workers", label: "Funcionários", icon: Users },
  { id: "activities", label: "Atividades", icon: Activity },
  { id: "alerts", label: "Alertas", icon: AlertTriangle },
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
      {/* Hero header */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6 text-white sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Digital Workforce Engine</h1>
            <p className="text-sm text-neutral-300">
              Equipe digital trabalhando continuamente · 10 funcionários IA · Análise, recomendação e alertas 24/7
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
          <span className="rounded-full bg-white/5 px-3 py-1">🤖 10 Funcionários</span>
          <span className="rounded-full bg-white/5 px-3 py-1">⏰ Rotinas Automáticas</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🔒 Apenas Recomenda</span>
          <span className="rounded-full bg-white/5 px-3 py-1">📊 Auditoria Completa</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🧠 Aprendizado Contínuo</span>
          <span className="rounded-full bg-white/5 px-3 py-1">💰 Economia Medida</span>
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
          <WorkforceDashboard refreshKey={refreshKey} onSelectWorker={(key) => { setSelectedWorker(key); setTab("workers"); }} />
        </TabsContent>
        <TabsContent value="workers" className="mt-6">
          {selectedWorker ? (
            <WorkerDetail workerKey={selectedWorker} onBack={() => setSelectedWorker(null)} />
          ) : (
            <WorkerGrid refreshKey={refreshKey} onSelectWorker={setSelectedWorker} />
          )}
        </TabsContent>
        <TabsContent value="activities" className="mt-6"><WorkerActivities refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="alerts" className="mt-6"><WorkerAlerts refreshKey={refreshKey} /></TabsContent>
      </Tabs>
    </div>
  );
}