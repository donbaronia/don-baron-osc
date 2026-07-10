import React from "react";
import { cn } from "@/lib/utils";

const MAP = {
  pendente: "bg-amber-100 text-amber-700",
  pago: "bg-emerald-100 text-emerald-700",
  recebido: "bg-emerald-100 text-emerald-700",
  vencido: "bg-rose-100 text-rose-700",
  processado: "bg-emerald-100 text-emerald-700",
  arquivado: "bg-neutral-100 text-neutral-600",
  em_analise: "bg-blue-100 text-blue-700",
  aguardando_confirmacao: "bg-amber-100 text-amber-700",
  rejeitado: "bg-rose-100 text-rose-700",
  aprovada: "bg-blue-100 text-blue-700",
  recebida: "bg-emerald-100 text-emerald-700",
  cancelada: "bg-rose-100 text-rose-700",
  planejada: "bg-neutral-100 text-neutral-600",
  em_producao: "bg-blue-100 text-blue-700",
  concluida: "bg-emerald-100 text-emerald-700",
};

export default function StatusBadge({ status }) {
  const label = (status || "").replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", MAP[status] || "bg-neutral-100 text-neutral-600")}>
      {label}
    </span>
  );
}