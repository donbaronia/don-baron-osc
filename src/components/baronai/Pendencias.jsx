import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { gatherBusinessData, generatePendingItems } from "@/lib/baronAI";
import EmptyState from "@/components/shared/EmptyState";
import { Clock, ArrowRight } from "lucide-react";

const MODULE_LABELS = {
  financeiro: "Financeiro",
  documentos: "Documentos",
  compras: "Compras",
  estoque: "Estoque",
  producao: "Produção",
};

export default function Pendencias() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await gatherBusinessData();
      setItems(generatePendingItems(data));
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

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Nenhuma pendência"
        description="Todos os itens foram processados. Nenhuma ação pendente identificada."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        {items.length} pendência(s) identificada(s) automaticamente. Os itens não são removidos automaticamente —
        apenas você pode resolvê-los.
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-neutral-900">{item.title}</p>
                <p className="mt-0.5 text-sm text-neutral-500">{item.description}</p>
                <span className="mt-2 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                  {MODULE_LABELS[item.module] || item.module}
                </span>
              </div>
            </div>
            {item.link && (
              <Link
                to={item.link}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50"
              >
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}