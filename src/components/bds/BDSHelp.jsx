import React, { useState } from "react"
import { HelpCircle, X, Brain, ExternalLink } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

/**
 * Ajuda contextual do Baron Design System.
 * Toda tela deverá possuir ajuda contextual e acesso à IA.
 */
export default function BDSHelp({ title = "Ajuda", sections = [], className }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const defaultSections = [
    { title: "Como usar", content: "Utilize os botões de ação no topo da página para realizar operações. Use a pesquisa para encontrar registros rapidamente." },
    { title: "Atalhos", content: "Ctrl+K: busca global · Ctrl+N: novo registro · Esc: fechar janelas" },
    { title: "Precisa de mais ajuda?", content: "A Inteligência Baron pode analisar seus dados e responder perguntas específicas." },
  ]

  const allSections = sections.length > 0 ? sections : defaultSections

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn("rounded-md p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700", className)}
        title="Ajuda"
      >
        <HelpCircle className="h-4.5 w-4.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-neutral-200 bg-white shadow-2xl lg:w-96">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{title}</p>
                  <p className="text-[11px] text-neutral-400">Ajuda contextual</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                {allSections.map((section, idx) => (
                  <div key={idx} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-sm font-semibold text-neutral-800">{section.title}</p>
                    <p className="mt-1 text-sm text-neutral-600">{section.content}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-neutral-200 p-4">
              <button
                onClick={() => { setOpen(false); navigate("/ia") }}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-amber-400 to-amber-600 px-3 py-2 text-sm font-medium text-white shadow transition-all hover:brightness-110"
              >
                <Brain className="h-4 w-4" />
                Perguntar à Inteligência Baron
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}