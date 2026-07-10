import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import Toolbar from "@/components/shared/Toolbar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { exportToCsv } from "@/lib/exportCsv";

export default function Producao() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    base44.entities.ProductionRecord.list("-production_date", 300).then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, []);

  const filtered = rows.filter((r) => !search || (r.item || "").toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: "item", label: "Item", render: (r) => <span className="font-medium text-neutral-900">{r.item}</span> },
    { key: "quantity", label: "Quantidade", render: (r) => `${r.quantity || 0} ${r.unit || "un"}` },
    { key: "responsible", label: "Responsável", render: (r) => r.responsible || "—" },
    { key: "production_date", label: "Data", render: (r) => (r.production_date ? new Date(r.production_date).toLocaleDateString("pt-BR") : "—") },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader emoji="🏭" title="Centro de Produção" subtitle="Planejamento e acompanhamento da produção diária." />
      <div className="mt-6 space-y-4">
        <Toolbar search={search} onSearch={setSearch} onExport={() => exportToCsv("producao.csv", filtered)} placeholder="Pesquisar item..." />
        <DataTable columns={columns} rows={filtered} loading={loading} emptyTitle="Nenhuma produção registrada" emptyDescription="Os registros de produção aparecerão aqui." />
      </div>
    </div>
  );
}