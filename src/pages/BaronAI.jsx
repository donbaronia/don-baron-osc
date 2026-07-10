import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, MessageSquare, AlertTriangle, Lightbulb, Clock, History, GraduationCap } from "lucide-react";
import ResumoExecutivo from "@/components/baronai/ResumoExecutivo";
import Assistente from "@/components/baronai/Assistente";
import Alertas from "@/components/baronai/Alertas";
import Recomendacoes from "@/components/baronai/Recomendacoes";
import Pendencias from "@/components/baronai/Pendencias";
import HistoricoTab from "@/components/baronai/Historico";
import Aprendizado from "@/components/baronai/Aprendizado";

const TABS = [
  { value: "resumo", label: "Resumo Executivo", icon: Sparkles },
  { value: "assistente", label: "Assistente", icon: MessageSquare },
  { value: "alertas", label: "Alertas", icon: AlertTriangle },
  { value: "recomendacoes", label: "Recomendações", icon: Lightbulb },
  { value: "pendencias", label: "Pendências", icon: Clock },
  { value: "historico", label: "Histórico", icon: History },
  { value: "aprendizado", label: "Aprendizado", icon: GraduationCap },
];

export default function BaronAI() {
  const [tab, setTab] = useState("resumo");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-neutral-900 to-neutral-800 p-6 text-white sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-black">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">BARON AI</h1>
            <p className="text-sm text-neutral-300">
              Diretor Operacional Digital — analisa, alerta, recomenda. Nunca executa sem confirmação.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
          <span className="rounded-full bg-white/5 px-3 py-1">📊 Analisa</span>
          <span className="rounded-full bg-white/5 px-3 py-1">💡 Recomenda</span>
          <span className="rounded-full bg-white/5 px-3 py-1">⚠️ Alerta</span>
          <span className="rounded-full bg-white/5 px-3 py-1">🔒 Apenas leitura</span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs sm:text-sm"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="resumo" className="mt-6"><ResumoExecutivo /></TabsContent>
        <TabsContent value="assistente" className="mt-6"><Assistente /></TabsContent>
        <TabsContent value="alertas" className="mt-6"><Alertas /></TabsContent>
        <TabsContent value="recomendacoes" className="mt-6"><Recomendacoes /></TabsContent>
        <TabsContent value="pendencias" className="mt-6"><Pendencias /></TabsContent>
        <TabsContent value="historico" className="mt-6"><HistoricoTab /></TabsContent>
        <TabsContent value="aprendizado" className="mt-6"><Aprendizado /></TabsContent>
      </Tabs>
    </div>
  );
}