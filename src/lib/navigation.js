import {
  LayoutDashboard,
  Wallet,
  ShoppingCart,
  Package,
  Factory,
  Users,
  Settings,
} from "lucide-react";

export const NAV_ITEMS = [
  {
    label: "Home",
    icon: LayoutDashboard,
    path: "/",
    emoji: "🏠",
    roles: ["administrador", "financeiro", "compras", "estoque", "producao", "gerencia", "operador", "rh"],
  },
  {
    label: "Financeiro",
    icon: Wallet,
    path: "/financeiro",
    emoji: "💰",
    roles: ["administrador", "financeiro", "gerencia"],
  },
  {
    label: "Compras",
    icon: ShoppingCart,
    path: "/compras",
    emoji: "🛒",
    roles: ["administrador", "compras", "gerencia"],
  },
  {
    label: "Estoque",
    icon: Package,
    path: "/estoque",
    emoji: "📦",
    roles: ["administrador", "estoque", "compras", "gerencia"],
  },
  {
    label: "Produção",
    icon: Factory,
    path: "/producao",
    emoji: "🏭",
    roles: ["administrador", "producao", "gerencia"],
  },
  {
    label: "RH",
    icon: Users,
    path: "/rh",
    emoji: "👥",
    roles: ["administrador", "rh", "gerencia"],
  },
  {
    label: "Configurações",
    icon: Settings,
    path: "/administracao",
    emoji: "⚙️",
    roles: ["administrador"],
  },
];

export const ROLE_LABELS = {
  administrador: "Administrador",
  financeiro: "Financeiro",
  compras: "Compras",
  estoque: "Estoque",
  producao: "Produção",
  gerencia: "Gerência",
  operador: "Operador",
  rh: "RH",
};

export function getUserRole(user) {
  if (user?.department) return user.department;
  if (user?.role === "admin") return "administrador";
  return "operador";
}

export function canAccess(item, role) {
  return item.roles.includes(role);
}