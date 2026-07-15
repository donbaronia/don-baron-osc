import React, { useState } from "react";
import { DecisionEngine } from "@/lib/decisionEngine";
import { brl } from "@/lib/financialCenter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BaronSelect } from "@/design-system";
import { Play, Save } from "lucide-react";

const SCENARIOS = [
  { v: "fornecedor_aumenta_preco", l: "Fornecedor Aumenta Preço", params: [{ key: "product_name", label: "Produto / Ingrediente", type: "text", default: "Blend" }, { key: "increase_pct", label: "Aumento (%)", type: "number", default: 10 }] },
  { v: "aumentar_preco", l: "Aumentar Preço de Venda", params: [{ key: "product_name", label: "Produto", type: "text", default: "Combo Don Baron" }, { key: "increase_pct", label: "Aumento (%)", type: "number", default: 5 }] },
  { v: "contratar", l: "Contratar Funcionários", params: [{ key: "count", label: "Quantidade", type: "number", default: 2 }, { key: "avg_salary", label: "Salário Médio (R$)", type: "number", default: 2200 }] },
  { v: "abrir_unidade", l: "Abrir Nova Unidade", params: [{ key: "estimated_revenue", label: "Faturamento Mensal Previsto (R$)", type: "number", default: 80000 }, { key: "estimated_investment", label: "Investimento Inicial (R$)", type: "number", default: 200000 }] },
  { v: "promocao", l: "Campanha Promocional", params: [{ key: "discount_pct", label: "Desconto (%)", type: "number", default: 10 }, { key: "expected_volume_increase", label: "Aumento de Volume Esperado (%)", type: "number", default: 20 }] },
];

function ResultRow({ label, value, highlight }) {
  return (
    <div className={`flex items-center justify-between rounded-lg p-2.5 ${highlight ? "bg-neutral-900 text-white" : "bg-neutral-50"}`}>
      <span className={`text-xs ${highlight ? "text-neutral-300" : "text-neutral-500"}`}>{label}</span>
      <span className={`text-sm font-bold ${highlight ? "text-white" : "text-neutral-900"}`}>{value}</span>
    </div>
  );
}

export default function DecisionSimulator() {
  const [scenario, setScenario] = useState(SCENARIOS[0].v);
  const [params, setParams] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const currentScenario = SCENARIOS.find(s => s.v === scenario);

  const handleRun = async () => {
    setLoading(true);
    try {
      const r = await DecisionEngine.simulate({ scenario, ...params });
      setResult(r);
    } catch (e) {
      setResult({ error: e.message });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!result || result.error) return;
    await DecisionEngine.saveRecommendation({
      title: result.scenario,
      decision_type: "simulacao",
      question: "Simulação de cenário",
      score: 0,
      recommendation: result.recommendation,
      risk_level: result.risk?.level || "medio",
      probability: result.risk?.probability || 0,
      financial_impact: result.risk?.impact || 0,
      reasoning: [result.suggestion],
      data_sources: ["simulador"],
      risks: [],
      alternatives: [],
      calculations: result.results,
      simulation_params: result.params,
      status: "simulada",
    }, result.suggestion);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-neutral-900">Simulador Empresarial</h3>
        <p className="mt-1 text-xs text-neutral-500">Selecione um cenário, ajuste os parâmetros e veja o impacto projetado.</p>

        <div className="mt-4">
          <Label className="text-xs">Cenário</Label>
          <BaronSelect className="mt-1" value={scenario} onChange={(v) => { setScenario(v); setResult(null); setParams({}); }} options={SCENARIOS.map((s) => ({ value: s.v, label: s.l }))} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {currentScenario?.params.map(p => (
            <div key={p.key}>
              <Label className="text-xs">{p.label}</Label>
              <Input
                type={p.type}
                defaultValue={p.default}
                className="mt-1"
                onChange={(e) => setParams(prev => ({ ...prev, [p.key]: p.type === "number" ? Number(e.target.value) : e.target.value }))}
              />
            </div>
          ))}
        </div>

        <Button className="mt-4 gap-2" onClick={handleRun} disabled={loading}>
          <Play className="h-4 w-4" /> {loading ? "Simulando..." : "Simular"}
        </Button>
      </div>

      {result && !result.error && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900">Resultado da Simulação</h3>
            <Button variant="outline" size="sm" className="gap-1.5 bg-white" onClick={handleSave}><Save className="h-3.5 w-3.5" /> Salvar</Button>
          </div>

          <div className="mt-4 space-y-2">
            {Object.entries(result.results || {}).map(([key, val]) => {
              const isCurrency = ["custo", "preco", "lucro", "faturamento", "impacto", "capital", "custo_mensal", "custo_anual", "ganho", "saldo", "lucro_mensal", "lucro_anual", "variacao_lucro", "impacto_anual", "impacto_lucro", "impacto_caixa", "ticket", "aumento_custo", "custo_novo", "custo_atual"].some(k => key.includes(k));
              const isPct = key.includes("cmv") || key.includes("margem");
              const formatted = isCurrency ? brl(val) : isPct ? `${val.toFixed(1)}%` : typeof val === "number" ? val.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : String(val);
              const highlight = key.includes("impacto_anual") || key.includes("lucro_mensal_novo") || key.includes("lucro_previsto") || key.includes("prazo_retorno") || key.includes("variacao_lucro");
              return <ResultRow key={key} label={key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} value={formatted} highlight={highlight} />;
            })}
          </div>

          <div className="mt-4 rounded-xl bg-violet-50 p-4">
            <p className="text-sm font-medium text-neutral-700">{result.suggestion}</p>
          </div>

          <div className="mt-4 flex items-center gap-4 border-t border-neutral-100 pt-4">
            <div>
              <p className="text-xs text-neutral-400">Recomendação</p>
              <p className="text-sm font-bold capitalize text-neutral-900">{result.recommendation?.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Risco</p>
              <p className="text-sm font-bold capitalize text-neutral-900">{result.risk?.level?.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Probabilidade</p>
              <p className="text-sm font-bold text-neutral-900">{result.risk?.probability}%</p>
            </div>
          </div>
        </div>
      )}

      {result?.error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">Erro: {result.error}</p>
        </div>
      )}
    </div>
  );
}