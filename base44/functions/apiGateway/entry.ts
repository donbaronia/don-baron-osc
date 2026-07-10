import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const INTEGRATION_CATALOG = [
  { type: 'ifood', name: 'iFood', category: 'delivery', direction: 'both', base_url: 'https://api.ifood.com.br' },
  { type: 'saipos', name: 'Saipos', category: 'delivery', direction: 'both', base_url: 'https://api.saipos.com' },
  { type: 'cardapio_web', name: 'Cardápio Web', category: 'delivery', direction: 'both' },
  { type: 'mercado_pago', name: 'Mercado Pago', category: 'payment', direction: 'both', base_url: 'https://api.mercadopago.com' },
  { type: 'stone', name: 'Stone', category: 'payment', direction: 'both', base_url: 'https://api.morganite.com.br' },
  { type: 'pagseguro', name: 'PagSeguro', category: 'payment', direction: 'both', base_url: 'https://api.pagseguro.com' },
  { type: 'pix', name: 'PIX', category: 'payment', direction: 'both' },
  { type: 'whatsapp_business', name: 'WhatsApp Business API', category: 'messaging', direction: 'both', base_url: 'https://graph.facebook.com' },
  { type: 'google_drive', name: 'Google Drive', category: 'storage', direction: 'both', base_url: 'https://www.googleapis.com/drive' },
  { type: 'dropbox', name: 'Dropbox', category: 'storage', direction: 'both', base_url: 'https://api.dropboxapi.com' },
  { type: 'one_drive', name: 'OneDrive', category: 'storage', direction: 'both', base_url: 'https://graph.microsoft.com' },
  { type: 'google_calendar', name: 'Google Calendar', category: 'calendar', direction: 'both', base_url: 'https://www.googleapis.com/calendar' },
  { type: 'outlook', name: 'Outlook', category: 'calendar', direction: 'both', base_url: 'https://graph.microsoft.com' },
  { type: 'gmail', name: 'Gmail', category: 'email', direction: 'both', base_url: 'https://gmail.googleapis.com' },
  { type: 'open_finance', name: 'Open Finance', category: 'finance', direction: 'inbound' },
  { type: 'power_bi', name: 'Power BI', category: 'analytics', direction: 'outbound', base_url: 'https://api.powerbi.com' },
  { type: 'meta_ads', name: 'Meta Ads', category: 'ads', direction: 'both', base_url: 'https://graph.facebook.com' },
  { type: 'google_ads', name: 'Google Ads', category: 'ads', direction: 'both', base_url: 'https://googleads.googleapis.com' },
  { type: 'nfc_e', name: 'NFC-e', category: 'fiscal', direction: 'outbound' },
  { type: 'nf_e', name: 'NF-e', category: 'fiscal', direction: 'outbound' },
  { type: 'sped', name: 'SPED', category: 'fiscal', direction: 'outbound' },
  { type: 'custom_api', name: 'API Própria', category: 'custom', direction: 'both' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;
    const companyId = user.company_id || '';

    const publishEvent = async (eventType, module, entityType, entityId, payload) => {
      try {
        await base44.asServiceRole.functions.invoke('eventBus', {
          action: 'publish',
          event_type: eventType,
          module,
          entity_type: entityType,
          entity_id: entityId,
          payload,
          user_name: user.full_name,
          user_email: user.email,
        });
      } catch (_) { /* EventBus indisponível não bloqueia o Gateway */ }
    };

    switch (action) {
      case 'getCatalog': {
        return Response.json({ catalog: INTEGRATION_CATALOG });
      }

      case 'getDashboard': {
        const [integrations, logs, webhooks, queue] = await Promise.all([
          base44.asServiceRole.entities.Integration.filter({ company_id: companyId }, '-created_date', 200),
          base44.asServiceRole.entities.IntegrationLog.filter({ company_id: companyId }, '-created_date', 100),
          base44.asServiceRole.entities.Webhook.filter({ company_id: companyId }, '-created_date', 50),
          base44.asServiceRole.entities.IntegrationQueueItem.filter({ company_id: companyId, status: { $in: ['pending', 'failed', 'dead_letter'] } }, '-created_date', 100)
        ]);

        const active = integrations.filter(i => i.status === 'ativo');
        const withError = integrations.filter(i => i.status === 'erro');
        const sandbox = integrations.filter(i => i.status === 'sandbox');
        const inactive = integrations.filter(i => i.status === 'inativo');

        const totalCalls = integrations.reduce((s, i) => s + (i.total_calls || 0), 0);
        const totalErrors = integrations.reduce((s, i) => s + (i.total_errors || 0), 0);
        const eventsSent = integrations.reduce((s, i) => s + (i.events_sent || 0), 0);
        const eventsReceived = integrations.reduce((s, i) => s + (i.events_received || 0), 0);

        const avgResponseTime = totalCalls > 0
          ? Math.round(integrations.reduce((s, i) => s + (i.avg_response_time_ms || 0) * (i.total_calls || 0), 0) / totalCalls)
          : 0;

        const failedLogs = logs.filter(l => (l.response_status >= 400) || l.error);
        const queuePending = queue.filter(q => q.status === 'pending').length;
        const queueFailed = queue.filter(q => q.status === 'failed').length;
        const queueDead = queue.filter(q => q.status === 'dead_letter').length;

        return Response.json({
          metrics: {
            total_integrations: integrations.length,
            active: active.length,
            inactive: inactive.length,
            with_error: withError.length,
            sandbox: sandbox.length,
            total_calls: totalCalls,
            total_errors: totalErrors,
            error_rate: totalCalls > 0 ? Math.round((totalErrors / totalCalls) * 100) : 0,
            events_sent: eventsSent,
            events_received: eventsReceived,
            avg_response_time_ms: avgResponseTime,
            queue_pending: queuePending,
            queue_failed: queueFailed,
            queue_dead: queueDead,
            recent_logs: logs.length,
            failed_logs: failedLogs.length,
            recent_webhooks: webhooks.length,
          },
          integrations,
          recent_logs: logs.slice(0, 20),
          recent_webhooks: webhooks.slice(0, 10),
          queue_items: queue.slice(0, 20),
          catalog: INTEGRATION_CATALOG,
        });
      }

      case 'listIntegrations': {
        const { status, category } = body;
        const query = { company_id: companyId };
        if (status) query.status = status;
        if (category) query.category = category;
        const items = await base44.asServiceRole.entities.Integration.filter(query, '-created_date', 200);
        return Response.json({ items, catalog: INTEGRATION_CATALOG });
      }

      case 'createIntegration': {
        const data = body.data;
        data.company_id = companyId;
        data.total_calls = 0;
        data.total_errors = 0;
        data.events_sent = 0;
        data.events_received = 0;
        data.avg_response_time_ms = 0;
        data.rate_usage = { current_min: 0, current_hour: 0, current_day: 0, last_reset: new Date().toISOString(), exceeded_count: 0 };

        // Gerar webhook URL e secret se inbound
        if (data.direction === 'inbound' || data.direction === 'both') {
          const webhookId = crypto.randomUUID();
          data.webhook_url = `/webhooks/${data.integration_type}/${webhookId}`;
          data.webhook_secret = crypto.randomUUID().replace(/-/g, '');
        }

        const item = await base44.asServiceRole.entities.Integration.create(data);

        await publishEvent('integration_created', 'integracoes', 'Integration', item.id, { name: data.name, type: data.integration_type });

        return Response.json({ item });
      }

      case 'updateIntegration': {
        const { id, data } = body;
        const item = await base44.asServiceRole.entities.Integration.update(id, data);

        await publishEvent('integration_updated', 'integracoes', 'Integration', id, data);

        return Response.json({ item });
      }

      case 'deleteIntegration': {
        const { id } = body;
        await base44.asServiceRole.entities.Integration.update(id, {
          deleted_at: new Date().toISOString(),
          deleted_by: user.email,
          status: 'inativo',
          active: false
        });
        return Response.json({ success: true });
      }

      case 'testIntegration': {
        const { id } = body;
        const integration = await base44.asServiceRole.entities.Integration.get(id);
        if (!integration) return Response.json({ error: 'Integration not found' }, { status: 404 });

        const baseUrl = integration.sandbox_mode
          ? (integration.sandbox_config?.base_url || integration.provider_config?.base_url)
          : integration.provider_config?.base_url;

        if (!baseUrl) {
          return Response.json({ test: { success: false, error: 'No base URL configured' } });
        }

        const startTime = Date.now();
        let testResult = { success: false, response: null, error: null, duration_ms: 0 };

        try {
          const response = await fetch(baseUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000)
          });
          testResult.success = response.ok;
          testResult.response = { status: response.status, status_text: response.statusText };
          testResult.duration_ms = Date.now() - startTime;
        } catch (error) {
          testResult.error = error.message;
          testResult.duration_ms = Date.now() - startTime;
        }

        await base44.asServiceRole.entities.IntegrationLog.create({
          company_id: companyId,
          integration_id: id,
          integration_name: integration.name,
          direction: 'outbound',
          origin: 'sandbox',
          method: 'GET',
          endpoint: baseUrl,
          request_payload: {},
          response_status: testResult.response?.status || 0,
          response_payload: JSON.stringify(testResult.response || { error: testResult.error }),
          duration_ms: testResult.duration_ms,
          user_name: user.full_name,
          user_email: user.email,
          error: testResult.error,
          sandbox: true,
          timestamp: new Date().toISOString()
        });

        return Response.json({ test: testResult });
      }

      case 'publishToExternal': {
        const { integration_id, endpoint, method, payload, headers } = body;
        const integration = await base44.asServiceRole.entities.Integration.get(integration_id);
        if (!integration) return Response.json({ error: 'Integration not found' }, { status: 404 });
        if (integration.status !== 'ativo' && integration.status !== 'sandbox') {
          return Response.json({ error: 'Integration not active' }, { status: 400 });
        }

        // Rate limit check
        const rateLimit = integration.rate_limit || {};
        const rateUsage = integration.rate_usage || {};
        const now = new Date();
        const lastReset = rateUsage.last_reset ? new Date(rateUsage.last_reset) : now;
        const minsSinceReset = (now.getTime() - lastReset.getTime()) / 60000;

        // Reset counters if minute elapsed
        let updatedRateUsage = { ...rateUsage };
        if (minsSinceReset >= 1) {
          updatedRateUsage.current_min = 0;
          if (minsSinceReset >= 60) updatedRateUsage.current_hour = 0;
          if (minsSinceReset >= 1440) updatedRateUsage.current_day = 0;
          updatedRateUsage.last_reset = now.toISOString();
        }

        if (rateLimit.requests_per_min && updatedRateUsage.current_min >= rateLimit.requests_per_min) {
          updatedRateUsage.exceeded_count = (updatedRateUsage.exceeded_count || 0) + 1;
          await base44.asServiceRole.entities.Integration.update(integration_id, { rate_usage: updatedRateUsage });

          await base44.asServiceRole.entities.IntegrationQueueItem.create({
            company_id: companyId,
            integration_id,
            integration_name: integration.name,
            queue_type: 'outbound_retry',
            payload,
            endpoint,
            method: method || 'POST',
            headers,
            priority: 'alta',
            status: 'pending',
            retry_count: 0,
            max_retries: 3,
            scheduled_at: now.toISOString()
          });

          return Response.json({ queued: true, message: 'Rate limit exceeded, request queued' });
        }

        const startTime = Date.now();
        const fullUrl = (integration.provider_config?.base_url || '') + (endpoint || '');
        const useSandbox = integration.sandbox_mode;
        const actualUrl = useSandbox
          ? (integration.sandbox_config?.base_url || fullUrl) + (endpoint || '')
          : fullUrl;

        try {
          const response = await fetch(actualUrl, {
            method: method || 'POST',
            headers: { 'Content-Type': 'application/json', ...(headers || {}) },
            body: payload ? JSON.stringify(payload) : undefined,
            signal: AbortSignal.timeout(30000)
          });
          const duration = Date.now() - startTime;
          const responseText = await response.text();

          await base44.asServiceRole.entities.IntegrationLog.create({
            company_id: companyId,
            integration_id,
            integration_name: integration.name,
            direction: 'outbound',
            origin: 'api_gateway',
            method: method || 'POST',
            endpoint: actualUrl,
            request_payload: payload,
            response_status: response.status,
            response_payload: responseText.substring(0, 5000),
            duration_ms: duration,
            user_name: user.full_name,
            user_email: user.email,
            sandbox: useSandbox,
            timestamp: now.toISOString()
          });

          updatedRateUsage.current_min = (updatedRateUsage.current_min || 0) + 1;
          updatedRateUsage.current_hour = (updatedRateUsage.current_hour || 0) + 1;
          updatedRateUsage.current_day = (updatedRateUsage.current_day || 0) + 1;

          await base44.asServiceRole.entities.Integration.update(integration_id, {
            total_calls: (integration.total_calls || 0) + 1,
            events_sent: (integration.events_sent || 0) + 1,
            last_call_at: now.toISOString(),
            avg_response_time_ms: Math.round(((integration.avg_response_time_ms || 0) * (integration.total_calls || 0) + duration) / ((integration.total_calls || 0) + 1)),
            rate_usage: updatedRateUsage
          });

          await publishEvent('integration_outbound', 'integracoes', 'Integration', integration_id, { endpoint, method, status: response.status });

          return Response.json({
            success: response.ok,
            status: response.status,
            response: responseText.substring(0, 5000),
            duration_ms: duration
          });
        } catch (error) {
          const duration = Date.now() - startTime;

          await base44.asServiceRole.entities.IntegrationLog.create({
            company_id: companyId,
            integration_id,
            integration_name: integration.name,
            direction: 'outbound',
            origin: 'api_gateway',
            method: method || 'POST',
            endpoint: actualUrl,
            request_payload: payload,
            response_status: 0,
            duration_ms: duration,
            user_name: user.full_name,
            user_email: user.email,
            error: error.message,
            sandbox: useSandbox,
            timestamp: now.toISOString()
          });

          await base44.asServiceRole.entities.IntegrationQueueItem.create({
            company_id: companyId,
            integration_id,
            integration_name: integration.name,
            queue_type: 'outbound_retry',
            payload,
            endpoint,
            method: method || 'POST',
            headers,
            priority: 'alta',
            status: 'pending',
            retry_count: 0,
            max_retries: 3,
            last_error: error.message,
            scheduled_at: now.toISOString()
          });

          await base44.asServiceRole.entities.Integration.update(integration_id, {
            total_calls: (integration.total_calls || 0) + 1,
            total_errors: (integration.total_errors || 0) + 1,
            events_sent: (integration.events_sent || 0) + 1,
            last_error_at: now.toISOString(),
            last_error_message: error.message,
            status: 'erro'
          });

          return Response.json({ success: false, error: error.message, queued: true });
        }
      }

      case 'receiveWebhook': {
        const { integration_id, event_name, payload, signature, source_ip } = body;
        const integration = await base44.asServiceRole.entities.Integration.get(integration_id);
        if (!integration) return Response.json({ error: 'Integration not found' }, { status: 404 });

        let verified = true;
        if (integration.webhook_secret && signature) {
          verified = true;
        }

        if (integration.allowed_ips && integration.allowed_ips.length > 0) {
          if (source_ip && !integration.allowed_ips.includes(source_ip)) {
            return Response.json({ error: 'IP not allowed' }, { status: 403 });
          }
        }

        const webhook = await base44.asServiceRole.entities.Webhook.create({
          company_id: companyId,
          integration_id,
          integration_name: integration.name,
          webhook_type: 'incoming',
          event_name: event_name || 'unknown',
          payload,
          signature,
          verified,
          source_ip,
          processing_status: 'completed',
          received_at: new Date().toISOString()
        });

        await base44.asServiceRole.entities.Integration.update(integration_id, {
          events_received: (integration.events_received || 0) + 1,
          last_call_at: new Date().toISOString()
        });

        await publishEvent('webhook_received', 'integracoes', 'Webhook', webhook.id, { event_name, integration: integration.name, integration_type: integration.integration_type });

        return Response.json({ success: true, webhook_id: webhook.id });
      }

      case 'reprocessWebhook': {
        const { webhook_id } = body;
        const webhook = await base44.asServiceRole.entities.Webhook.get(webhook_id);
        if (!webhook) return Response.json({ error: 'Webhook not found' }, { status: 404 });

        await base44.asServiceRole.entities.Webhook.update(webhook_id, {
          processing_status: 'reprocessing',
          reprocessed_at: new Date().toISOString(),
          reprocess_count: (webhook.reprocess_count || 0) + 1
        });

        await publishEvent('webhook_reprocessed', 'integracoes', 'Webhook', webhook_id, { event_name: webhook.event_name, integration: webhook.integration_name });

        await base44.asServiceRole.entities.Webhook.update(webhook_id, {
          processing_status: 'completed'
        });

        return Response.json({ success: true });
      }

      case 'reprocessQueue': {
        const { queue_id } = body;
        const item = await base44.asServiceRole.entities.IntegrationQueueItem.get(queue_id);
        if (!item) return Response.json({ error: 'Queue item not found' }, { status: 404 });

        await base44.asServiceRole.entities.IntegrationQueueItem.update(queue_id, {
          status: 'processing',
          last_retry_at: new Date().toISOString()
        });

        const integration = await base44.asServiceRole.entities.Integration.get(item.integration_id);
        if (!integration || (integration.status !== 'ativo' && integration.status !== 'sandbox')) {
          await base44.asServiceRole.entities.IntegrationQueueItem.update(queue_id, {
            status: 'failed',
            last_error: 'Integration not available'
          });
          return Response.json({ success: false, error: 'Integration not available' });
        }

        try {
          const fullUrl = (integration.provider_config?.base_url || '') + (item.endpoint || '');
          const response = await fetch(fullUrl, {
            method: item.method || 'POST',
            headers: { 'Content-Type': 'application/json', ...(item.headers || {}) },
            body: item.payload ? JSON.stringify(item.payload) : undefined,
            signal: AbortSignal.timeout(30000)
          });

          if (response.ok) {
            await base44.asServiceRole.entities.IntegrationQueueItem.update(queue_id, {
              status: 'completed',
              completed_at: new Date().toISOString()
            });

            await publishEvent('integration_queue_completed', 'integracoes', 'IntegrationQueueItem', queue_id, { integration: integration.name });

            return Response.json({ success: true });
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          const newRetryCount = (item.retry_count || 0) + 1;
          if (newRetryCount >= (item.max_retries || 3)) {
            await base44.asServiceRole.entities.IntegrationQueueItem.update(queue_id, {
              status: 'dead_letter',
              retry_count: newRetryCount,
              last_error: error.message
            });
          } else {
            await base44.asServiceRole.entities.IntegrationQueueItem.update(queue_id, {
              status: 'pending',
              retry_count: newRetryCount,
              last_error: error.message,
              next_retry_at: new Date(Date.now() + 60000 * newRetryCount).toISOString()
            });
          }
          return Response.json({ success: false, error: error.message });
        }
      }

      case 'getLogs': {
        const { integration_id, limit } = body;
        const query = { company_id: companyId };
        if (integration_id) query.integration_id = integration_id;
        const items = await base44.asServiceRole.entities.IntegrationLog.filter(query, '-created_date', limit || 50);
        return Response.json({ items });
      }

      case 'listWebhooks': {
        const { integration_id, limit } = body;
        const query = { company_id: companyId };
        if (integration_id) query.integration_id = integration_id;
        const items = await base44.asServiceRole.entities.Webhook.filter(query, '-created_date', limit || 50);
        return Response.json({ items });
      }

      case 'listQueue': {
        const { status, limit } = body;
        const query = { company_id: companyId };
        if (status) query.status = status;
        const items = await base44.asServiceRole.entities.IntegrationQueueItem.filter(query, '-created_date', limit || 50);
        return Response.json({ items });
      }

      case 'convertData': {
        const { mapping_id, data } = body;
        const mapping = await base44.asServiceRole.entities.DataMapping.get(mapping_id);
        if (!mapping) return Response.json({ error: 'Mapping not found' }, { status: 404 });

        const rules = mapping.mapping_rules || {};
        const convert = (item) => {
          const result = {};
          for (const [sourceField, targetField] of Object.entries(rules)) {
            if (item[sourceField] !== undefined) {
              result[targetField] = item[sourceField];
            }
          }
          return result;
        };

        const converted = Array.isArray(data) ? data.map(convert) : convert(data);
        return Response.json({ converted });
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});