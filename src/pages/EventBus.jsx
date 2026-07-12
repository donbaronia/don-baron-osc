import React, { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EventBusOverview from "@/components/eventbus/EventBusOverview";
import EventCatalog from "@/components/eventbus/EventCatalog";
import EventStream from "@/components/eventbus/EventStream";
import QueueMonitor from "@/components/eventbus/QueueMonitor";
import SubscriptionMap from "@/components/eventbus/SubscriptionMap";

const TABS = [
  { v: "overview", l: "Dashboard", C: EventBusOverview },
  { v: "stream", l: "Event Stream", C: EventStream },
  { v: "queues", l: "Filas", C: QueueMonitor },
  { v: "catalog", l: "Catálogo", C: EventCatalog },
  { v: "subscriptions", l: "Subscrições", C: SubscriptionMap },
];

export default function EventBusPage() {
  const [tab, setTab] = useState("overview");
  const Active = TABS.find(t => t.v === tab)?.C || EventBusOverview;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title="Central de Eventos"
        subtitle="Comunicação entre módulos via eventos, filas e observabilidade."
      />
      <div className="mt-6 space-y-6">
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {TABS.map(t => <TabsTrigger key={t.v} value={t.v}>{t.l}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>
        <Active />
      </div>
    </div>
  );
}