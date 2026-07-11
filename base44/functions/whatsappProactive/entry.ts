import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow admin from UI or service-role for scheduled calls
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin';
    } catch {}

    const svc = base44.asServiceRole;
    const alerts = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 1. Boletos vencendo (próximos 3 dias + vencidos ontem)
    const transactions = await svc.entities.FinancialTransaction.filter({
      type: 'a_pagar',
      status: 'pendente'
    });
    const upcomingBoletos = (transactions || []).filter(t => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      const diff = (due - today) / (1000 * 60 * 60 * 24);
      return diff >= -1 && diff <= 3;
    });
    if (upcomingBoletos.length > 0) {
      const total = upcomingBoletos.reduce((s, t) => s + (t.amount || 0), 0);
      alerts.push({
        type: 'boletos_vencendo',
        severity: 'alta',
        title: `${upcomingBoletos.length} boleto(s) vencendo`,
        message: `Total: R$ ${total.toFixed(2)}. ${upcomingBoletos.map(t => `${t.description} (${t.due_date})`).slice(0, 5).join(', ')}`
      });
    }

    // 2. Estoque crítico
    const products = await svc.entities.Product.filter({ active: true, controls_stock: true });
    const criticalStock = (products || []).filter(p => p.stock_quantity <= (p.min_quantity || 0));
    if (criticalStock.length > 0) {
      alerts.push({
        type: 'estoque_critico',
        severity: 'critica',
        title: `${criticalStock.length} produto(s) com estoque crítico`,
        message: criticalStock.slice(0, 5).map(p => `${p.name}: ${p.stock_quantity} (mín: ${p.min_quantity})`).join(', ')
      });
    }

    // 3. Fluxo de caixa negativo (mês atual)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const paidThisMonth = (transactions || []).filter(t =>
      t.status === 'pago' && t.payment_date && new Date(t.payment_date) >= monthStart
    );
    const receivedThisMonth = (transactions || []).filter(t =>
      t.status === 'recebido' && t.payment_date && new Date(t.payment_date) >= monthStart
    );
    const totalPaid = paidThisMonth.reduce((s, t) => s + (t.amount || 0), 0);
    const totalReceived = receivedThisMonth.reduce((s, t) => s + (t.amount || 0), 0);
    if (totalPaid > totalReceived) {
      alerts.push({
        type: 'fluxo_caixa_negativo',
        severity: 'critica',
        title: 'Fluxo de caixa negativo no mês',
        message: `Receitas: R$ ${totalReceived.toFixed(2)} | Despesas: R$ ${totalPaid.toFixed(2)} | Déficit: R$ ${(totalPaid - totalReceived).toFixed(2)}`
      });
    }

    // 4. Fornecedor atrasado
    const purchases = await svc.entities.Purchase.filter({});
    const delayedDeliveries = (purchases || []).filter(p => {
      if (!p.expected_delivery_date) return false;
      if (['recebida', 'conferida', 'cancelada'].includes(p.status)) return false;
      return new Date(p.expected_delivery_date) < today;
    });
    if (delayedDeliveries.length > 0) {
      alerts.push({
        type: 'fornecedor_atrasado',
        severity: 'alta',
        title: `${delayedDeliveries.length} entrega(s) atrasada(s)`,
        message: delayedDeliveries.slice(0, 5).map(p => `${p.supplier}: ${p.description || 'Pedido'} (previsto: ${p.expected_delivery_date})`).join(', ')
      });
    }

    // 5. Compras pendentes de aprovação
    const pendingPurchases = (purchases || []).filter(p => p.status === 'pendente_aprovacao');
    if (pendingPurchases.length > 0) {
      alerts.push({
        type: 'compras_pendentes',
        severity: 'media',
        title: `${pendingPurchases.length} compra(s) aguardando aprovação`,
        message: pendingPurchases.slice(0, 5).map(p => `${p.supplier}: R$ ${(p.total_amount || 0).toFixed(2)}`).join(', ')
      });
    }

    // 6. Missões críticas
    const missions = await svc.entities.Mission.filter({ priority: 'critica' });
    const activeMissions = (missions || []).filter(m => ['planejada', 'em_andamento'].includes(m.status));
    if (activeMissions.length > 0) {
      alerts.push({
        type: 'missoes_criticas',
        severity: 'alta',
        title: `${activeMissions.length} missão(ões) crítica(s) ativa(s)`,
        message: activeMissions.slice(0, 5).map(m => `${m.name} (${m.status}, ${m.progress_pct || 0}%)`).join(', ')
      });
    }

    // Create notifications for each alert
    for (const alert of alerts) {
      await svc.entities.Notification.create({
        title: `[WhatsApp] ${alert.title}`,
        message: alert.message,
        category: alert.severity === 'critica' ? 'urgent' : 'warning',
        module: 'whatsapp',
        metadata: { alert_type: alert.type, severity: alert.severity, source: 'whatsapp_proactive' }
      });
    }

    return Response.json({
      alerts,
      total: alerts.length,
      checked_at: todayStr,
      triggered_by: isAdmin ? 'admin_manual' : 'scheduled'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});