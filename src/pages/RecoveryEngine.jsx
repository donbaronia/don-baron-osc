import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { RecoveryEngine } from "@/lib/recoveryEngine";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  ShieldCheck, RotateCw, AlertTriangle, Skull, RefreshCw, Eye, Clock,
  Layers, Database, User, X,
} from "lucide-react";

const STATE_LABELS = {
  pending: "Pendente",
  write_completed: "Gravado",
  readback_completed: "Read-back OK",
  validated: "Validado",
  committed: "Commitado",
  retry: "Em Retry",
  dead_letter: "Dead Letter",
};
const STATE_COLORS = {
  pending: "bg-muted text-muted-foreground",
  write_completed: "bg-baron-blue/15 text-baron-blue",
  readback_completed: "bg-baron-blue/15 text-baron-blue",
  validated: "bg-baron-purple/15 text-baron-purple",
  committed: "bg-baron-green/15 text-baron-green",
  retry: "bg-baron-yellow/15 text-baron-yellow",
  dead_letter: "bg-baron-red/15 text-baron-red",
};
const STEP_LABELS = { write: "Write", readback: "Read Back", validate: "Validação", commit: "Commit" };

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </Card>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return d;
  }
}

export default function RecoveryEnginePage() {
  const { toast } = useToast();
  const [tab, setTab] = useState("retry");
  const [stats, setStats] = useState({ active: 0, retry: 0, dead_letter: 0, committed: 0 });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const queue = tab === "history" ? "committed" : tab;
      const [res, active, retry, dead, committed] = await Promise.all([
        base44.entities.RecoveryOperation.filter({ queue }, "-started_at", 100),
        base44.entities.RecoveryOperation.filter({ queue: "active" }, null, 500),
        base44.entities.RecoveryOperation.filter({ queue: "retry" }, null, 500),
        base44.entities.RecoveryOperation.filter({ queue: "dead_letter" }, null, 500),
        base44.entities.RecoveryOperation.filter({ queue: "committed" }, null, 500),
      ]);
      setItems(res || []);
      setStats({ active: active.length, retry: retry.length, dead_letter: dead.length, committed: committed.length });
    } catch (e) {
      toast({ title: "Erro ao carregar", description: e.message });
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => { load(); }, [load]);

  const handleRetryAll = async () => {
    setRunning(true);
    try {
      const res = await RecoveryEngine.retryAll();
      toast({
        title: "Fila de retry processada",
        description: `${res.succeeded} recuperadas · ${res.failed} falhas · ${res.dead_lettered} para dead letter`,
      });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message });
    } finally {
      setRunning(false);
    }
  };

  const handleReprocess = async (id) => {
    setRunning(true);
    try {
      await RecoveryEngine.reprocess(id);
      toast({ title: "Operação reprocessada com sucesso" });
      load();
    } catch (e) {
      toast({ title: "Falha ao reprocessar", description: e.message });
      load();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-baron-orange/15">
            <ShieldCheck className="h-6 w-6 text-baron-orange" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Recovery Engine</h1>
            <p className="text-sm text-muted-foreground">Pipeline Write → Read Back → Validação → Commit · Nenhuma operação desaparece</p>
          </div>
        </div>
        <Button onClick={handleRetryAll} loading={running} disabled={running}>
          <RotateCw className="h-4 w-4" />
          Processar Retry Agora
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Layers} label="Ativas (executando)" value={stats.active} tone="bg-baron-blue/15 text-baron-blue" />
        <StatCard icon={RotateCw} label="Fila de Retry" value={stats.retry} tone="bg-baron-yellow/15 text-baron-yellow" />
        <StatCard icon={Skull} label="Dead Letter Queue" value={stats.dead_letter} tone="bg-baron-red/15 text-baron-red" />
        <StatCard icon={ShieldCheck} label="Commitadas (OK)" value={stats.committed} tone="bg-baron-green/15 text-baron-green" />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="retry"><RotateCw className="mr-1.5 h-4 w-4" />Fila de Retry</TabsTrigger>
          <TabsTrigger value="dead_letter"><Skull className="mr-1.5 h-4 w-4" />Dead Letter</TabsTrigger>
          <TabsTrigger value="history"><Clock className="mr-1.5 h-4 w-4" />Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="retry" className="mt-4">
          <QueueTable items={items} loading={loading} onReprocess={handleReprocess} onDetail={setSelected} />
        </TabsContent>
        <TabsContent value="dead_letter" className="mt-4">
          <QueueTable items={items} loading={loading} onReprocess={handleReprocess} onDetail={setSelected} deadLetter />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <QueueTable items={items} loading={loading} onDetail={setSelected} history />
        </TabsContent>
      </Tabs>

      {/* Detail drawer */}
      {selected && <DetailDrawer item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function QueueTable({ items, loading, onReprocess, onDetail, deadLetter, history }) {
  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Carregando operações…</Card>;
  }
  if (!items || items.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <ShieldCheck className="h-10 w-10 text-baron-green" />
        <p className="text-sm text-muted-foreground">Nenhuma operação nesta fila.</p>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-table-header text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Operação</th>
              <th className="px-3 py-2.5 font-semibold">Entidade</th>
              <th className="px-3 py-2.5 font-semibold">Etapa Falha</th>
              <th className="px-3 py-2.5 font-semibold">Estado</th>
              <th className="px-3 py-2.5 font-semibold">Tentativas</th>
              <th className="px-3 py-2.5 font-semibold">Usuário</th>
              <th className="px-3 py-2.5 font-semibold">Horário</th>
              <th className="px-3 py-2.5 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-table-border">
            {items.map((op) => (
              <tr key={op.id} className="bg-table-row transition-colors hover:bg-table-hover">
                <td className="px-3 py-2.5">
                  <p className="font-mono text-xs font-medium text-foreground">{op.operation_code}</p>
                  <p className="text-xs text-muted-foreground">{op.operation}</p>
                </td>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-foreground">{op.entity_name}</p>
                  {op.entity_id && <p className="font-mono text-[10px] text-muted-foreground">{op.entity_id.slice(0, 12)}…</p>}
                </td>
                <td className="px-3 py-2.5">
                  {op.failed_step ? (
                    <span className="inline-flex items-center gap-1 text-baron-red">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {STEP_LABELS[op.failed_step] || op.failed_step}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${STATE_COLORS[op.current_state] || "bg-muted text-muted-foreground"}`}>
                    {STATE_LABELS[op.current_state] || op.current_state}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {op.retry_count || 0}/{op.max_retries || 5}
                </td>
                <td className="px-3 py-2.5">
                  <p className="text-xs text-foreground">{op.user_name || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{op.module || ""}</p>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(op.last_attempt_at || op.started_at)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onDetail(op)} title="Ver detalhes">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(deadLetter || (!history && op.queue === "retry")) && (
                      <Button size="sm" variant="outline" onClick={() => onReprocess(op.id)} title="Reprocessar">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DetailDrawer({ item, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative h-full w-full max-w-lg overflow-y-auto border-l border-border bg-card shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-baron-orange" />
            <h2 className="font-bold text-foreground">{item.operation_code}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Identificação */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Identificação</h3>
            <div className="space-y-1.5 rounded-lg border border-border p-3 text-sm">
              <Row label="Entidade" value={item.entity_name} />
              <Row label="Operação" value={item.operation} />
              <Row label="ID do registro" value={item.entity_id || "—"} mono />
              <Row label="Módulo" value={item.module || "—"} />
              <Row label="Origem" value={item.origin || "—"} />
            </div>
          </section>

          {/* Estado do pipeline */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Pipeline</h3>
            <div className="space-y-1.5 rounded-lg border border-border p-3 text-sm">
              <Row label="Etapa atual" value={STEP_LABELS[item.current_step] || item.current_step} />
              <Row label="Estado" value={STATE_LABELS[item.current_state] || item.current_state} />
              {item.failed_step && (
                <Row label="Etapa que falhou" value={STEP_LABELS[item.failed_step] || item.failed_step} danger />
              )}
              <Row label="Tentativas" value={`${item.retry_count || 0} / ${item.max_retries || 5}`} />
            </div>
          </section>

          {/* Erro */}
          {item.error_message && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-baron-red">Erro</h3>
              <div className="rounded-lg border border-baron-red/30 bg-baron-red/5 p-3">
                <p className="text-sm text-foreground">{item.error_message}</p>
                {item.error_stack && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-background p-2 text-[10px] text-muted-foreground">{item.error_stack}</pre>
                )}
              </div>
            </section>
          )}

          {/* Usuário e horários */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Contexto</h3>
            <div className="space-y-1.5 rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{item.user_name || "—"}</span>
                <span className="text-xs text-muted-foreground">{item.user_email || ""}</span>
              </div>
              <Row label="Iniciado em" value={fmtDate(item.started_at)} />
              <Row label="Última tentativa" value={fmtDate(item.last_attempt_at)} />
              <Row label="Concluído em" value={fmtDate(item.completed_at)} />
            </div>
          </section>

          {/* Payload (intenção original — nunca se perde) */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Payload (Intenção Original)</h3>
            <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-background p-3 text-[11px] text-foreground">
              {JSON.stringify(item.payload, null, 2)}
            </pre>
          </section>

          {/* Readback */}
          {item.readback && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Read Back (Prova de Gravação)</h3>
              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-background p-3 text-[11px] text-foreground">
                {JSON.stringify(item.readback, null, 2)}
              </pre>
            </section>
          )}

          {/* Histórico de tentativas */}
          {item.attempt_history && item.attempt_history.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Histórico de Tentativas</h3>
              <div className="space-y-1">
                {item.attempt_history.map((a, i) => (
                  <div key={i} className="flex items-center justify-between rounded border border-border px-3 py-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">#{a.attempt}</span>
                      <span className="font-medium text-foreground">{STEP_LABELS[a.step] || a.step}</span>
                      <span className={a.status === "success" ? "text-baron-green" : "text-baron-red"}>
                        {a.status === "success" ? "✓" : "✗"}
                      </span>
                    </div>
                    <span className="text-muted-foreground">{fmtDate(a.timestamp)} · {a.duration_ms}ms</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, danger }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-right text-xs ${danger ? "text-baron-red font-medium" : "text-foreground"} ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}