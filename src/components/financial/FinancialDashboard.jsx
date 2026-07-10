import React, { useEffect, useState } from "react";
import { Wallet, Banknote, DollarSign, TrendingDown, TrendingUp, Calendar, BarChart3, Percent, PiggyBank, AlertTriangle, AlertCircle, RefreshCw } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { FinancialCenter, brl } from "@/lib/financialCenter";

export default function FinancialDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await FinancialCenter.getDashboardData());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  if (!data) return <div className="text-center py-20 text-neutral-500">Erro ao carregar dados.</div>;

  const { saldos, hoje, semana, mes, indicadores, alerts } = data;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-neutral-500 mb-3">SALDOS</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Wallet} label="Saldo em Caixa" value={brl(saldos.caixa)} />
          <StatCard icon={Banknote} label="Saldo Bancário" value={brl(saldos.bancario)} />
          <StatCard icon={DollarSign} label="Saldo Total" value={brl(saldos.total)} tone={saldos.total >= 0 ? "positive" : "negative"} />
          <StatCard icon={PiggyBank} label="Capital de Giro" value={brl(indicadores.capitalGiro)} tone={indicadores.capitalGiro >= 0 ? "positive" : "negative"} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-neutral-500 mb-3">HOJE</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={TrendingDown} label="Contas a Pagar Hoje" value={brl(hoje.pagar)} tone="negative" />
          <StatCard icon={TrendingUp} label="Contas a Receber Hoje" value={brl(hoje.receber)} tone="positive" />
          <StatCard icon={Calendar} label="iFood Previsto" value={brl(hoje.ifood)} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-neutral-500 mb-3">SEMANA</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={TrendingDown} label="Despesas da Semana" value={brl(semana.despesas)} tone="negative" />
          <StatCard icon={TrendingUp} label="Receitas da Semana" value={brl(semana.receitas)} tone="positive" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-neutral-500 mb-3">INDICADORES</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BarChart3} label="Lucro Bruto" value={brl(indicadores.lucroBruto)} tone={indicadores.lucroBruto >= 0 ? "positive" : "negative"} />
          <StatCard icon={Percent} label="Margem Atual" value={`${indicadores.margem.toFixed(1)}%`} tone={indicadores.margem >= 20 ? "positive" : "warning"} />
          <StatCard icon={BarChart3} label="CMV Atual" value={brl(indicadores.cmv)} />
          <StatCard icon={TrendingUp} label="Fluxo Projetado" value={brl(indicadores.fluxoProjetado)} tone={indicadores.fluxoProjetado >= 0 ? "positive" : "negative"} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-neutral-500 mb-3">RESULTADO DO MÊS</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={TrendingUp} label="Receitas" value={brl(mes.receitas)} tone="positive" />
          <StatCard icon={TrendingDown} label="Despesas" value={brl(mes.despesas)} tone="negative" />
          <StatCard icon={BarChart3} label="Resultado" value={brl(mes.resultado)} tone={mes.resultado >= 0 ? "positive" : "negative"} />
        </div>
      </div>

      {alerts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-neutral-500 mb-3">ALERTAS</h3>
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 ${alert.severity === "urgent" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
                {alert.severity === "urgent" ? <AlertCircle className="h-5 w-5 text-rose-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
                <span className={`text-sm ${alert.severity === "urgent" ? "text-rose-700" : "text-amber-700"}`}>{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}