import React, { useEffect, useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import CadastroMessageBubble from "@/components/cadastro/CadastroMessageBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Plus, MessageSquare, Sparkles, Loader2, Boxes } from "lucide-react";

const AGENT_NAME = "cadastro_ai";

const SUGGESTIONS = [
  "Cadastre Bacon Sadia",
  "Novo fornecedor Fribal",
  "Novo funcionário João",
  "Novo motoboy Carlos",
  "Nova conta Banco do Brasil",
  "Nova categoria Embalagens",
];

export default function CadastroAI() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME }).catch(() => []);
      setConversations(list || []);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Subscribe to active conversation for streaming tokens
  useEffect(() => {
    if (!activeId) return;
    const unsubscribe = base44.agents.subscribeToConversation(activeId, (data) => {
      setMessages(data.messages || []);
    });
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, [activeId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const startNew = async () => {
    setCreating(true);
    try {
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: "Novo Cadastro", description: "Cadastro via linguagem natural" },
      });
      const newConv = conv.data || conv;
      setActiveId(newConv.id);
      setMessages([]);
      await loadConversations();
      inputRef.current?.focus();
    } finally {
      setCreating(false);
    }
  };

  const openConversation = async (conv) => {
    setActiveId(conv.id);
    try {
      const full = await base44.agents.getConversation(conv.id);
      const data = full.data || full;
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    }
  };

  const sendMessage = async (text) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    let convId = activeId;
    setSending(true);
    setInput("");
    try {
      if (!convId) {
        const conv = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: content.slice(0, 40), description: "Cadastro via linguagem natural" },
        });
        const newConv = conv.data || conv;
        convId = newConv.id;
        setActiveId(convId);
        const created = await base44.agents.getConversation(convId);
        const cd = created.data || created;
        const convObj = cd.conversation || cd;
        const targetConv = convObj && (convObj.id || convObj.metadata) ? convObj : newConv;
        await base44.agents.addMessage(targetConv, { role: "user", content });
        loadConversations();
      } else {
        const created = await base44.agents.getConversation(convId);
        const cd = created.data || created;
        const convObj = cd.conversation || cd;
        const targetConv = convObj && (convObj.id || convObj.metadata) ? convObj : { id: convId };
        await base44.agents.addMessage(targetConv, { role: "user", content });
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ Erro: ${e.message}` }]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <div className="h-10 w-10 rounded-xl bg-baron-orange/15 border border-baron-orange/30 flex items-center justify-center">
          <Boxes className="h-5 w-5 text-baron-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-title flex items-center gap-2">
            Cadastro AI <Sparkles className="h-4 w-4 text-baron-orange" />
          </h1>
          <p className="text-xs text-small-info">Cadastre qualquer coisa por linguagem natural — sem abrir telas.</p>
        </div>
        <Button onClick={startNew} loading={creating} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Conversations sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/50">
          <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-small-info font-semibold border-b border-border">
            Conversas
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-small-info" /></div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-6 text-xs text-small-info text-center">
                Nenhuma conversa ainda. Clique em <span className="text-secondary-info font-medium">Novo</span> para começar.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConversation(c)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-table-hover transition-colors ${activeId === c.id ? "bg-baron-orange/10 border-l-2 border-l-baron-orange" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-small-info shrink-0" />
                    <span className="text-xs text-foreground truncate">{c.metadata?.name || "Conversa"}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Chat area */}
        <main className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
            {!activeId && messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <div className="h-16 w-16 rounded-2xl bg-baron-orange/10 border border-baron-orange/30 flex items-center justify-center mb-4">
                  <Boxes className="h-8 w-8 text-baron-orange" />
                </div>
                <h2 className="text-lg font-semibold text-title mb-1.5">Cadastro Inteligente</h2>
                <p className="text-sm text-secondary-info mb-5">
                  Diga o que quer cadastrar em linguagem natural. O Cadastro AI pergunta só o necessário e grava sozinho.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { startNew().then(() => setTimeout(() => sendMessage(s), 300)); }}
                      className="px-3 py-1.5 rounded-full text-xs bg-card border border-border text-secondary-info hover:border-baron-orange/50 hover:text-primary-info transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, idx) => <CadastroMessageBubble key={idx} message={m} />)
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl px-4 py-2.5 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-baron-orange" />
                  <span className="text-xs text-small-info">Cadastrando...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card px-3 py-3">
            <div className="flex items-end gap-2 max-w-3xl mx-auto">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ex: Cadastre 100kg de queijo coalho..."
                disabled={sending}
                className="flex-1"
              />
              <Button onClick={() => sendMessage()} disabled={sending || !input.trim()} size="icon" className="h-11 w-11">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-small-info text-center mt-1.5">Enter envia · Shift+Enter quebra linha</p>
          </div>
        </main>
      </div>
    </div>
  );
}