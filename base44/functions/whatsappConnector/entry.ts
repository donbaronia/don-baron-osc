import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// =====================================================
// WHATSAPP CONNECTOR — DON BARON OS
// Provedor: Z-API (https://z-api.com)
//
// Credenciais sao configuradas via UI e armazenadas na entidade WhatsAppConnection.
// Campos: instance_id, instance_token, client_token, api_url
//
// Endpoints Z-API:
//   Status:     GET  {api_url}/instances/{instance_id}/token/{instance_token}/status
//   QR Code:    GET  {api_url}/instances/{instance_id}/token/{instance_token}/qr-code/image
//   Send Text:  POST {api_url}/instances/{instance_id}/token/{instance_token}/send-text
//   Webhook:    POST {api_url}/instances/{instance_id}/token/{instance_token}/update-webhook
//   Disconnect: GET  {api_url}/instances/{instance_id}/token/{instance_token}/disconnect
//
// Header Client-Token: client_token (quando utilizado)
// =====================================================

async function getConfig(svc) {
  const connections = await svc.entities.WhatsAppConnection.list('-created_date', 1);
  return connections[0] || null;
}

async function saveConfig(svc, configId, data) {
  if (configId) {
    return await svc.entities.WhatsAppConnection.update(configId, data);
  }
  return await svc.entities.WhatsAppConnection.create(data);
}

function buildHeaders(clientToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (clientToken) headers['Client-Token'] = clientToken;
  return headers;
}

function buildBaseUrl(config) {
  return (config.api_url || 'https://api.z-api.com').replace(/\/+$/, '');
}

function buildInstancePath(config) {
  return `/instances/${config.instance_id}/token/${config.instance_token}`;
}

async function log(svc, logType, level, message, details) {
  try {
    await svc.entities.WhatsAppLog.create({
      log_type: logType,
      level,
      message,
      details: details || {},
    });
  } catch {}
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const isWebhook = url.pathname.endsWith('/webhook');

    // ---- WEBHOOK HANDLER (recebido da Z-API) ----
    if (isWebhook && req.method === 'POST') {
      const body = await req.json();
      const svc = createClientFromRequest(req).asServiceRole;

      // Z-API envia: phone, message, type, messageId, etc.
      const sender = body.phone || '';
      const messageText = body.message || body.text || '';
      const eventType = body.type || 'message';

      if (messageText && sender) {
        await svc.entities.WhatsAppMessage.create({
          direction: 'received',
          phone_number: String(sender),
          message_text: messageText,
          message_type: 'text',
          status: 'read',
          sent_at: new Date().toISOString(),
          source_module: 'whatsapp',
          source_event: 'incoming_message',
        });
        await log(svc, 'message', 'info', `Mensagem recebida de ${sender}`);
      } else {
        await log(svc, 'webhook', 'info', `Webhook recebido: ${eventType}`, body);
      }

      return Response.json({ received: true });
    }

    // ---- API HANDLER (chamado pelo frontend) ----
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const payload = await req.json().catch(() => ({}));
    const action = payload.action;

    // ---- ACTION: save_config ----
    if (action === 'save_config') {
      const { instance_id, instance_token, client_token, api_url, webhook_url, notifications_enabled } = payload;
      const existing = await getConfig(svc);

      const data = {
        provider: 'z-api',
        instance_id: instance_id || '',
        instance_token: instance_token || '',
        client_token: client_token || '',
        api_url: api_url || 'https://api.z-api.com',
        webhook_url: webhook_url || '',
        notifications_enabled: notifications_enabled !== false,
      };

      const saved = await saveConfig(svc, existing?.id, data);
      await log(svc, 'connection', 'info', 'Configuracao Z-API salva');
      return Response.json({ success: true, config: saved });
    }

    // ---- ACTION: get_config ----
    if (action === 'get_config') {
      const config = await getConfig(svc);
      return Response.json({ config });
    }

    // Para demais actions, precisa ter config salva
    const config = await getConfig(svc);

    if (!config || !config.instance_id || !config.instance_token) {
      return Response.json({
        configured: false,
        error: 'Configuracoes da Z-API nao salvas. Acesse a tela WhatsApp Connector e configure Instance ID, Instance Token e Client Token.',
      });
    }

    const baseUrl = buildBaseUrl(config);
    const instancePath = buildInstancePath(config);
    const headers = buildHeaders(config.client_token);

    // ---- ACTION: test_connection ----
    if (action === 'test_connection') {
      try {
        const resp = await fetch(`${baseUrl}${instancePath}/status`, { headers });
        const data = await resp.json();

        let connStatus = 'disconnected';
        let errorMsg = '';

        if (!resp.ok) {
          connStatus = 'error';
          errorMsg = data?.message || data?.error || `Erro HTTP ${resp.status}`;
        } else {
          // Z-API status: connected, disconnected, loading, qr-code
          const state = data?.status || data?.state || '';
          if (state === 'connected' || state === 'CONNECTED') connStatus = 'connected';
          else if (state === 'loading' || state === 'LOADING') connStatus = 'connecting';
          else if (state === 'qr-code' || state === 'QR_CODE') connStatus = 'qr_code';
          else if (state === 'disconnected' || state === 'DISCONNECTED') connStatus = 'disconnected';
          else connStatus = 'disconnected';
        }

        await saveConfig(svc, config.id, {
          connection_status: connStatus,
          error_message: errorMsg,
          last_test_at: new Date().toISOString(),
          last_test_result: resp.ok ? 'success' : 'error',
          phone_number: data?.phone || config.phone_number,
        });
        await log(svc, 'connection', resp.ok ? 'info' : 'error', `Teste de conexao: ${resp.ok ? 'OK' : errorMsg}`);

        return Response.json({
          success: resp.ok,
          configured: true,
          connection_status: connStatus,
          phone_number: data?.phone || '',
          zapi_status: data,
          error: errorMsg || undefined,
        });
      } catch (err) {
        await saveConfig(svc, config.id, {
          connection_status: 'error',
          error_message: err.message,
          last_test_at: new Date().toISOString(),
          last_test_result: 'error',
        });
        await log(svc, 'connection', 'error', `Erro no teste: ${err.message}`);
        return Response.json({
          success: false,
          configured: true,
          connection_status: 'error',
          error: `Falha ao comunicar com Z-API: ${err.message}`,
        });
      }
    }

    // ---- ACTION: status ----
    if (action === 'status') {
      try {
        const resp = await fetch(`${baseUrl}${instancePath}/status`, { headers });
        const data = await resp.json();

        let connStatus = 'disconnected';
        if (resp.ok) {
          const state = data?.status || data?.state || '';
          if (state === 'connected' || state === 'CONNECTED') connStatus = 'connected';
          else if (state === 'loading' || state === 'LOADING') connStatus = 'connecting';
          else if (state === 'qr-code' || state === 'QR_CODE') connStatus = 'qr_code';
        }

        await saveConfig(svc, config.id, {
          connection_status: connStatus,
          phone_number: data?.phone || config.phone_number,
        });

        return Response.json({
          configured: true,
          provider: 'z-api',
          connection_status: connStatus,
          phone_number: data?.phone || config.phone_number || '',
          instance_id: config.instance_id,
          api_url: config.api_url,
          webhook_url: config.webhook_url,
          notifications_enabled: config.notifications_enabled,
        });
      } catch (err) {
        return Response.json({
          configured: true,
          provider: 'z-api',
          connection_status: 'error',
          error: err.message,
        });
      }
    }

    // ---- ACTION: get_qr ----
    if (action === 'get_qr') {
      try {
        const resp = await fetch(`${baseUrl}${instancePath}/qr-code/image`, { headers });
        const data = await resp.json();
        const qrUrl = data?.value || data?.qrCode || data?.qr_code || data?.url || '';

        await saveConfig(svc, config.id, {
          connection_status: qrUrl ? 'qr_code' : 'connecting',
          qr_code: qrUrl,
        });

        return Response.json({ success: true, qr_code: qrUrl });
      } catch (err) {
        await log(svc, 'connection', 'error', `Erro ao obter QR: ${err.message}`);
        return Response.json({ success: false, error: `Erro ao obter QR Code: ${err.message}` }, { status: 500 });
      }
    }

    // ---- ACTION: disconnect ----
    if (action === 'disconnect') {
      try {
        const resp = await fetch(`${baseUrl}${instancePath}/disconnect`, { headers });
        await saveConfig(svc, config.id, {
          connection_status: 'disconnected',
          last_disconnected_at: new Date().toISOString(),
          qr_code: '',
        });
        await log(svc, 'connection', 'info', 'Desconexao solicitada');
        return Response.json({ success: true });
      } catch (err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    // ---- ACTION: setup_webhook ----
    if (action === 'setup_webhook') {
      const webhookUrl = payload.webhook_url || config.webhook_url;
      if (!webhookUrl) {
        return Response.json({ error: 'webhook_url nao informado' }, { status: 400 });
      }
      try {
        const resp = await fetch(`${baseUrl}${instancePath}/update-webhook`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ value: webhookUrl }),
        });
        const data = await resp.json();
        await saveConfig(svc, config.id, { webhook_url: webhookUrl });
        await log(svc, 'connection', 'info', `Webhook configurado: ${webhookUrl}`);
        return Response.json({ success: true, webhook_url: webhookUrl, response: data });
      } catch (err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    // ---- ACTION: send_message ----
    if (action === 'send_message') {
      const { phone_number, message_text, source_module = 'sistema', source_event = 'notification' } = payload;
      if (!phone_number || !message_text) {
        return Response.json({ error: 'phone_number e message_text sao obrigatorios' }, { status: 400 });
      }

      const msg = await svc.entities.WhatsAppMessage.create({
        direction: 'sent',
        phone_number,
        message_text,
        message_type: 'text',
        status: 'sending',
        sent_at: new Date().toISOString(),
        source_module,
        source_event,
      });

      try {
        const resp = await fetch(`${baseUrl}${instancePath}/send-text`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            phone: phone_number.replace(/\D/g, ''),
            message: message_text,
          }),
        });
        const data = await resp.json();

        if (!resp.ok) {
          await svc.entities.WhatsAppMessage.update(msg.id, {
            status: 'failed',
            error_message: data?.message || data?.error || `HTTP ${resp.status}`,
          });
          return Response.json({ success: false, error: data?.message || data?.error || 'Erro ao enviar' }, { status: 500 });
        }

        await svc.entities.WhatsAppMessage.update(msg.id, {
          status: 'sent',
          provider_message_id: data?.messageId || data?.id || '',
          sent_at: new Date().toISOString(),
        });

        return Response.json({ success: true, message_id: msg.id, provider_response: data });
      } catch (err) {
        await svc.entities.WhatsAppMessage.update(msg.id, { status: 'failed', error_message: err.message });
        await log(svc, 'message', 'error', `Erro ao enviar para ${phone_number}: ${err.message}`);
        return Response.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    return Response.json({ error: 'Action not found. Use: save_config, get_config, test_connection, status, get_qr, disconnect, setup_webhook, send_message' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});