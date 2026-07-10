import React from "react";
import { Bot } from "lucide-react";

export default function CommandExecutiveAI({ summary, loading }) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-6">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-white">
          <Bot className="h-5 w-5" />
        </div>
        <h2 className="text-sm font-semibold text-neutral-900">IA Executiva — BARON AI</h2>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-violet-100/60" style={{ width: `${90 - i * 8}%` }} />
          ))}
        </div>
      ) : (
        <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
          {summary}
        </div>
      )}
    </div>
  );
}