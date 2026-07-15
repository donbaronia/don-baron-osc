import React, { useEffect, useState } from "react";
import { RE, brl } from "@/lib/recipeEngine";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Calculator, ArrowRight, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";

import { BaronSelect } from "@/design-system";

export default function RecipeSimulator() {
  const { toast } = useToast();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [recipe, setRecipe] = useState(null);
  const [simQty, setSimQty] = useState({});
  const [simPrice, setSimPrice] = useState(0);
  const [result, setResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const load = async () => {
    setLoading(true);
    const recs = await base44.entities.Recipe.filter({ active: true, is_addition: { $ne: true }, deleted_at: null }, "name", 500).catch(() => []);
    setRecipes(recs);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const selectRecipe = (id) => {
    setSelectedId(id);
    const r = recipes.find(x => x.id === id);
    setRecipe(r);
    if (r) {
      const qtyMap = {};
      (r.ingredients || []).forEach((ing, i) => { qtyMap[i] = ing.quantity || 0; });
      setSimQty(qtyMap);
      setSimPrice(r.sale_price || 0);
    }
    setResult(null);
  };

  const simulate = async () => {
    if (!recipe) return;
    setSimulating(true);
    try {
      const ingredients = (recipe.ingredients || []).map((ing, i) => ({
        index: i,
        name: ing.name,
        quantity: simQty[i] ?? ing.quantity,
        unit_cost: ing.unit_cost,
      }));
      const res = await RE.simulateChange(recipe.id, { ingredients, sale_price: simPrice });
      setResult(res);
    } catch { toast({ title: "Erro", description: "Falha na simulação", variant: "destructive" }); }
    setSimulating(false);
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;

  const Diff = ({ value, isCurrency = true, invert = false }) => {
    const positive = invert ? value < 0 : value > 0;
    const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : null;
    return (
      <span className={`inline-flex items-center gap-1 text-sm font-medium ${positive ? "text-emerald-600" : value < 0 ? "text-rose-600" : "text-neutral-500"}`}>
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {value > 0 ? "+" : ""}{isCurrency ? brl(value) : `${value.toFixed(1)}%`}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Simulador de Receitas</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">Receita</label>
            <BaronSelect value={selectedId} onChange={(v) => selectRecipe(v)} options={recipes.map((r) => ({ value: r.id, label: r.name }))} placeholder="Selecione uma receita..." />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">Preço de Venda Simulado</label>
            <Input type="number" step="0.01" value={simPrice} onChange={e => setSimPrice(parseFloat(e.target.value) || 0)} disabled={!recipe} />
          </div>
        </div>
      </div>

      {recipe && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h4 className="text-xs font-semibold text-neutral-500 mb-3">INGREDIENTES — Altere as quantidades para simular</h4>
          <div className="space-y-2">
            {(recipe.ingredients || []).map((ing, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-5 text-sm text-neutral-700">{ing.name}</span>
                <span className="col-span-2 text-xs text-neutral-400">{ing.quantity} {ing.unit}</span>
                <ArrowRight className="col-span-1 h-3 w-3 text-neutral-300 mx-auto" />
                <Input type="number" step="0.01" value={simQty[i] ?? 0} onChange={e => setSimQty({ ...simQty, [i]: parseFloat(e.target.value) || 0 })} className="col-span-2 h-8 text-xs" />
                <span className="col-span-2 text-right text-xs text-neutral-500">{brl((simQty[i] || 0) * (ing.unit_cost || 0))}</span>
              </div>
            ))}
            {(recipe.ingredients || []).length === 0 && <p className="py-2 text-center text-sm text-neutral-400">Sem ingredientes</p>}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={simulate} disabled={simulating} className="gap-2"><Calculator className="h-4 w-4" /> {simulating ? "Simulando..." : "Simular"}</Button>
          </div>
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h4 className="text-xs font-semibold text-neutral-500 mb-3">ATUAL</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Custo Total</span><span className="font-medium">{brl(result.current.cost_total)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Custo/Un</span><span className="font-medium">{brl(result.current.cost_per_unit)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Margem</span><span className="font-medium">{result.current.margin_pct.toFixed(0)}%</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">CMV</span><span className="font-medium">{result.current.cmv_pct.toFixed(0)}%</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Lucro</span><span className="font-medium">{brl(result.current.gross_profit)}</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <h4 className="text-xs font-semibold text-blue-500 mb-3">SIMULADO</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-blue-600">Custo Total</span><span className="font-medium text-blue-900">{brl(result.simulated.cost_total)}</span></div>
              <div className="flex justify-between"><span className="text-blue-600">Custo/Un</span><span className="font-medium text-blue-900">{brl(result.simulated.cost_per_unit)}</span></div>
              <div className="flex justify-between"><span className="text-blue-600">Margem</span><span className="font-medium text-blue-900">{result.simulated.margin_pct.toFixed(0)}%</span></div>
              <div className="flex justify-between"><span className="text-blue-600">CMV</span><span className="font-medium text-blue-900">{result.simulated.cmv_pct.toFixed(0)}%</span></div>
              <div className="flex justify-between"><span className="text-blue-600">Lucro</span><span className="font-medium text-blue-900">{brl(result.simulated.gross_profit)}</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h4 className="text-xs font-semibold text-neutral-500 mb-3">IMPACTO</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center"><span className="text-neutral-500">Δ Custo</span><Diff value={result.diff.cost} /></div>
              <div className="flex justify-between items-center"><span className="text-neutral-500">Δ Margem</span><Diff value={result.diff.margin} isCurrency={false} /></div>
              <div className="flex justify-between items-center"><span className="text-neutral-500">Δ CMV</span><Diff value={result.diff.cmv} isCurrency={false} invert /></div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center"><span className="text-neutral-500 flex items-center gap-1"><Calendar className="h-3 w-3" />Mensal</span><Diff value={result.impact.monthly_cost_impact} /></div>
                <div className="flex justify-between items-center mt-1"><span className="text-neutral-500 flex items-center gap-1"><Calendar className="h-3 w-3" />Anual</span><Diff value={result.impact.annual_cost_impact} /></div>
                <p className="mt-1 text-xs text-neutral-400">Volume: {result.impact.monthly_volume} un/mês</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}