import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, GitCompare, Users, TrendingUp } from "lucide-react";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import EmployeeScores from "@/components/analytics/EmployeeScores";
import EmployeeScoreDetail from "@/components/analytics/EmployeeScoreDetail";
import Predictions from "@/components/analytics/Predictions";
import Comparisons from "@/components/analytics/Comparisons";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "scores", label: "Scores", icon: Users },
  { id: "predictions", label: "Previsões", icon: TrendingUp },
  { id: "comparisons", label: "Comparações", icon: GitCompare },
];

export default function PeopleAnalyticsPage() {
  const [tab, setTab] = useState("dashboard");
  const [refreshKey] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-indigo-900 via-blue-900 to-neutral-900 p-6 text-white sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">People Analytics Engine</h1>
            <p className="text-sm text-neutral-300">Inteligência de pessoas · Scores compostos · Previsões de risco · Comparações · Planos de desenvolvimento</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
          <span className="rounded-full bg-white/5 px-3 py-1">📊 8 Dimensões de Score</span>
          <span className="rounded-full bg-white/5 px-3 py-1">⚠️ Previsão de Riscos</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🏆 Identificação de Talentos</span>
          <span className="rounded-full bg-white/5 px-3 py-1">📈 Comparações</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🤖 IA Especialista</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🔒 Privacidade & Ética</span>
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

        <TabsContent value="dashboard" className="mt-6"><AnalyticsDashboard refreshKey={refreshKey} onSelectEmployee={(id) => { setSelectedEmployee(id); setTab("scores"); }} /></TabsContent>
        <TabsContent value="scores" className="mt-6">
          {selectedEmployee ? <EmployeeScoreDetail employeeId={selectedEmployee} onBack={() => setSelectedEmployee(null)} /> : <EmployeeScores refreshKey={refreshKey} onSelectEmployee={setSelectedEmployee} />}
        </TabsContent>
        <TabsContent value="predictions" className="mt-6"><Predictions refreshKey={refreshKey} onSelectEmployee={(id) => { setSelectedEmployee(id); setTab("scores"); }} /></TabsContent>
        <TabsContent value="comparisons" className="mt-6"><Comparisons refreshKey={refreshKey} /></TabsContent>
      </Tabs>
    </div>
  );
}