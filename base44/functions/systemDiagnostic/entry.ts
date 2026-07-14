import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = base44.asServiceRole;
    const stamp = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const userName = user.full_name || user.email || 'Sistema';

    // ===== FASE 1: MAPEAMENTO DE TODAS AS TABELAS =====
    const allEntities = [
      'Product', 'Stock', 'Inventory', 'Movement', 'Purchase', 'PurchaseRequest',
      'Quotation', 'ProductionRecord', 'Recipe', 'Payment', 'FinancialTransaction',
      'Receipt', 'DBDocument', 'Employee', 'Courier', 'Sale', 'Customer', 'Supplier',
      'AuditLog', 'Mission', 'Category', 'Tag', 'CMVRecord', 'CMVGoal', 'PriceHistory',
      'FinancialAccount', 'CostCenter', 'FinancialCategory', 'Ingredient', 'Indicator',
      'Notification', 'Conciliation', 'KPIRecord', 'IFoodReceipt', 'UnitOfMeasure',
      'WhatsAppConnection', 'WhatsAppConfig', 'WhatsAppLog', 'WhatsAppMessage',
      'AutomationConfig', 'SystemEvent', 'Company', 'Occurrence', 'Recognition',
      'TimeRecord', 'EmployeeAdvance', 'CareerPlan', 'PerformanceReview',
      'EmployeeDocument', 'JobOpening', 'Training', 'MissionChecklist', 'Candidate',
      'MissionTask', 'DigitalWorker', 'WorkerAlert', 'WorkerActivity',
      'BaronAIHistory', 'BaronAILearning', 'AgentConversation', 'AgentMessage',
      'Module', 'AgentMemory', 'HealthCheck', 'AgentLearning', 'Agent', 'AgentAlert',
      'ServiceRegistry', 'TimelineEntry', 'DataSnapshot', 'WorkflowDefinition',
      'WorkflowApproval', 'WorkflowProcess', 'Payroll', 'AIMemory', 'Decision',
      'SystemTask', 'Permission', 'TechLog', 'FileRecord', 'SystemConfig',
      'License', 'MaintenanceWindow', 'TelemetryRecord', 'Integration',
      'IntegrationLog', 'IntegrationQueueItem', 'DataMapping', 'Webhook',
      'DataQualityAlert', 'Scenario', 'OKR', 'StrategicProject', 'Goal',
      'StrategicPlan', 'BudgetItem', 'RoadmapItem', 'Role'
    ];

    const tableMap = [];
    for (const entityName of allEntities) {
      try {
        const records = await admin.entities[entityName].list('-created_date', 1000);
        const lastUpdate = records.length > 0 ? (records[0].updated_date || records[0].created_date) : null;
        tableMap.push({
          entity: entityName,
          recordCount: records.length,
          primaryKey: 'id',
          lastUpdate,
          accessible: true
        });
      } catch (e) {
        tableMap.push({
          entity: entityName,
          recordCount: 0,
          primaryKey: 'id',
          lastUpdate: null,
          accessible: false,
          error: e.message
        });
      }
    }

    // ===== FASE 2: TESTE CRUD COMPLETO EM TODOS OS 16 MÓDULOS =====
    const moduleTests = [
      { module: 'Produtos', entity: 'Product', create: { name: 'DIAG_' + stamp, status: 'ativo' }, updateField: 'notes', updateValue: 'DIAG_UPDATED' },
      { module: 'Estoque', entity: 'Stock', create: { product_id: 'DIAG_' + stamp, product_name: 'DIAG_TEST', status: 'ativo' }, updateField: 'physical_location', updateValue: 'DIAG_LOC' },
      { module: 'Movimentações', entity: 'Movement', create: { movement_type: 'ajuste', product_id: 'DIAG_' + stamp, product_name: 'DIAG_TEST', status: 'ativo' }, updateField: 'notes', updateValue: 'DIAG_UPDATED' },
      { module: 'Compras', entity: 'Purchase', create: { supplier: 'DIAG_TEST', status: 'rascunho' }, updateField: 'notes', updateValue: 'DIAG_UPDATED' },
      { module: 'Produção', entity: 'ProductionRecord', create: { item: 'DIAG_TEST', status: 'planejada' }, updateField: 'notes', updateValue: 'DIAG_UPDATED' },
      { module: 'Receitas', entity: 'Recipe', create: { name: 'DIAG_' + stamp, status: 'ativo' }, updateField: 'description', updateValue: 'DIAG_UPDATED' },
      { module: 'Boletos', entity: 'Payment', create: { description: 'DIAG_TEST', amount: 0.01, status: 'pendente' }, updateField: 'notes', updateValue: 'DIAG_UPDATED' },
      { module: 'Financeiro', entity: 'FinancialTransaction', create: { description: 'DIAG_TEST', amount: 0.01, type: 'a_pagar', status: 'pendente' }, updateField: 'notes', updateValue: 'DIAG_UPDATED' },
      { module: 'Contas a Receber', entity: 'Receipt', create: { description: 'DIAG_TEST', amount: 0.01, status: 'pendente' }, updateField: 'notes', updateValue: 'DIAG_UPDATED' },
      { module: 'Fornecedores', entity: 'Supplier', create: { name: 'DIAG_' + stamp, status: 'ativo' }, updateField: 'notes', updateValue: 'DIAG_UPDATED' },
      { module: 'Documentos', entity: 'DBDocument', create: { title: 'DIAG_' + stamp, category: 'outros', status: 'recebido' }, updateField: 'notes', updateValue: 'DIAG_UPDATED' },
      { module: 'Clientes', entity: 'Customer', create: { name: 'DIAG_' + stamp, status: 'ativo' }, updateField: 'notes', updateValue: 'DIAG_UPDATED' },
      { module: 'Motoboys', entity: 'Courier', create: { full_name: 'DIAG TEST', status: 'ativo' }, updateField: 'short_name', updateValue: 'DIAG_UP' },
      { module: 'Pedidos', entity: 'Sale', create: { sale_date: today, status: 'pendente' }, updateField: 'notes', updateValue: 'DIAG_UPDATED' },
      { module: 'RH', entity: 'Employee', create: { full_name: 'DIAG TEST', status: 'ativo' }, updateField: 'notes', updateValue: 'DIAG_UPDATED' },
      { module: 'Intelligence', entity: 'KPIRecord', create: { name: 'DIAG_TEST', category: 'financeiro', value: 1, source: 'manual' }, updateField: 'name', updateValue: 'DIAG_UPDATED_KPI' },
    ];

    const crudResults = [];
    const allErrors = [];

    for (const test of moduleTests) {
      const start = Date.now();
      const steps = [];
      let testId = null;
      let passed = true;

      try {
        // STEP 1: CREATE
        const created = await admin.entities[test.entity].create(test.create);
        testId = created.id;
        if (!testId) throw new Error('CREATE: Banco não retornou ID');
        steps.push({ step: 'create', status: 'ok', id: testId });

        // STEP 2: READ-BACK
        const read1 = await admin.entities[test.entity].get(testId);
        if (!read1) throw new Error('READ: Registro não encontrado após create');
        // Verify fields
        for (const key of Object.keys(test.create)) {
          if (read1[key] !== test.create[key]) {
            throw new Error(`READ: Campo "${key}" diverge — esperado=${test.create[key]}, retornado=${read1[key]}`);
          }
        }
        steps.push({ step: 'read_after_create', status: 'ok', verified: true });

        // STEP 3: UPDATE
        const updateData = { [test.updateField]: test.updateValue };
        await admin.entities[test.entity].update(testId, updateData);
        steps.push({ step: 'update', status: 'ok' });

        // STEP 4: READ-BACK after update
        const read2 = await admin.entities[test.entity].get(testId);
        if (!read2) throw new Error('READ: Registro não encontrado após update');
        if (read2[test.updateField] !== test.updateValue) {
          throw new Error(`READ: Update não persistiu — ${test.updateField} esperado=${test.updateValue}, retornado=${read2[test.updateField]}`);
        }
        steps.push({ step: 'read_after_update', status: 'ok', verified: true });

        // STEP 5: DELETE
        await admin.entities[test.entity].delete(testId);
        steps.push({ step: 'delete', status: 'ok' });

        // STEP 6: CONFIRM deletion
        let stillExists = false;
        try {
          const check = await admin.entities[test.entity].get(testId);
          if (check) stillExists = true;
        } catch {}
        if (stillExists) throw new Error('DELETE: Registro ainda existe após exclusão');
        steps.push({ step: 'confirm_delete', status: 'ok' });

      } catch (e) {
        passed = false;
        steps.push({ step: 'error', status: 'error', error: e.message });
        allErrors.push({ module: test.module, entity: test.entity, error: e.message });
        // Cleanup
        if (testId) { try { await admin.entities[test.entity].delete(testId); } catch {} }
      }

      const elapsed = Date.now() - start;
      crudResults.push({
        module: test.module,
        entity: test.entity,
        passed,
        elapsedMs: elapsed,
        steps
      });
    }

    // ===== FASE 7: TESTE DE RELACIONAMENTO (Product → Stock → Movement) =====
    let relationshipTest = { passed: false, steps: [] };
    try {
      // Create Product
      const product = await admin.entities.Product.create({ name: 'REL_' + stamp, status: 'ativo' });
      // Create Stock referencing Product
      const stock = await admin.entities.Stock.create({ product_id: product.id, product_name: product.name, status: 'ativo' });
      // Create Movement referencing Product
      const movement = await admin.entities.Movement.create({ movement_type: 'entrada', product_id: product.id, product_name: product.name, status: 'ativo' });

      // Verify relationships
      const stockCheck = await admin.entities.Stock.get(stock.id);
      const movementCheck = await admin.entities.Movement.get(movement.id);
      const relOk = stockCheck?.product_id === product.id && movementCheck?.product_id === product.id;
      relationshipTest = {
        passed: relOk,
        steps: [
          { step: 'create_product', status: 'ok', id: product.id },
          { step: 'create_stock_with_product_id', status: 'ok', id: stock.id, links: stockCheck?.product_id === product.id },
          { step: 'create_movement_with_product_id', status: 'ok', id: movement.id, links: movementCheck?.product_id === product.id },
        ]
      };
      if (!relOk) allErrors.push({ module: 'Relacionamentos', error: 'Falha na integridade de relacionamento' });

      // Cleanup
      await admin.entities.Movement.delete(movement.id);
      await admin.entities.Stock.delete(stock.id);
      await admin.entities.Product.delete(product.id);
    } catch (e) {
      relationshipTest = { passed: false, steps: [{ step: 'error', error: e.message }] };
      allErrors.push({ module: 'Relacionamentos', error: e.message });
    }

    // ===== FASE 4: SALVAR RELATÓRIO NO AUDITLOG =====
    const totalPassed = crudResults.filter(r => r.passed).length;
    const overallStatus = allErrors.length === 0 ? 'ok' : allErrors.length <= 2 ? 'warning' : 'critical';

    const report = {
      timestamp: new Date().toISOString(),
      user: { name: userName, email: user.email },
      overallStatus,
      databaseConnected: true,
      summary: {
        totalTables: allEntities.length,
        accessibleTables: tableMap.filter(t => t.accessible).length,
        totalRecords: tableMap.reduce((s, t) => s + t.recordCount, 0),
        modulesTested: moduleTests.length,
        modulesPassed: totalPassed,
        modulesFailed: moduleTests.length - totalPassed,
        relationshipTestPassed: relationshipTest.passed,
        totalErrors: allErrors.length,
      },
      tableMap,
      crudResults,
      relationshipTest,
      errors: allErrors
    };

    try {
      await admin.entities.AuditLog.create({
        user_name: userName,
        user_email: user.email,
        module: 'diagnostico',
        action: 'diagnostic_full_report',
        entity_type: 'System',
        operation: 'other',
        origin: 'backend',
        details: JSON.stringify(report).slice(0, 9000),
      });
    } catch {}

    // Buscar últimos logs
    let recentAuditLogs = [];
    try { recentAuditLogs = await admin.entities.AuditLog.list('-created_date', 20); } catch {}

    const avgCrudTime = crudResults.length > 0
      ? Math.round(crudResults.reduce((a, r) => a + r.elapsedMs, 0) / crudResults.length)
      : 0;

    return Response.json({
      ...report,
      summary: {
        ...report.summary,
        avgCrudTimeMs: avgCrudTime
      },
      recentAuditLogs: recentAuditLogs.map(l => ({
        id: l.id,
        created_date: l.created_date,
        user_name: l.user_name,
        action: l.action,
        module: l.module,
        entity_type: l.entity_type,
        details: l.details?.slice(0, 200)
      }))
    });
  } catch (error) {
    return Response.json({
      error: error.message,
      databaseConnected: false,
      overallStatus: 'critical',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});