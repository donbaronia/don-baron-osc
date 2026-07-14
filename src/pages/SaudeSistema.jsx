import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Database, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Activity, Clock, FileText, Loader2, ChevronDown, ChevronUp
} from "lucide-react";

const STATUS_CONFIG = {
  ok: { icon: CheckCircle2, color: "text-baron-success", bg: "bg-baron-success/10", label: "OK" },
  error: { icon: XCircle, color: "text-baron-error", bg: "bg-baron-error/10", label: "Erro" },
  mismatch: { icon: AlertTriangle, color: "text-baron-alert", bg: "bg-baron-alert/10", label: "Divergência" },
  warning: { icon: AlertTriangle, color: "text-baron-alert", bg: "bg-baron-alert/10", label: "Atenção" },
  critical: { icon: XCircle, color: "text-baron-error", bg: "bg-baron-error/10", label: "Crítico" },
};

const MODULE_LABELS = {
  Product: "Produtos", Stock: "Estoque", Inventory: "Inventário", Movement: "Movimentações",
  Purchase: "Compras", PurchaseRequest: "Requisições", Quotation: "Cotações",
  ProductionRecord: "Produção", Recipe: "Receitas", Payment: "Boletos/Pagamentos",
  FinancialTransaction: "Financeiro", DBDocument: "Documentos", Employee: "Funcionários",
  Courier: "Motoboys", Sale: "Vendas/Pedidos", Customer: "Clientes", Supplier: "Fornecedores",
  AuditLog: "Auditoria", Mission: "Missões", Category: "Categorias", Tag: "Tags",
  CMVRecord: "CMV", PriceHistory: "Histórico Preços", FinancialAccount: "Contas Financeiras",
  CostCenter: "Centros de Custo", FinancialCategory: "Categorias Financeiras",
  Ingredient: "Ingredientes", Indicator: "Indicadores", Notification: "Notificações",
  Conciliation: "Conciliação", KPIRecord: "KPIs", IFoodReceipt: "Recibos iFood"
};

export default function SaudeSistema() {
  const { user } = useAuth();
  const [diagnostic, setDiagnostic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedEntity, setExpandedEntity] = useState(null);

  const runDiagnostic = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("systemDiagnostic", {});
      setDiagnostic(res.data);
    } catch (e) {
      setError(e.message || "Falha ao executar diagnóstico");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { runDiagnostic(); }, [runDiagnostic]);

  const overall = diagnostic?.overallStatus || "unknown";
  const overallCfg = STATUS_CONFIG[overall] || STATUS_CONFIG.warning;
  const OverallIcon = overallCfg.icon;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Saúde do Sistema</h1>
            <p className="text-xs text-muted-foreground">
              Diagnóstico de persistência — {user?.full_name || user?.email}
            </p>
          </div>
        </div>
        <Button onClick={runDiagnostic} disabled={loading} variant="outline" size="sm" className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {loading ? "Diagnosticando..." : "Reexecutar"}
        </Button>
      </div>

      {loading && !diagnostic ? (
        <Card className="p-8 text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Executando testes de persistência em todas as entidades...</p>
          <p className="mt-1 text-xs text-muted-foreground">Criando, lendo, verificando e excluindo registros de teste.</p>
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
      ) : diagnostic ? (
        <>
          {/* Status Geral */}
          <Card className={`mb-4 p-5 ${overallCfg.bg} border-0`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <OverallIcon className={`h-8 w-8 ${overallCfg.color}`} />
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {overall === "ok" ? "Sistema Operacional" : overall === "warning" ? "Atenção Necessária" : "Sistema Crítico"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {diagnostic.summary.writeOk}/{diagnostic.summary.writeTested} escritas OK ·
                    {" "}{diagnostic.summary.readOk}/{diagnostic.summary.totalEntities} leituras OK ·
                    {" "}{diagnostic.summary.totalErrors} erro(s)
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{new Date(diagnostic.timestamp).toLocaleString("pt-BR")}</p>
                <p className="flex items-center justify-end gap-1 mt-1">
                  <Database className="h-3 w-3 text-baron-success" /> Banco conectado
                </p>
              </div>
            </div>
          </Card>

          {/* Métricas */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard icon={Clock} label="Tempo médio escrita" value={`${diagnostic.summary.avgWriteTimeMs}ms`} />
            <MetricCard icon={Activity} label="Tempo médio leitura" value={`${diagnostic.summary.avgReadTimeMs}ms`} />
            <MetricCard icon={CheckCircle2} label="Escritas confirmadas" value={`${diagnostic.summary.writeOk}/${diagnostic.summary.writeTested}`} />
            <MetricCard icon={FileText} label="Total registros" value={diagnostic.readResults.reduce((a, r) => a + (r.recordCount || 0), 0)} />
          </div>

          {/* Teste de Escrita — ETAPA 2 e 6 */}
          <div className="mb-4">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Teste de Persistência (Create → Read-back → Verify → Delete)</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {diagnostic.writeResults.map((wr) => {
                const cfg = STATUS_CONFIG[wr.status] || STATUS_CONFIG.error;
                const Icon = cfg.icon;
                const label = MODULE_LABELS[wr.entity] || wr.entity;
                const isOpen = expandedEntity === wr.entity;
                return (
                  <div key={wr.entity} className={`rounded-lg border p-3 ${wr.status === "ok" ? "border-baron-success/20" : wr.status === "mismatch" ? "border-baron-alert/30" : "border-baron-error/30"}`}>
                    <button
                      onClick={() => setExpandedEntity(isOpen ? null : wr.entity)}
                      className="flex w-full items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                        <span className="text-sm font-medium text-foreground">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{wr.writeTimeMs}ms</span>
                        {isOpen ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>Status: <span className={cfg.color}>{cfg.label}</span></p>
                        <p>ID teste: {wr.testId || "—"}</p>
                        <p>Verificado: {wr.verified ? "Sim" : "Não"}</p>
                        {wr.error && <p className="text-baron-error">Erro: {wr.error}</p>}
                        {wr.mismatches?.length > 0 && (
                          <div>
                            <p className="text-baron-alert">Divergências:</p>
                            {wr.mismatches.map((m, i) => (
                              <p key={i} className="ml-2">• {m.field}: esperado={String(m.expected)}, retornado={String(m.actual)}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Teste de Leitura — todas as entidades */}
          <div className="mb-4">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Contagem de Registros por Entidade</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {diagnostic.readResults.map((rr) => {
                const cfg = STATUS_CONFIG[rr.status] || STATUS_CONFIG.error;
                const Icon = cfg.icon;
                const label = MODULE_LABELS[rr.entity] || rr.entity;
                return (
                  <div key={rr.entity} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${cfg.color}`} />
                      <span className="truncate text-xs text-foreground">{label}</span>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">{rr.recordCount}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logs de Auditoria — ETAPA 4 e 8 */}
          <div className="mb-4">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Auditoria Recente</h2>
            <Card className="p-0 overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {diagnostic.recentAuditLogs.length === 0 ? (
                  <p className="p-4 text-center text-xs text-muted-foreground">Nenhum log registrado.</p>
                ) : (
                  diagnostic.recentAuditLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 border-b border-border px-4 py-2 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{log.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.user_name} · {log.entity_type} · {log.entity_id?.slice(0, 8) || "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {log.created_date ? new Date(log.created_date).toLocaleString("pt-BR") : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Erros — ETAPA 4 */}
          {diagnostic.errors.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-baron-error">Erros Detectados ({diagnostic.errors.length})</h2>
              <Card className="p-0 border-baron-error/30">
                {diagnostic.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-3 border-b border-border px-4 py-2 last:border-0">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-baron-error" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{err.entity} — {err.phase}</p>
                      <p className="text-xs text-muted-foreground">{err.error}</p>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}
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