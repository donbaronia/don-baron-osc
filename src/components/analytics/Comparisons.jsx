import React, { useEffect, useState, useCallback } from "react";
import { PeopleAnalytics, scoreColor, DEPARTMENT_CONFIG, SHIFT_CONFIG, CAREER_LEVEL_CONFIG } from "@/lib/peopleAnalytics";
import { BarChart3, GitCompare } from "lucide-react";

const GROUP_OPTIONS = [
  { key: 'department', label: 'Departamento' },
  { key: 'shift', label: 'Turno' },
  { key: 'career_level', label: 'Nível de Carreira' },
];

const CONFIG_MAP = {
  department: DEPARTMENT_CONFIG,
  shift: SHIFT_CONFIG,
  career_level: CAREER_LEVEL_CONFIG,
};

export default function Comparisons({ refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('department');

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await PeopleAnalytics.getComparisons(groupBy)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [groupBy]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const cfg = CONFIG_MAP[groupBy] || {};

  if (loading || !data) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;

  const items = data.items || [];
  const maxScore = Math.max(...items.map(i => i.avgScore || 0), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GitCompare className="h-5 w-5 text-neutral-400" />
        <div className="flex gap-1">
          {GROUP_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => setGroupBy(opt.key)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${groupBy === opt.key ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Score comparison bar chart */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500"><BarChart3 className="h-4 w-4" /> Score Médio por {GROUP_OPTIONS.find(g => g.key === groupBy)?.label}</h3>
        <div className="space-y-3">
          {items.map((item) => {
            const sCfg = scoreColor(item.avgScore);
            const widthPct = (item.avgScore / maxScore) * 100;
            return (
              <div key={item.group} className="flex items-center gap-3">
                <div className="w-32 shrink-0">
                  <span className="text-sm text-neutral-700">{cfg[item.group]?.emoji} {cfg[item.group]?.label || item.group}</span>
                  <span className="text-xs text-neutral-400 ml-1">({item.count})</span>
                </div>
                <div className="flex-1 h-7 rounded-lg bg-neutral-100 overflow-hidden relative">
                  <div className={`h-full rounded-lg ${sCfg.bar} flex items-center justify-end pr-2`} style={{ width: `${widthPct}%` }}>
                    <span className="text-xs font-bold text-white">{item.avgScore}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed metrics table */}
      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left p-3 font-medium text-neutral-500">{GROUP_OPTIONS.find(g => g.key === groupBy)?.label}</th>
                <th className="text-center p-3 font-medium text-neutral-500">Pessoas</th>
                <th className="text-center p-3 font-medium text-neutral-500">Score</th>
                <th className="text-center p-3 font-medium text-neutral-500">Folha</th>
                <th className="text-center p-3 font-medium text-neutral-500">Banco Horas</th>
                <th className="text-center p-3 font-medium text-neutral-500">Atrasos</th>
                <th className="text-center p-3 font-medium text-neutral-500">H. Extras</th>
                <th className="text-center p-3 font-medium text-neutral-500">Trein. Concl.</th>
                <th className="text-center p-3 font-medium text-neutral-500">Trein. Pend.</th>
                <th className="text-center p-3 font-medium text-neutral-500">Ocorrências</th>
                <th className="text-center p-3 font-medium text-neutral-500">Vales</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const sCfg = scoreColor(item.avgScore);
                return (
                  <tr key={item.group} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="p-3 font-medium text-neutral-700">{cfg[item.group]?.emoji} {cfg[item.group]?.label || item.group}</td>
                    <td className="p-3 text-center text-neutral-600">{item.count}</td>
                    <td className="p-3 text-center"><span className={`inline-flex rounded-lg ${sCfg.bg} ${sCfg.text} px-2 py-0.5 text-xs font-bold`}>{item.avgScore}</span></td>
                    <td className="p-3 text-center text-neutral-600">R$ {item.totalSalary.toLocaleString('pt-BR')}</td>
                    <td className={`p-3 text-center font-medium ${item.totalBankHours < 0 ? 'text-red-600' : 'text-neutral-600'}`}>{item.totalBankHours}min</td>
                    <td className="p-3 text-center text-neutral-600">{item.totalLate}min</td>
                    <td className="p-3 text-center text-neutral-600">{item.totalOvertime}min</td>
                    <td className="p-3 text-center text-emerald-600">{item.completedTrainings}</td>
                    <td className="p-3 text-center text-amber-600">{item.pendingTrainings}</td>
                    <td className="p-3 text-center text-red-600">{item.unresolvedOccs}</td>
                    <td className="p-3 text-center text-orange-600">R$ {item.totalAdvances.toLocaleString('pt-BR')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}