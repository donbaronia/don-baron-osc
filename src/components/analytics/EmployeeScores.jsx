import React, { useEffect, useState, useCallback } from "react";
import { PeopleAnalytics, scoreColor, SCORE_DIMENSIONS, RISK_CONFIG, DEPARTMENT_CONFIG, SHIFT_CONFIG } from "@/lib/peopleAnalytics";
import { Loader2, Search, Users, Info } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function EmployeeScores({ refreshKey, onSelectEmployee }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('overall');

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await PeopleAnalytics.getEmployeeScores(); setItems(res.items || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const filtered = items.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.employee_name?.toLowerCase().includes(q) || s.department?.includes(q) || s.position?.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'overall') return b.overall - a.overall;
    if (sortKey === 'name') return a.employee_name.localeCompare(b.employee_name);
    if (sortKey === 'turnover') { const order = { alto: 0, medio: 1, baixo: 2 }; return (order[a.turnoverRisk] || 2) - (order[b.turnoverRisk] || 2); }
    if (sortKey === 'bank') return (a.bank_hours || 0) - (b.bank_hours || 0);
    return b.overall - a.overall;
  });

  if (loading) return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-neutral-600">O score do colaborador é um índice composto por 8 dimensões. Ele serve apenas como apoio à decisão e <strong>nunca deve ser usado como único critério</strong> para promoções, demissões ou outras decisões sobre pessoas.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar colaborador, cargo, departamento..." className="pl-9" />
        </div>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700">
          <option value="overall">Maior Score</option>
          <option value="name">Nome A-Z</option>
          <option value="turnover">Risco de Turnover</option>
          <option value="bank">Banco de Horas (menor)</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center"><Users className="mx-auto h-8 w-8 text-neutral-300" /><p className="mt-2 text-sm text-neutral-400">Nenhum colaborador encontrado</p></div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left p-3 font-medium text-neutral-500">Colaborador</th>
                  <th className="text-left p-3 font-medium text-neutral-500">Departamento</th>
                  <th className="text-center p-3 font-medium text-neutral-500">Score</th>
                  <th className="text-center p-3 font-medium text-neutral-500">Banco Horas</th>
                  <th className="text-center p-3 font-medium text-neutral-500">Turnover</th>
                  <th className="text-center p-3 font-medium text-neutral-500">Sobrecarga</th>
                  <th className="text-center p-3 font-medium text-neutral-500">Absenteísmo</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => {
                  const sCfg = scoreColor(s.overall);
                  const tCfg = RISK_CONFIG[s.turnoverRisk] || {};
                  const oCfg = RISK_CONFIG[s.overloadRisk] || {};
                  const aCfg = RISK_CONFIG[s.absenteeismRisk] || {};
                  const dCfg = DEPARTMENT_CONFIG[s.department] || {};
                  return (
                    <tr key={s.employee_id} onClick={() => onSelectEmployee?.(s.employee_id)} className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer">
                      <td className="p-3"><p className="font-medium text-neutral-800">{s.employee_name}</p><p className="text-xs text-neutral-400">{s.position}</p></td>
                      <td className="p-3 text-neutral-500">{dCfg.emoji} {dCfg.label}</td>
                      <td className="p-3 text-center"><div className={`inline-flex items-center justify-center rounded-lg ${sCfg.bg} ${sCfg.text} px-2 py-1 text-sm font-bold`}>{s.overall}</div></td>
                      <td className={`p-3 text-center font-medium ${(s.bank_hours || 0) < 0 ? 'text-red-600' : 'text-neutral-600'}`}>{s.bank_hours || 0}min</td>
                      <td className="p-3 text-center"><span className={`inline-flex items-center gap-1 rounded-full ${tCfg.bg} ${tCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}><span className={`h-1.5 w-1.5 rounded-full ${tCfg.dot}`} />{tCfg.label}</span></td>
                      <td className="p-3 text-center"><span className={`inline-flex items-center gap-1 rounded-full ${oCfg.bg} ${oCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}><span className={`h-1.5 w-1.5 rounded-full ${oCfg.dot}`} />{oCfg.label}</span></td>
                      <td className="p-3 text-center"><span className={`inline-flex items-center gap-1 rounded-full ${aCfg.bg} ${aCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}><span className={`h-1.5 w-1.5 rounded-full ${aCfg.dot}`} />{aCfg.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Score dimensions legend */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <h4 className="text-xs font-semibold uppercase text-neutral-500 mb-2">Composição do Score</h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SCORE_DIMENSIONS.map(d => (
            <div key={d.key} className="flex items-center justify-between rounded-lg border border-neutral-100 px-2 py-1">
              <span className="text-xs text-neutral-600">{d.label}</span>
              <span className="text-xs font-medium text-neutral-400">{d.weight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}