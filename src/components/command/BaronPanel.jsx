import React from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import BaronChat from "@/components/command/BaronChat";
import { Brain, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const SUGGESTIONS = [
  { label: "Quanto devo hoje?", path: "/" },
  { label: "Pagar boleto", path: "/financeiro" },
  { label: "Cadastrar fornecedor", path: "/cadastro" },
  { label: "Registrar compra", path: "/compras" },
  { label: "Processar documento", path: "/processamento" },
  { label: "Mostrar estoque", path: "/estoque" },
  { label: "Fechar caixa", path: "/financeiro" },
  { label: "Fluxo de caixa", path: "/financeiro" },
];

export default function BaronPanel({ open, onClose }) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">BARON</p>
              <p className="text-xs font-normal text-muted-foreground">Seu diretor operacional</p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <BaronChat />

          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Acesso Rápido</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s.label}
                  to={s.path}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                  onClick={onClose}
                >
                  <Zap className="h-3 w-3 shrink-0" />
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}