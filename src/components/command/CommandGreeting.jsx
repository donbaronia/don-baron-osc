import React from "react";
import { brl } from "@/lib/financialCenter";

const HEALTH_CONFIG = {
  excelente: { label: "Excelente", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", ring: "ring-emerald-200" },
  boa: { label: "Boa", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", ring: "ring-blue-200" },
  atencao: { label: "Atenção", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", ring: "ring-amber-200" },
  critica: { label: "Crítica", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", ring: "ring-rose-200" },
};

const BREAKDOWN_LABELS = {
  financeiro: "Financeiro",
  fluxo_caixa: "Fluxo de Caixa",
  cmv: "CMV",
  estoque: "Estoque",
  producao: "Produção",
  alertas: "Alertas",
};

export default function CommandGreeting({ data, user }) {
  const cfg = HEALTH_CONFIG[data.health.status] || HEALTH_CONFIG.boa;
  const dateObj = new Date(data.greeting.date + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const firstName = (user?.full_name || "Gestor").split(" ")[0];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-white to-neutral-50 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-2xl font-bold text-neutral-900">{data.greeting.period}, {firstName}.</p>
          <p className="mt-1 text-sm text-neutral-500">
            Don Baron · {formattedDate} · {data.greeting.dayOfWeek}
          </p>
        </div>
        <div className={`flex items-center gap-3 rounded-xl ${cfg.bg} px-4 py-3 ring-1 ${cfg.ring}`}>
          <span className={`h-3 w-3 rounded-full ${cfg.dot} ${data.health.status === "critica" ? "animate-pulse" : ""}`} />
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500">Saúde da Empresa</p>
            <p className={`text-lg font-bold ${cfg.text}`}>{cfg.label}</p>
          </div>
          <div className="ml-2 text-right">
            <p className={`text-2xl font-black ${cfg.text}`}>{data.health.score}</p>
            <p className="text-[10px] uppercase text-neutral-400">/100</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {Object.entries(data.health.breakdown).map(([key, val]) => (
          <div key={key} className="rounded-lg bg-neutral-50 p-2.5 text-center">
            <div className="mx-auto mb-1 h-1.5 w-full max-w-[60px] overflow-hidden rounded-full bg-neutral-200">
              <div
                className={`h-1.5 rounded-full ${val >= 80 ? "bg-emerald-500" : val >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                style={{ width: `${val}%` }}
              />
            </div>
            <p className="text-[10px] font-medium text-neutral-500">{BREAKDOWN_LABELS[key]}</p>
            <p className="text-xs font-bold text-neutral-700">{val}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}