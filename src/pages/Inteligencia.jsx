import React, { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BIExecutive from "@/components/bi/BIExecutive";
import BIFinancial from "@/components/bi/BIFinancial";
import BIStock from "@/components/bi/BIStock";
import BIProduction from "@/components/bi/BIProduction";
import BICRM from "@/components/bi/BICRM";
import BITemporal from "@/components/bi/BITemporal";
import BIForecasts from "@/components/bi/BIForecasts";
import BIAnomalies from "@/components/bi/BIAnomalies";
import BIAlertCenter from "@/components/bi/BIAlertCenter";
import BISnapshots from "@/components/bi/BISnapshots";

const TABS = [
  { v: "executive", l: "Painel Executivo", C: BIExecutive },
  { v: "financial", l: "Financeiro", C: BIFinancial },
  { v: "stock", l: "Estoque", C: BIStock },
  { v: "production", l: "Produção", C: BIProduction },
  { v: "crm", l: "CRM", C: BICRM },
  { v: "temporal", l: "Análise Temporal", C: BITemporal },
  { v: "forecasts", l: "Previsões", C: BIForecasts },
  { v: "anomalies", l: "Anomalias", C: BIAnomalies },
  { v: "alerts", l: "Central de Alertas", C: BIAlertCenter },
  { v: "snapshots", l: "Data Warehouse", C: BISnapshots },
];

export default function Inteligencia() {
  const [tab, setTab] = useState("executive");
  const Active = TABS.find(t => t.v === tab)?.C || BIExecutive;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        emoji="🧠"
        title="Motor de Inteligência de Negócios"
        subtitle="Fonte única de indicadores, previsões e anomalias — todos os dashboards consultam exclusivamente este motor."
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