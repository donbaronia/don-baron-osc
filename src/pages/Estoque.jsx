import React, { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
import ProductRegistrationModal from "@/components/cadastro/ProductRegistrationModal";

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
  const [regOpen, setRegOpen] = useState(false);
  const { toast } = useToast();
  const Active = TABS.find(t => t.v === tab)?.C || InventoryDashboard;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title="Estoque"
        subtitle="Controle de itens, movimentações, lotes, validade e inventário."
        actions={
          <Button onClick={() => setRegOpen(true)} className="gap-2 shadow-lg shadow-baron-orange/20">
            <Plus className="h-4 w-4" /> Novo Produto
          </Button>
        }
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
      <ProductRegistrationModal
        open={regOpen}
        onClose={() => setRegOpen(false)}
        onSaved={() => {
          setRegOpen(false);
          toast({ title: "Produto cadastrado", description: "Disponível para todos os módulos do sistema." });
        }}
      />
    </div>
  );
}