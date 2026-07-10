import React, { useEffect, useState, useCallback } from "react";
import { MissionControl, MISSION_TYPE_CONFIG, MISSION_STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/missionEngine";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Zap } from "lucide-react";
import CreateMissionDialog from "@/components/mission/CreateMissionDialog";
import { toast } from "@/components/ui/use-toast";

export default function MissionList({ refreshKey, onSelectMission }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [autoCreating, setAutoCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await MissionControl.listMissions(filterStatus || undefined, filterType || undefined);
      setItems(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterStatus, filterType]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleAutoCreate = async () => {
    setAutoCreating(true);
    try {
      const res = await MissionControl.autoCreate();
      toast({ title: res.message });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setAutoCreating(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700">
          <option value="">Todos os status</option>
          {Object.entries(MISSION_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700">
          <option value="">Todos os tipos</option>
          {Object.entries(MISSION_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="flex-1" />
        <Button onClick={handleAutoCreate} disabled={autoCreating} variant="outline" size="sm">
          {autoCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {autoCreating ? "Criando..." : "Criar com IA"}
        </Button>
        <CreateMissionDialog onCreated={(m) => { load(); onSelectMission?.(m.id); }} />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
          <Zap className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 text-sm text-neutral-400">Nenhuma missão encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((mission) => {
            const tCfg = MISSION_TYPE_CONFIG[mission.type] || {};
            const sCfg = MISSION_STATUS_CONFIG[mission.status] || {};
            const pCfg = PRIORITY_CONFIG[mission.priority] || {};
            const today = new Date().toISOString().split('T')[0];
            const daysLeft = mission.end_date ? Math.ceil((new Date(mission.end_date) - new Date(today)) / (1000 * 60 * 60 * 24)) : null;
            return (
              <button key={mission.id} onClick={() => onSelectMission?.(mission.id)} className="text-left rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:shadow-md transition-all">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">{tCfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-neutral-800 leading-tight">{mission.name}</h4>
                    <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{mission.objective}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  <span className={`rounded-full ${tCfg.bg} ${tCfg.color} px-1.5 py-0.5 text-[10px] font-semibold`}>{tCfg.label}</span>
                  <span className={`rounded-full ${pCfg.bg} ${pCfg.color} px-1.5 py-0.5 text-[10px] font-semibold`}>{pCfg.label}</span>
                  <span className={`rounded-full ${sCfg.bg} ${sCfg.color} px-1.5 py-0.5 text-[10px] font-medium`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${sCfg.dot} mr-1`} />{sCfg.label}
                  </span>
                  {daysLeft !== null && mission.status !== 'concluida' && (
                    <span className={`text-[10px] ${daysLeft < 0 ? 'text-red-600' : daysLeft <= 1 ? 'text-orange-600' : 'text-neutral-400'}`}>
                      {daysLeft < 0 ? `Atrasada ${Math.abs(daysLeft)}d` : daysLeft === 0 ? 'Hoje' : `${daysLeft}d restante`}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-neutral-100 overflow-hidden">
                    <div className={`h-full rounded-full ${mission.progress_pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${mission.progress_pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-neutral-600">{mission.progress_pct}%</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[10px] text-neutral-400">
                  <span>📋 {mission.tasks_completed || 0}/{mission.tasks_count || 0} tarefas</span>
                  <span>✓ {mission.checklist_completed || 0}/{mission.checklist_total || 0} checklist</span>
                  {mission.is_auto_created && <span className="text-purple-500">🤖 IA</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}