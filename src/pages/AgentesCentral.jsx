import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { AGENT_LIST } from "@/core/agents";
import AgentCard from "@/components/agents/AgentCard";
import { Activity, RefreshCw, AlertTriangle, ShieldCheck, Cpu } from "lucide-react";

export default function AgentesCentral() {
  const [procs, setProcs] = useState([]);
  const [agentRecs, setAgentRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        base44.entities.EnterpriseProcess.list("-created_date", 500).catch(() => []),
        base44.entities.Agent.list("-created_date", 200).catch(() => []),
      ]);
      setProcs(p || []);
      setAgentRecs(a || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const statsByAgent = useMemo(() => {
    const byAgent = {};
    (procs || []).forEach((p) => {
      const k = p.ia_agent || p.context?.agent_key;
      if (!k) return;
      (byAgent[k] = byAgent[k] || []).push(p);
    });
    const out = {};
    for (const key of Object.keys(byAgent)) {
      const arr = byAgent[key];
      const active = arr.filter((p) => p.status === "ativo").length;
      const errors = arr.filter((p) => p.status === "erro" || p.current_state === "ERRO").length;
      const times = arr.map((p) => p.processing_time_ms || 0).filter((n) => n > 0);
      const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
      out[key] = { active, errors, last_execution: arr[0]?.started_at, avg_time_ms: avg, total: arr.length };
    }
    return out;
  }, [procs]);

  const totals = useMemo(() => {
    const active = AGENT_LIST.filter((a) => a.active).length;
    const withErrors = Object.values(statsByAgent).filter((s) => s.errors > 0).length;
    const totalProcs = procs.length;
    const activeProcs = procs.filter((p) => p.status === "ativo").length;
    return { active, withErrors, totalProcs, activeProcs };
  }, [statsByAgent, procs]);

  const merged = AGENT_LIST.map((a) => {
    const rec = agentRecs.find((r) => r.agent_key === a.agent_key);
    return { ...a, active: rec ? rec.active !== false : a.active, last_active_at: rec?.last_active_at };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Cpu className="h-5 w-5 text-baron-orange" /> Central dos Agentes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            DON BARON ENTERPRISE V3 — empresa digital de agentes especialistas coordenados pelo BARON. Nenhuma gravação direta: tudo via Action Engine → Workflow → Banco → Read Back.
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-secondary-info transition hover:border-baron-orange/40 hover:text-foreground">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={ShieldCheck} label="Agentes ativos" value={totals.active} tone="text-baron-green" />
        <Metric icon={AlertTriangle} label="Com erros" value={totals.withErrors} tone={totals.withErrors ? "text-baron-red" : "text-baron-green"} />
        <Metric icon={Activity} label="Processos ativos" value={totals.activeProcs} tone="text-baron-orange" />
        <Metric icon={Cpu} label="Workflows totais" value={totals.totalProcs} tone="text-baron-blue" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {merged.map((agent) => (
          <AgentCard key={agent.agent_key} agent={agent} stats={statsByAgent[agent.agent_key] || {}} />
        ))}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={`h-4 w-4 ${tone}`} />
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}