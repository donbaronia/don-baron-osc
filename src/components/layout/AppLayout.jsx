import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import GlobalSearch from "@/components/bds/GlobalSearch";
import BDSAIPanel from "@/components/bds/BDSAIPanel";
import BDSHelp from "@/components/bds/BDSHelp";
import { useAuth } from "@/lib/AuthContext";
import { getUserRole, ROLE_LABELS } from "@/lib/navigation";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import { base44 } from "@/api/base44Client";
import { Menu, X, PanelLeftClose, PanelLeftOpen, Brain, Star, Bell, LogOut, Moon, Sun } from "lucide-react";

export default function AppLayout() {
  const { user } = useAuth();
  const role = getUserRole(user);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useKeyboardShortcuts([
    { combo: "ctrl+k", action: () => document.querySelector?.("[data-bds-search]")?.focus() },
    { combo: "alt+i", action: () => setAiOpen(true) },
    { combo: "escape", action: () => { setAiOpen(false); setShowProfile(false); } },
  ]);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100">
      {/* Sidebar desktop */}
      <div className="hidden lg:block">
        <Sidebar role={role} user={user} collapsed={collapsed} />
      </div>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar role={role} user={user} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Barra superior — Baron Design System */}
        <header className="flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-2.5">
          {/* Toggle mobile */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100 lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Toggle recolher sidebar desktop */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100 lg:block"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <PanelLeftOpen className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
          </button>

          {/* Pesquisa global */}
          <GlobalSearch />

          {/* Ações da barra superior */}
          <div className="flex items-center gap-0.5">
            {/* IA */}
            <button
              onClick={() => setAiOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-amber-400 to-amber-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:brightness-110"
              title="Inteligência Baron"
            >
              <Brain className="h-4 w-4" />
              <span className="hidden xl:inline">IA</span>
            </button>

            {/* Favoritos */}
            <button
              onClick={() => navigate("/")}
              className="rounded-md p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              title="Favoritos"
            >
              <Star className="h-4.5 w-4.5" />
            </button>

            {/* Modo escuro/claro */}
            <button
              onClick={toggleDark}
              className="rounded-md p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              title={darkMode ? "Modo claro" : "Modo escuro"}
            >
              {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* Ajuda contextual */}
            <BDSHelp />

            {/* Notificações */}
            <button
              onClick={() => navigate("/event-bus")}
              className="relative rounded-md p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              title="Notificações"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" />
            </button>

            {/* Perfil */}
            <div className="relative ml-1">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-neutral-100"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-semibold text-white">
                  {(user?.full_name || "U").charAt(0).toUpperCase()}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="max-w-[120px] truncate text-xs font-medium text-neutral-700">{user?.full_name || "Usuário"}</p>
                  <p className="text-[10px] text-neutral-400">{ROLE_LABELS[role] || "Operador"}</p>
                </div>
              </button>

              {showProfile && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowProfile(false)} />
                  <div className="absolute right-0 z-40 mt-1.5 w-52 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
                    <div className="border-b border-neutral-100 px-4 py-3">
                      <p className="truncate text-sm font-medium text-neutral-800">{user?.full_name || "Usuário"}</p>
                      <p className="truncate text-xs text-neutral-400">{user?.email || ""}</p>
                    </div>
                    <button
                      onClick={() => { setShowProfile(false); base44.auth.logout(); }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Painel da IA — Inteligência Baron */}
      <BDSAIPanel open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}