import React, { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import IntegrationDashboard from "@/components/integracoes/IntegrationDashboard";
import IntegrationList from "@/components/integracoes/IntegrationList";
import WebhookCentral from "@/components/integracoes/WebhookCentral";
import IntegrationLogs from "@/components/integracoes/IntegrationLogs";
import IntegrationQueue from "@/components/integracoes/IntegrationQueue";
import UniversalImporter from "@/components/integracoes/UniversalImporter";
import UniversalExporter from "@/components/integracoes/UniversalExporter";
import DataMappingManager from "@/components/integracoes/DataMappingManager";

const TABS = [
  { id: "dashboard", label: "Dashboard", component: IntegrationDashboard },
  { id: "integracoes", label: "Integrações", component: IntegrationList },
  { id: "webhooks", label: "Webhooks", component: WebhookCentral },
  { id: "fila", label: "Fila", component: IntegrationQueue },
  { id: "logs", label: "Logs", component: IntegrationLogs },
  { id: "importar", label: "Importador", component: UniversalImporter },
  { id: "exportar", label: "Exportador", component: UniversalExporter },
  { id: "mapeamento", label: "Mapeamento", component: DataMappingManager },
];

export default function Integracoes() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        emoji="🔌"
        title="API Gateway & Integration Hub"
        subtitle="Ponto único de entrada e saída para todas as integrações externas"
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
                <IntegrationDashboard refreshKey={refreshKey} onRefresh={() => setRefreshKey(k => k + 1)} />
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