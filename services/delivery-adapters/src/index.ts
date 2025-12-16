import http from 'http';
import { parse } from 'url';
import mockAdapter from './adapters/mockAdapter';
import sendgridAdapter from './adapters/sendgridAdapter';
import cfg from './config';

const PORT = cfg.PORT;

function jsonResponse(res: http.ServerResponse, code: number, body: any) {
  const s = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(s);
}

async function handleDeliver(req: http.IncomingMessage, res: http.ServerResponse) {
  let data = '';
  req.on('data', (chunk) => (data += chunk));
  await new Promise((r) => req.on('end', r));

  console.info('[delivery-adapters] /deliver request received');

  let payload: any = null;
  try {
    payload = data ? JSON.parse(data) : {};
  } catch (e) {
    return jsonResponse(res, 400, { error: 'invalid_json' });
  }

  // Expected shape: { channel: 'email'|'sms', to, subject, body, metadata }
  const channel = payload.channel || 'email';
  try {
    console.info('[delivery-adapters] routing channel=%s to=%s', channel, payload?.to);
    if (channel === 'email') {
      const p = {
        to: payload.to,
        subject: payload.subject,
        body: payload.body,
        metadata: payload.metadata,
      };
      console.info('[delivery-adapters] selected adapter=%s', cfg.USE_MOCK ? 'mock' : 'sendgrid');
      const result = await (cfg.USE_MOCK ? mockAdapter.deliver(p) : sendgridAdapter.deliver(p));
      console.info(
        '[delivery-adapters] adapter result success=%s code=%s',
        result.success,
        result.code,
      );
      return jsonResponse(res, result.success ? 200 : 500, result);
    }

    // fallback mock for sms etc.
    console.info('[delivery-adapters] fallback to mock adapter for channel=%s', channel);
    const result = await mockAdapter.deliver(payload);
    console.info(
      '[delivery-adapters] adapter result success=%s code=%s',
      result.success,
      result.code,
    );
    return jsonResponse(res, result.success ? 200 : 500, result);
  } catch (err: any) {
    console.error('[delivery-adapters] handler exception', err);
    return jsonResponse(res, 500, {
      success: false,
      code: 'ADAPTER_EXCEPTION',
      providerResponse: String(err),
    });
  }
}

const server = http.createServer(async (req, res) => {
  const url = parse(req.url || '');
  if (req.method === 'POST' && url.pathname === '/deliver') return handleDeliver(req, res);
  jsonResponse(res, 404, { error: 'not_found' });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.info(`[delivery-adapters] listening on ${PORT}`);
});
