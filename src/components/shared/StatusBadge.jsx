import React from "react";
import { cn } from "@/lib/utils";

const MAP = {
  pendente: "bg-baron-yellow/15 text-baron-yellow border-baron-yellow/30",
  pago: "bg-baron-green/15 text-baron-green border-baron-green/30",
  recebido: "bg-baron-green/15 text-baron-green border-baron-green/30",
  vencido: "bg-baron-red/15 text-baron-red border-baron-red/30",
  processado: "bg-baron-green/15 text-baron-green border-baron-green/30",
  arquivado: "bg-secondary text-secondary-info border-border",
  em_analise: "bg-baron-blue/15 text-baron-blue border-baron-blue/30",
  aguardando_confirmacao: "bg-baron-yellow/15 text-baron-yellow border-baron-yellow/30",
  rejeitado: "bg-baron-red/15 text-baron-red border-baron-red/30",
  aprovada: "bg-baron-blue/15 text-baron-blue border-baron-blue/30",
  recebida: "bg-baron-green/15 text-baron-green border-baron-green/30",
  cancelada: "bg-baron-red/15 text-baron-red border-baron-red/30",
  planejada: "bg-secondary text-secondary-info border-border",
  em_producao: "bg-baron-blue/15 text-baron-blue border-baron-blue/30",
  concluida: "bg-baron-green/15 text-baron-green border-baron-green/30",
  parcial: "bg-baron-yellow/15 text-baron-yellow border-baron-yellow/30",
  conciliado: "bg-baron-green/15 text-baron-green border-baron-green/30",
  divergente: "bg-baron-red/15 text-baron-red border-baron-red/30",
  ativo: "bg-baron-green/15 text-baron-green border-baron-green/30",
  inativo: "bg-secondary text-secondary-info border-border",
  bloquado: "bg-baron-red/15 text-baron-red border-baron-red/30",
};

export default function StatusBadge({ status }) {
  const label = (status || "").replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold capitalize", MAP[status] || "bg-secondary text-secondary-info border-border")}>
      {label}
    </span>
  );
}