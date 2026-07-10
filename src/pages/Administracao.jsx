import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { ROLE_LABELS } from "@/lib/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Administracao() {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingU, setLoadingU] = useState(true);
  const [loadingL, setLoadingL] = useState(true);

  useEffect(() => {
    base44.entities.User.list("-created_date", 200).then((r) => { setUsers(r); setLoadingU(false); });
    base44.entities.AuditLog.list("-created_date", 300).then((r) => { setLogs(r); setLoadingL(false); });
  }, []);

  const userCols = [
    { key: "full_name", label: "Nome", render: (r) => <span className="font-medium text-neutral-900">{r.full_name || "—"}</span> },
    { key: "email", label: "E-mail" },
    { key: "department", label: "Perfil", render: (r) => ROLE_LABELS[r.department] || (r.role === "admin" ? "Administrador" : "Operador") },
    { key: "active", label: "Ativo", render: (r) => (r.active === false ? "Não" : "Sim") },
  ];

  const logCols = [
    { key: "created_date", label: "Data/Hora", render: (r) => new Date(r.created_date).toLocaleString("pt-BR") },
    { key: "user_name", label: "Usuário", render: (r) => <span className="font-medium text-neutral-900">{r.user_name}</span> },
    { key: "module", label: "Módulo" },
    { key: "action", label: "Ação" },
    { key: "details", label: "Detalhes", render: (r) => r.details || "—" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader emoji="⚙️" title="Administração" subtitle="Perfis de acesso e trilha de auditoria de todas as ações." />
      <Tabs defaultValue="usuarios" className="mt-6">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários & Perfis</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios" className="mt-4">
          <DataTable columns={userCols} rows={users} loading={loadingU} emptyTitle="Nenhum usuário" />
        </TabsContent>
        <TabsContent value="auditoria" className="mt-4">
          <DataTable columns={logCols} rows={logs} loading={loadingL} emptyTitle="Nenhum registro de auditoria" emptyDescription="Todas as ações relevantes serão registradas automaticamente aqui." />
        </TabsContent>
      </Tabs>
    </div>
  );
}