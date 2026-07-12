import React, { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KernelDashboard from "@/components/kernel/KernelDashboard";
import ModuleRegistry from "@/components/kernel/ModuleRegistry";
import ServiceCatalog from "@/components/kernel/ServiceCatalog";
import HealthMonitor from "@/components/kernel/HealthMonitor";
import TelemetryPanel from "@/components/kernel/TelemetryPanel";
import LicenseManager from "@/components/kernel/LicenseManager";
import MaintenanceControl from "@/components/kernel/MaintenanceControl";
import CentralConfig from "@/components/kernel/CentralConfig";

const TABS = [
  { id: "dashboard", label: "Dashboard", component: KernelDashboard },
  { id: "modulos", label: "Módulos", component: ModuleRegistry },
  { id: "servicos", label: "Serviços", component: ServiceCatalog },
  { id: "saude", label: "Saúde", component: HealthMonitor },
  { id: "telemetria", label: "Telemetria", component: TelemetryPanel },
  { id: "licenca", label: "Licenciamento", component: LicenseManager },
  { id: "manutencao", label: "Manutenção", component: MaintenanceControl },
  { id: "config", label: "Configuração", component: CentralConfig },
];

export default function Kernel() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="Núcleo do Sistema" subtitle="Módulos, serviços, saúde e monitoramento da plataforma." />
      <div className="mt-6 space-y-6">
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              {TABS.map(t => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>
        <div>
          {TABS.map(tab => {
            const Component = tab.component;
            return activeTab === tab.id ? (
              activeTab === "dashboard" ? (
                <KernelDashboard key={tab.id} refreshKey={refreshKey} onRefresh={() => setRefreshKey(k => k + 1)} />
              ) : (
                <Component key={tab.id} refreshKey={refreshKey} />
              )
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}