import React, { useEffect, useState, useCallback } from "react";
import { BaronBrain } from "@/lib/brainEngine";
import { CheckCircle2, GraduationCap, XCircle } from "lucide-react";

export default function BrainLearning({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BaronBrain.listLearnings();
      setItems(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const positive = items.filter(i => i.feedback_positive).length;
  const negative = items.filter(i => !i.feedback_positive).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            <span className="text-sm text-neutral-500">Total de Aprendizados</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-800">{items.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-sm text-neutral-500">Feedback Positivo</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{positive}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm text-neutral-500">Feedback Negativo</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">{negative}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-200/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 text-sm text-neutral-400">Nenhum aprendizado registrado ainda</p>
          <p className="text-xs text-neutral-400 mt-1">Dê feedback nas respostas do Brain para gerar aprendizados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className={`rounded-xl border p-4 ${item.feedback_positive ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30'}`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.feedback_positive ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {item.feedback_positive ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 line-clamp-1">{item.decision}</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-white p-2">
                      <div className="text-[10px] font-semibold text-neutral-400 uppercase">Previsto</div>
                      <p className="text-xs text-neutral-600 mt-0.5 line-clamp-2">{item.predicted_outcome}</p>
                    </div>
                    <div className="rounded-lg bg-white p-2">
                      <div className="text-[10px] font-semibold text-neutral-400 uppercase">Real</div>
                      <p className="text-xs text-neutral-600 mt-0.5 line-clamp-2">{item.actual_outcome}</p>
                    </div>
                  </div>
                  {item.learned_lesson && (
                    <div className="mt-2 rounded-lg bg-purple-50 p-2 text-xs text-purple-800">
                      <strong>🧠 Lição:</strong> {item.learned_lesson}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}