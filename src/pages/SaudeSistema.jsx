import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Database, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Activity, Clock, FileText, Loader2, ChevronDown, ChevronUp,
  Table, Link2, Shield, AlertCircle
} from "lucide-react";

const STATUS_CFG = {
  ok: { icon: CheckCircle2, color: "text-baron-success", bg: "bg-baron-success/10", label: "OK" },
  error: { icon: XCircle, color: "text-baron-error", bg: "bg-baron-error/10", label: "Erro" },
  warning: { icon: AlertTriangle, color: "text-baron-alert", bg: "bg-baron-alert/10", label: "Atenção" },
  critical: { icon: XCircle, color: "text-baron-error", bg: "bg-baron-error/10", label: "Crítico" },
};

const MODULE_ICONS = {
  "Produtos": "📦", "Estoque": "📊", "Movimentações": "🔄", "Compras": "🛒",
  "Produção": "🏭", "Receitas": "📖", "Boletos": "💳", "Financeiro": "💰",
  "Contas a Receber": "📥", "Fornecedores": "🚚", "Documentos": "📄",
  "Clientes": "👤", "Motoboys": "🛵", "Pedidos": "📋", "RH": "👷", "Intelligence": "🧠"
};

export default function SaudeSistema() {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedModule, setExpandedModule] = useState(null);
  const [showAllTables, setShowAllTables] = useState(false);

  const runDiagnostic = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("systemDiagnostic", {});
      setReport(res.data);
    } catch (e) {
      setError(e.message || "Falha ao executar diagnóstico");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { runDiagnostic(); }, [runDiagnostic]);

  const overall = report?.overallStatus || "unknown";
  const overallCfg = STATUS_CFG[overall] || STATUS_CFG.warning;
  const OverallIcon = overallCfg.icon;
  const s = report?.summary;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">🔧 Diagnóstico do Sistema</h1>
            <p className="text-xs text-muted-foreground">Auditoria completa de persistência — {user?.full_name || user?.email}</p>
          </div>
        </div>
        <Button onClick={runDiagnostic} disabled={loading} variant="outline" size="sm" className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {loading ? "Executando..." : "Executar Diagnóstico"}
        </Button>
      </div>

      {loading && !report ? (
        <Card className="p-8 text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Executando bateria de testes em todos os módulos...</p>
          <p className="mt-1 text-xs text-muted-foreground">CRUD completo: criar → ler → atualizar → ler → excluir → confirmar</p>
        </Card>
      ) : error ? (
        <Card className="p-6 border-baron-error/30 bg-baron-error/5">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-baron-error" />
            <div>
              <p className="text-sm font-medium text-baron-error">Falha no diagnóstico</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
        </Card>
      ) : report ? (
        <>
          {/* Status Geral */}
          <Card className={`mb-4 p-5 ${overallCfg.bg} border-0`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <OverallIcon className={`h-8 w-8 ${overallCfg.color}`} />
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {overall === "ok" ? "Sistema Operacional — 100% Persistente" : overall === "warning" ? "Atenção Necessária" : "Sistema Crítico"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s?.modulesPassed}/{s?.modulesTested} módulos OK · {s?.totalTables} tabelas · {s?.totalRecords} registros · {s?.totalErrors} erro(s)
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{new Date(report.timestamp).toLocaleString("pt-BR")}</p>
                <p className="mt-1 flex items-center justify-end gap-1">
                  <Database className="h-3 w-3 text-baron-success" /> Banco conectado
                </p>
              </div>
            </div>
          </Card>

          {/* Métricas */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard icon={Clock} label="Tempo médio CRUD" value={`${s?.avgCrudTimeMs || 0}ms`} />
            <MetricCard icon={CheckCircle2} label="Módulos aprovados" value={`${s?.modulesPassed}/${s?.modulesTested}`} />
            <MetricCard icon={Table} label="Tabelas acessíveis" value={`${s?.accessibleTables}/${s?.totalTables}`} />
            <MetricCard icon={Link2} label="Relacionamento" value={s?.relationshipTestPassed ? "Íntegro" : "Falha"} />
          </div>

          {/* FASE 2: Teste CRUD por módulo */}
          <div className="mb-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Shield className="h-4 w-4 text-primary" /> Teste CRUD por Módulo (Create → Read → Update → Read → Delete → Confirm)
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {report.crudResults.map((r) => {
                const cfg = r.passed ? STATUS_CFG.ok : STATUS_CFG.error;
                const Icon = cfg.icon;
                const isOpen = expandedModule === r.module;
                return (
                  <div key={r.module} className={`rounded-lg border p-3 ${r.passed ? "border-baron-success/20" : "border-baron-error/30"}`}>
                    <button onClick={() => setExpandedModule(isOpen ? null : r.module)} className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                        <span className="text-sm font-medium text-foreground">{MODULE_ICONS[r.module] || "📋"} {r.module}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{r.elapsedMs}ms</span>
                        {isOpen ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="mt-2 space-y-1 text-xs">
                        {r.steps.map((st, i) => (
                          <div key={i} className="flex items-center gap-2">
                            {st.status === "ok" ? (
                              <CheckCircle2 className="h-3 w-3 text-baron-success" />
                            ) : (
                              <XCircle className="h-3 w-3 text-baron-error" />
                            )}
                            <span className="text-muted-foreground">{st.step}</span>
                            {st.id && <span className="text-muted-foreground/50">· {st.id.slice(0, 8)}</span>}
                            {st.verified && <span className="text-baron-success">✓ verificado</span>}
                            {st.error && <span className="text-baron-error">{st.error}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* FASE 7: Relacionamento */}
          <div className="mb-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Link2 className="h-4 w-4 text-primary" /> Integridade de Relacionamentos (Product → Stock → Movement)
            </h2>
            <Card className={`p-3 ${report.relationshipTest.passed ? "border-baron-success/20" : "border-baron-error/30"}`}>
              <div className="flex items-center gap-2">
                {report.relationshipTest.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-baron-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-baron-error" />
                )}
                <span className="text-sm font-medium text-foreground">
                  {report.relationshipTest.passed ? "Relacionamentos íntegros — chaves estrangeiras preservadas" : "Falha na integridade"}
                </span>
              </div>
              {report.relationshipTest.steps?.map((st, i) => (
                <div key={i} className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-baron-success" />
                  {st.step} {st.links !== undefined && (st.links ? "✓ link OK" : "✗ link quebrado")}
                </div>
              ))}
            </Card>
          </div>

          {/* FASE 1: Mapa de Tabelas */}
          <div className="mb-4">
            <button onClick={() => setShowAllTables(!showAllTables)} className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Table className="h-4 w-4 text-primary" /> Mapeamento de Tabelas ({report.tableMap.length})
              {showAllTables ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showAllTables && (
              <Card className="p-0 overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tabela</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Registros</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">PK</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Última atualização</th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">Acesso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.tableMap.map((t) => (
                        <tr key={t.entity} className="border-b border-border/50">
                          <td className="px-3 py-1.5 font-medium text-foreground">{t.entity}</td>
                          <td className="px-3 py-1.5 text-right text-muted-foreground">{t.recordCount}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{t.primaryKey}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{t.lastUpdate ? new Date(t.lastUpdate).toLocaleDateString("pt-BR") : "—"}</td>
                          <td className="px-3 py-1.5 text-center">
                            {t.accessible ? <CheckCircle2 className="mx-auto h-3 w-3 text-baron-success" /> : <XCircle className="mx-auto h-3 w-3 text-baron-error" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>

          {/* FASE 4: Logs de Auditoria */}
          <div className="mb-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4 text-primary" /> Logs de Auditoria
            </h2>
            <Card className="p-0 overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {report.recentAuditLogs.length === 0 ? (
                  <p className="p-4 text-center text-xs text-muted-foreground">Nenhum log registrado.</p>
                ) : (
                  report.recentAuditLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 border-b border-border px-4 py-2 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{log.action}</p>
                        <p className="text-xs text-muted-foreground">{log.user_name} · {log.module} · {log.entity_type}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{log.created_date ? new Date(log.created_date).toLocaleString("pt-BR") : ""}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Erros */}
          {report.errors.length > 0 && (
            <div className="mb-4">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-baron-error">
                <AlertCircle className="h-4 w-4" /> Falhas Detectadas ({report.errors.length})
              </h2>
              <Card className="p-0 border-baron-error/30">
                {report.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-3 border-b border-border px-4 py-2 last:border-0">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-baron-error" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{err.module || err.entity}</p>
                      <p className="text-xs text-muted-foreground">{err.error}</p>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* Relatório salvo */}
          <Card className="p-3 bg-secondary/30">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-baron-success" />
              Relatório salvo automaticamente na tabela AuditLog para auditoria futura.
            </p>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </Card>
  );
}