import React, { Component } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { base44 } from "@/api/base44Client"

/**
 * Error Boundary do Baron Design System.
 * Nunca mostrar mensagens técnicas — sempre linguagem simples.
 */
const FRIENDLY_MESSAGES = [
  { match: /network|fetch|ECONNREFUSED|timeout/i, message: "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente." },
  { match: /401|unauthorized|forbidden|403/i, message: "Você não tem permissão para realizar esta operação. Entre em contato com o administrador." },
  { match: /404|not found/i, message: "O registro solicitado não foi encontrado. Ele pode ter sido removido ou arquivado." },
  { match: /500|internal server/i, message: "Não foi possível processar sua solicitação. Tente novamente ou entre em contato com o administrador." },
  { match: /validation|required|invalid/i, message: "Alguns campos não foram preenchidos corretamente. Verifique e tente novamente." },
]

export function friendlyErrorMessage(error) {
  const raw = typeof error === "string" ? error : error?.message || String(error)
  for (const { match, message } of FRIENDLY_MESSAGES) {
    if (match.test(raw)) return message
  }
  return "Não foi possível completar a operação. Tente novamente ou entre em contato com o administrador."
}

export default class BDSErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-800">Algo deu errado</h2>
            <p className="mt-2 text-sm text-neutral-500">
              {friendlyErrorMessage(this.state.error)}
            </p>
            <button
              onClick={this.handleReload}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-amber-600"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}