import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // --- Financial summary ---
    const transactions = await svc.entities.FinancialTransaction.filter({});
    const contasPagar = (transactions || []).filter(t => t.type === 'a_pagar' && t.status === 'pendente');
    const contasReceber = (transactions || []).filter(t => t.type === 'a_receber' && t.status === 'pendente');
    const totalPagar = contasPagar.reduce((s, t) => s + (t.amount || 0), 0);
    const totalReceber = contasReceber.reduce((s, t) => s + (t.amount || 0), 0);
    const boletosHoje = contasPagar.filter(t => t.due_date === todayStr);
    const totalBoletosHoje = boletosHoje.reduce((s, t) => s + (t.amount || 0), 0);

    // --- Stock ---
    const products = await svc.entities.Product.filter({ active: true, controls_stock: true });
    const criticalStock = (products || []).filter(p => p.stock_quantity <= (p.min_quantity || 0));

    // --- Missions of the day ---
    const missions = await svc.entities.Mission.filter({});
    const todayMissions = (missions || []).filter(m =>
      m.end_date === todayStr && ['planejada', 'em_andamento'].includes(m.status)
    );

    // --- Pending purchases ---
    const purchases = await svc.entities.Purchase.filter({});
    const pendingPurchases = (purchases || []).filter(p => p.status === 'pendente_aprovacao');

    // --- Production yesterday ---
    const production = await svc.entities.ProductionRecord.filter({});
    const yesterdayProduction = (production || []).filter(p => p.production_date === yesterdayStr);

    // --- Compile summary ---
    const summary = {
      date: todayStr,
      financeiro: {
        contas_pagar: totalPagar,
        contas_receber: totalReceber,
        saldo_projetado: totalReceber - totalPagar,
        boletos_hoje: totalBoletosHoje,
        boletos_hoje_count: boletosHoje.length
      },
      estoque: {
        produtos_criticos: criticalStock.length,
        produtos_criticos_lista: criticalStock.slice(0, 5).map(p => p.name)
      },
      missoes: {
        do_dia: todayMissions.length,
        lista: todayMissions.map(m => m.name)
      },
      compras: {
        pendentes: pendingPurchases.length,
        lista: pendingPurchases.slice(0, 3).map(p => p.supplier)
      },
      producao: {
        ordens_ontem: yesterdayProduction.length,
        concluidas: yesterdayProduction.filter(p => p.status === 'concluida').length
      }
    };

    // --- AI recommendation ---
    let aiRecommendation = '';
    try {
      const llmResponse = await svc.integrations.Core.InvokeLLM({
        prompt: `Como assistente executivo do DON BARON OS, gere um resumo diario conciso para WhatsApp baseado nestes dados:\n\n${JSON.stringify(summary, null, 2)}\n\nFormate como mensagem de WhatsApp: use emojis moderadamente, secao por secao, maximo 200 palavras. Destaque o que precisa de atencao urgente.`,
        response_json_schema: {
          type: 'object',
          properties: { message: { type: 'string' } }
        }
      });
      aiRecommendation = llmResponse.message || '';
    } catch (e) {
      aiRecommendation = '';
    }

    // --- Create notification ---
    const formattedDate = todayStr.split('-').reverse().join('/');
    await svc.entities.Notification.create({
      title: `[WhatsApp] Resumo Executivo Diario - ${formattedDate}`,
      message: aiRecommendation || JSON.stringify(summary),
      category: 'info',
      module: 'whatsapp',
      metadata: { type: 'daily_summary', summary_data: summary }
    });

    return Response.json({ summary, ai_recommendation: aiRecommendation });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});