import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { getGreeting } from "@/lib/baronPersonality";
import BaronConsole from "@/components/command/BaronConsole";
import ExecutiveStatus from "@/components/command/ExecutiveStatus";

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export default function CommandCenter() {
  const { user } = useAuth();
  const g = getGreeting(user);
  const now = new Date();
  const dateStr = `${WEEKDAYS[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]}`;

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-8">
      <div className="w-full max-w-3xl">
        {/* Saudação executiva */}
        <div className="mb-8 animate-fade-in">
          <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-baron-orange">👑 BARON</div>
          <h1 className="text-title text-3xl font-bold sm:text-4xl">{g.title}</h1>
          <p className="mt-2 text-lg capitalize text-secondary-info">{dateStr}</p>
        </div>

        {/* Status operacional — modo executivo */}
        <div className="mb-8">
          <ExecutiveStatus />
        </div>

        {/* Divisor */}
        <div className="mb-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-gray-info">O que vamos fazer agora?</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* BARON — o coração */}
        <BaronConsole />
      </div>
    </div>
  );
}