import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Core } from "@/lib/coreEngine";
import { searchDocuments, DOCUMENT_CATEGORIES } from "@/lib/documentUtils";
import PageHeader from "@/components/shared/PageHeader";
import Toolbar from "@/components/shared/Toolbar";
import DocumentUpload from "@/components/documentos/DocumentUpload";
import DocumentList from "@/components/documentos/DocumentList";
import DocumentConfirmDialog from "@/components/documentos/DocumentConfirmDialog";
import DocumentViewer from "@/components/documentos/DocumentViewer";
import DocumentReports from "@/components/documentos/DocumentReports";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { BaronSelect } from "@/design-system";

export default function Documentos() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("entrada");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [confirmDoc, setConfirmDoc] = useState(null);
  const [viewerDoc, setViewerDoc] = useState(null);

  const load = useCallback(async () => {
    const docs = await base44.entities.DBDocument.list("-created_date", 500);
    setDocuments(docs);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const notDeleted = documents.filter((d) => !d.deleted_at);
  const inTrash = documents.filter((d) => d.deleted_at);

  const getFiltered = () => {
    switch (activeTab) {
      case "entrada":
        return notDeleted.filter((d) => ["recebido", "em_analise", "aguardando_confirmacao"].includes(d.status));
      case "pendentes":
        return notDeleted.filter((d) => d.status === "aguardando_confirmacao");
      case "processados":
        return notDeleted.filter((d) => d.status === "processado");
      case "arquivados":
        return notDeleted.filter((d) => d.status === "arquivado");
      case "pesquisa": {
        let results = searchDocuments(notDeleted, search);
        if (catFilter !== "all") results = results.filter((d) => d.category === catFilter);
        return results;
      }
      case "lixeira":
        return inTrash;
      default:
        return notDeleted;
    }
  };

  const handleDelete = async (doc) => {
    await base44.entities.DBDocument.update(doc.id, {
      deleted_at: new Date().toISOString(),
      deleted_by: user?.full_name || "Sistema",
    });
    await Core.audit({ audit_action: "delete", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Moveu para lixeira: ${doc.title}` });
    load();
  };

  const handleRestore = async (doc) => {
    await base44.entities.DBDocument.update(doc.id, { deleted_at: null, deleted_by: null });
    await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Restaurou da lixeira: ${doc.title}` });
    load();
  };

  const handleArchive = async (doc) => {
    await base44.entities.DBDocument.update(doc.id, { status: "arquivado" });
    await Core.audit({ audit_action: "update", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Arquivou: ${doc.title}` });
    load();
  };

  const handleReject = async (doc) => {
    await base44.entities.DBDocument.update(doc.id, {
      status: "rejeitado",
      rejected_by: user?.full_name || "Sistema",
    });
    await Core.audit({ audit_action: "reject", module: "documentos", entity_type: "DBDocument", entity_id: doc.id, details: `Rejeitou: ${doc.title}` });
    load();
  };

  const filtered = getFiltered();
  const pendingCount = notDeleted.filter((d) => d.status === "aguardando_confirmacao").length;
  const trashCount = inTrash.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title="Documentos"
        subtitle="Receba, confirme e arquive notas, boletos e recibos."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="entrada">Entrada</TabsTrigger>
          <TabsTrigger value="pendentes">
            Pendentes {pendingCount > 0 && <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-white">{pendingCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="processados">Processados</TabsTrigger>
          <TabsTrigger value="arquivados">Arquivados</TabsTrigger>
          <TabsTrigger value="pesquisa">Pesquisa</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          <TabsTrigger value="lixeira">
            Lixeira {trashCount > 0 && <span className="ml-1.5 rounded-full bg-neutral-400 px-1.5 py-0.5 text-xs font-bold text-white">{trashCount}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entrada" className="mt-4 space-y-4">
          <DocumentUpload onUploaded={load} />
          <DocumentList
            documents={filtered}
            loading={loading}
            onView={setViewerDoc}
            onConfirm={setConfirmDoc}
            onReject={handleReject}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="pendentes" className="mt-4">
          <DocumentList
            documents={filtered}
            loading={loading}
            onView={setViewerDoc}
            onConfirm={setConfirmDoc}
            onReject={handleReject}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="processados" className="mt-4">
          <DocumentList
            documents={filtered}
            loading={loading}
            onView={setViewerDoc}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="arquivados" className="mt-4">
          <DocumentList
            documents={filtered}
            loading={loading}
            onView={setViewerDoc}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="pesquisa" className="mt-4 space-y-4">
          <Toolbar search={search} onSearch={setSearch} placeholder="Pesquisar por fornecedor, valor, número, categoria, data, tags, texto...">
            <div className="w-48"><BaronSelect value={catFilter} onChange={setCatFilter} options={[{ value: "all", label: "Todas categorias" }, ...DOCUMENT_CATEGORIES.map((c) => ({ value: c.value, label: `${c.emoji} ${c.label}` }))]} /></div>
          </Toolbar>
          <DocumentList
            documents={filtered}
            loading={loading}
            onView={setViewerDoc}
            onConfirm={setConfirmDoc}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="lixeira" className="mt-4">
          <DocumentList
            documents={filtered}
            loading={loading}
            onRestore={handleRestore}
          />
        </TabsContent>

        <TabsContent value="relatorios" className="mt-4">
          <DocumentReports />
        </TabsContent>
      </Tabs>

      <DocumentConfirmDialog
        open={!!confirmDoc}
        document={confirmDoc}
        onClose={() => setConfirmDoc(null)}
        onConfirmed={load}
      />
      <DocumentViewer
        open={!!viewerDoc}
        document={viewerDoc}
        onClose={() => setViewerDoc(null)}
      />
    </div>
  );
}