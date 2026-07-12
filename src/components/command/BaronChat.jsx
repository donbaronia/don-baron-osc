import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Mic, Paperclip, Camera, Send, Loader2, ArrowRight } from "lucide-react";

const FAST_ROUTES = [
  { keywords: ["compra", "comprar", "pedir"], path: "/compras", message: "Abrindo Centro de Compras..." },
  { keywords: ["cadastrar fornecedor", "novo fornecedor"], path: "/cadastro", message: "Abrindo Cadastro de Fornecedores..." },
  { keywords: ["fornecedor"], path: "/cadastro", message: "Abrindo Cadastro de Fornecedores..." },
  { keywords: ["dre", "demonstrativo"], path: "/financeiro", message: "Abrindo DRE..." },
  { keywords: ["fluxo", "caixa"], path: "/financeiro", message: "Abrindo Fluxo de Caixa..." },
  { keywords: ["pagamento", "pagar", "boleto", "contas a pagar"], path: "/financeiro", message: "Abrindo Financeiro..." },
  { keywords: ["receber", "contas a receber"], path: "/financeiro", message: "Abrindo Contas a Receber..." },
  { keywords: ["funcionário", "funcionario", "colaborador"], path: "/rh", message: "Abrindo Recursos Humanos..." },
  { keywords: ["rh", "pessoal", "ponto", "ferias", "férias"], path: "/rh", message: "Abrindo Recursos Humanos..." },
  { keywords: ["carne", "estoque", "insumo", "produto"], path: "/estoque", message: "Abrindo Estoque..." },
  { keywords: ["ifood", "delivery"], path: "/documentos", message: "Abrindo Pedidos do iFood..." },
  { keywords: ["produção", "producao", "produzir", "fabricar"], path: "/producao", message: "Abrindo Produção..." },
  { keywords: ["cmv", "custo", "margem"], path: "/cmv", message: "Abrindo Motor de CMV..." },
  { keywords: ["missão", "missao", "tarefa"], path: "/missions", message: "Abrindo Central de Missões..." },
  { keywords: ["indicador", "kpi", "métrica", "metrica"], path: "/indicadores", message: "Abrindo Indicadores..." },
  { keywords: ["documento", "nota fiscal", "recibo"], path: "/documentos", message: "Abrindo Documentos..." },
  { keywords: ["decisão", "decisao", "decidir"], path: "/decisoes", message: "Abrindo Motor de Decisões..." },
  { keywords: ["planejamento", "estratégia", "estrategia", "meta", "okr"], path: "/planejamento", message: "Abrindo Planejamento Estratégico..." },
  { keywords: ["brain", "inteligência baron"], path: "/brain", message: "Abrindo Inteligência Baron..." },
  { keywords: ["equipe digital", "robô", "robo", "worker"], path: "/workforce", message: "Abrindo Equipe Digital..." },
  { keywords: ["whatsapp"], path: "/whatsapp", message: "Abrindo WhatsApp..." },
  { keywords: ["configuração", "configuracao", "admin"], path: "/administracao", message: "Abrindo Configurações..." },
  { keywords: ["evento"], path: "/event-bus", message: "Abrindo Central de Eventos..." },
  { keywords: ["kernel", "núcleo", "nucleo"], path: "/kernel", message: "Abrindo Núcleo do Sistema..." },
  { keywords: ["integração", "integracao"], path: "/integracoes", message: "Abrindo Integrações..." },
  { keywords: ["people", "analytics", "pessoas"], path: "/people-analytics", message: "Abrindo Inteligência de Pessoas..." },
  { keywords: ["cadastro", "categoria", "unidade"], path: "/cadastro", message: "Abrindo Cadastro Mestre..." },
  { keywords: ["bi", "inteligência negócio", "analise"], path: "/inteligencia", message: "Abrindo Inteligência de Negócios..." },
];

function fastRoute(query) {
  const q = query.toLowerCase();
  for (const r of FAST_ROUTES) {
    if (r.keywords.some(k => q.includes(k))) return r;
  }
  return null;
}

export default function BaronChat() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [listening, setListening] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const navigate = useNavigate();

  const handleSend = async () => {
    if (!query.trim() || loading) return;
    const userMsg = query.trim();
    setLoading(true);
    setResponse(null);

    // Fast path: keyword matching
    const fast = fastRoute(userMsg);
    if (fast) {
      setResponse({ message: fast.message, route: fast.path });
      setQuery("");
      setTimeout(() => navigate(fast.path), 1200);
      setLoading(false);
      return;
    }

    // LLM path for complex queries
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é o BARON, o Diretor Operacional Virtual do DON BARON OS. O usuário disse: "${userMsg}"\n\nIdentifique qual módulo o usuário deseja e responda em JSON com a rota e uma mensagem curta.\nRotas: /compras, /financeiro, /estoque, /producao, /rh, /cmv, /documentos, /indicadores, /inteligencia, /decisoes, /planejamento, /brain, /workforce, /missions, /whatsapp, /cadastro, /event-bus, /kernel, /integracoes, /people-analytics, /administracao.\nSe for uma pergunta sobre dados (ex: "quanto tenho em caixa?"), use route: null e responda a pergunta com uma mensagem útil.\nResponda sempre em português, de forma amigável e concisa.`,
        response_json_schema: {
          type: "object",
          properties: {
            route: { type: "string" },
            message: { type: "string" }
          }
        }
      });
      setResponse(res);
      setQuery("");
      if (res.route) {
        setTimeout(() => navigate(res.route), 1500);
      }
    } catch {
      setResponse({ message: "Não consegui processar agora. Tente novamente.", route: null });
    } finally {
      setLoading(false);
    }
  };

  const handleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setResponse({ message: "Reconhecimento de voz não disponível neste navegador.", route: null });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setQuery(text);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResponse({ message: `Arquivo "${file.name}" recebido. Processando...`, route: null });
    e.target.value = "";
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Input area */}
      <div className="rounded-2xl border border-border bg-card p-2 shadow-xl shadow-black/20">
        <div className="flex items-center gap-2">
          {/* Mic */}
          <button
            onClick={handleMic}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${listening ? "bg-baron-error text-white animate-pulse" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            title="Microfone"
          >
            <Mic className="h-5 w-5" />
          </button>

          {/* Attach */}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Anexar Arquivo"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />

          {/* Camera */}
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Tirar Foto"
          >
            <Camera className="h-5 w-5" />
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

          {/* Text input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Digite ou fale seu comando..."
            className="flex-1 bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            disabled={loading}
          />

          {/* Send */}
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

      {/* Response */}
      {response && (
        <div className="mt-4 animate-fade-in">
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
              BA
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">{response.message}</p>
              {response.route && (
                <button
                  onClick={() => navigate(response.route)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Abrir agora <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {!response && !loading && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {["Lançar compra", "Fluxo de caixa", "Estoque crítico", "Cadastrar funcionário", "Mostrar DRE"].map(s => (
            <button
              key={s}
              onClick={() => { setQuery(s); }}
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