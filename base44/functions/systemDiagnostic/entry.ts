import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = base44.asServiceRole;
    const stamp = Date.now();
    const userName = user.full_name || user.email || 'Sistema';

    // Entidades para teste de LEITURA (todas as críticas)
    const readEntities = [
      'Product', 'Stock', 'Inventory', 'Movement', 'Purchase', 'PurchaseRequest',
      'Quotation', 'ProductionRecord', 'Recipe', 'Payment', 'FinancialTransaction',
      'DBDocument', 'Employee', 'Courier', 'Sale', 'Customer', 'Supplier',
      'AuditLog', 'Mission', 'Category', 'Tag', 'CMVRecord', 'PriceHistory',
      'FinancialAccount', 'CostCenter', 'FinancialCategory', 'Ingredient',
      'Indicator', 'Notification', 'Conciliation', 'KPIRecord', 'IFoodReceipt'
    ];

    // Entidades para teste de ESCRITA (create → read-back → verify → delete)
    const writeEntities = {
      'Product': { name: 'DIAG_' + stamp, status: 'ativo' },
      'Supplier': { name: 'DIAG_' + stamp, status: 'ativo' },
      'FinancialTransaction': { description: 'DIAG_TEST', amount: 0.01, type: 'a_pagar', status: 'pendente' },
      'Payment': { description: 'DIAG_TEST', amount: 0.01, status: 'pendente' },
      'DBDocument': { title: 'DIAG_' + stamp, category: 'outros', status: 'recebido' },
      'Employee': { full_name: 'DIAG TEST', status: 'ativo' },
      'Courier': { full_name: 'DIAG TEST', status: 'ativo' },
      'Purchase': { supplier: 'DIAG_TEST', status: 'rascunho' },
      'Stock': { product_id: 'DIAG_' + stamp, status: 'ativo' },
      'ProductionRecord': { item: 'DIAG_TEST', status: 'planejada' },
      'Recipe': { name: 'DIAG_' + stamp, status: 'ativo' },
      'Sale': { sale_date: new Date().toISOString().slice(0, 10), status: 'pendente' },
      'Customer': { name: 'DIAG_' + stamp, status: 'ativo' },
      'Movement': { movement_type: 'ajuste', product_id: 'DIAG_' + stamp, status: 'ativo' },
      'AuditLog': { action: 'diagnostic_test', entity_type: 'System', operation: 'other' }
    };

    const readResults = [];
    const writeResults = [];
    const allErrors = [];

    // ETAPA 1: Teste de leitura
    for (const entityName of readEntities) {
      const start = Date.now();
      try {
        const records = await admin.entities[entityName].list('-created_date', 1000);
        const readTimeMs = Date.now() - start;
        readResults.push({
          entity: entityName,
          status: 'ok',
          recordCount: records.length,
          readTimeMs,
          hasMore: records.length >= 1000
        });
      } catch (e) {
        const readTimeMs = Date.now() - start;
        readResults.push({
          entity: entityName,
          status: 'error',
          recordCount: 0,
          readTimeMs,
          error: e.message
        });
        allErrors.push({ entity: entityName, phase: 'read', error: e.message });
      }
    }

    // ETAPA 2: Teste de escrita completa (create → read-back → verify → delete)
    for (const [entityName, testData] of Object.entries(writeEntities)) {
      const start = Date.now();
      let createdId = null;
      try {
        // CREATE
        const created = await admin.entities[entityName].create(testData);
        createdId = created.id;
        if (!createdId) throw new Error('Banco não retornou ID após create');

        // READ-BACK
        const readBack = await admin.entities[entityName].get(createdId);
        if (!readBack) throw new Error('Registro não encontrado após gravação (get retornou null)');

        // VERIFY
        let verified = true;
        const mismatches = [];
        for (const key of Object.keys(testData)) {
          if (readBack[key] !== testData[key]) {
            verified = false;
            mismatches.push({ field: key, expected: testData[key], actual: readBack[key] });
          }
        }

        // DELETE (cleanup)
        await admin.entities[entityName].delete(createdId);

        const writeTimeMs = Date.now() - start;
        writeResults.push({
          entity: entityName,
          status: verified ? 'ok' : 'mismatch',
          writeTimeMs,
          testId: createdId,
          verified,
          mismatches
        });

        // AUDIT LOG
        try {
          await admin.entities.AuditLog.create({
            user_name: userName,
            user_email: user.email,
            module: 'diagnostico',
            action: 'diagnostic_write_test',
            entity_type: entityName,
            entity_id: createdId,
            operation: 'other',
            origin: 'backend',
            details: verified ? 'Persistência OK — create, read-back e delete confirmados' : 'Mismatch detectado'
          });
        } catch {}
      } catch (e) {
        const writeTimeMs = Date.now() - start;
        writeResults.push({
          entity: entityName,
          status: 'error',
          writeTimeMs,
          testId: createdId,
          error: e.message
        });
        allErrors.push({ entity: entityName, phase: 'write', error: e.message });
        // Tentar cleanup
        if (createdId) {
          try { await admin.entities[entityName].delete(createdId); } catch {}
        }
      }
    }

    // Buscar últimos logs de auditoria
    let recentAuditLogs = [];
    try {
      recentAuditLogs = await admin.entities.AuditLog.list('-created_date', 20);
    } catch {}

    // Buscar último erro registrado
    let lastError = null;
    try {
      const errorLogs = await admin.entities.AuditLog.filter({ module: 'diagnostico' }, '-created_date', 1);
      if (errorLogs.length > 0 && errorLogs[0].details?.includes('Mismatch')) {
        lastError = errorLogs[0];
      }
    } catch {}

    const totalWriteTests = writeResults.length;
    const writeOk = writeResults.filter(r => r.status === 'ok').length;
    const readOk = readResults.filter(r => r.status === 'ok').length;

    const overallStatus = allErrors.length === 0
      ? 'ok'
      : allErrors.length <= 3 ? 'warning' : 'critical';

    const avgWriteTime = writeResults.length > 0
      ? Math.round(writeResults.reduce((a, r) => a + (r.writeTimeMs || 0), 0) / writeResults.length)
      : 0;
    const avgReadTime = readResults.length > 0
      ? Math.round(readResults.reduce((a, r) => a + (r.readTimeMs || 0), 0) / readResults.length)
      : 0;

    return Response.json({
      timestamp: new Date().toISOString(),
      overallStatus,
      databaseConnected: true,
      user: { name: userName, email: user.email },
      summary: {
        totalEntities: readEntities.length,
        readOk,
        readFailed: readResults.length - readOk,
        writeTested: totalWriteTests,
        writeOk,
        writeFailed: totalWriteTests - writeOk,
        avgReadTimeMs: avgReadTime,
        avgWriteTimeMs: avgWriteTime,
        totalErrors: allErrors.length
      },
      readResults,
      writeResults,
      recentAuditLogs: recentAuditLogs.map(l => ({
        id: l.id,
        created_date: l.created_date,
        user_name: l.user_name,
        module: l.module,
        action: l.action,
        entity_type: l.entity_type,
        entity_id: l.entity_id,
        details: l.details
      })),
      errors: allErrors
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