import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare } from "lucide-react";

export default function Historico() {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const items = await base44.entities.BaronAIHistory.list("-created_date", 200);
        setHistory(items);
      } catch (e) {
        setHistory([]);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter(
      (h) =>
        (h.question || "").toLowerCase().includes(q) ||
        (h.answer || "").toLowerCase().includes(q) ||
        (h.user_name || "").toLowerCase().includes(q)
    );
  }, [history, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar perguntas, respostas ou usuários..."
          className="pl-9 bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 py-12 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-3 text-sm text-neutral-400">
            {history.length === 0 ? "Nenhuma pergunta registrada ainda." : "Nenhum resultado encontrado."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((h) => (
            <div key={h.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-neutral-900">{h.question}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">{h.answer}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-neutral-400">
                <span>{new Date(h.created_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                <span>{new Date(h.created_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5">{h.user_name || "N/A"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}