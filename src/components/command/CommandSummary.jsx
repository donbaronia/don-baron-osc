import React from "react";
import SectionCard from "./SectionCard";
import { brl } from "@/lib/financialCenter";
import { Target, ClipboardList, TrendingUp } from "lucide-react";

function ProgressRow({ label, meta, atual, projecao }) {
  const pct = meta > 0 ? Math.min((atual / meta) * 100, 100) : 0;
  const excedeu = atual > meta;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-600">{label}</span>
        <span className={`font-semibold ${excedeu ? "text-emerald-600" : "text-neutral-900"}`}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
          <div className={`h-2 rounded-full ${excedeu ? "bg-emerald-500" : pct > 50 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
        <span>{brl(atual)} / {brl(meta)}</span>
        {projecao !== undefined && <span className="text-neutral-400">Projeção: {brl(projecao)}</span>}
      </div>
    </div>
  );
}

export default function CommandSummary({ data }) {
  const obj = data.objetivos;
  const r = data.resumo_dia;

  const dayItems = [
    { label: "Receita", value: brl(r.receita), tone: "text-emerald-600" },
    { label: "Lucro", value: brl(r.lucro), tone: r.lucro >= 0 ? "text-emerald-600" : "text-rose-600" },
    { label: "CMV", value: `${r.cmv.toFixed(1)}%`, tone: r.cmv > 35 ? "text-rose-600" : "text-neutral-700" },
    { label: "Despesas", value: brl(r.despesas), tone: "text-rose-600" },
    { label: "Produção", value: r.producao, tone: "text-neutral-700" },
    { label: "Compras", value: r.compras, tone: "text-neutral-700" },
    { label: "Pendências", value: r.pendencias, tone: r.pendencias > 0 ? "text-amber-600" : "text-neutral-700" },
    { label: "Ocorrências", value: r.ocorrencias, tone: r.ocorrencias > 0 ? "text-amber-600" : "text-neutral-700" },
  ];

  return (
    <>
      <SectionCard icon={Target} title="Metas e Objetivos" accent="text-blue-500">
        <div className="space-y-4">
          <ProgressRow label="Meta Diária" meta={obj.dia.meta} atual={obj.dia.atual} />
          <ProgressRow label="Meta Semanal" meta={obj.semana.meta} atual={obj.semana.atual} />
          <ProgressRow label="Meta Mensal" meta={obj.mes.meta} atual={obj.mes.atual} projecao={obj.mes.projecao} />
        </div>

        <div className="mt-5 border-t border-neutral-100 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Distância da Meta</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Dia", falta: obj.dia.falta, ultra: obj.dia.ultrapassou },
              { label: "Semana", falta: obj.semana.falta, ultra: obj.semana.ultrapassou },
              { label: "Mês", falta: obj.mes.falta, ultra: obj.mes.ultrapassou },
            ].map(o => (
              <div key={o.label} className="rounded-lg bg-neutral-50 p-3 text-center">
                <p className="text-xs text-neutral-500">{o.label}</p>
                {o.ultra > 0 ? (
                  <>
                    <p className="text-sm font-bold text-emerald-600">+{brl(o.ultra)}</p>
                    <p className="text-[10px] text-emerald-500">acima da meta</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-neutral-700">{brl(o.falta)}</p>
                    <p className="text-[10px] text-neutral-400">falta</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={ClipboardList} title="Resumo do Dia" accent="text-amber-500">
        <div className="grid grid-cols-2 gap-3">
          {dayItems.map(item => (
            <div key={item.label} className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">{item.label}</p>
              <p className={`mt-0.5 text-sm font-bold ${item.tone}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}