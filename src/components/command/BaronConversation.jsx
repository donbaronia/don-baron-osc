import React from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BaronConversation({ messages, onRouteAction }) {
  const navigate = useNavigate();

  if (!messages || messages.length === 0) return null;

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {messages.map((msg, i) => (
        <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
          <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}>
            {msg.role === "baron" && (
              <div className="mb-1 flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/15 text-[9px] font-bold text-primary">BA</div>
                <span className="text-[10px] font-medium text-muted-foreground">BARON</span>
              </div>
            )}
            <p className="whitespace-pre-line">{msg.content}</p>
            {msg.route && (
              <button
                onClick={() => { navigate(msg.route); onRouteAction?.(); }}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Abrir <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}