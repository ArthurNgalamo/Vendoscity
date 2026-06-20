// Vercel Serverless proxy for /api/products/:id -> Render backend.
// Used for edits/deletes (PUT/DELETE) without CORS issues.

function getTargetBase() {
  const raw =
    process.env.RENDER_API_BASE_URL ||
    process.env.RENDER_BACKEND_BASE_URL ||
    'https://vendoscity.onrender.com';
  return String(raw || '').trim().replace(/\/+$/, '');
}

function getTargetUrl(req) {
  const base = getTargetBase();
  const url = new URL(req.url, 'http://localhost');
  const id = String(req.query?.id || '').trim();
  const encId = encodeURIComponent(id);
  return `${base}/api/products/${encId}${url.search || ''}`;
}

async function wakeBackend() {
  const base = getTargetBase();
  try {
    await fetch(`${base}/api/ping`, {
      method: 'GET',
      headers: { 'user-agent': 'vendoscity-vercel-proxy', 'accept': 'application/json' }
    });
  } catch (_) { /* ignore */ }
}

function buildForwardHeaders(req) {
  const h = new Headers();
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (v == null) continue;
    const key = String(k).toLowerCase();
    if (key === 'connection') continue;
    if (key === 'host') continue;
    if (key === 'content-length') continue;
    if (Array.isArray(v)) h.set(k, v.join(','));
    else h.set(k, String(v));
  }
  if (!h.has('accept')) h.set('accept', 'application/json');
  return h;
}

async function forwardOnce(req, targetUrl) {
  const method = String(req.method || 'GET').toUpperCase();
  const headers = buildForwardHeaders(req);
  const hasBody = !(method === 'GET' || method === 'HEAD');
  const init = { method, headers };
  if (hasBody) {
    init.body = req;
    init.duplex = 'half';
  }
  return fetch(targetUrl, init);
}

module.exports = async function handler(req, res) {
  res.setHeader('x-vendoscity-proxy', 'vercel-api-products-id');
  res.setHeader('x-vendoscity-upstream', getTargetBase());

  if (String(req.method || '').toUpperCase() === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,Accept,Origin');
    return res.end();
  }

  try {
    const targetUrl = getTargetUrl(req);
    const method = String(req.method || 'GET').toUpperCase();
    const hasBody = !(method === 'GET' || method === 'HEAD');

    let upstream;
    try {
      if (hasBody) await wakeBackend();
      upstream = await forwardOnce(req, targetUrl);
    } catch (e) {
      return res.status(502).json({ error: 'Bad gateway (proxy failed)', details: e?.message || String(e) });
    }

    if (!hasBody && (upstream.status === 502 || upstream.status === 504)) {
      await wakeBackend();
      try { upstream = await forwardOnce(req, targetUrl); } catch (_) { /* ignore */ }
    }

    const ct = upstream.headers.get('content-type') || '';
    res.statusCode = upstream.status;
    res.setHeader('content-type', ct || 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');

    const buf = Buffer.from(await upstream.arrayBuffer());
    return res.end(buf);
  } catch (e) {
    return res.status(500).json({ error: 'Proxy crashed', details: e?.message || String(e) });
  }
};

module.exports.config = {
  api: {
    bodyParser: false
  }
};
