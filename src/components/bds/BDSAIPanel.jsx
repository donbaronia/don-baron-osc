import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { X, Brain, Sparkles, TrendingUp, AlertTriangle, Lightbulb, BarChart3, Gauge } from "lucide-react"
import { cn } from "@/lib/utils"

const SECTIONS = [
  { key: "resumo", label: "Resumo", icon: Brain },
  { key: "alertas", label: "Alertas", icon: AlertTriangle },
  { key: "sugestoes", label: "Sugestões", icon: Lightbulb },
  { key: "analises", label: "Análises", icon: BarChart3 },
  { key: "impactos", label: "Impactos", icon: Gauge },
]

export default function BDSAIPanel({ open, onClose }) {
  const [activeSection, setActiveSection] = useState("resumo")
  const navigate = useNavigate()

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-neutral-200 bg-white shadow-2xl lg:w-96">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">Inteligência Baron</p>
              <p className="text-[11px] text-neutral-400">Assistente de Gestão</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex gap-1 overflow-x-auto border-b border-neutral-200 px-3 py-2">
          {SECTIONS.map((section) => {
            const Icon = section.icon
            const active = activeSection === section.key
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  active ? "bg-amber-50 text-amber-700" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {section.label}
              </button>
            )
          })}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeSection === "resumo" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-semibold text-amber-900">Resumo Executivo</p>
                </div>
                <p className="mt-2 text-sm text-amber-800">
                  A Inteligência Baron está pronta para analisar seus dados operacionais e oferecer insights.
                  Acesse os módulos abaixo para visualizar análises detalhadas.
                </p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => navigate("/ia")}
                  className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
                >
                  <span className="text-sm font-medium text-neutral-700">Central da IA</span>
                  <TrendingUp className="h-4 w-4 text-neutral-400" />
                </button>
                <button
                  onClick={() => navigate("/inteligencia")}
                  className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
                >
                  <span className="text-sm font-medium text-neutral-700">Inteligência de Negócios</span>
                  <BarChart3 className="h-4 w-4 text-neutral-400" />
                </button>
                <button
                  onClick={() => navigate("/decisoes")}
                  className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
                >
                  <span className="text-sm font-medium text-neutral-700">Motor de Decisões</span>
                  <Gauge className="h-4 w-4 text-neutral-400" />
                </button>
              </div>
            </div>
          )}
          {activeSection === "alertas" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="text-sm font-semibold text-red-900">Central de Alertas</p>
              </div>
              <p className="mt-2 text-sm text-red-800">
                Nenhum alerta crítico no momento. Os alertas da IA aparecem aqui automaticamente quando detectados.
              </p>
            </div>
          )}
          {activeSection === "sugestoes" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-semibold text-blue-900">Sugestões</p>
              </div>
              <p className="mt-2 text-sm text-blue-800">
                A IA Baron sugere melhorias com base no histórico operacional. As sugestões aparecem aqui após análise dos seus dados.
              </p>
            </div>
          )}
          {activeSection === "analises" && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-neutral-600" />
                <p className="text-sm font-semibold text-neutral-900">Análises</p>
              </div>
              <p className="mt-2 text-sm text-neutral-600">
                Visualize análises detalhadas de performance, tendências e previsões na Inteligência de Negócios.
              </p>
            </div>
          )}
          {activeSection === "impactos" && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-purple-600" />
                <p className="text-sm font-semibold text-purple-900">Análise de Impactos</p>
              </div>
              <p className="mt-2 text-sm text-purple-800">
                Simule o impacto de decisões no Motor de Decisões antes de implementar mudanças.
              </p>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-2 border-t border-neutral-200 p-4">
          <button
            onClick={() => navigate("/ia")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700"
          >
            <Brain className="h-4 w-4" />
            Explicar
          </button>
          <button
            onClick={() => navigate("/decisoes")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-purple-700"
          >
            <Sparkles className="h-4 w-4" />
            Simular
          </button>
        </div>
      </aside>
    </>
  )
}