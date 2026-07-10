import React, { useEffect, useState } from "react";
import { DecisionEngine } from "@/lib/decisionEngine";
import { brl } from "@/lib/financialCenter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Bot, RefreshCw, TrendingUp } from "lucide-react";

const REC_CONFIG = {
  recomendado: { label: "Recomendado", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  recomendado_com_reservas: { label: "Recomendado com Reservas", color: "bg-amber-100 text-amber-700 border-amber-200" },
  neutro: { label: "Neutro", color: "bg-neutral-100 text-neutral-700 border-neutral-200" },
  nao_recomendado: { label: "Não Recomendado", color: "bg-rose-100 text-rose-700 border-rose-200" },
};

const RISK_CONFIG = {
  baixo: { label: "Baixo", color: "bg-emerald-50 text-emerald-600" },
  medio: { label: "Médio", color: "bg-amber-50 text-amber-600" },
  alto: { label: "Alto", color: "bg-orange-50 text-orange-600" },
  muito_alto: { label: "Muito Alto", color: "bg-rose-50 text-rose-600" },
};

function ScoreCircle({ score }) {
  const color = score >= 80 ? "text-emerald-600" : score >= 65 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-neutral-200 bg-white">
      <div className="text-center">
        <p className={`text-lg font-black ${color}`}>{score}</p>
        <p className="text-[8px] uppercase text-neutral-400">/100</p>
      </div>
    </div>
  );
}

export default function DecisionRecommendations() {
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const load = () => {
    setLoading(true);
    DecisionEngine.getRecommendations().then(r => { setRecs(r); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleExplain = async (rec) => {
    setSelected(rec);
    setAiLoading(true);
    setAiText("");
    const explanation = await DecisionEngine.getAIExplanation(rec);
    setAiText(explanation);
    setAiLoading(false);
  };

  const handleDecide = async (rec, status) => {
    await DecisionEngine.saveRecommendation(rec, aiText);
    const history = await DecisionEngine.getHistory(1);
    if (history[0]) {
      await DecisionEngine.decide(history[0].id, status, "Gestor", { score: rec.score, financial_impact: rec.financial_impact });
    }
    setSelected(null);
    load();
  };

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>;
  }

  if (!recs || recs.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
        <TrendingUp className="mx-auto h-10 w-10 text-neutral-300" />
        <p className="mt-3 text-sm font-semibold text-neutral-900">Nenhuma recomendação ativa</p>
        <p className="mt-1 text-xs text-neutral-500">O motor não identificou decisões prioritárias no momento.</p>
        <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={load}><RefreshCw className="h-4 w-4" /> Recalcular</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{recs.length} recomendação(ões) ativa(s)</p>
        <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={load}><RefreshCw className="h-4 w-4" /> Recalcular</Button>
      </div>

      {recs.map((rec, i) => {
        const rCfg = REC_CONFIG[rec.recommendation] || REC_CONFIG.neutro;
        const riskCfg = RISK_CONFIG[rec.risk_level] || RISK_CONFIG.medio;
        return (
          <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-start gap-4">
              <ScoreCircle score={rec.score} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-neutral-900">{rec.title}</h3>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${rCfg.color}`}>{rCfg.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${riskCfg.color}`}>Risco {riskCfg.label}</span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">{rec.question}</p>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-neutral-50 p-2">
                    <p className="text-[10px] text-neutral-400">Probabilidade</p>
                    <p className="text-sm font-bold text-neutral-700">{rec.probability.toFixed(0)}%</p>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-2">
                    <p className="text-[10px] text-neutral-400">Impacto Financeiro</p>
                    <p className="text-sm font-bold text-neutral-700">{brl(rec.financial_impact)}</p>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-2">
                    <p className="text-[10px] text-neutral-400">Impacto Operacional</p>
                    <p className="text-sm font-bold capitalize text-neutral-700">{rec.operational_impact}</p>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-2">
                    <p className="text-[10px] text-neutral-400">Impacto Comercial</p>
                    <p className="text-sm font-bold capitalize text-neutral-700">{rec.commercial_impact}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold text-neutral-700">Motivos:</p>
                  <ul className="mt-1 space-y-0.5">
                    {rec.reasoning?.slice(0, 3).map((r, j) => (
                      <li key={j} className="flex items-start gap-1.5 text-xs text-neutral-600">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-400" />{r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 bg-white" onClick={() => handleExplain(rec)}>
                    <Bot className="h-3.5 w-3.5" /> Explicar com IA
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-violet-500" />
              Análise da IA — {selected?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl bg-violet-50 p-4">
              {aiLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-4 animate-pulse rounded bg-violet-200/60" style={{ width: `${90 - i * 8}%` }} />)}</div>
              ) : (
                <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{aiText}</p>
              )}
            </div>

            {selected && (
              <>
                <div>
                  <p className="mb-1 text-xs font-semibold text-neutral-700">Riscos Identificados</p>
                  <ul className="space-y-1">
                    {selected.risks?.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-neutral-600">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-400" />{r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold text-neutral-700">Alternativas</p>
                  <ul className="space-y-1">
                    {selected.alternatives?.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-neutral-600">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />{a}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-2 border-t border-neutral-100 pt-4">
                  <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleDecide(selected, "aceita")}>
                    <CheckCircle className="h-4 w-4" /> Aceitar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-rose-600" onClick={() => handleDecide(selected, "rejeitada")}>
                    <XCircle className="h-4 w-4" /> Rejeitar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Fechar</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}