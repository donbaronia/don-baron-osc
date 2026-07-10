import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { exportToCsv } from "@/lib/exportCsv";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const brl = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Financeiro() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("todos");

  useEffect(() => {
    base44.entities.FinancialTransaction.list("-due_date", 300).then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, []);

  const filtered = rows.filter((r) => {
    const matchTab = tab === "todos" || r.type === tab;
    const matchSearch = !search || (r.description || "").toLowerCase().includes(search.toLowerCase()) || (r.supplier || "").toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const columns = [
    { key: "description", label: "Descrição", render: (r) => <span className="font-medium text-neutral-900">{r.description}</span> },
    { key: "type", label: "Tipo", render: (r) => (r.type === "a_pagar" ? "A Pagar" : "A Receber") },
    { key: "supplier", label: "Fornecedor/Cliente" },
    { key: "amount", label: "Valor", render: (r) => brl(r.amount) },
    { key: "due_date", label: "Vencimento", render: (r) => (r.due_date ? new Date(r.due_date).toLocaleDateString("pt-BR") : "—") },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader emoji="💰" title="Centro Financeiro" subtitle="Contas a pagar, contas a receber e movimentações da Don Baron." />
      <div className="mt-6 space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="a_pagar">A Pagar</TabsTrigger>
            <TabsTrigger value="a_receber">A Receber</TabsTrigger>
          </TabsList>
        </Tabs>
        <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("financeiro.csv", filtered)} placeholder="Pesquisar lançamento..." />
        <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhum lançamento financeiro" emptyDescription="Os lançamentos aparecerão aqui conforme forem registrados ou interpretados pela IA." />
      </div>
    </div>
  );
}