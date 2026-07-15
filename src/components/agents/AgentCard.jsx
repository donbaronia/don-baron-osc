import React from "react";
import { Clock, AlertTriangle, Activity, ListChecks, ShieldCheck, ShieldOff } from "lucide-react";

const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms || 0}ms`);
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");

export default function AgentCard({ agent, stats = {} }) {
  const errors = stats.errors || 0;
  const active = stats.active || 0;
  const status = !agent.active
    ? { dot: "bg-muted-foreground", label: "Inativo" }
    : errors > 0 && active === 0
      ? { dot: "bg-baron-red", label: "Erro" }
      : errors > 0
        ? { dot: "bg-baron-yellow", label: "Atenção" }
        : { dot: "bg-baron-green", label: "OK" };

  const writes = agent.write_permissions?.length
    ? (agent.write_permissions[0] === "*" ? ["Tudo (BARON)"] : agent.write_permissions)
    : ["Somente leitura"];

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-baron-orange/40 hover:bg-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{agent.avatar_emoji}</span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{agent.name}</h3>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{agent.module}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-secondary px-2 py-1">
          <span className={`h-2 w-2 rounded-full ${status.dot}`} />
          <span className="text-[10px] font-semibold text-secondary-info">{status.label}</span>
        </div>
      </div>

      <p className="mt-2 line-clamp-2 text-xs text-secondary-info" title={agent.description}>{agent.description}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <Stat icon={Clock} label="Última exec." value={fmtDate(stats.last_execution)} />
        <Stat icon={Activity} label="Tempo médio" value={fmtMs(stats.avg_time_ms)} />
        <Stat icon={ListChecks} label="Processos ativos" value={active} />
        <Stat icon={AlertTriangle} label="Erros" value={errors} tone={errors > 0 ? "text-baron-red" : ""} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {writes.map((w) => (
          <span key={w} className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-info">{w}</span>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        {writes[0] === "Somente leitura" ? <ShieldOff className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
        <span>{writes[0] === "Somente leitura" ? "Não grava (extrator/auditor)" : `${writes.length} entidade(s) com permissão de gravação`}</span>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone = "" }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-secondary/50 px-2 py-1.5">
      <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
        <p className={`truncate font-semibold text-foreground ${tone}`}>{value}</p>
      </div>
    </div>
  );
}