import React from "react";
import { Link, useLocation } from "react-router-dom";
import { NAV_ITEMS, canAccess, ROLE_LABELS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function Sidebar({ role, user, onNavigate }) {
  const location = useLocation();
  const items = NAV_ITEMS.filter((i) => canAccess(i, role));

  return (
    <aside className="flex h-full w-72 flex-col bg-[#0e0e10] text-neutral-300">
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-lg font-black text-black shadow-lg shadow-amber-900/30">
            DB
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-white">DON BARON</p>
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-500/80">Operating System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                active
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-neutral-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] transition-colors", active ? "text-amber-400" : "text-neutral-500 group-hover:text-white")} />
              <span className="font-medium">{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
            {(user?.full_name || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.full_name || "Usuário"}</p>
            <p className="truncate text-[11px] text-amber-500/80">{ROLE_LABELS[role] || "Operador"}</p>
          </div>
          <button
            onClick={() => base44.auth.logout()}
            className="rounded-md p-2 text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}