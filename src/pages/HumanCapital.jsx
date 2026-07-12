import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import HCMDashboard from "@/components/hcm/HCMDashboard";
import EmployeeManager from "@/components/hcm/EmployeeManager";
import Recruitment from "@/components/hcm/Recruitment";
import TimeTracking from "@/components/hcm/TimeTracking";
import Advances from "@/components/hcm/Advances";
import Performance from "@/components/hcm/Performance";
import TrainingTab from "@/components/hcm/TrainingTab";
import Culture from "@/components/hcm/Culture";
import EmployeeDetail from "@/components/hcm/EmployeeDetail";
import { HCM } from "@/lib/hcmEngine";

const TABS = [
  { id: "colaboradores", label: "Colaboradores" },
  { id: "recrutamento", label: "Recrutamento" },
  { id: "ponto", label: "Ponto & Horas" },
  { id: "vales", label: "Vales & Folha" },
  { id: "avaliacoes", label: "Avaliações" },
  { id: "treinamentos", label: "Treinamentos" },
  { id: "cultura", label: "Cultura" },
];

export default function HumanCapital() {
  const [tab, setTab] = useState("colaboradores");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => { HCM.init().then(() => setRefreshKey(k => k + 1)).catch(() => setRefreshKey(k => k + 1)); }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="RH" subtitle="Gerencie colaboradores, folha, ponto e benefícios." />
      <div className="mt-6 space-y-6">
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {TABS.map(t => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>
        <div>
          {tab === "colaboradores" && (selectedEmployee
            ? <EmployeeDetail employeeId={selectedEmployee} onBack={() => setSelectedEmployee(null)} />
            : <EmployeeManager refreshKey={refreshKey} onSelectEmployee={setSelectedEmployee} />)}
          {tab === "recrutamento" && <Recruitment refreshKey={refreshKey} />}
          {tab === "ponto" && <TimeTracking refreshKey={refreshKey} />}
          {tab === "vales" && <Advances refreshKey={refreshKey} />}
          {tab === "avaliacoes" && <Performance refreshKey={refreshKey} />}
          {tab === "treinamentos" && <TrainingTab refreshKey={refreshKey} />}
          {tab === "cultura" && <Culture refreshKey={refreshKey} />}
        </div>
      </div>
    </div>
  );
}