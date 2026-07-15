import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BaronSelect } from "@/design-system";
import { Upload, FileSpreadsheet, Loader2, Save, ArrowRight } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { IntegrationHub } from "@/lib/integrationHub";

const ENTITY_OPTIONS = [
  { value: "Product", label: "Produtos" },
  { value: "Supplier", label: "Fornecedores" },
  { value: "Customer", label: "Clientes" },
  { value: "FinancialTransaction", label: "Transações Financeiras" },
];

export default function UniversalImporter() {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [entity, setEntity] = useState("Product");
  const [extracted, setExtracted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState({});
  const [modelName, setModelName] = useState("");

  const handleUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setFileUrl(file_url);
      toast({ title: "Arquivo enviado", description: f.name });
    } catch (err) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!fileUrl) return;
    setLoading(true);
    try {
      const schema = await base44.entities[entity].schema();
      const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: { type: "array", items: { type: "object", properties: schema.properties } },
      });
      if (res.status === "success") {
        const data = Array.isArray(res.output) ? res.output : [res.output];
        setExtracted(data);
        // Auto-map by field name
        if (data.length > 0) {
          const autoMap = {};
          Object.keys(data[0]).forEach((k) => { autoMap[k] = k; });
          setMapping(autoMap);
        }
        toast({ title: `${data.length} registro(s) extraído(s)` });
      } else {
        throw new Error(res.details || "Falha na extração");
      }
    } catch (err) {
      toast({ title: "Erro na extração", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!extracted || extracted.length === 0) return;
    setLoading(true);
    try {
      const mapped = extracted.map((item) => {
        const result = {};
        Object.entries(mapping).forEach(([source, target]) => {
          if (item[source] !== undefined && target) result[target] = item[source];
        });
        return result;
      });
      await base44.entities[entity].bulkCreate(mapped);
      toast({ title: `${mapped.length} registro(s) importado(s)` });
      setExtracted(null);
      setFile(null);
      setFileUrl("");
      setMapping({});
    } catch (err) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveModel = async () => {
    if (!modelName) {
      toast({ title: "Dê um nome ao modelo", variant: "destructive" });
      return;
    }
    try {
      await IntegrationHub.createMapping({
        name: modelName,
        entity_type: "import_columns",
        source_format: file?.name?.endsWith('.csv') ? 'csv' : file?.name?.endsWith('.json') ? 'json' : 'excel',
        mapping_rules: mapping,
        is_template: true,
      });
      toast({ title: "Modelo salvo para reutilização" });
      setModelName("");
    } catch (err) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-800 mb-4">1. Selecione o arquivo e entidade de destino</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Arquivo (Excel, CSV, JSON, PDF, Imagem)</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input type="file" onChange={handleUpload} accept=".xlsx,.xls,.csv,.json,.pdf,.png,.jpg,.jpeg,.xml" />
              {file && <span className="text-xs text-emerald-600 whitespace-nowrap">✓ Enviado</span>}
            </div>
          </div>
          <div>
            <Label>Entidade de Destino</Label>
            <BaronSelect value={entity} onChange={setEntity} options={ENTITY_OPTIONS} />
          </div>
        </div>
        <Button className="mt-4" onClick={handleExtract} disabled={!fileUrl || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          Extrair Dados
        </Button>
      </div>

      {extracted && (
        <>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-neutral-800 mb-4">2. Mapeie as colunas</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {Object.keys(extracted[0] || {}).map((sourceField) => (
                <div key={sourceField} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-neutral-600 truncate">{sourceField}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
                  <Input
                    className="flex-1"
                    value={mapping[sourceField] || ""}
                    onChange={(e) => setMapping({ ...mapping, [sourceField]: e.target.value })}
                    placeholder="campo_destino"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Nome do modelo (para reutilizar)" className="flex-1" />
              <Button variant="outline" onClick={handleSaveModel}><Save className="h-4 w-4" /> Salvar Modelo</Button>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-neutral-800 mb-3">3. Pré-visualização ({extracted.length} registros)</h3>
            <div className="overflow-x-auto max-h-60">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-200">
                    {Object.keys(extracted[0] || {}).map((k) => <th key={k} className="px-2 py-1 text-left text-neutral-500">{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {extracted.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-neutral-100">
                      {Object.keys(extracted[0] || {}).map((k) => <td key={k} className="px-2 py-1 text-neutral-600">{String(row[k] ?? '').substring(0, 40)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button className="mt-4" onClick={handleImport} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importar {extracted.length} Registro(s)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}