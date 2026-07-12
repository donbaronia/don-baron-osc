import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import EmployeeScores from "@/components/analytics/EmployeeScores";
import EmployeeScoreDetail from "@/components/analytics/EmployeeScoreDetail";
import Predictions from "@/components/analytics/Predictions";
import Comparisons from "@/components/analytics/Comparisons";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "scores", label: "Scores" },
  { id: "predictions", label: "Previsões" },
  { id: "comparisons", label: "Comparações" },
];

export default function PeopleAnalyticsPage() {
  const [tab, setTab] = useState("dashboard");
  const [refreshKey] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="Inteligência de Pessoas" subtitle="Scores, previsões de risco e comparações." />
      <div className="mt-6 space-y-6">
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {TABS.map(t => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>
        <div>
          {tab === "dashboard" && <AnalyticsDashboard refreshKey={refreshKey} onSelectEmployee={(id) => { setSelectedEmployee(id); setTab("scores"); }} />}
          {tab === "scores" && (
            selectedEmployee
              ? <EmployeeScoreDetail employeeId={selectedEmployee} onBack={() => setSelectedEmployee(null)} />
              : <EmployeeScores refreshKey={refreshKey} onSelectEmployee={setSelectedEmployee} />
          )}
          {tab === "predictions" && <Predictions refreshKey={refreshKey} onSelectEmployee={(id) => { setSelectedEmployee(id); setTab("scores"); }} />}
          {tab === "comparisons" && <Comparisons refreshKey={refreshKey} />}
        </div>
      </div>
    </div>
  );
}