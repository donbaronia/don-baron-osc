import {
  LayoutDashboard,
  Wallet,
  Package,
  ShoppingCart,
  Factory,
  Users,
  Bike,
  BarChart3,
  MessageCircle,
  Settings,
  FileText,
  Zap,
  History,
  HeartPulse,
  Brain,
  Activity,
  ShieldCheck,
} from "lucide-react";

export const NAV_ITEMS = [
  {
    label: "Home",
    icon: LayoutDashboard,
    path: "/",
    roles: ["administrador", "financeiro", "compras", "estoque", "producao", "gerencia", "operador", "rh"],
  },
  {
    label: "Financeiro",
    icon: Wallet,
    path: "/financeiro",
    roles: ["administrador", "financeiro", "gerencia"],
  },
  {
    label: "Processar Documento",
    icon: Zap,
    path: "/processamento",
    roles: ["administrador", "financeiro", "gerencia", "compras", "estoque"],
  },
  {
    label: "Documentos",
    icon: FileText,
    path: "/documentos-financeiros",
    roles: ["administrador", "financeiro", "gerencia", "compras"],
  },
  {
    label: "Pendências da IA",
    icon: Brain,
    path: "/pendencias-ia",
    roles: ["administrador", "financeiro", "gerencia", "compras", "estoque"],
  },
  {
    label: "Workflow de Processos",
    icon: Activity,
    path: "/processos",
    roles: ["administrador", "financeiro", "gerencia", "compras", "estoque"],
  },
  {
    label: "Estoque",
    icon: Package,
    path: "/estoque",
    roles: ["administrador", "estoque", "compras", "gerencia"],
  },
  {
    label: "Compras",
    icon: ShoppingCart,
    path: "/compras",
    roles: ["administrador", "compras", "gerencia"],
  },
  {
    label: "Produção",
    icon: Factory,
    path: "/producao",
    roles: ["administrador", "producao", "gerencia"],
  },
  {
    label: "RH",
    icon: Users,
    path: "/rh",
    roles: ["administrador", "rh", "gerencia"],
  },
  {
    label: "Motoboys",
    icon: Bike,
    path: "/motoboys",
    roles: ["administrador", "gerencia", "operador"],
  },
  {
    label: "Inteligência",
    icon: BarChart3,
    path: "/inteligencia",
    roles: ["administrador", "gerencia", "financeiro"],
  },
  {
    label: "WhatsApp",
    icon: MessageCircle,
    path: "/whatsapp-connector",
    roles: ["administrador"],
  },
  {
    label: "Relatórios",
    icon: BarChart3,
    path: "/relatorios",
    roles: ["administrador", "gerencia", "financeiro"],
  },
  {
    label: "Configurações",
    icon: Settings,
    path: "/administracao",
    roles: ["administrador"],
  },
  {
    label: "Saúde do Sistema",
    icon: HeartPulse,
    path: "/saude",
    roles: ["administrador"],
  },
  {
    label: "Recovery Engine",
    icon: ShieldCheck,
    path: "/recovery",
    roles: ["administrador"],
  },
  {
    label: "BARON Histórico",
    icon: History,
    path: "/baron-historico",
    roles: ["administrador", "financeiro", "compras", "estoque", "producao", "gerencia", "operador", "rh"],
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