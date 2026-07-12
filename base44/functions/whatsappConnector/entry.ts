import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// =====================================================
// WHATSAPP CONNECTOR — DON BARON OS
// Provedor: Evolution API
//
// CREDENCIAIS NECESSARIAS (configurar em Settings > Environment Variables):
//   EVOLUTION_API_URL      — URL base da instancia (ex: https://evolution.seudominio.com)
//   EVOLUTION_API_TOKEN    — Token de autenticacao (Global API Key)
//   EVOLUTION_INSTANCE_NAME — Nome da instancia (ex: don-baron-prod)
//
// WEBHOOK: configurar na Evolution API apontando para:
//   https://[seu-app].base44.app/api/functions/whatsappConnector/webhook
//
// A Evolution API enviara eventos de mensagem recebida, status de entrega, etc.
// =====================================================

const API_URL = Deno.env.get("EVOLUTION_API_URL");
const API_TOKEN = Deno.env.get("EVOLUTION_API_TOKEN");
const INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");

function isConfigured() {
  return !!(API_URL && API_TOKEN && INSTANCE_NAME);
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

    // ---- WEBHOOK HANDLER (recebido da Evolution API) ----
    if (isWebhook && req.method === 'POST') {
      const body = await req.json();
      const svc = createClientFromRequest(req).asServiceRole;

      // Evolution API envia: event, instance, data
      const eventType = body.event || 'unknown';
      const sender = body.data?.key?.remoteJid?.replace('@s.us', '') || '';
      const messageText = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || '';
      const status = body.data?.status || '';

      if (eventType === 'messages.upsert' && messageText) {
        await svc.entities.WhatsAppMessage.create({
          direction: 'received',
          phone_number: sender,
          message_text: messageText,
          message_type: 'text',
          status: 'read',
          received_at: new Date().toISOString(),
          source_module: 'whatsapp',
          source_event: 'incoming_message',
        });
        await log(svc, 'message', 'info', `Mensagem recebida de ${sender}`);
      } else if (eventType === 'messages.update' && status) {
        // Atualiza status de entrega (sent, delivered, read)
        await log(svc, 'message', 'info', `Status atualizado: ${status} para ${sender}`);
      } else if (eventType === 'connection.update') {
        const connState = body.data?.state || '';
        await log(svc, 'connection', 'info', `Estado da conexao: ${connState}`);
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

    // Se as credenciais nao estao configuradas, retorna status claro
    if (!isConfigured()) {
      return Response.json({
        configured: false,
        provider: 'evolution_api',
        connection_status: 'disconnected',
        error: 'Credenciais da Evolution API nao configuradas',
        required_credentials: {
          EVOLUTION_API_URL: API_URL ? 'OK' : 'AUSENTE',
          EVOLUTION_API_TOKEN: API_TOKEN ? 'OK' : 'AUSENTE',
          EVOLUTION_INSTANCE_NAME: INSTANCE_NAME ? 'OK' : 'AUSENTE',
        },
        instructions: 'Configure as variaveis de ambiente em Settings > Environment Variables',
        webhook_url: `${url.origin}/api/functions/whatsappConnector/webhook`,
      });
    }

    // ---- ACTION: status ----
    if (action === 'status') {
      try {
        const resp = await fetch(`${API_URL}/instance/connectionState/${INSTANCE_NAME}`, {
          headers: { 'apikey': API_TOKEN },
        });
        const data = await resp.json();

        let connStatus = 'disconnected';
        const state = data?.instance?.state || data?.state || '';
        if (state === 'open') connStatus = 'connected';
        else if (state === 'connecting') connStatus = 'connecting';
        else if (state === 'close') connStatus = 'disconnected';

        // Atualiza registro no banco
        const connections = await svc.entities.WhatsAppConnection.list('-created_date', 1);
        if (connections.length > 0) {
          await svc.entities.WhatsAppConnection.update(connections[0].id, {
            connection_status: connStatus,
            provider: 'evolution_api',
            instance_name: INSTANCE_NAME,
            api_url: API_URL,
            health_status: 'healthy',
            health_checked_at: new Date().toISOString(),
          });
        }

        return Response.json({
          configured: true,
          provider: 'evolution_api',
          connection_status: connStatus,
          instance_name: INSTANCE_NAME,
          api_url: API_URL,
          phone_number: connections[0]?.phone_number || '',
          webhook_url: `${url.origin}/api/functions/whatsappConnector/webhook`,
        });
      } catch (err) {
        return Response.json({
          configured: true,
          provider: 'evolution_api',
          connection_status: 'error',
          error: `Falha ao comunicar com Evolution API: ${err.message}`,
          api_url: API_URL,
        });
      }
    }

    // ---- ACTION: get_qr ----
    if (action === 'get_qr') {
      try {
        const resp = await fetch(`${API_URL}/instance/connect/${INSTANCE_NAME}`, {
          headers: { 'apikey': API_TOKEN },
        });
        const data = await resp.json();
        const qrCode = data?.base64?.code || data?.qrcode?.code || data?.code || '';

        const connections = await svc.entities.WhatsAppConnection.list('-created_date', 1);
        if (connections.length > 0) {
          await svc.entities.WhatsAppConnection.update(connections[0].id, {
            connection_status: qrCode ? 'qr_code' : 'connecting',
            qr_code: qrCode,
          });
        }

        return Response.json({
          configured: true,
          provider: 'evolution_api',
          qr_code: qrCode,
          connection_status: qrCode ? 'qr_code' : 'connecting',
        });
      } catch (err) {
        await log(svc, 'connection', 'error', `Erro ao obter QR: ${err.message}`);
        return Response.json({ error: `Erro ao obter QR Code: ${err.message}` }, { status: 500 });
      }
    }

    // ---- ACTION: reconnect ----
    if (action === 'reconnect') {
      try {
        const resp = await fetch(`${API_URL}/instance/reconnect/${INSTANCE_NAME}`, {
          method: 'POST',
          headers: { 'apikey': API_TOKEN },
        });
        const data = await resp.json();

        const connections = await svc.entities.WhatsAppConnection.list('-created_date', 1);
        if (connections.length > 0) {
          await svc.entities.WhatsAppConnection.update(connections[0].id, {
            connection_status: 'connecting',
          });
        }
        await log(svc, 'connection', 'info', 'Reconexao solicitada');

        return Response.json({ success: true, message: 'Reconexao iniciada', data });
      } catch (err) {
        return Response.json({ error: `Erro ao reconectar: ${err.message}` }, { status: 500 });
      }
    }

    // ---- ACTION: disconnect ----
    if (action === 'disconnect') {
      try {
        const resp = await fetch(`${API_URL}/instance/logout/${INSTANCE_NAME}`, {
          method: 'POST',
          headers: { 'apikey': API_TOKEN },
        });
        const data = await resp.json();

        const connections = await svc.entities.WhatsAppConnection.list('-created_date', 1);
        if (connections.length > 0) {
          await svc.entities.WhatsAppConnection.update(connections[0].id, {
            connection_status: 'disconnected',
            last_disconnected_at: new Date().toISOString(),
            qr_code: '',
          });
        }
        await log(svc, 'connection', 'info', 'Desconexao solicitada');

        return Response.json({ success: true, message: 'Desconectado', data });
      } catch (err) {
        return Response.json({ error: `Erro ao desconectar: ${err.message}` }, { status: 500 });
      }
    }

    // ---- ACTION: send_message ----
    if (action === 'send_message') {
      const { phone_number, message_text, source_module = 'sistema', source_event = 'notification' } = payload;

      if (!phone_number || !message_text) {
        return Response.json({ error: 'phone_number e message_text sao obrigatorios' }, { status: 400 });
      }

      // Registra mensagem na fila
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
        const resp = await fetch(`${API_URL}/message/sendText/${INSTANCE_NAME}`, {
          method: 'POST',
          headers: {
            'apikey': API_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: phone_number.replace(/\D/g, ''),
            textMessage: { text: message_text },
          }),
        });
        const data = await resp.json();

        await svc.entities.WhatsAppMessage.update(msg.id, {
          status: 'sent',
          provider_message_id: data?.key?.id || '',
          sent_at: new Date().toISOString(),
        });

        return Response.json({ success: true, message_id: msg.id, provider_response: data });
      } catch (err) {
        await svc.entities.WhatsAppMessage.update(msg.id, {
          status: 'failed',
          error_message: err.message,
        });
        await log(svc, 'message', 'error', `Erro ao enviar para ${phone_number}: ${err.message}`);
        return Response.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    // ---- ACTION: health_check ----
    if (action === 'health_check') {
      try {
        const start = Date.now();
        const resp = await fetch(`${API_URL}/instance/fetchInstances/${INSTANCE_NAME}`, {
          headers: { 'apikey': API_TOKEN },
        });
        const latency = Date.now() - start;

        const connections = await svc.entities.WhatsAppConnection.list('-created_date', 1);
        if (connections.length > 0) {
          await svc.entities.WhatsAppConnection.update(connections[0].id, {
            health_status: resp.ok ? 'healthy' : 'down',
            health_checked_at: new Date().toISOString(),
            health_latency_ms: latency,
          });
        }

        return Response.json({
          healthy: resp.ok,
          latency_ms: latency,
          checked_at: new Date().toISOString(),
        });
      } catch (err) {
        return Response.json({ healthy: false, error: err.message }, { status: 500 });
      }
    }

    return Response.json({ error: 'Action not found. Use: status, get_qr, reconnect, disconnect, send_message, health_check' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});