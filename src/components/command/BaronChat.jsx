import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { parseCommand, executeCommand } from "@/lib/baronCommandEngine";
import { processDocument } from "@/lib/processamentoIA";
import { Mic, Paperclip, Camera, Send, Loader2 } from "lucide-react";
import BaronConversation from "@/components/command/BaronConversation";

const CONV_KEY = "baron_conversation";
const CTX_KEY = "baron_pending_context";

export default function BaronChat() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [pendingContext, setPendingContext] = useState(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  useEffect(() => {
    try {
      setConversation(JSON.parse(localStorage.getItem(CONV_KEY) || "[]"));
      setPendingContext(JSON.parse(localStorage.getItem(CTX_KEY) || "null"));
    } catch { setConversation([]); }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conversation, loading]);

  const addMessage = (role, content, route) => {
    setConversation((prev) => {
      const next = [...prev, { role, content, route, timestamp: Date.now() }].slice(-30);
      localStorage.setItem(CONV_KEY, JSON.stringify(next));
      return next;
    });
  };

  const setContext = (ctx) => {
    setPendingContext(ctx);
    localStorage.setItem(CTX_KEY, JSON.stringify(ctx));
  };

  const handleSend = async () => {
    if (!query.trim() || loading) return;
    const userMsg = query.trim();
    setQuery("");
    addMessage("user", userMsg);
    setLoading(true);

    try {
      // Multi-turn: respondendo a uma pergunta do BARON
      if (pendingContext) {
        // Oferta de comprovante
        if (pendingContext.type === "attachment_offer") {
          const ans = userMsg.toLowerCase();
          if (ans.startsWith("n")) {
            addMessage("baron", "✓ Pagamento finalizado.");
          } else {
            addMessage("baron", "Anexe o comprovante usando o botão 📎.");
          }
          setContext(null);
          return;
        }
        // Preenchendo campo faltante
        if (pendingContext.type === "missing_info" && pendingContext.needsField) {
          const updatedParsed = { ...pendingContext.parsed, [pendingContext.needsField]: userMsg };
          const result = await executeCommand(updatedParsed, { full_name: "Robson" });
          handleResult(result, updatedParsed);
          return;
        }
      }

      // Fluxo normal: parsear + executar
      const parsed = await parseCommand(userMsg, pendingContext?.parsed?.intent);
      const result = await executeCommand(parsed, { full_name: "Robson" });
      handleResult(result, parsed);
    } catch {
      addMessage("baron", "Não consegui processar agora. Pode repetir?");
      setContext(null);
    } finally {
      setLoading(false);
    }
  };

  const handleResult = (result, parsed) => {
    if (result.type === "needs_info" && result.needsField) {
      const fullMsg = result.understood ? `${result.understood}\n\n${result.message}` : result.message;
      addMessage("baron", fullMsg, result.route);
      setContext({ type: "missing_info", parsed: result.parsed || parsed, needsField: result.needsField });
    } else if (result.type === "needs_info") {
      // Sem needsField → apenas informar, não há contexto pendente
      addMessage("baron", result.message, result.route);
      setContext(null);
    } else {
      addMessage("baron", result.message || "Pronto.", result.route);
      if (result.follow_up) {
        addMessage("baron", result.follow_up);
        setContext({ type: "attachment_offer", parsed });
      } else {
        setContext(null);
      }
      if (result.type === "navigate" && result.route) {
        setTimeout(() => navigate(result.route + (result.filter ? `?filtro=${result.filter}` : "")), 1500);
      }
    }
  };

  const handleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { addMessage("baron", "Reconhecimento de voz não disponível neste navegador."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (e) => { setQuery(e.results[0][0].transcript); setListening(false); };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    addMessage("user", `📎 ${file.name}`);
    setLoading(true);
    // Se havia oferta de comprovante, limpar contexto
    if (pendingContext?.type === "attachment_offer") setContext(null);
    try {
      const result = await processDocument(file, { full_name: "Robson" });
      const conf = result.route?.confidence;
      const tierLabel = conf?.tier === "green" ? "aprovado automaticamente" : conf?.tier === "yellow" ? "em revisão" : "bloqueado";
      addMessage("baron", `✓ Documento recebido e processado.\n✓ Tipo: ${(result.doc?.category || "documento").replace(/_/g, " ")}\n✓ Confiança: ${conf?.score || 0}% — ${tierLabel}${result.route?.auto ? "\n✓ Ação executada automaticamente." : "\n⚠ Requer sua confirmação."}`, "/processamento");
    } catch {
      addMessage("baron", "Não consegui processar o documento. Tente pela Central de Processamento.", "/processamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Conversation history */}
      {conversation.length > 0 && (
        <div ref={scrollRef} className="mb-3 max-h-64 overflow-y-auto rounded-2xl bg-background/50 p-2">
          <BaronConversation messages={conversation} />
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="mb-2 flex items-center gap-2 px-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> BARON processando...
        </div>
      )}

      {/* Input area — mantida exatamente igual */}
      <div className="rounded-2xl border border-border bg-card p-2 shadow-xl shadow-black/20">
        <div className="flex items-center gap-2">
          <button
            onClick={handleMic}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${listening ? "bg-baron-error text-white animate-pulse" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            title="Microfone"
          >
            <Mic className="h-5 w-5" />
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Anexar Arquivo"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Tirar Foto"
          >
            <Camera className="h-5 w-5" />
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={pendingContext ? "Responda ao BARON..." : "Digite ou fale seu comando..."}
            className="flex-1 bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!query.trim() || loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Enviar"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Suggestions — apenas quando sem conversa */}
      {conversation.length === 0 && !loading && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {["Comprei 100kg de arroz a R$12,50", "Paguei a Equatorial pelo Inter via PIX", "Produzimos 18 geleias de bacon", "Abrir estoque", "Boletos vencendo"].map(s => (
            <button
              key={s}
              onClick={() => setQuery(s)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}