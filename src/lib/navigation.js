import {
  LayoutDashboard,
  Database,
  Wallet,
  Package,
  Factory,
  ShoppingCart,
  FileText,
  BarChart3,
  Bot,
  Settings,
  PieChart,
  Brain,
  Target,
  Zap,
  Plug,
  Cpu,
  Users,
} from "lucide-react";

// Centros de Operação do Don Baron OS.
// "roles" define quais perfis têm acesso a cada centro.
export const NAV_ITEMS = [
  {
    label: "Central de Comando",
    icon: LayoutDashboard,
    path: "/",
    emoji: "🧭",
    roles: ["administrador", "financeiro", "compras", "estoque", "producao", "gerencia", "operador"],
  },
  {
    label: "Cadastro Mestre",
    icon: Database,
    path: "/cadastro",
    emoji: "🗃️",
    roles: ["administrador", "compras", "estoque", "gerencia"],
  },
  {
    label: "Centro Financeiro",
    icon: Wallet,
    path: "/financeiro",
    emoji: "💰",
    roles: ["administrador", "financeiro", "gerencia"],
  },
  {
    label: "Centro de Estoque",
    icon: Package,
    path: "/estoque",
    emoji: "📦",
    roles: ["administrador", "estoque", "compras", "gerencia"],
  },
  {
    label: "Centro de Produção",
    icon: Factory,
    path: "/producao",
    emoji: "🏭",
    roles: ["administrador", "producao", "gerencia"],
  },
  {
    label: "Motor de CMV",
    icon: PieChart,
    path: "/cmv",
    emoji: "📊",
    roles: ["administrador", "financeiro", "gerencia"],
  },
  {
    label: "Centro de Compras",
    icon: ShoppingCart,
    path: "/compras",
    emoji: "🛒",
    roles: ["administrador", "compras", "gerencia"],
  },
  {
    label: "Centro de Documentos",
    icon: FileText,
    path: "/documentos",
    emoji: "📄",
    roles: ["administrador", "financeiro", "compras", "estoque", "producao", "gerencia"],
  },
  {
    label: "Centro de Indicadores",
    icon: BarChart3,
    path: "/indicadores",
    emoji: "📊",
    roles: ["administrador", "financeiro", "gerencia"],
  },
  {
    label: "Inteligência de Negócios",
    icon: Brain,
    path: "/inteligencia",
    emoji: "🧠",
    roles: ["administrador", "financeiro", "gerencia"],
  },
  {
    label: "Motor de Decisões",
    icon: Target,
    path: "/decisoes",
    emoji: "🎯",
    roles: ["administrador", "financeiro", "gerencia"],
  },
  {
    label: "Central de Eventos",
    icon: Zap,
    path: "/event-bus",
    emoji: "⚡",
    roles: ["administrador", "gerencia"],
  },
  {
    label: "Núcleo do Sistema",
    icon: Cpu,
    path: "/kernel",
    emoji: "🧬",
    roles: ["administrador"],
  },
  {
    label: "Integrações",
    icon: Plug,
    path: "/integracoes",
    emoji: "🔌",
    roles: ["administrador", "gerencia"],
  },
  {
    label: "Inteligência Baron",
    icon: Brain,
    path: "/brain",
    emoji: "🧠",
    roles: ["administrador", "financeiro", "compras", "estoque", "producao", "gerencia"],
  },
  {
    label: "Equipe Digital",
    icon: Users,
    path: "/workforce",
    emoji: "🤖",
    roles: ["administrador", "financeiro", "compras", "estoque", "producao", "gerencia"],
  },
  {
    label: "Central de Missões",
    icon: Target,
    path: "/missions",
    emoji: "🎯",
    roles: ["administrador", "financeiro", "compras", "estoque", "producao", "gerencia"],
  },
  {
    label: "Recursos Humanos",
    icon: Users,
    path: "/rh",
    emoji: "👥",
    roles: ["administrador", "rh", "gerencia"],
  },
  {
    label: "Inteligência de Pessoas",
    icon: BarChart3,
    path: "/people-analytics",
    emoji: "📊",
    roles: ["administrador", "rh", "gerencia"],
  },
  {
    label: "Planejamento Estratégico",
    icon: Target,
    path: "/planejamento",
    emoji: "🎯",
    roles: ["administrador", "gerencia"],
  },
  {
    label: "BARON AI",
    icon: Bot,
    path: "/ia",
    emoji: "🤖",
    roles: ["administrador", "financeiro", "compras", "estoque", "producao", "gerencia"],
  },
  {
    label: "Administração",
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
};

export function getUserRole(user) {
  // Administradores da plataforma têm acesso total por padrão.
  if (user?.department) return user.department;
  if (user?.role === "admin") return "administrador";
  return "operador";
}

export function canAccess(item, role) {
  return item.roles.includes(role);
}