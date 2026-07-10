import React, { useEffect, useState, useCallback, useRef } from "react";
import { BaronBrain, CONFIDENCE_CONFIG, DIRECTORATE_CONFIG } from "@/lib/brainEngine";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, ChevronDown, ChevronUp, Crown, Loader2, Send, ThumbsDown, ThumbsUp, Brain as BrainIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/components/ui/use-toast";

const LOADING_PHASES = [
  { emoji: "👑", text: "CEO AI está analisando sua pergunta..." },
  { emoji: "🔍", text: "Selecionando especialistas mais relevantes..." },
  { emoji: "💼", text: "Especialistas estão analisando os dados..." },
  { emoji: "🤝", text: "CEO AI está consolidando as respostas..." },
];

function SpecialistCard({ response, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const conf = CONFIDENCE_CONFIG[response.confidence_level] || CONFIDENCE_CONFIG.media;
  const dir = DIRECTORATE_CONFIG[response.directorate] || DIRECTORATE_CONFIG.dados;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-3 hover:bg-neutral-50 transition-colors">
        <span className="text-xl">{response.avatar_emoji}</span>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-800">{response.agent_name}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${dir.bg} ${dir.color}`}>{dir.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs font-medium ${conf.color}`}>{conf.emoji} {conf.label}</span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs text-neutral-400">{response.response_time_ms}ms</span>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
      </button>
      {open && (
        <div className="border-t border-neutral-100 p-4">
          <ReactMarkdown className="text-sm text-neutral-700 prose prose-sm max-w-none">{response.content}</ReactMarkdown>
          {response.recommendation && (
            <div className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
              <strong>💡 Recomendação:</strong> {response.recommendation}
            </div>
          )}
          {response.data_used?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {response.data_used.map((d, i) => (
                <span key={i} className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">{d}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConflictCard({ conflict }) {
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <span className="text-sm font-semibold text-orange-800">Conflito: {conflict.topic}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-lg bg-white p-2.5">
          <div className="text-xs font-semibold text-emerald-600">{conflict.agent_a}</div>
          <p className="text-xs text-neutral-600 mt-1">{conflict.position_a}</p>
        </div>
        <div className="rounded-lg bg-white p-2.5">
          <div className="text-xs font-semibold text-red-600">{conflict.agent_b}</div>
          <p className="text-xs text-neutral-600 mt-1">{conflict.position_b}</p>
        </div>
      </div>
      {conflict.recommendation && (
        <div className="mt-2 rounded-lg bg-white p-2.5 text-xs text-neutral-600">
          <strong>Recomendação:</strong> {conflict.recommendation}
        </div>
      )}
    </div>
  );
}

export default function BrainChat({ mode = "question" }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [phase, setPhase] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const resultRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await BaronBrain.listConversations();
      setConversations(res.items || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!loading) { setPhase(0); return; }
    const interval = setInterval(() => setPhase(p => (p + 1) % LOADING_PHASES.length), 3500);
    return () => clearInterval(interval);
  }, [loading]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    setFeedback(null);
    setSelectedConv(null);
    try {
      const res = mode === "simulation"
        ? await BaronBrain.simulate(input)
        : await BaronBrain.ask(input);
      setResult(res);
      loadConversations();
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (fb) => {
    if (!result?.conversation_id) return;
    try {
      await BaronBrain.provideFeedback(result.conversation_id, fb, "");
      setFeedback(fb);
      toast({ title: "Feedback registrado" });
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleSelectConversation = async (id) => {
    try {
      const res = await BaronBrain.getConversation(id);
      setSelectedConv(res.item);
      setResult(null);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) { console.error(e); }
  };

  const displayResult = result || selectedConv;
  const isSim = mode === "simulation";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Main chat area */}
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <BrainIcon className="h-5 w-5 text-purple-600" />
            <h3 className="text-sm font-semibold text-neutral-800">
              {isSim ? "Simulador de Cenários" : "Pergunte ao Conselho"}
            </h3>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isSim ? "Ex: Se contratar dois funcionários adicionais..." : "Ex: Vale aumentar o preço do Combo Don Baron?"}
            rows={3}
            className="resize-none"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-neutral-400">⌘+Enter para enviar</span>
            <Button onClick={handleSubmit} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {loading ? "Processando..." : isSim ? "Simular" : "Perguntar"}
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-8 text-center">
            <div className="text-4xl mb-3 animate-bounce">{LOADING_PHASES[phase].emoji}</div>
            <p className="text-sm font-medium text-purple-800">{LOADING_PHASES[phase].text}</p>
            <div className="mt-3 flex justify-center gap-1">
              {LOADING_PHASES.map((_, i) => (
                <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === phase ? "bg-purple-600" : "bg-purple-200"}`} />
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {displayResult && !loading && (
          <div ref={resultRef} className="space-y-4">
            {/* Question */}
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-tr-sm bg-neutral-800 px-4 py-2.5 text-sm text-white max-w-[80%]">
                {displayResult.question}
              </div>
            </div>

            {/* Council banner */}
            {displayResult.agents_consulted?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <Crown className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-neutral-600">
                  {displayResult.is_council ? "Conselho convocado" : "Especialista consultado"}:
                </span>
                {displayResult.agents_consulted.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-neutral-700 ring-1 ring-neutral-200">
                    {a.avatar_emoji} {a.agent_name}
                  </span>
                ))}
              </div>
            )}

            {/* Specialist responses */}
            {displayResult.specialist_responses?.map((r, i) => (
              <SpecialistCard key={i} response={r} defaultOpen={displayResult.specialist_responses.length <= 2} />
            ))}

            {/* Conflicts */}
            {displayResult.conflicts?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-neutral-700">⚠️ Conflitos Identificados</h4>
                {displayResult.conflicts.map((c, i) => <ConflictCard key={i} conflict={c} />)}
              </div>
            )}

            {/* Consolidated response */}
            {displayResult.consolidated_response && (
              <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white">
                    <Crown className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-neutral-800">Resposta Consolidada do CEO AI</span>
                  {displayResult.confidence_level && (() => {
                    const conf = CONFIDENCE_CONFIG[displayResult.confidence_level] || CONFIDENCE_CONFIG.media;
                    return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${conf.bg} ${conf.color}`}>{conf.emoji} {conf.label}</span>;
                  })()}
                </div>
                <ReactMarkdown className="text-sm text-neutral-700 prose prose-sm max-w-none">{displayResult.consolidated_response}</ReactMarkdown>
                {displayResult.confidence_reason && (
                  <div className="mt-3 text-xs text-neutral-500 italic">
                    <strong>Motivo da confiança:</strong> {displayResult.confidence_reason}
                  </div>
                )}
                {displayResult.total_response_time_ms > 0 && (
                  <div className="mt-2 text-xs text-neutral-400">
                    Tempo total: {displayResult.total_response_time_ms}ms
                  </div>
                )}
                {/* Feedback */}
                {result && (
                  <div className="mt-4 flex items-center gap-2 border-t border-purple-100 pt-3">
                    <span className="text-xs text-neutral-500">Esta recomendação foi útil?</span>
                    <Button size="sm" variant={feedback === "positive" ? "default" : "outline"} onClick={() => handleFeedback("positive")} disabled={!!feedback}>
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant={feedback === "negative" ? "default" : "outline"} onClick={() => handleFeedback("negative")} disabled={!!feedback}>
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </Button>
                    {feedback && <span className="text-xs text-emerald-600">✓ Feedback registrado</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conversation history sidebar */}
      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 lg:sticky lg:top-4">
          <h3 className="mb-3 text-sm font-semibold text-neutral-800">Histórico</h3>
          {conversations.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-8">Nenhuma conversa ainda</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {conversations.map((c) => (
                <button key={c.id} onClick={() => handleSelectConversation(c.id)} className="w-full text-left rounded-lg border border-neutral-100 p-2.5 hover:bg-neutral-50 transition-colors">
                  <p className="text-xs font-medium text-neutral-700 line-clamp-2">{c.question}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-neutral-400">
                    <span>{c.agents_consulted?.length || 0} esp.</span>
                    <span>·</span>
                    <span>{c.created_date ? new Date(c.created_date).toLocaleDateString('pt-BR') : '—'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}