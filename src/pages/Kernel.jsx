import React, { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  { id: "servicos", label: "Service Registry", component: ServiceCatalog },
  { id: "saude", label: "Health Check", component: HealthMonitor },
  { id: "telemetria", label: "Telemetria", component: TelemetryPanel },
  { id: "licenca", label: "Licenciamento", component: LicenseManager },
  { id: "manutencao", label: "Manutenção", component: MaintenanceControl },
  { id: "config", label: "Configuração", component: CentralConfig },
];

export default function Kernel() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        emoji="🧬"
        title="BARON Kernel"
        subtitle="Núcleo absoluto da plataforma — inicialização, módulos, saúde e monitoramento"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => {
          const Component = tab.component;
          return (
            <TabsContent key={tab.id} value={tab.id} className="mt-4">
              {tab.id === "dashboard" ? (
                <KernelDashboard refreshKey={refreshKey} onRefresh={() => setRefreshKey(k => k + 1)} />
              ) : (
                <Component refreshKey={refreshKey} />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}