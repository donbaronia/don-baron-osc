import React, { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventoryDashboard from "@/components/estoque/InventoryDashboard";
import StockList from "@/components/estoque/StockList";
import MovementManagement from "@/components/estoque/MovementManagement";
import InventoryCount from "@/components/estoque/InventoryCount";
import BatchExpiryControl from "@/components/estoque/BatchExpiryControl";
import ABCCurve from "@/components/estoque/ABCCurve";
import SmartSuggestions from "@/components/estoque/SmartSuggestions";
import InventoryReports from "@/components/estoque/InventoryReports";

const TABS = [
  { v: "dashboard", l: "Painel Operacional", C: InventoryDashboard },
  { v: "estoque", l: "Estoque Atual", C: StockList },
  { v: "movimentacoes", l: "Movimentações", C: MovementManagement },
  { v: "inventario", l: "Inventário", C: InventoryCount },
  { v: "validade", l: "Lotes & Validade", C: BatchExpiryControl },
  { v: "abc", l: "Curva ABC", C: ABCCurve },
  { v: "sugestoes", l: "Compras Sugeridas", C: SmartSuggestions },
  { v: "relatorios", l: "Relatórios", C: InventoryReports },
];

export default function Estoque() {
  const [tab, setTab] = useState("dashboard");
  const Active = TABS.find(t => t.v === tab)?.C || InventoryDashboard;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader emoji="📦" title="Centro de Estoque Inteligente" subtitle="Controle patrimonial de itens físicos — toda movimentação passa pelo Inventory Engine." />
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