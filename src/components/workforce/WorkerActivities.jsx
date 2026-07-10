import React, { useEffect, useState, useCallback } from "react";
import { DigitalWorkforce, CONFIDENCE_CONFIG, ACTIVITY_TYPE_LABELS } from "@/lib/workforceEngine";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, ChevronUp, Clock, DollarSign, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function WorkerActivities({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await DigitalWorkforce.listActivities(50);
      setItems(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleApprove = async (id, approved) => {
    try {
      await DigitalWorkforce.approveActivity(id, approved, '');
      toast({ title: approved ? "Atividade aprovada" : "Atividade rejeitada" });
      load();
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-200/60" />)}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
        <Clock className="mx-auto h-8 w-8 text-neutral-300" />
        <p className="mt-2 text-sm text-neutral-400">Nenhuma atividade registrada</p>
        <p className="text-xs text-neutral-400 mt-1">Execute rotinas nos funcionários digitais para gerar atividades</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((a) => {
        const conf = CONFIDENCE_CONFIG[a.confidence_level] || CONFIDENCE_CONFIG.media;
        const isExpanded = expanded === a.id;
        const isPending = a.status === 'pending_approval';
        return (
          <div key={a.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            <button onClick={() => setExpanded(isExpanded ? null : a.id)} className="w-full text-left">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">{ACTIVITY_TYPE_LABELS[a.activity_type] || a.activity_type}</span>
                <h4 className="text-sm font-medium text-neutral-800 line-clamp-1 flex-1">{a.title}</h4>
                <span className={`rounded-full ${conf.bg} ${conf.color} px-1.5 py-0.5 text-[10px] font-medium`}>{conf.emoji} {conf.label}</span>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
              </div>
              {a.summary && <p className="mt-2 text-xs text-neutral-600 line-clamp-2">{a.summary}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-neutral-400">
                <span>👤 {a.worker_name}</span>
                {a.savings_identified > 0 && <span className="flex items-center gap-0.5"><DollarSign className="h-3 w-3" />{a.savings_identified.toFixed(0)}</span>}
                {a.time_saved_min > 0 && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{a.time_saved_min}min</span>}
                <span>{a.created_date ? new Date(a.created_date).toLocaleString('pt-BR') : ''}</span>
                {a.status === 'approved' && <span className="text-emerald-600">✓ Aprovada</span>}
                {a.status === 'rejected' && <span className="text-red-600">✗ Rejeitada</span>}
                {isPending && <span className="text-amber-600">⏳ Pendente</span>}
              </div>
            </button>
            {isExpanded && (
              <div className="mt-3 border-t border-neutral-100 pt-3 space-y-3">
                {a.description && <p className="text-xs text-neutral-500">{a.description}</p>}
                {a.findings?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-neutral-400">Descobertas</p>
                    <ul className="mt-1 space-y-1">{a.findings.map((f, i) => <li key={i} className="text-xs text-neutral-600">• {f}</li>)}</ul>
                  </div>
                )}
                {a.recommendations?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-neutral-400">Recomendações</p>
                    <ul className="mt-1 space-y-1">{a.recommendations.map((r, i) => <li key={i} className="text-xs text-neutral-600">• {r}</li>)}</ul>
                  </div>
                )}
                {a.entities_used?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {a.entities_used.map((e, i) => <span key={i} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">{e}</span>)}
                  </div>
                )}
                {isPending && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApprove(a.id, true)}><Check className="h-3.5 w-3.5" />Aprovar</Button>
                    <Button size="sm" variant="outline" onClick={() => handleApprove(a.id, false)}><X className="h-3.5 w-3.5" />Rejeitar</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}