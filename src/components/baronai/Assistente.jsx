import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";

const EXAMPLES = [
  "Quanto tenho para pagar hoje?",
  "Qual fornecedor vendeu mais barato o bacon?",
  "Quais produtos estão abaixo do estoque mínimo?",
  "Quanto comprei de carne este mês?",
  "Quanto paguei para o fornecedor X?",
  "Qual foi meu CMV da semana passada?",
];

export default function Assistente() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);

  const handleAsk = async (q) => {
    const query = (q || question).trim();
    if (!query || loading) return;
    setQuestion("");
    setLoading(true);
    setConversations((prev) => [...prev, { question: query, answer: "", loading: true }]);
    try {
      const response = await base44.functions.invoke("baronAIAsk", { question: query });
      const answer = response.data?.answer || "Não foi possível processar a resposta.";
      setConversations((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { question: query, answer, loading: false };
        return copy;
      });
    } catch (e) {
      const errorMsg = e.response?.data?.error || e.message || "Erro ao processar a pergunta.";
      setConversations((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { question: query, answer: `Erro: ${errorMsg}`, loading: false, error: true };
        return copy;
      });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Assistente BARON AI</p>
            <p className="mt-1 text-sm text-neutral-500">
              Faça perguntas sobre seus dados. A BARON AI responde apenas com informações cadastradas no sistema —
              nunca inventa respostas. Se não houver dados suficientes, ela informará.
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-neutral-500">Perguntas de exemplo:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => handleAsk(ex)}
              disabled={loading}
              className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder="Digite sua pergunta..."
          disabled={loading}
          className="bg-white"
        />
        <Button onClick={() => handleAsk()} disabled={loading || !question.trim()} className="gap-2 bg-neutral-900">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Perguntar
        </Button>
      </div>

      <div className="space-y-4">
        {conversations.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-200 py-12 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-3 text-sm text-neutral-400">Faça sua primeira pergunta para começar.</p>
          </div>
        )}
        {conversations.map((conv, i) => (
          <div key={i} className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-neutral-900 px-4 py-2.5 text-sm text-white">
                {conv.question}
              </div>
            </div>
            <div className="flex justify-start">
              <div className={`max-w-[85%] rounded-2xl rounded-tl-sm border px-4 py-3 ${conv.error ? "border-rose-200 bg-rose-50" : "border-neutral-200 bg-white"}`}>
                {conv.loading ? (
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analisando dados do sistema...
                  </div>
                ) : (
                  <ReactMarkdown className="prose prose-sm max-w-none text-neutral-700">{conv.answer}</ReactMarkdown>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}