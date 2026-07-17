import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import {
  recoverProcesses,
  resumeProcess,
  approveAndResume,
  rejectProcess,
  WAITING_STATES,
} from "@/lib/documentWorkflow";
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  XCircle,
  PackagePlus,
  History,
  Database,
} from "lucide-react";

const STATE_META = {
  RECEBIDO: { label: "Recebido", color: "text-secondary-info", dot: "bg-muted-foreground" },
  OCR_CONCLUIDO: { label: "OCR Concluído", color: "text-baron-blue", dot: "bg-baron-blue" },
  PRODUTOS_EXTRAIDOS: { label: "Produtos Extraídos", color: "text-baron-blue", dot: "bg-baron-blue" },
  AGUARDANDO_CADASTRO_PRODUTO: { label: "Aguardando Cadastro de Produto", color: "text-baron-yellow", dot: "bg-baron-yellow" },
  AGUARDANDO_APROVACAO: { label: "Aguardando Aprovação", color: "text-baron-yellow", dot: "bg-baron-yellow" },
  AGUARDANDO_PROCESSAMENTO: { label: "Aguardando Processamento", color: "text-baron-yellow", dot: "bg-baron-yellow" },
  PRODUTO_CRIADO: { label: "Produto Criado", color: "text-baron-blue", dot: "bg-baron-blue" },
  ESTOQUE_PROCESSADO: { label: "Estoque Processado", color: "text-baron-green", dot: "bg-baron-green" },
  CMV_PROCESSADO: { label: "CMV Processado", color: "text-baron-green", dot: "bg-baron-green" },
  DRE_PROCESSADO: { label: "DRE Processado", color: "text-baron-green", dot: "bg-baron-green" },
  FINANCEIRO_PROCESSADO: { label: "Financeiro Processado", color: "text-baron-green", dot: "bg-baron-green" },
  DOCUMENTO_ARQUIVADO: { label: "Documento Arquivado", color: "text-secondary-info", dot: "bg-muted-foreground" },
  CONCLUIDO: { label: "Concluído", color: "text-baron-green", dot: "bg-baron-green" },
  ERRO: { label: "Erro", color: "text-baron-red", dot: "bg-baron-red" },
};

function StateBadge({ state }) {
  const meta = STATE_META[state] || { label: state, color: "text-secondary-info", dot: "bg-muted-foreground" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.color}`}>
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export default function ProcessosWorkflow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pausado");
  const [selected, setSelected] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", unit: "un", category: "", cost_price: 0 });
  const [fixValue, setFixValue] = useState("");
  const [readBack, setReadBack] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = filter === "all" ? {} : { status: filter };
      const list = await base44.entities.DocumentProcess.list("-created_date", 100);
      const filtered = filter === "all" ? list : (list || []).filter((p) => p.status === filter);
      setProcesses(filtered || []);
    } catch (e) {
      toast({ title: "Erro ao carregar processos", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshDetail = useCallback(async (id) => {
    if (!id) return;
    const d = await base44.entities.DocumentProcess.get(id);
    setSelectedDetail(d);
    setReadBack({ id: d.id, state: d.current_state, status: d.status, at: new Date().toISOString() });
    return d;
  }, []);

  useEffect(() => {
    if (selected) refreshDetail(selected);
    else setSelectedDetail(null);
  }, [selected, refreshDetail]);

  const handleResume = async (id) => {
    setActionLoading(id);
    try {
      const res = await resumeProcess(id, user);
      if (res.resumed) {
        toast({ title: "Processo retomado", description: "Fluxo continuou do ponto exato e foi concluído.", state: "success" });
      } else if (res.reason) {
        toast({ title: "Não retomado", description: res.reason, variant: "destructive" });
      } else {
        toast({ title: "Erro ao retomar", description: res.error || "Falha", variant: "destructive" });
      }
      await load();
      await refreshDetail(id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFixValueAndResume = async () => {
    const value = parseFloat(String(fixValue).replace(",", "."));
    if (!selected || !value || value <= 0) return;
    setActionLoading(selected);
    try {
      const res = await approveAndResume(selected, { user, contextOverride: { value } });
      if (res.resumed) {
        toast({ title: "Valor confirmado", description: "Conta a pagar criada e fluxo concluído.", state: "success" });
      } else if (res.reason) {
        toast({ title: "Não retomado", description: res.reason, variant: "destructive" });
      }
      setFixValue("");
      await load();
      await refreshDetail(selected);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateAndResume = async () => {
    if (!selected || !newProduct.name.trim()) return;
    setActionLoading(selected);
    try {
      await approveAndResume(selected, { user, productData: newProduct });
      toast({ title: "Produto criado e fluxo retomado", description: newProduct.name, state: "success" });
      setNewProduct({ name: "", unit: "un", category: "", cost_price: 0 });
      setShowCreate(false);
      await load();
      await refreshDetail(selected);
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await rejectProcess(id, { user, reason: "Rejeitado pelo operador" });
      toast({ title: "Processo rejeitado", variant: "destructive" });
      await load();
      await refreshDetail(id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecover = async () => {
    setActionLoading("recover");
    try {
      const res = await recoverProcesses(user);
      toast({
        title: "Recuperação concluída",
        description: `${res.scanned} processo(s) verificado(s), ${res.resumed.length} retomado(s).`,
        state: "success",
      });
      await load();
      if (selected) await refreshDetail(selected);
    } finally {
      setActionLoading(null);
    }
  };

  const counts = processes.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
  const pausedCount = (counts.pausado || 0) + (counts.erro || 0);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-heading font-bold text-title flex items-center gap-2">
            <Activity className="h-5 w-5 text-baron-orange" />
            Workflow Persistente de Documentos
          </h1>
          <p className="text-sm text-secondary-info">
            Nenhum documento perde o fluxo. Aprovação apenas pausa — retoma do ponto exato, sem reenviar a nota.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRecover}
            disabled={actionLoading === "recover"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-baron-blue/30 bg-baron-blue/10 px-3 py-2 text-sm font-medium text-baron-blue hover:bg-baron-blue/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${actionLoading === "recover" ? "animate-spin" : ""}`} />
            Recuperar processos
          </button>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-table-hover transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={<Clock className="h-4 w-4" />} label="Pausados / Erro" value={pausedCount} color="text-baron-yellow" />
        <SummaryCard icon={<Play className="h-4 w-4" />} label="Ativos" value={counts.ativo || 0} color="text-baron-blue" />
        <SummaryCard icon={<CheckCircle2 className="h-4 w-4" />} label="Concluídos" value={counts.concluido || 0} color="text-baron-green" />
        <SummaryCard icon={<Database className="h-4 w-4" />} label="Total" value={processes.length} color="text-secondary-info" />
      </div>

      {/* Filtros */}
      <div className="flex gap-1 rounded-lg bg-secondary/40 p-1 w-fit">
        {[
          { v: "pausado", l: "Pausados" },
          { v: "ativo", l: "Em andamento" },
          { v: "concluido", l: "Concluídos" },
          { v: "all", l: "Todos" },
        ].map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.v ? "bg-baron-orange text-white" : "text-secondary-info hover:text-primary-info"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Lista */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />
              ))}
            </div>
          ) : processes.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-secondary-info">
              Nenhum processo neste filtro.
            </div>
          ) : (
            processes.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  selected === p.id
                    ? "border-baron-orange/50 bg-baron-orange/5"
                    : "border-border bg-card hover:bg-card-hover"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-primary-info">{p.process_id}</span>
                  <StateBadge state={p.current_state} />
                </div>
                <p className="mt-1 truncate text-sm text-secondary-info">{p.document_title || "Documento"}</p>
                {p.pending?.product_names?.length > 0 && (
                  <p className="mt-1 truncate text-xs text-baron-yellow">
                    <PackagePlus className="mr-1 inline h-3 w-3" />
                    {p.pending.product_names.join(", ")}
                  </p>
                )}
              </button>
            ))
          )}
        </div>

        {/* Detalhe */}
        <div className="lg:col-span-3">
          {!selectedDetail ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-secondary-info">
              Selecione um processo para ver a máquina de estados e auditoria.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Resumo do processo */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-bold text-primary-info">{selectedDetail.process_id}</p>
                    <p className="text-xs text-secondary-info">{selectedDetail.document_title}</p>
                  </div>
                  <StateBadge state={selectedDetail.current_state} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Info label="Tipo roteado" value={selectedDetail.route_type || "—"} />
                  <Info label="Estado anterior" value={selectedDetail.previous_state || "—"} />
                  <Info label="Tentativas de recuperação" value={selectedDetail.recovery_attempts || 0} />
                  <Info label="Próxima etapa" value={selectedDetail.next_step || "—"} />
                </div>

                {readBack && (
                  <div className="flex items-center gap-2 rounded-lg bg-baron-green/10 px-3 py-2 text-xs text-baron-green">
                    <Database className="h-3.5 w-3.5" />
                    Read-back confirmado: estado <b>{readBack.state}</b> · status <b>{readBack.status}</b>
                  </div>
                )}

                {/* Ações */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedDetail.current_state === "AGUARDANDO_CADASTRO_PRODUTO" && (
                    <button
                      onClick={() => setShowCreate(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-baron-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-baron-orange-hover transition-colors"
                    >
                      <PackagePlus className="h-3.5 w-3.5" />
                      Criar produto e retomar
                    </button>
                  )}
                  {selectedDetail.current_state === "AGUARDANDO_APROVACAO" && !(selectedDetail.context?.value > 0) && (
                    <div className="flex w-full items-center gap-2 rounded-lg border border-baron-yellow/40 bg-baron-yellow/5 p-2.5">
                      <span className="text-xs text-secondary-info">O valor não foi identificado no documento. Informe manualmente:</span>
                      <input
                        type="number" step="0.01" placeholder="R$ 0,00" value={fixValue}
                        onChange={(e) => setFixValue(e.target.value)}
                        className="h-8 w-28 rounded-md border border-border bg-card px-2 text-xs"
                      />
                      <button
                        onClick={handleFixValueAndResume}
                        disabled={actionLoading === selected || !fixValue}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-baron-green px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 transition-colors disabled:opacity-50"
                      >
                        Confirmar valor e concluir
                      </button>
                    </div>
                  )}
                  {WAITING_STATES.includes(selectedDetail.current_state) && selectedDetail.current_state !== "ERRO" && (
                    <button
                      onClick={() => handleResume(selectedDetail.id)}
                      disabled={actionLoading === selectedDetail.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-baron-green px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 transition-colors disabled:opacity-50"
                    >
                      <Play className="h-3.5 w-3.5" />
                      {actionLoading === selectedDetail.id ? "Retomando..." : "Retomar fluxo"}
                    </button>
                  )}
                  {selectedDetail.current_state !== "CONCLUIDO" && (
                    <button
                      onClick={() => handleReject(selectedDetail.id)}
                      disabled={actionLoading === selectedDetail.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-baron-red/40 px-3 py-1.5 text-xs font-semibold text-baron-red hover:bg-baron-red/10 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Rejeitar
                    </button>
                  )}
                </div>
              </div>

              {/* Contexto */}
              {selectedDetail.context && Object.keys(selectedDetail.context).length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-xs font-semibold text-secondary-info">Contexto persistido (OCR / produtos / valores)</p>
                  <pre className="overflow-x-auto rounded-lg bg-background/60 p-3 text-[11px] text-secondary-info max-h-40">
                    {JSON.stringify(
                      {
                        supplier: selectedDetail.context.supplier,
                        value: selectedDetail.context.value,
                        due_date: selectedDetail.context.due_date,
                        document_number: selectedDetail.context.document_number,
                        products: (selectedDetail.context.products || []).map((p) => ({ name: p.name, quantity: p.quantity, unit_price: p.unit_price })),
                        route_type: selectedDetail.context.route_type,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}

              {/* Resultados */}
              {selectedDetail.results && Object.keys(selectedDetail.results).length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-xs font-semibold text-secondary-info">Resultados das etapas</p>
                  <div className="space-y-1 text-xs">
                    {selectedDetail.results.stock?.length > 0 && (
                      <p className="text-baron-green">✓ Estoque: {selectedDetail.results.stock.length} produto(s) atualizado(s)</p>
                    )}
                    {selectedDetail.results.payment_id && (
                      <p className="text-baron-green">✓ Conta a pagar criada: {selectedDetail.results.payment_id}</p>
                    )}
                    {selectedDetail.results.confidence != null && (
                      <p className="text-secondary-info">Confiança: {selectedDetail.results.confidence}%</p>
                    )}
                  </div>
                </div>
              )}

              {/* Auditoria */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-3 text-xs font-semibold text-secondary-info flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" /> Auditoria de transições
                </p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {(selectedDetail.history || []).slice().reverse().map((h, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <div className="flex flex-col items-center">
                        <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${(STATE_META[h.state]?.dot) || "bg-muted-foreground"}`} />
                        {i < (selectedDetail.history || []).length - 1 && <span className="flex-1 w-px bg-border" />}
                      </div>
                      <div className="pb-2 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-primary-info">{STATE_META[h.state]?.label || h.state}</span>
                          <span className="text-small-info">{new Date(h.timestamp).toLocaleString("pt-BR")}</span>
                        </div>
                        {h.reason && <p className="text-secondary-info">{h.reason}</p>}
                        <p className="text-small-info">por {h.actor}{h.duration_ms ? ` · ${h.duration_ms}ms` : ""}</p>
                        {h.errors?.length > 0 && (
                          <p className="text-baron-red flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{h.errors.join("; ")}</p>
                        )}
                        {h.previous_state && <p className="text-small-info">de {STATE_META[h.previous_state]?.label || h.previous_state}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog criar produto */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-heading font-bold text-title flex items-center gap-2">
              <PackagePlus className="h-4 w-4 text-baron-orange" /> Cadastrar produto e retomar
            </h3>
            <p className="text-xs text-secondary-info">
              O produto será criado e o fluxo continuará automaticamente: estoque → custo médio → financeiro → arquivamento.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-medium text-secondary-info">Nome do produto</label>
              <input
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="Ex: Queijo Mussarela 1kg"
                className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-primary-info focus:border-baron-orange focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-secondary-info">Unidade</label>
                  <input
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-primary-info focus:border-baron-orange focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-secondary-info">Categoria</label>
                  <input
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    placeholder="Geral"
                    className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-primary-info focus:border-baron-orange focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-secondary-info">Custo (R$)</label>
                <input
                  type="number"
                  value={newProduct.cost_price}
                  onChange={(e) => setNewProduct({ ...newProduct, cost_price: Number(e.target.value) })}
                  className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-primary-info focus:border-baron-orange focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-3 py-2 text-sm text-secondary-foreground hover:bg-table-hover">Cancelar</button>
              <button
                onClick={handleCreateAndResume}
                disabled={!newProduct.name.trim() || actionLoading === selected}
                className="rounded-lg bg-baron-orange px-3 py-2 text-sm font-semibold text-white hover:bg-baron-orange-hover disabled:opacity-50"
              >
                {actionLoading === selected ? "Processando..." : "Criar e retomar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className={`flex items-center gap-1.5 ${color}`}>{icon}<span className="text-xs text-secondary-info">{label}</span></div>
      <p className="mt-1 text-2xl font-heading font-bold text-title">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-small-info">{label}</p>
      <p className="text-secondary-info font-medium truncate">{value}</p>
    </div>
  );
}