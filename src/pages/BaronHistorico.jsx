import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONV_KEY = "baron_conversation";

export default function BaronHistorico() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(CONV_KEY) || "[]")); } catch { setHistory([]); }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem(CONV_KEY);
    setHistory([]);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Histórico do BARON</h1>
            <p className="text-xs text-muted-foreground">Todos os comandos, respostas e auditoria.</p>
          </div>
        </div>
        {history.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearHistory} className="gap-1 text-baron-error">
            <Trash2 className="h-4 w-4" /> Limpar
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum comando registrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.slice().reverse().map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}>
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
                <span className="mt-1 block text-[10px] opacity-50">
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleString("pt-BR") : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}