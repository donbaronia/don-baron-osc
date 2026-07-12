import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import WhatsAppOverview from "@/components/whatsapp/WhatsAppOverview";
import WhatsAppLinking from "@/components/whatsapp/WhatsAppLinking";
import WhatsAppAlerts from "@/components/whatsapp/WhatsAppAlerts";
import WhatsAppApprovals from "@/components/whatsapp/WhatsAppApprovals";
import WhatsAppCommands from "@/components/whatsapp/WhatsAppCommands";
import WhatsAppSimulator from "@/components/whatsapp/WhatsAppSimulator";

const TABS = [
  { id: "overview", label: "Visão Geral" },
  { id: "linking", label: "Vincular" },
  { id: "alerts", label: "Alertas" },
  { id: "approvals", label: "Aprovações" },
  { id: "commands", label: "Comandos" },
  { id: "simulator", label: "Simulador" },
];

export default function WhatsAppAssistant() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="WhatsApp" subtitle="Notificações, alertas, consultas rápidas e resumos." />
      <div className="mt-6 space-y-6">
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {TABS.map(t => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>
        <div>
          {tab === "overview" && <WhatsAppOverview />}
          {tab === "linking" && <WhatsAppLinking />}
          {tab === "alerts" && <WhatsAppAlerts />}
          {tab === "approvals" && <WhatsAppApprovals />}
          {tab === "commands" && <WhatsAppCommands />}
          {tab === "simulator" && <WhatsAppSimulator />}
        </div>
      </div>
    </div>
  );
}