import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import ResumoExecutivo from "@/components/baronai/ResumoExecutivo";
import Assistente from "@/components/baronai/Assistente";
import Alertas from "@/components/baronai/Alertas";
import Recomendacoes from "@/components/baronai/Recomendacoes";
import Pendencias from "@/components/baronai/Pendencias";
import HistoricoTab from "@/components/baronai/Historico";
import Aprendizado from "@/components/baronai/Aprendizado";

const TABS = [
  { value: "resumo", label: "Resumo" },
  { value: "assistente", label: "Assistente" },
  { value: "alertas", label: "Alertas" },
  { value: "recomendacoes", label: "Recomendações" },
  { value: "pendencias", label: "Pendências" },
  { value: "historico", label: "Histórico" },
  { value: "aprendizado", label: "Aprendizado" },
];

export default function BaronAI() {
  const [tab, setTab] = useState("resumo");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="BARON AI" subtitle="Análises, alertas e recomendações automáticas." />
      <div className="mt-6 space-y-6">
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {TABS.map(t => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>
        <div>
          {tab === "resumo" && <ResumoExecutivo />}
          {tab === "assistente" && <Assistente />}
          {tab === "alertas" && <Alertas />}
          {tab === "recomendacoes" && <Recomendacoes />}
          {tab === "pendencias" && <Pendencias />}
          {tab === "historico" && <HistoricoTab />}
          {tab === "aprendizado" && <Aprendizado />}
        </div>
      </div>
    </div>
  );
}