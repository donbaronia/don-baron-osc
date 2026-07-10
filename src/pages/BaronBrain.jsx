import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Brain, MessageSquare, Users, Bell, GraduationCap, FileSearch, Database, FlaskConical } from "lucide-react";
import BrainDashboard from "@/components/brain/BrainDashboard";
import BrainChat from "@/components/brain/BrainChat";
import AgentRegistry from "@/components/brain/AgentRegistry";
import ProactiveAlerts from "@/components/brain/ProactiveAlerts";
import BrainLearning from "@/components/brain/BrainLearning";
import BrainAudit from "@/components/brain/BrainAudit";
import BrainMemory from "@/components/brain/BrainMemory";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: Brain },
  { id: "conversar", label: "Conversar", icon: MessageSquare },
  { id: "simular", label: "Simulador", icon: FlaskConical },
  { id: "agentes", label: "Agentes", icon: Users },
  { id: "alertas", label: "Alertas", icon: Bell },
  { id: "aprendizado", label: "Aprendizado", icon: GraduationCap },
  { id: "auditoria", label: "Auditoria", icon: FileSearch },
  { id: "memoria", label: "Memória", icon: Database },
];

export default function BaronBrain() {
  const [tab, setTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      {/* Hero header */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-purple-900 via-indigo-900 to-neutral-900 p-6 text-white sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">BARON BRAIN</h1>
            <p className="text-sm text-neutral-300">
              Plataforma Multi-Agente · Conselho Executivo Digital · 35 especialistas colaborativos
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
          <span className="rounded-full bg-white/5 px-3 py-1">👑 CEO AI</span>
          <span className="rounded-full bg-white/5 px-3 py-1">💼 5 Diretorias</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🤝 Conselhos</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🧠 Memória Corporativa</span>
          <span className="rounded-full bg-white/5 px-3 py-1">📊 Auditoria Completa</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🔒 Apenas Recomenda</span>
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

        <TabsContent value="dashboard" className="mt-6"><BrainDashboard refreshKey={refreshKey} onSelectConversation={() => setTab("conversar")} /></TabsContent>
        <TabsContent value="conversar" className="mt-6"><BrainChat mode="question" /></TabsContent>
        <TabsContent value="simular" className="mt-6"><BrainChat mode="simulation" /></TabsContent>
        <TabsContent value="agentes" className="mt-6"><AgentRegistry refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="alertas" className="mt-6"><ProactiveAlerts refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="aprendizado" className="mt-6"><BrainLearning refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="auditoria" className="mt-6"><BrainAudit refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="memoria" className="mt-6"><BrainMemory refreshKey={refreshKey} /></TabsContent>
      </Tabs>
    </div>
  );
}