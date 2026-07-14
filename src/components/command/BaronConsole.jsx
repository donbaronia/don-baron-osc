import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BaronCOO } from "@/core/BaronCOO";
import { processDocument } from "@/lib/processamentoIA";
import { useAuth } from "@/lib/AuthContext";
import { Mic, Paperclip, Camera, Send, Loader2 } from "lucide-react";

const CONV_KEY = "baron_conversation";

const FIELD_LABELS = {
  supplier: "Fornecedor?",
  product_name: "Produto?",
  quantity: "Quantidade?",
  price: "Valor?",
  payment_method: "Forma de pagamento?",
  bank: "Banco?",
  recipient: "Beneficiário?",
  loss_reason: "Motivo da baixa?",
};

function shortConfirm(msg) {
  if (!msg) return "✓ Operação concluída.";
  const first = msg.split("\n")[0];
  return first.length > 50 ? "✓ Operação concluída." : first;
}

export default function BaronConsole() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [pendingContext, setPendingContext] = useState(null);
  const [ephemeral, setEphemeral] = useState(null);
  const [askLabel, setAskLabel] = useState(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setPendingContext(BaronCOO.hasContext() ? { type: "coo_pending" } : null);
  }, []);

  useEffect(() => {
    if (!ephemeral) return;
    const ms = ephemeral.kind === "done" ? 2500 : 3000;
    const t = setTimeout(() => setEphemeral(null), ms);
    return () => clearTimeout(t);
  }, [ephemeral]);

  const saveHistory = (role, content, route) => {
    try {
      const prev = JSON.parse(localStorage.getItem(CONV_KEY) || "[]");
      const next = [...prev, { role, content, route, timestamp: Date.now() }].slice(-500);
      localStorage.setItem(CONV_KEY, JSON.stringify(next));
    } catch {}
  };

  const setContext = (ctx) => {
    setPendingContext(ctx);
  };

  const handleSend = async () => {
    if (!query.trim() || loading) return;
    const userMsg = query.trim();
    setQuery("");
    saveHistory("user", userMsg);
    setLoading(true);
    setAskLabel(null);

    try {
      // Se há oferta de anexo em aberto
      if (pendingContext?.type === "attachment_offer") {
        const ans = userMsg.toLowerCase();
        if (ans.startsWith("n")) {
          setEphemeral({ text: "✓ Pagamento finalizado.", kind: "done" });
        } else {
          setEphemeral({ text: "Anexe o comprovante com 📎", kind: "info" });
        }
        setContext(null);
        return;
      }

      // BARON COO processa — Intent → Validation → Action → Persistence → ReadBack → Response
      const result = await BaronCOO.process(userMsg, user);
      handleResult(result);
    } catch {
      setEphemeral({ text: "Não consegui processar. Repita?", kind: "error" });
      BaronCOO.clearContext();
      setContext(null);
    } finally {
      setLoading(false);
    }
  };

  const handleResult = (result) => {
    const type = result.status === "executed" ? "done"
      : result.status === "needs_info" ? "needs_info"
      : result.status === "navigate" ? "navigate"
      : result.status === "error" ? "error"
      : "message";

    if (type === "needs_info" && result.needsField) {
      saveHistory("baron", result.message, result.route);
      setContext({ type: "coo_pending" });
      setAskLabel(FIELD_LABELS[result.needsField] || "Continue...");
    } else if (type === "needs_info") {
      saveHistory("baron", result.message, result.route);
      setEphemeral({ text: result.message, kind: "info" });
      setContext(null);
      if (result.route) setTimeout(() => navigate(result.route), 1200);
    } else {
      saveHistory("baron", result.message || "Pronto.", result.route);
      setEphemeral({ text: shortConfirm(result.message), kind: "done" });
      if (result.follow_up) {
        saveHistory("baron", result.follow_up);
        setContext({ type: "attachment_offer" });
      } else {
        setContext(null);
      }
      if (type === "navigate" && result.route) {
        setTimeout(() => navigate(result.route + (result.filter ? `?filtro=${result.filter}` : "")), 800);
      }
    }
  };

  const handleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setEphemeral({ text: "Voz não disponível neste navegador.", kind: "info" }); return; }
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
    saveHistory("user", `📎 ${file.name}`);
    setLoading(true);
    if (pendingContext?.type === "attachment_offer") setContext(null);
    try {
      const result = await processDocument(file, { full_name: "Robson" });
      const conf = result.route?.confidence;
      const tier = conf?.tier === "green" ? "aprovado" : conf?.tier === "yellow" ? "em revisão" : "bloqueado";
      saveHistory("baron", `Documento processado — ${conf?.score || 0}% ${tier}`, "/processamento");
      setEphemeral({ text: `✓ Documento processado — ${tier}`, kind: conf?.tier === "green" ? "done" : "info" });
    } catch {
      setEphemeral({ text: "Falha no documento. Use Processamento.", kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  const placeholder = askLabel || (pendingContext ? "Responda ao BARON..." : "O que vamos fazer agora?");

  return (
    <div className="mx-auto max-w-2xl">
      {/* Linha efêmera — processando / confirmação / pergunta */}
      <div className="mb-2 flex h-7 items-center justify-center">
        {loading && (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> BARON processando...
          </span>
        )}
        {!loading && ephemeral && (
          <span className={`text-xs font-medium ${ephemeral.kind === "done" ? "text-baron-success" : ephemeral.kind === "error" ? "text-baron-error" : "text-muted-foreground"}`}>
            {ephemeral.text}
          </span>
        )}
      </div>

      {/* Campo do BARON — mantido exatamente igual */}
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
            placeholder={placeholder}
            className="flex-1 bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            disabled={loading}
            autoFocus
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

      {/* Sugestões — apenas quando campo vazio, sem contexto e sem efêmero */}
      {!query && !pendingContext && !loading && !ephemeral && (
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