import React, { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialDashboard from "@/components/financial/FinancialDashboard";
import ContasPagar from "@/components/financial/ContasPagar";
import ContasReceber from "@/components/financial/ContasReceber";
import IFoodReceipts from "@/components/financial/IFoodReceipts";
import Conciliacao from "@/components/financial/Conciliacao";
import CostCenters from "@/components/financial/CostCenters";
import Projecao from "@/components/financial/Projecao";
import DREReport from "@/components/financial/DREReport";

const TABS = [
  { v: "dashboard", l: "Visão Geral", C: FinancialDashboard },
  { v: "pagar", l: "A Pagar", C: ContasPagar },
  { v: "receber", l: "A Receber", C: ContasReceber },
  { v: "ifood", l: "iFood", C: IFoodReceipts },
  { v: "conciliacao", l: "Conciliação", C: Conciliacao },
  { v: "projecao", l: "Projeção", C: Projecao },
  { v: "dre", l: "DRE", C: DREReport },
  { v: "config", l: "Configurações", C: CostCenters },
];

export default function Financeiro() {
  const [tab, setTab] = useState("dashboard");
  const Active = TABS.find(t => t.v === tab)?.C || FinancialDashboard;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="Financeiro" subtitle="Gerencie contas, pagamentos, recebimentos e relatórios financeiros." />
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