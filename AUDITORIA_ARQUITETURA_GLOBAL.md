# AUDITORIA GLOBAL DA ARQUITETURA — DON BARON CORE
## FASE 1 — SOMENTE LEITURA (READ-ONLY)
**Data:** 2026-07-15 · **Status:** Concluída · **Próxima fase:** Aguardando aprovação para refatoração

---

## RESUMO EXECUTIVO

A auditoria revelou que **a causa raiz de todos os problemas de persistência, sincronização e comunicação entre módulos é a inexistência de uma camada única de Application Services.** Hoje existem **TRÊS camadas centrais concorrentes** que gravam dados, e as telas/motores as usam de forma inconsistente — inclusive gravando direto no banco, contornando toda a infraestrutura de read-back, recovery, eventos e auditoria já construída.

### Os 3 motores de gravação concorrentes (PROBLEMA RAIZ)

| Camada | Arquivo | Read-Back | Recovery | EventBus | Auditoria | Quem usa |
|--------|---------|-----------|----------|----------|-----------|----------|
| **donBaronCore** (`Core.save/update/remove`) | `src/lib/donBaronCore.js` | ✅ Sim | ❌ Não | ❌ Não | ✅ SystemLog | ContasPagar, ProductForm |
| **PersistenceEngine → RecoveryEngine** | `src/core/PersistenceEngine.js` → `src/lib/recoveryEngine.js` | ✅ Sim (4 etapas) | ✅ Fila+retry+dead-letter | ❌ Não (quem chama é que publica) | ✅ SystemLog | HCM.createAdvance, ActionEngine |
| **ActionEngine** | `src/core/ActionEngine.js` | ✅ (via PersistenceEngine) | ✅ (via PersistenceEngine) | ✅ publish | ✅ Logger.audit | Quase NINGUÉM (só Baron IA) |
| **Gravação DIRETA** `base44.entities.X.create` | espalhado | ❌ Não | ❌ Não | ❌ Não | ❌ Não | Motoboys, EmployeeManager, IE, PE, CMV, documentWorkflow, hcmEngine CRUD |

> **Conclusão:** a infraestrutura enterprise já existe (ActionEngine, PersistenceEngine, RecoveryEngine, EventBus, SyncManager, Logger) — mas **a maioria dos módulos NÃO a usa**. O problema não é falta de infraestrutura, é **falta de enforcement de uma camada única**.

---

## MAPA DE ENTIDADES — AUDITORIA COMPLETA

### 🟢 Conforme (usa camada enterprise completa)

Nenhuma entidade está 100% conforme o fluxo ideal (Interface → Application Service → ActionEngine → PersistenceEngine → Read-Back → EventBus → Recovery → Audit).

### 🟡 Parcial (usa alguma camada, mas faltam peças)

### 🔴 Crítico (gravação direta, sem read-back/recovery/eventos)

---

### ENTIDADE: Employee (RH — Funcionários)
- **Tabela:** `Employee`
- **Arquivo responsável:** `src/lib/hcmEngine.js` (linhas 15-19), `src/components/hcm/EmployeeManager.jsx` (linha 41)
- **Quem cria:** `HCM.createEmployee` → `base44.entities.Employee.create(data)` — **DIRETO**
- **Quem lê:** `HCM.listEmployees` → `base44.entities.Employee.list()` (direto)
- **Quem atualiza:** `HCM.updateEmployee` → `base44.entities.Employee.update(id, data)` — **DIRETO**
- **Quem exclui:** `HCM.deleteEmployee` → `base44.entities.Employee.delete(id)` — **DIRETO**
- **Publica eventos:** ❌ NÃO. Helper `emitEmployeeCreated` não existe. Nenhum evento publicado.
- **Consome eventos:** ❌ Nenhum.
- **Read-Back:** ❌ Não.
- **Recovery:** ❌ Não.
- **Auditoria:** ❌ Não (não chama Core.audit nem Logger.audit).
- **Status:** 🔴 **CRÍTICO**
- **Impacto:** Funcionário criado → RH isolado. Folha, Financeiro, Dashboard, CEO AI nunca são notificados. Dados podem não persistir sem read-back.

### ENTIDADE: EmployeeAdvance (RH — Vales/Empréstimos)
- **Tabela:** `EmployeeAdvance`
- **Arquivo responsável:** `src/lib/hcmEngine.js` (linhas 46-84), `src/components/hcm/Advances.jsx` (linha 47)
- **Quem cria:** `HCM.createAdvance` → `PersistenceEngine.create("EmployeeAdvance", ...)` → RecoveryEngine ✅
- **Quem lê:** `HCM.listAdvances` → `base44.entities.EmployeeAdvance.list()` (direto, leitura ok)
- **Quem atualiza:** `HCM.updateAdvance` → `PersistenceEngine.update` → RecoveryEngine ✅
- **Publica eventos:** ✅ `EventBus.emitAdvanceCreated` (linha 55) e `emitAdvanceUpdated` (linha 78)
- **Consome eventos:** ✅ via `SyncManager.onSync("EmployeeAdvance", ...)` em Advances.jsx (linhas 33-36)
- **Read-Back:** ✅ Sim (RecoveryEngine etapa 2)
- **Recovery:** ✅ Sim (fila + retry + dead-letter)
- **Auditoria:** ✅ Sim (Logger.audit no RecoveryEngine commit)
- **Status:** 🟢 **CONFORME** — único módulo totalmente migrado
- **Impacto:** Este é o MODELO a seguir. A inconsistência com o resto do RH gera dúvida sobre qual camada usar.

### ENTIDADE: Candidate (RH — Seleção)
- **Tabela:** `Candidate`
- **Arquivo:** `src/lib/hcmEngine.js` (linhas 22-24)
- **Quem cria/atualiza:** `base44.entities.Candidate.create/update` — **DIRETO**
- **Eventos/ReadBack/Recovery/Audit:** ❌ Nenhum
- **Status:** 🔴 **CRÍTICO**

### ENTIDADE: JobOpening / EmployeeDocument / TimeRecord / PerformanceReview / Training / CareerPlan / Recognition / Occurrence / Payroll
- **Arquivo:** `src/lib/hcmEngine.js` (linhas 27-112)
- **Quem cria/atualiza:** Todos `base44.entities.X.create/update` — **DIRETO**
- **Eventos/ReadBack/Recovery/Audit:** ❌ Nenhum
- **Status:** 🔴 **CRÍTICO** (todo o RH exceto Vales)
- **Impacto:** Documento de funcionário vencido, treinamento expirado, ocorrência — nada gera evento, nada dispara alerta automático, nada persiste com garantia.

---

### ENTIDADE: Product (Cadastro — Produtos)
- **Tabela:** `Product`
- **Arquivo responsável:** `src/components/cadastro/ProductForm.jsx` (linhas 111, 114)
- **Quem cria:** `Core.save("Product", data)` (donBaronCore) → read-back + SystemLog ✅
- **Quem atualiza:** `Core.update("Product", id, data)` (donBaronCore) ✅
- **Quem lê:** `ProductRegistrationModal.jsx` → `base44.entities.Supplier/Category/UnitOfMeasure/Tag.list` (direto, leitura ok)
- **Publica eventos:** ❌ NÃO. `emitProductCreated` existe no EventBus (linha 68) mas ProductForm NÃO chama.
- **Consome eventos:** ❌ Nenhum.
- **Read-Back:** ✅ Sim (donBaronCore)
- **Recovery:** ❌ Não (donBaronCore não usa RecoveryEngine)
- **Auditoria:** ✅ SystemLog
- **Status:** 🟡 **PARCIAL**
- **Impacto:** Produto criado → Estoque não sabe (não cria Stock), Compras não sabe, CMV não sabe, Produção não sabe. **Entidade isolada apesar de central.**

### ENTIDADE: Supplier (Cadastro — Fornecedores)
- **Tabela:** `Supplier`
- **Arquivo:** `src/lib/purchasingCenter.js` (linha 252), `src/components/cadastro/SupplierForm.jsx`
- **Quem cria:** ver SupplierForm (provável `Core.save`)
- **Quem atualiza:** `PC.recalculateSupplierScore` → `base44.entities.Supplier.update` — **DIRETO** (linha 252)
- **Eventos:** ❌ Nenhum
- **Read-Back:** Parcial (criação sim, atualização de score não)
- **Recovery:** ❌
- **Auditoria:** ❌ no score update
- **Status:** 🟡 **PARCIAL**

---

### ENTIDADE: Stock / Movement (Estoque)
- **Tabela:** `Stock`, `Movement`
- **Arquivo responsável:** `src/lib/inventoryEngine.js` (IE)
- **Quem cria Movement:** `IE.processMovement` (linha 48) → `base44.entities.Movement.create` — **DIRETO**
- **Quem cria/atualiza Stock:** `IE._updateStock` (linhas 100, 143, 157, 221) → `base44.entities.Stock.create/update` — **DIRETO**
- **Quem atualiza Product:** `IE._updateStock` (linha 236) → `base44.entities.Product.update(...).catch(() => {})` — **DIRETO com erro silenciado**
- **Quem chama:** `MovementManagement.jsx` (linha 73) → `IE.processMovement`
- **Publica eventos:** ✅ `EventBus.publish` stock_entry_created / stock_exit_created (linha 79)
- **Consome eventos:** ❌ Nenhum frontend subscriber encontrado
- **Read-Back:** ❌ Não
- **Recovery:** ❌ Não
- **Auditoria:** ✅ `Core.audit` (linha 69)
- **Status:** 🟡 **PARCIAL** (tem eventos + auditoria, mas sem read-back/recovery)
- **Impacto CRÍTICO:** **Duas fontes de verdade para quantidade** (`Product.stock_quantity` e `Stock.quantity`), atualizadas independentemente. O `Product.update` na linha 236 tem `.catch(() => {})` — **erro silenciado** — então se falhar, Product e Stock divergem silenciosamente. Sem read-back, não há detecção.

### ENTIDADE: ProductionRecord / Recipe (Produção)
- **Tabela:** `ProductionRecord`, `Recipe`
- **Arquivo responsável:** `src/lib/productionEngine.js` (PE)
- **Quem cria:** `PE.createProductionOrder` (linha 45) → `base44.entities.ProductionRecord.create` — **DIRETO**
- **Quem atualiza:** `PE.updateStatus` (linha 128) → `base44.entities.ProductionRecord.update` — **DIRETO**
- **Quem finaliza:** `PE.finalizeProduction` (linha 142) → chama `IE.processMovement` (linhas 179, 239) para baixa de ingredientes e entrada de produto acabado
- **Publica eventos:** ❌ NÃO. `emitProductionFinished` existe no EventBus (linha 84) mas PE NÃO chama.
- **Consome eventos:** ❌ Nenhum.
- **Read-Back:** ❌ Não
- **Recovery:** ❌ Não
- **Auditoria:** ✅ `Core.audit` (linhas 69, 130)
- **Status:** 🟡 **PARCIAL**
- **Impacto:** Produção concluída → CMV não recalculado automaticamente, DRE não atualizado, Dashboard não notificado. Sem read-back, ordem de produção pode não persistir.

### ENTIDADE: Purchase / PurchaseRequest / Quotation (Compras)
- **Tabela:** `Purchase`, `PurchaseRequest`, `Quotation`
- **Arquivo:** `src/lib/purchasingCenter.js` (PC — read-only dashboard), componentes `src/components/compras/*`
- **Quem atualiza:** `PC.recalculateSupplierScore` (linha 252) → `base44.entities.Supplier.update` — **DIRETO**
- **Publica eventos:** ❌ `emitPurchaseCreated`/`emitPurchaseConfirmed` existem mas não chamados no PC
- **Read-Back:** ❌
- **Recovery:** ❌
- **Auditoria:** ❌
- **Status:** 🔴 **CRÍTICO** (assumindo que PurchaseOrders grava direto — confirmar em Fase 2)
- **Impacto:** Pedido de compra criado → Estoque não sabe aguardar entrega, Financeiro não provisiona, Supplier score não atualiza via evento.

---

### ENTIDADE: Payment / Receipt / FinancialTransaction / FinancialAccount (Financeiro)
- **Tabela:** `Payment`, `Receipt`, `FinancialTransaction`, `FinancialAccount`
- **Arquivo responsável:** `src/components/financial/ContasPagar.jsx` (linhas 69, 72, 91)
- **Quem cria Payment:** `DBCore.save("Payment", form)` (donBaronCore) → read-back + SystemLog ✅
- **Quem atualiza:** `DBCore.update("Payment", id, data)` (donBaronCore) ✅
- **Quem lê:** `base44.entities.Payment.list` (direto, leitura ok), `FinancialCenter.js` (read-only)
- **Publica eventos:** ❌ NÃO. `emitPaymentCreated`/`emitPaymentConfirmed` existem no EventBus (linhas 76-77) mas ContasPagar NÃO chama.
- **Consome eventos:** ❌ Nenhum (exceto reactor `advance_created` → espelha vale em FinancialTransaction, conforme histórico)
- **Read-Back:** ✅ Sim (donBaronCore)
- **Recovery:** ❌ Não (donBaronCore não usa RecoveryEngine)
- **Auditoria:** ✅ `Core.audit` (linhas 70, 73, 92)
- **Status:** 🟡 **PARCIAL**
- **Impacto:** Conta a pagar criada → Dashboard financeiro não atualiza via evento (só recarrega manual), DRE não recalcula, CMV não recalcula, conciliação não sabe. **Financeiro isolado do event bus.**

### ENTIDADE: Courier (Motoboys)
- **Tabela:** `Courier`
- **Arquivo responsável:** `src/pages/Motoboys.jsx` (linha 29)
- **Quem cria:** `base44.entities.Courier.create(form)` — **DIRETO**
- **Quem lê:** `base44.entities.Courier.list` (direto)
- **Eventos/ReadBack/Recovery/Audit:** ❌ NENHUM
- **Status:** 🔴 **CRÍTICO — MÓDULO TOTALMENTE ISOLADO**
- **Impacto:** Motoboy cadastrado → nada mais no sistema sabe. Sem garantia de persistência.

---

### ENTIDADE: DBDocument (Documentos)
- **Tabela:** `DBDocument`
- **Arquivo:** `src/pages/Documentos.jsx`, `src/lib/documentCenter.js`, `src/lib/documentWorkflow.js`
- **Quem cria:** `documentWorkflow.resumeProcess` (linha 330) → `base44.entities.Payment.create` e `base44.entities.DBDocument.update` — **DIRETO**; upload via DocumentUpload
- **Quem atualiza:** `base44.entities.DBDocument.update` (linhas 357, 414) — **DIRETO**
- **Publica eventos:** ✅ `emitDocumentReceived`/`emitOCRCompleted` existem; Documentos.jsx pode publicar (confirmar)
- **Read-Back:** ✅ Parcial (documentWorkflow.createProcess faz read-back linha 144, transition linha 170)
- **Recovery:** ✅ Parcial (DocumentProcess tem recovery_attempts, recoverProcesses linha 427)
- **Auditoria:** ✅ `Core.audit` (linha 345)
- **Status:** 🟡 **PARCIAL**
- **Impacto CRÍTICO:** `resumeProcess` atualiza `Product.stock_quantity` e `Product.cost_price` **DIRETAMENTE** (linha 310) **bypassando `IE.processMovement`** → **nenhum registro de Movement é criado** → CMV (que lê Movement) não vê essa entrada → ABC/forecast/coverage quebram. **Quebra de fluxo documentada.**

### ENTIDADE: DocumentProcess (Workflow de Documentos)
- **Tabela:** `DocumentProcess`
- **Arquivo:** `src/lib/documentWorkflow.js`
- **Status:** 🟢 **CONFORME** (read-back + recovery + auditoria + máquina de estados persistente). Este é o segundo modelo a seguir (junto com EmployeeAdvance).

### ENTIDADE: CMVRecord / CMVGoal / IFoodReceipt (CMV)
- **Tabela:** `CMVRecord`, `CMVGoal`, `IFoodReceipt`
- **Arquivo:** `src/lib/cmvEngine.js` (CMV)
- **Quem cria:** `CMV.calculate` (linha 143) → `base44.entities.CMVRecord.create` — **DIRETO**
- **Quem atualiza:** `CMV.confirmIFood` (linha 519) → `base44.entities.IFoodReceipt.update` — **DIRETO**
- **Publica eventos:** ✅ `EventBus.publish` cmv_updated (linha 189)
- **Consome eventos:** ❌ Nenhum (CMV só calcula sob demanda/manual/ifood_import)
- **Read-Back:** ❌ Não
- **Recovery:** ❌ Não
- **Auditoria:** ✅ `Core.audit` (linhas 504, 549)
- **Status:** 🟡 **PARCIAL**
- **Impacto:** CMV é reativo (ninguém dispara recálculo automaticamente quando produção/estoque/venda mudam). Só recalcula por chamada manual ou import iFood. Deveria consumir `production_finished`, `stock_entry_created`, `sale_created` para recalcular em tempo real.

### ENTIDADE: EnterpriseProcess (Workflow genérico)
- **Tabela:** `EnterpriseProcess`
- **Quem cria:** `ActionEngine.execute` (linha 63) — usado só quando Baron IA executa. Telas NÃO usam ActionEngine.
- **Status:** 🟢 infraestrutura existe, mas subutilizada.

---

## MAPA DE DEPENDÊNCIAS (arquitetura real vs. ideal)

```
IDEAL (event-driven):
Funcionário ──create─▶ EventBus ──employee_created──▶ Folha, Financeiro, Dashboard, CEO AI
Vale ──create─▶ EventBus ──advance_created──▶ Financeiro (espelha) ✅ JÁ EXISTE
Produto ──create─▶ EventBus ──product_created──▶ Estoque(cria Stock), CMV, Compras
Estoque ──movement─▶ EventBus ──stock_entry──▶ CMV(recalc), Compras(sugere), Dashboard
Compra ──create─▶ EventBus ──purchase_created──▶ Estoque(aguarda), Financeiro(provisiona)
Produção ──finish─▶ EventBus ──production_finished──▶ CMV(recalc), DRE, Estoque(entrada)
Pagamento ──create─▶ EventBus ──payment_created──▶ Dashboard, DRE, Conciliação
Documento ──process─▶ EventBus ──document_processed──▶ Estoque, Financeiro, CMV

REAL (atual):
Funcionário ──create──▶ base44.DIRECT ──✕── ISOLADO
Vale ──create──▶ PersistenceEngine ──▶ EventBus ──advance_created──▶ Financeiro ✅
Produto ──create──▶ donBaronCore(read-back) ──✕── ISOLADO (sem evento)
Estoque ──movement──▶ IE ──▶ EventBus(stock_entry) ──✕── SEM CONSUMIDOR
Compra ──create──▶ base44.DIRECT (?) ──✕── ISOLADO
Produção ──finish──▶ PE ──✕── sem evento ──✕── ISOLADO
Pagamento ──create──▶ donBaronCore ──✕── ISOLADO (sem evento)
Documento ──resume──▶ base44.DIRECT(Product.update) ──✕── BYPASSA IE → Movement órfão
```

---

## MATRIZ DE CONFIABILIDADE

| Módulo | Create | Read | Update | Delete | Read-Back | EventBus(publish) | EventBus(consume) | Recovery | Auditoria | Status |
|--------|--------|------|--------|--------|-----------|-------------------|--------------------|----------|-----------|--------|
| RH-Employee | ❌ Direto | ✅ | ❌ Direto | ❌ Direto | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 Crítico |
| RH-Advance | ✅ Persist | ✅ | ✅ Persist | — | ✅ | ✅ | ✅ Sync | ✅ | ✅ | 🟢 OK |
| RH-Demais | ❌ Direto | ✅ | ❌ Direto | ❌ Direto | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 Crítico |
| Estoque | ✅ IE(direto) | ✅ | ✅ IE(direto) | — | ❌ | ✅ | ❌ | ❌ | ✅ Core.audit | 🟡 Parcial |
| Produção | ✅ PE(direto) | ✅ | ✅ PE(direto) | — | ❌ | ❌ | ❌ | ❌ | ✅ Core.audit | 🟡 Parcial |
| Compras | ? Direto | ✅ | ❌ Direto(score) | — | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 Crítico |
| Financeiro-Payment | ✅ DBCore | ✅ | ✅ DBCore | — | ✅ | ❌ | ✅(reactor vale) | ❌ | ✅ | 🟡 Parcial |
| Documentos | ✅+readback | ✅ | ✅+readback | — | ✅ | ✅? | ❌ | ✅ parcial | ✅ | 🟡 Parcial |
| CMV | ✅ Direto | ✅ | ✅ Direto | — | ❌ | ✅ | ❌ | ❌ | ✅ | 🟡 Parcial |
| Motoboys | ❌ Direto | ✅ | — | — | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 Crítico |
| Cadastro-Product | ✅ DBCore | ✅ | ✅ DBCore | — | ✅ | ❌ | ❌ | ❌ | ✅ SysLog | 🟡 Parcial |

---

## LISTA DE PROBLEMAS COM EVIDÊNCIAS

### 1. 📛 TRÊS camadas de gravação concorrentes
- **Arquivo:** `src/lib/donBaronCore.js` (Core.save), `src/core/PersistenceEngine.js`, `src/core/ActionEngine.js`
- **Fluxo:** Telas escolhem arbitrariamente qual usar — ou nenhuma (base44 direto).
- **Motivo técnico:** Ausência de enforcement. Não há um único ponto de entrada obrigatório.
- **Impacto:** Inconsistência de garantias (read-back sim/não, recovery sim/não, eventos sim/não).
- **Como reproduzir:** Criar um Payment (Core.save, sem recovery) vs. criar um Vale (PersistenceEngine, com recovery) — comportamentos diferentes para operações equivalentes.

### 2. 📛 EventBus helpers existem mas NÃO são chamados nas gravações
- **Arquivo:** `src/lib/eventBus.js` (linhas 68-87 definem `emitProductCreated`, `emitPaymentCreated`, `emitPurchaseCreated`, `emitProductionFinished`, etc.)
- **Onde deveriam ser chamados:** `ProductForm.jsx` (não chama), `ContasPagar.jsx` (não chama), `productionEngine.js` (não chama), `purchasingCenter.js` (não chama)
- **Motivo técnico:** Helpers definidos mas não integrados nos write paths.
- **Impacto:** Eventos definidos no catálogo mas nunca publicados → **zero sincronização event-driven**. Módulos isolados.
- **Como reproduzir:** Criar um produto e verificar no EventBus dashboard que nenhum `product_created` foi publicado.

### 3. 📛 EventBus não tem subscribers/reactores no frontend (exceto Vales)
- **Arquivo:** Buscar `SyncManager.onSync` ou `EventBus.subscribe` no código — só `Advances.jsx` (linha 34).
- **Motivo técnico:** Reactors não implementados. O backend `eventBus` function despacha mas não há consumers mapeados para `stock_entry_created`, `payment_created`, `production_finished`, `purchase_created`.
- **Impacto:** Mesmo que os eventos fossem publicados, ninguém os consumiria para sincronizar módulos.
- **Como reproduzir:** Publicar manualmente `payment_created` e observar que nada no sistema reage.

### 4. 📛 Erro de estoque silenciado (divergência Product × Stock)
- **Arquivo:** `src/lib/inventoryEngine.js` (linha 236)
- **Linha:** `await base44.entities.Product.update(productId, {...}).catch(() => {});`
- **Entidade:** Product.stock_quantity vs Stock.quantity
- **Motivo técnico:** `.catch(() => {})` engole erro. Sem read-back.
- **Impacto:** Se `Product.update` falhar, `Stock` já foi atualizado → **quantidades divergem silenciosamente**. Telas que leem `Product.stock_quantity` (Cadastro, Dashboard) mostram valor diferente de `Stock.quantity` (Estoque, ABC).
- **Como reproduzir:** Simular falha de rede no `Product.update` após `Stock.update` bem-sucedido. Recarregar Estoque vs Cadastro → números diferentes.

### 5. 📛 Documento retoma estoque DIRETO, bypassa IE.processMovement
- **Arquivo:** `src/lib/documentWorkflow.js` (linhas 308-315)
- **Linha:** `await base44.entities.Product.update(prod.id, { stock_quantity: newQty, cost_price: newCost, ... })`
- **Entidade:** Product (bypass de Movement)
- **Motivo técnico:** `resumeProcess` atualiza Product direto em vez de chamar `IE.processMovement`.
- **Impacto:** Entrada de nota fiscal NÃO cria Movement → **CMV (que soma Movement) não vê**, ABC/forecast/coverage não atualizam, auditoria de estoque perde rastreabilidade, custo médio não recalculado pelo IE (lógica de custo médio ponderado ignorada).
- **Como reproduzir:** Processar uma NF via Documentos → verificar que nenhum Movement foi criado → rodar CMV → custo não inclui a entrada.

### 6. 📛 RH (exceto Vales) grava direto sem nenhuma garantia
- **Arquivo:** `src/lib/hcmEngine.js` (linhas 17-19, 23-24, 28-29, 34-36, 41-42, 89, 94-95, 99-100, 104, 108-109)
- **Entidades:** Employee, Candidate, JobOpening, EmployeeDocument, TimeRecord, PerformanceReview, Training, CareerPlan, Recognition, Occurrence, Payroll
- **Motivo técnico:** CRUD direto em `base44.entities.X`.
- **Impacto:** Sem read-back, sem recovery, sem eventos, sem auditoria. Funcionário criado/demitido → nada reage.
- **Como reproduzir:** Cadastrar funcionário → verificar RecoveryOperation (vazio), SystemLog (vazio), EventBus (vazio).

### 7. 📛 Motoboys totalmente isolado
- **Arquivo:** `src/pages/Motoboys.jsx` (linha 29)
- **Linha:** `await base44.entities.Courier.create(form);`
- **Impacto:** Sem read-back, sem eventos, sem auditoria, sem recovery. Módulo órfão.

### 8. 📛 Três mecanismos de auditoria não unificados
- **Arquivos:** `src/lib/audit.js` (`logAudit` → AuditLog), `src/lib/donBaronCore.js` (`logToSystemLog` → SystemLog), `src/core/Logger.js` (`Logger.audit` → SystemLog)
- **Motivo técnico:** Três funções diferentes, gravando em tabelas diferentes (AuditLog vs SystemLog), com assinaturas diferentes.
- **Impacto:** Auditoria fragmentada. Para rastrear uma operação é preciso buscar em 2 tabelas com formatos diferentes.

### 9. 📛 donBaronCore não publica eventos nem usa RecoveryEngine
- **Arquivo:** `src/lib/donBaronCore.js`
- **Motivo técnico:** Tem read-back + SystemLog + transaction com rollback, mas **sem EventBus.publish e sem RecoveryEngine**.
- **Impacto:** Payment e Product (que usam donBaronCore) têm read-back mas não disparam eventos nem têm fila de recovery.

### 10. 📛 CMV é reativo, não event-driven
- **Arquivo:** `src/lib/cmvEngine.js`
- **Motivo técnico:** `CMV.calculate` só roda sob chamada manual ou `importIFood`. Não subscreve `production_finished`, `stock_entry_created`, `sale_created`.
- **Impacto:** CMV sempre defasado. Produção concluída não recalcula CMV automaticamente.

---

## ENTIDADES ÓRFÃS / ISOLADAS

| Entidade | Por que é órfã |
|----------|---------------|
| **Courier** | Nenhum módulo a referencia. Sem eventos, sem relações. |
| **Employee** (create) | Não publica evento → Folha/Financeiro/Dashboard não reagem. |
| **Product** (create) | Não publica `product_created` → Estoque não cria Stock, Compras não sabe. |
| **Movement** (quando via documentWorkflow) | Documento cria stock sem Movement → Movement órfão, CMV cego. |
| **Payroll** | Apenas lista, sem criação/eventos. |

---

## EVENTOS DEFINIDOS MAS NUNCA PUBLICADOS

| Evento | Helper existe | Quem deveria publicar | Publica? |
|--------|--------------|----------------------|----------|
| product_created | ✅ emitProductCreated | ProductForm | ❌ |
| product_updated | ✅ emitProductUpdated | ProductForm | ❌ |
| purchase_created | ✅ emitPurchaseCreated | PurchaseOrders | ❌ (confirmar) |
| purchase_confirmed | ✅ emitPurchaseConfirmed | PurchaseOrders | ❌ |
| payment_created | ✅ emitPaymentCreated | ContasPagar | ❌ |
| payment_confirmed | ✅ emitPaymentConfirmed | MarkAsPaidDialog | ❌ (confirmar) |
| production_finished | ✅ emitProductionFinished | productionEngine | ❌ |
| recipe_updated | ✅ emitRecipeUpdated | recipeEngine | ❌ (confirmar) |

## EVENTOS PUBLICADOS MAS SEM CONSUMIDOR (frontend)

| Evento | Publica | Consome? |
|--------|---------|----------|
| stock_entry_created | inventoryEngine ✅ | ❌ nenhum frontend |
| stock_exit_created | inventoryEngine ✅ | ❌ |
| cmv_updated | cmvEngine ✅ | ❌ |
| advance_created | hcmEngine ✅ | ✅ reactor Financeiro (backend) |

---

## GRAVAÇÕES DIRETAS (contornando toda a infraestrutura)

| Arquivo | Linha | Operação |
|---------|-------|----------|
| `src/pages/Motoboys.jsx` | 29 | `base44.entities.Courier.create` |
| `src/lib/hcmEngine.js` | 17,18,19,23,24,28,29,34,35,36,41,42,89,94,95,99,100,104,108,109 | `base44.entities.{Employee,Candidate,...}.create/update` |
| `src/lib/inventoryEngine.js` | 48,100,143,157,221,236 | `base44.entities.{Movement,Stock,Product}.create/update` |
| `src/lib/productionEngine.js` | 45,128,209,388,474 | `base44.entities.{ProductionRecord,Recipe}.create/update` |
| `src/lib/cmvEngine.js` | 143,483,519,538 | `base44.entities.{CMVRecord,IFoodReceipt,CMVGoal}.create/update` |
| `src/lib/purchasingCenter.js` | 252 | `base44.entities.Supplier.update` |
| `src/lib/documentWorkflow.js` | 117,162,310,330,388,400,410,414 | `base44.entities.{DocumentProcess,Product,Payment,DBDocument}.create/update` |

---

## LEITURAS INCORRETAS / TELAS LENDO ENTIDADE DIFERENTE DA GRAVADA

| Tela/Componente | Lê | Mas é gravado em | Divergência |
|----------------|-----|-------------------|-------------|
| Cadastro (Product) lê `Product.stock_quantity` | Product | Estoque atualiza `Stock.quantity` | 2 fontes de verdade, atualizadas independentemente |
| Dashboard financeiro (FinancialCenter) lê `Payment`/`Receipt` | Payment/Receipt | ContasPagar grava via donBaronCore | OK, mesma entidade — mas sem evento, dashboard só atualiza com refresh |
| CMV lê `Movement` para custo | Movement | documentWorkflow atualiza `Product` direto (sem Movement) | CMV não vê entradas vindas de documentos |

---

## FLUXOGRAMA DE WORKFLOWS

### DocumentProcess (✅ máquina de estados robusta)
```
RECEBIDO → OCR_CONCLUIDO → PRODUTOS_EXTRAIDOS
  → [sem produto] AGUARDANDO_CADASTRO_PRODUTO → (aprovar) → PRODUTO_CRIADO
  → [auto] PRODUTO_CRIADO → ESTOQUE_PROCESSADO → CMV_PROCESSADO
  → FINANCEIRO_PROCESSADO → DOCUMENTO_ARQUIVADO → CONCLUIDO
  → [erro] ERRO (recoverProcesses retoma)
```
**Quebra:** entre `PRODUTO_CRIADO` e `ESTOQUE_PROCESSADO`, atualiza Product direto (sem Movement) → estoque real (Stock entity) não atualiza.

### EnterpriseProcess (ActionEngine)
```
RECEBIDO → EXECUTANDO → [sucesso] CONCLUIDO / [erro] ERRO (pending)
```
**Status:** só usado pelo Baron IA. Telas não usam → workflows genéricos não rastreados.

---

## PLANO TÉCNICO DA REFACTORAÇÃO (FASE 2 — não executar ainda)

### Princípio: Uma única camada de Application Services

```
Interface (tela)
   ↓
Application Service (por módulo: ProductService, EmployeeService, StockService, PaymentService...)
   ↓
Validação (ValidationEngine)
   ↓
ActionEngine (permissão + workflow tracking)
   ↓
PersistenceEngine → RecoveryEngine (write → read-back → validate → commit)
   ↓
EventBus.publish (evento de domínio)
   ↓
Reactors (backend) consomem evento → atualizam módulos dependentes
   ↓
Audit Engine (unificado)
   ↓
Resposta CONFIRMADA à interface
```

### Passos:
1. **Unificar a camada de auditoria** — um único `AuditEngine` gravando em `SystemLog` (deprecate `logAudit`→AuditLog ou migre).
2. **Criar Application Services** por módulo (`src/services/*.js`) que encapsulem ActionEngine+PersistenceEngine+EventBus. Nenhuma tela importa `base44` diretamente.
3. **Migrar módulo a módulo** (RH → Estoque → Financeiro → Documentos → Produção → Compras → CMV → Motoboys).
4. **Conectar EventBus helpers** em TODOS os write paths (ProductForm → emitProductCreated, ContasPagar → emitPaymentCreated, PE → emitProductionFinished, etc.).
5. **Implementar reactors** no backend para cada evento → atualizar módulos dependentes automaticamente.
6. **Corrigir documentWorkflow** para chamar `IE.processMovement` em vez de `Product.update` direto.
7. **Eliminar gravação direta** — lint rule ou grep CI proibindo `base44.entities.X.create/update/delete` fora de `core/` e `services/`.
8. **Unificar Product.stock_quantity vs Stock.quantity** — Stock como fonte única de verdade; Product.stock_quantity torna-se derivado/ocache.
9. **Testes obrigatórios por módulo migrado** (criar, read-back, refresh, reabrir, sincronização, eventos, auditoria, recovery).

### Ordem de migração recomendada:
1. RH (funcionários + vales já migrados parcialmente) — completar Employee
2. Cadastro (Product, Supplier) — publicar eventos
3. Estoque — read-back no IE, remover `.catch(()=>{})`
4. Documentos — usar IE.processMovement no resumeProcess
5. Financeiro — publicar eventos no ContasPagar
6. Produção — publicar production_finished, read-back
7. Compras — publicar purchase_created
8. CMV — subscrever eventos para recálculo automático
9. Motoboys — migrar para camada enterprise

---

**AUDITORIA CONCLUÍDA.** Aguardando aprovação para iniciar a FASE 2 (refatoração).