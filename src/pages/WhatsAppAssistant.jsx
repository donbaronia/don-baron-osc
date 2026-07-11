import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, Bell, Link2, CheckSquare, Terminal, FlaskConical, LayoutDashboard } from "lucide-react";
import WhatsAppOverview from "@/components/whatsapp/WhatsAppOverview";
import WhatsAppLinking from "@/components/whatsapp/WhatsAppLinking";
import WhatsAppAlerts from "@/components/whatsapp/WhatsAppAlerts";
import WhatsAppApprovals from "@/components/whatsapp/WhatsAppApprovals";
import WhatsAppCommands from "@/components/whatsapp/WhatsAppCommands";
import WhatsAppSimulator from "@/components/whatsapp/WhatsAppSimulator";

const TABS = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "linking", label: "Vincular Número", icon: Link2 },
  { id: "alerts", label: "Alertas Proativos", icon: Bell },
  { id: "approvals", label: "Aprovações", icon: CheckSquare },
  { id: "commands", label: "Comandos", icon: Terminal },
  { id: "simulator", label: "Simulador", icon: FlaskConical },
];

export default function WhatsAppAssistant() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-emerald-700 via-green-800 to-neutral-900 p-6 text-white sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Baron WhatsApp Assistant</h1>
            <p className="text-sm text-neutral-300">Interface operacional oficial · Consultas · Aprovações · Alertas · Relatórios</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-300">
          <span className="rounded-full bg-white/5 px-3 py-1">🔐 Permissões por perfil</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🔔 Alertas proativos</span>
          <span className="rounded-full bg-white/5 px-3 py-1">📋 Resumo diário 07:30</span>
          <span className="rounded-full bg-white/5 px-3 py-1">💬 Linguagem natural</span>
          <span className="rounded-full bg-white/5 px-3 py-1">📄 Interpretação de documentos</span>
          <span className="rounded-full bg-white/5 px-3 py-1">✅ Aprovações com PIN</span>
          <span className="rounded-full bg-white/5 px-3 py-1">📊 Auditoria completa</span>
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

        <TabsContent value="overview" className="mt-6"><WhatsAppOverview /></TabsContent>
        <TabsContent value="linking" className="mt-6"><WhatsAppLinking /></TabsContent>
        <TabsContent value="alerts" className="mt-6"><WhatsAppAlerts /></TabsContent>
        <TabsContent value="approvals" className="mt-6"><WhatsAppApprovals /></TabsContent>
        <TabsContent value="commands" className="mt-6"><WhatsAppCommands /></TabsContent>
        <TabsContent value="simulator" className="mt-6"><WhatsAppSimulator /></TabsContent>
      </Tabs>
    </div>
  );
}