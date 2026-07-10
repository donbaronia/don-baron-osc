import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, Users, UserPlus, Clock, Wallet, Star, GraduationCap, Award } from "lucide-react";
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
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "colaboradores", label: "Colaboradores", icon: Users },
  { id: "recrutamento", label: "Recrutamento", icon: UserPlus },
  { id: "ponto", label: "Ponto & Horas", icon: Clock },
  { id: "vales", label: "Vales & Folha", icon: Wallet },
  { id: "avaliacoes", label: "Avaliações", icon: Star },
  { id: "treinamentos", label: "Treinamentos", icon: GraduationCap },
  { id: "cultura", label: "Cultura", icon: Award },
];

export default function HumanCapital() {
  const [tab, setTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => { HCM.init().then(() => setRefreshKey(k => k + 1)).catch(() => setRefreshKey(k => k + 1)); }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-purple-900 via-indigo-900 to-neutral-900 p-6 text-white sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Human Capital Engine</h1>
            <p className="text-sm text-neutral-300">Gestão estratégica de pessoas · Ciclo completo do colaborador · IA Especialista de RH</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
          <span className="rounded-full bg-white/5 px-3 py-1">👥 Cadastro & Perfil</span>
          <span className="rounded-full bg-white/5 px-3 py-1">📋 Recrutamento & Onboarding</span>
          <span className="rounded-full bg-white/5 px-3 py-1">⏰ Ponto & Banco de Horas</span>
          <span className="rounded-full bg-white/5 px-3 py-1">💰 Vales & Folha</span>
          <span className="rounded-full bg-white/5 px-3 py-1">⭐ Avaliações & Carreira</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🎓 Treinamentos</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🏆 Cultura & Reconhecimento</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🤖 IA Especialista</span>
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

        <TabsContent value="dashboard" className="mt-6"><HCMDashboard refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="colaboradores" className="mt-6">
          {selectedEmployee ? <EmployeeDetail employeeId={selectedEmployee} onBack={() => setSelectedEmployee(null)} /> : <EmployeeManager refreshKey={refreshKey} onSelectEmployee={setSelectedEmployee} />}
        </TabsContent>
        <TabsContent value="recrutamento" className="mt-6"><Recruitment refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="ponto" className="mt-6"><TimeTracking refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="vales" className="mt-6"><Advances refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="avaliacoes" className="mt-6"><Performance refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="treinamentos" className="mt-6"><TrainingTab refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="cultura" className="mt-6"><Culture refreshKey={refreshKey} /></TabsContent>
      </Tabs>
    </div>
  );
}