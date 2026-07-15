import React, { useEffect, useState } from "react";
import { CMV, brl } from "@/lib/cmvEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Calculator, ArrowRight, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";

import { BaronSelect } from "@/design-system";

export default function CMVSimulator() {
  const { toast } = useToast();
  const [ingredients, setIngredients] = useState([]);
  const [selectedIng, setSelectedIng] = useState("");
  const [priceChange, setPriceChange] = useState(8);
  const [result, setResult] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const latest = await CMV.getLatest("monthly");
      const ings = (latest?.breakdown_by_ingredient || []).map(i => i.name).filter(Boolean);
      setIngredients([...new Set(ings)]);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const simulate = async () => {
    if (!selectedIng) { toast({ title: "Erro", description: "Selecione um ingrediente", variant: "destructive" }); return; }
    setSimulating(true);
    try {
      const res = await CMV.simulate(selectedIng, priceChange);
      setResult(res);
    } catch (e) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    setSimulating(false);
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;

  const Diff = ({ value, isPct = false, invert = false }) => {
    const positive = invert ? value < 0 : value > 0;
    const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : null;
    const fmt = isPct ? `${value.toFixed(1)}pp` : brl(value);
    return (
      <span className={`inline-flex items-center gap-1 text-sm font-medium ${positive ? "text-emerald-600" : value < 0 ? "text-rose-600" : "text-neutral-500"}`}>
        {Icon && <Icon className="h-3.5 w-3.5" />}{value > 0 ? "+" : ""}{fmt}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Simulador de CMV</h3>
        <p className="text-sm text-neutral-500 mb-4">Simule o impacto de um aumento de preço de ingrediente no CMV da empresa.</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">Ingrediente</label>
            <BaronSelect value={selectedIng} onChange={(v) => setSelectedIng(v)} options={ingredients.map((ing) => ({ value: ing, label: ing }))} placeholder="Selecione..." />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">Variação de Preço (%)</label>
            <Input type="number" step="0.1" value={priceChange} onChange={e => setPriceChange(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="flex items-end">
            <Button onClick={simulate} disabled={simulating} className="w-full gap-2"><Calculator className="h-4 w-4" /> {simulating ? "Simulando..." : "Simular"}</Button>
          </div>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h4 className="text-xs font-semibold text-neutral-500 mb-3">ATUAL</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">CMV</span><span className="font-medium">{result.current.cmv_pct.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Custo</span><span className="font-medium">{brl(result.current.cost)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Margem</span><span className="font-medium">{result.current.margin_pct.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Lucro</span><span className="font-medium">{brl(result.current.gross_profit)}</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <h4 className="text-xs font-semibold text-blue-500 mb-3">SIMULADO (+{result.price_change_pct}%)</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-blue-600">CMV</span><span className="font-medium text-blue-900">{result.simulated.cmv_pct.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-blue-600">Custo</span><span className="font-medium text-blue-900">{brl(result.simulated.cost)}</span></div>
              <div className="flex justify-between"><span className="text-blue-600">Margem</span><span className="font-medium text-blue-900">{result.simulated.margin_pct.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-blue-600">Lucro</span><span className="font-medium text-blue-900">{brl(result.simulated.gross_profit)}</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h4 className="text-xs font-semibold text-neutral-500 mb-3">IMPACTO</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center"><span className="text-neutral-500">Δ CMV</span><Diff value={result.diff.cmv} isPct invert /></div>
              <div className="flex justify-between items-center"><span className="text-neutral-500">Δ Custo</span><Diff value={result.diff.cost} invert /></div>
              <div className="flex justify-between items-center"><span className="text-neutral-500">Δ Margem</span><Diff value={result.diff.margin} isPct /></div>
              <div className="flex justify-between items-center"><span className="text-neutral-500">Δ Lucro</span><Diff value={result.diff.profit} invert /></div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center"><span className="text-neutral-500 flex items-center gap-1"><Calendar className="h-3 w-3" />Semanal</span><Diff value={result.impact.weekly} invert /></div>
                <div className="flex justify-between items-center mt-1"><span className="text-neutral-500 flex items-center gap-1"><Calendar className="h-3 w-3" />Mensal</span><Diff value={result.impact.monthly} invert /></div>
                <div className="flex justify-between items-center mt-1"><span className="text-neutral-500 flex items-center gap-1"><Calendar className="h-3 w-3" />Anual</span><Diff value={result.impact.annual} invert /></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}