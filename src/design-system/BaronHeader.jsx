import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, PanelLeftClose, PanelLeftOpen, Home, Brain, Bell, Search } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getUserRole, ROLE_LABELS } from "@/lib/navigation";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

// ============================================================
// BaronHeader — fixo, pesquisa global, acesso ao Baron, notificações, perfil
// ============================================================

export function BaronHeader({
  onToggleMobile,
  onToggleCollapse,
  collapsed,
  onBaron,
  onGlobalSearch,
  notifications = [],
  onNotifications,
}) {
  const { user } = useAuth();
  const role = getUserRole(user);
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = React.useState(false);
  const [showNotifs, setShowNotifs] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const searchRef = React.useRef(null);
  const unread = notifications.filter((n) => !n.read).length;

  // Atalho Ctrl+K
  React.useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      onGlobalSearch?.(search);
      searchRef.current?.blur();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-header px-3 sm:px-4">
      {/* Toggle mobile */}
      <button
        onClick={onToggleMobile}
        className="rounded-lg p-2 text-secondary-info transition-colors hover:bg-card-hover lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Toggle collapse desktop */}
      <button
        onClick={onToggleCollapse}
        className="hidden rounded-lg p-2 text-secondary-info transition-colors hover:bg-card-hover lg:block"
        title={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>

      {/* Home */}
      <button
        onClick={() => navigate("/")}
        className="rounded-lg p-2 text-secondary-info transition-colors hover:bg-card-hover hover:text-primary-info"
        title="Central de Comando"
      >
        <Home className="h-4 w-4" />
      </button>

      {/* Pesquisa global */}
      <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-small-info" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar no sistema... (Ctrl+K)"
          className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-primary-info transition-all placeholder:text-small-info focus-visible:border-baron-orange focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-baron-orange"
        />
      </form>

      {/* Ações */}
      <div className="flex items-center gap-1">
        {/* BARON — destaque laranja */}
        <button
          onClick={onBaron}
          className="flex items-center gap-1.5 rounded-lg bg-baron-orange/10 px-2.5 py-2 text-baron-orange transition-all hover:bg-baron-orange/20"
          title="Conversar com BARON (Ctrl+B)"
        >
          <Brain className="h-4 w-4" />
          <span className="hidden text-xs font-semibold sm:inline">BARON</span>
        </button>

        {/* Notificações */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }}
            className="relative rounded-lg p-2 text-secondary-info transition-colors hover:bg-card-hover hover:text-primary-info"
            title="Notificações"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-baron-orange opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-baron-orange" />
              </span>
            )}
          </button>

          {showNotifs && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
              <div className="absolute right-0 z-50 mt-1.5 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-title text-sm font-semibold">Notificações</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-small-info px-4 py-8 text-center text-xs">Sem notificações</p>
                  ) : (
                    notifications.slice(0, 8).map((n, i) => (
                      <button
                        key={i}
                        onClick={() => { onNotifications?.(n); setShowNotifs(false); }}
                        className={cn(
                          "flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-card-hover",
                          !n.read && "bg-baron-orange/5"
                        )}
                      >
                        <p className="text-primary-info text-xs font-medium">{n.title}</p>
                        <p className="text-small-info text-xs">{n.message}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Perfil */}
        <div className="relative ml-1">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}
            className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-card-hover"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-baron-orange/15 text-sm font-semibold text-baron-orange">
              {(user?.full_name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="hidden text-left sm:block">
              <p className="max-w-[120px] truncate text-xs font-medium text-primary-info">{user?.full_name || "Usuário"}</p>
              <p className="text-[10px] text-small-info">{ROLE_LABELS[role] || "Operador"}</p>
            </div>
          </button>

          {showProfile && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
              <div className="absolute right-0 z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-sm font-medium text-primary-info">{user?.full_name || "Usuário"}</p>
                  <p className="truncate text-xs text-small-info">{user?.email || ""}</p>
                </div>
                <button
                  onClick={() => base44.auth.logout("/login")}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-baron-red transition-colors hover:bg-baron-red/10"
                >
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}