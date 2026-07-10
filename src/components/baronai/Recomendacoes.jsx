import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { gatherBusinessData, generateRecommendations } from "@/lib/baronAI";
import EmptyState from "@/components/shared/EmptyState";
import { Lightbulb, ArrowRight } from "lucide-react";

const PRIORITY_CONFIG = {
  alta: "border-rose-200 bg-rose-50 text-rose-700",
  media: "border-amber-200 bg-amber-50 text-amber-700",
  baixa: "border-blue-200 bg-blue-50 text-blue-700",
};

export default function Recomendacoes() {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await gatherBusinessData();
      setRecs(generateRecommendations(data));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800" />
      </div>
    );
  }

  if (recs.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="Nenhuma recomendação no momento"
        description="Não há ações sugeridas com base nos dados atuais. A operação está estável."
      />
    );
  }

  const sorted = [...recs].sort((a, b) => {
    const order = { alta: 0, media: 1, baixa: 2 };
    return order[a.priority] - order[b.priority];
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        {recs.length} recomendação(ões) gerada(s) com base nos dados do sistema. Cada recomendação inclui justificativa.
      </p>
      {sorted.map((r) => (
        <div key={r.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">{r.title}</p>
                <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_CONFIG[r.priority]}`}>
                  Prioridade {r.priority}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-neutral-600">{r.justification}</p>
          {r.link && (
            <Link
              to={r.link}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 hover:gap-2.5 transition-all"
            >
              {r.action_label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}