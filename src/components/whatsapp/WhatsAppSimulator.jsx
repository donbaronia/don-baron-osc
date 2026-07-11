import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

const SYSTEM_PROMPT = `Você é o Baron WhatsApp Assistant do DON BARON OS, um sistema de gestão empresarial.
Responda como se estivesse respondendo no WhatsApp: formato amigável, conciso (máximo 200 palavras), use emojis com moderação.
Valores em R$, datas em DD/MM/AAAA.
Se a pergunta for sobre dados específicos, explique que no WhatsApp real você consultaria o sistema em tempo real.
Seja direto e útil. Responda em português.`;

export default function WhatsAppSimulator() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!query.trim() || loading) return;
    const userMsg = query.trim();
    setQuery("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `${SYSTEM_PROMPT}\n\nUsuário: ${userMsg}`,
        response_json_schema: { type: "object", properties: { response: { type: "string" } } },
      });
      setMessages(prev => [...prev, { role: "assistant", content: res.response || "Não consegui processar." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Erro ao processar. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="flex items-center gap-3 border-b border-neutral-100 bg-emerald-50 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white text-sm font-bold">
            BA
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800">Baron WhatsApp Assistant</p>
            <p className="text-xs text-emerald-600">● online</p>
          </div>
        </div>

        <div className="min-h-[300px] space-y-3 bg-[#e5ddd5] p-4">
          {messages.length === 0 && (
            <div className="flex justify-center">
              <p className="rounded-lg bg-white/80 px-4 py-2 text-xs text-neutral-500">
                Digite uma mensagem para simular a resposta do WhatsApp
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-emerald-500 text-white" : "bg-white text-neutral-800"}`}>
                <ReactMarkdown className={m.role === "user" ? "prose prose-sm text-white" : "prose prose-sm"}>{m.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-white px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-neutral-100 p-3">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Digite sua mensagem..."
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading || !query.trim()} className="bg-emerald-600 hover:bg-emerald-700" size="icon">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}