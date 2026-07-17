import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getUserRole } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash2, CheckCircle2, Loader2, ShieldOff } from "lucide-react";

// Entidades de DADOS que serão apagadas. Propositalmente FORA desta lista:
// User, Company, Role, Permission, Module, License, SystemConfig,
// WhatsAppConfig, Integration, ServiceRegistry, Webhook, RecoveryOperation,
// SystemLog, AuditLog, TechLog — apagar essas travaria login, configuração
// de acesso e credenciais de integração, ou destruiria o próprio rastro de
// auditoria da limpeza.
const ENTITIES_TO_WIPE = [
  // Cadastro
  "Product", "Supplier", "Customer", "Category", "UnitOfMeasure", "Tag", "CostCenter", "Ingredient", "Recipe",
  // Estoque
  "Stock", "Movement", "Inventory", "PriceHistory",
  // Compras
  "Purchase", "PurchaseRequest", "Quotation",
  // Produção
  "ProductionRecord",
  // RH
  "Employee", "Candidate", "JobOpening", "EmployeeDocument", "TimeRecord", "EmployeeAdvance",
  "PerformanceReview", "Training", "CareerPlan", "Recognition", "Occurrence", "Payroll",
  // Financeiro
  "Payment", "Receipt", "FinancialTransaction", "FinancialAccount", "FinancialCategory",
  "IFoodReceipt", "Conciliation", "BudgetItem",
  // Documentos / Workflow
  "DBDocument", "DocumentProcess", "WorkflowApproval", "WorkflowDefinition", "WorkflowProcess",
  "EnterpriseProcess", "DataMapping", "DataQualityAlert",
  // Motoboys / Logística
  "Courier", "Sale",
  // CMV
  "CMVRecord", "CMVGoal",
  // Agentes / IA (dados gerados, não config — reconstroem sozinhos no próximo "init")
  "DigitalWorker", "WorkerActivity", "WorkerAlert", "Agent", "AgentConversation", "AgentMessage",
  "AgentMemory", "AgentLearning", "AIMemory", "BaronAIHistory", "BaronAILearning",
  "Decision", "KnowledgeEdge", "DataSnapshot",
  // Planejamento
  "Goal", "OKR", "StrategicPlan", "StrategicProject", "RoadmapItem", "Scenario", "KPIRecord", "Indicator",
  // Missões
  "Mission", "MissionChecklist", "MissionTask",
  // Notificações / integrações de mensagens (não credenciais)
  "Notification", "WhatsAppLog", "WhatsAppMessage", "IntegrationLog", "IntegrationQueueItem",
  // Outros
  "FileRecord", "TimelineEntry", "SystemTask", "SystemEvent", "SystemHealth", "HealthCheck",
  "MaintenanceWindow", "TelemetryRecord",
];

const CONFIRM_WORD = "RESETAR";

export default function ResetSistema() {
  const { user } = useAuth();
  const role = getUserRole(user);
  const [confirmText, setConfirmText] = useState("");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);
  const [totalDeleted, setTotalDeleted] = useState(0);

  if (role !== "administrador") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShieldOff className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Só administradores podem acessar esta página.</p>
      </div>
    );
  }

  const appendLog = (line) => setLog((l) => [...l, line]);

  const handleReset = async () => {
    if (confirmText !== CONFIRM_WORD) return;
    setRunning(true);
    setLog([]);
    setDone(false);
    let total = 0;

    for (const entityName of ENTITIES_TO_WIPE) {
      const entity = base44.entities[entityName];
      if (!entity) {
        appendLog(`⚠️ ${entityName}: entidade não encontrada, pulei.`);
        continue;
      }
      try {
        let deletedForEntity = 0;
        // Apaga em lotes até não sobrar nada (proteção contra listas grandes)
        for (let round = 0; round < 50; round++) {
          const batch = await entity.list("-created_date", 100).catch(() => []);
          if (!batch || batch.length === 0) break;
          for (const rec of batch) {
            try {
              await entity.delete(rec.id);
              deletedForEntity++;
              total++;
            } catch (e) {
              appendLog(`  ✗ ${entityName} ${rec.id}: ${e.message}`);
            }
          }
        }
        appendLog(`✓ ${entityName}: ${deletedForEntity} registro(s) apagado(s).`);
        setTotalDeleted(total);
      } catch (e) {
        appendLog(`✗ ${entityName}: falha geral — ${e.message}`);
      }
    }

    appendLog(`\n✅ Concluído. Total: ${total} registros apagados em ${ENTITIES_TO_WIPE.length} entidades.`);
    setDone(true);
    setRunning(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <h1 className="text-lg font-bold text-destructive">Reset Total do Sistema</h1>
            <p className="text-sm text-muted-foreground">Isso apaga TODOS os dados de negócio — sem volta.</p>
          </div>
        </div>

        <div className="mt-5 space-y-2 rounded-xl bg-card p-4 text-sm">
          <p className="font-semibold text-foreground">Vai apagar: {ENTITIES_TO_WIPE.length} tipos de dado</p>
          <p className="text-muted-foreground">Produtos, Estoque, Movimentações, Funcionários, Financeiro, Compras, Documentos, Fornecedores, Categorias, Unidades, Tags, Vales, Agentes e mais.</p>
          <p className="mt-2 font-semibold text-foreground">NÃO vai apagar (proteção):</p>
          <p className="text-muted-foreground">Sua conta de login (User), configuração de acesso (Role/Permission), credenciais de integração (WhatsApp/Webhooks), e os logs de auditoria/sistema.</p>
        </div>

        {!running && !done && (
          <div className="mt-5 space-y-3">
            <label className="text-sm font-medium text-foreground">
              Pra confirmar, digite <span className="font-mono font-bold text-destructive">{CONFIRM_WORD}</span> abaixo:
            </label>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={CONFIRM_WORD} className="border-destructive/40" />
            <Button
              variant="destructive"
              disabled={confirmText !== CONFIRM_WORD}
              onClick={handleReset}
              className="w-full gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Apagar tudo e começar do zero
            </Button>
          </div>
        )}

        {running && (
          <div className="mt-5 flex items-center gap-2 text-sm text-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Apagando... ({totalDeleted} registros até agora)
          </div>
        )}

        {done && (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-baron-green/10 p-3 text-sm text-baron-green">
            <CheckCircle2 className="h-4 w-4" />
            Sistema zerado. {totalDeleted} registros apagados. Pode começar a cadastrar do zero.
          </div>
        )}

        {log.length > 0 && (
          <pre className="mt-4 max-h-80 overflow-y-auto rounded-xl bg-background/80 p-3 text-[11px] text-secondary-info whitespace-pre-wrap">
            {log.join("\n")}
          </pre>
        )}
      </div>
    </div>
  );
}
