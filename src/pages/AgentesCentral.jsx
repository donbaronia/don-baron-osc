import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, AlertTriangle, ShieldCheck, Cpu, Play, Loader2 } from "lucide-react";

const DEPARTMENT_LABELS = {
  compras: "Compras", financeiro: "Financeiro", producao: "Produção", estoque: "Estoque",
  rh: "RH", logistica: "Logística", comercial: "Comercial", auditoria: "Auditoria", estrategia: "Estratégia",
};

const invoke = (action, extra = {}) => base44.functions.invoke("digitalWorkforce", { action, ...extra }).then((r) => r.data);

export default function AgentesCentral() {
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null); // worker_key em execução

  const load = async () => {
    setLoading(true);
    try {
      // init é idempotente — só semeia os Funcionários Digitais na primeira vez
      const initRes = await invoke("init");
      console.log("[AgentesCentral] init:", initRes);
      const [w, d] = await Promise.all([invoke("listWorkers"), invoke("getDashboard")]);
      setWorkers(w?.items || w?.workers || []);
      setDashboard(d || null);
    } catch (e) {
      console.error("[AgentesCentral] Falha ao carregar:", e);
      toast({ title: "Erro ao carregar Funcionários Digitais", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runNow = async (worker) => {
    const routines = worker.routines || [];
    if (routines.length === 0) {
      toast({ title: "Este funcionário não tem rotina configurada" });
      return;
    }
    // Executa a rotina há mais tempo sem rodar (mesma lógica do agendamento automático)
    const sorted = [...routines].sort((a, b) => {
      const aT = a.last_executed_at ? new Date(a.last_executed_at).getTime() : 0;
      const bT = b.last_executed_at ? new Date(b.last_executed_at).getTime() : 0;
      return aT - bT;
    });
    const routine = sorted[0];
    setRunning(worker.worker_key);
    try {
      const result = await invoke("executeRoutine", { worker_key: worker.worker_key, routine_action: routine.action });
      toast({ title: `${worker.name} executou: ${routine.action}`, description: result?.activity?.summary || "Concluído." });
      await load();
    } catch (e) {
      toast({ title: "Falha na execução", description: e.message, variant: "destructive" });
    } finally {
      setRunning(null);
    }
  };

  const grouped = workers.reduce((acc, w) => {
    (acc[w.department] = acc[w.department] || []).push(w);
    return acc;
  }, {});

  const m = dashboard?.metrics || {};

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Cpu className="h-5 w-5 text-baron-orange" /> Funcionários Digitais
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitoramento autônomo — rodam sozinhos de hora em hora, e você pode executar manualmente a qualquer momento.
          </p>
        </div>
        <Button variant="outline" onClick={load} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={ShieldCheck} label="Funcionários ativos" value={m.active_workers ?? "—"} tone="text-baron-green" />
        <Metric icon={Activity} label="Análises feitas" value={m.total_analyses ?? "—"} tone="text-baron-orange" />
        <Metric icon={AlertTriangle} label="Sugestões geradas" value={m.total_suggestions ?? "—"} tone="text-baron-blue" />
        <Metric icon={Cpu} label="Economia gerada" value={m.total_savings ? `R$ ${m.total_savings.toLocaleString("pt-BR")}` : "—"} tone="text-baron-green" />
      </div>

      {loading && workers.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-neutral-200/60" />)}
        </div>
      ) : (
        Object.entries(grouped).map(([dept, list]) => (
          <div key={dept} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">{DEPARTMENT_LABELS[dept] || dept}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => (
                <WorkerCard key={w.worker_key} worker={w} running={running === w.worker_key} onRun={() => runNow(w)} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function WorkerCard({ worker, running, onRun }) {
  const status = !worker.active
    ? { dot: "bg-muted-foreground", label: "Inativo" }
    : worker.status === "working"
      ? { dot: "bg-baron-orange", label: "Trabalhando" }
      : { dot: "bg-baron-green", label: "Pronto" };

  const lastRoutine = (worker.routines || [])
    .filter((r) => r.last_executed_at)
    .sort((a, b) => new Date(b.last_executed_at) - new Date(a.last_executed_at))[0];

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-baron-orange/40">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{worker.avatar_emoji}</span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{worker.name}</h3>
            <p className="text-[11px] text-muted-foreground">{worker.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-secondary px-2 py-1">
          <span className={`h-2 w-2 rounded-full ${status.dot}`} />
          <span className="text-[10px] font-semibold text-secondary-info">{status.label}</span>
        </div>
      </div>

      <p className="mt-2 line-clamp-2 text-xs text-secondary-info">{worker.objective}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <Stat label="Análises" value={worker.analyses_count || 0} />
        <Stat label="Sugestões" value={worker.suggestions_count || 0} />
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        {lastRoutine ? `Última execução: ${lastRoutine.action} — ${new Date(lastRoutine.last_executed_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "Ainda não executou nenhuma rotina."}
      </p>

      <Button size="sm" variant="outline" className="mt-3 w-full gap-1.5" onClick={onRun} disabled={running}>
        {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        {running ? "Executando..." : "Executar agora"}
      </Button>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-secondary/50 px-2 py-1.5">
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className="truncate font-semibold text-foreground">{value}</p>
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
