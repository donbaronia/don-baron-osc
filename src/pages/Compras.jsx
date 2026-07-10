import React, { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PurchaseDashboard from "@/components/compras/PurchaseDashboard";
import PurchaseRequests from "@/components/compras/PurchaseRequests";
import Quotations from "@/components/compras/Quotations";
import PurchaseOrders from "@/components/compras/PurchaseOrders";
import ReceiptManagement from "@/components/compras/ReceiptManagement";
import SupplierScorecard from "@/components/compras/SupplierScorecard";
import PriceHistoryView from "@/components/compras/PriceHistoryView";
import PurchaseReports from "@/components/compras/PurchaseReports";

const TABS = [
  { v: "dashboard", l: "Dashboard", C: PurchaseDashboard },
  { v: "solicitacoes", l: "Solicitações", C: PurchaseRequests },
  { v: "cotacoes", l: "Cotações", C: Quotations },
  { v: "pedidos", l: "Pedidos", C: PurchaseOrders },
  { v: "recebimento", l: "Recebimento", C: ReceiptManagement },
  { v: "fornecedores", l: "Fornecedores", C: SupplierScorecard },
  { v: "precos", l: "Histórico de Preços", C: PriceHistoryView },
  { v: "relatorios", l: "Relatórios", C: PurchaseReports },
];

export default function Compras() {
  const [tab, setTab] = useState("dashboard");
  const Active = TABS.find(t => t.v === tab)?.C || PurchaseDashboard;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader emoji="🛒" title="Centro de Compras Inteligente" subtitle="Solicitação → Cotação → Aprovação → Pedido → Recebimento → Conferência → Financeiro → Estoque → CMV." />
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