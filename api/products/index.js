// Vercel Serverless proxy for /api/products -> Render backend.
//
// Why:
// - Browser -> Render direct calls trigger CORS (Authorization + multipart/form-data => preflight).
// - Vercel "external rewrite" to Render can return 502/504 on cold starts/timeouts.
// - This server-to-server proxy avoids CORS and lets us retry once after a wake-up ping.

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
  // Preserve query string (pagination, etc.)
  return `${base}/api/products${url.search || ''}`;
}

function shouldRetry(status) {
  return status === 502 || status === 504;
}

async function wakeBackend() {
  const base = getTargetBase();
  try {
    await fetch(`${base}/api/ping`, {
      method: 'GET',
      headers: { 'user-agent': 'vendoscity-vercel-proxy', 'accept': 'application/json' }
    });
  } catch (_) {
    // ignore
  }
}

function buildForwardHeaders(req) {
  const h = new Headers();
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (v == null) continue;
    const key = String(k).toLowerCase();
    // Hop-by-hop headers that should not be forwarded.
    if (key === 'connection') continue;
    if (key === 'host') continue;
    if (key === 'content-length') continue;
    // Vercel sets these; not needed upstream.
    if (key === 'x-vercel-proxy-signature') continue;
    if (key === 'x-vercel-forwarded-for') continue;
    if (key === 'x-vercel-id') continue;
    if (Array.isArray(v)) h.set(k, v.join(','));
    else h.set(k, String(v));
  }
  // Ensure accept header for JSON responses.
  if (!h.has('accept')) h.set('accept', 'application/json');
  return h;
}

async function forwardOnce(req, targetUrl) {
  const method = String(req.method || 'GET').toUpperCase();
  const headers = buildForwardHeaders(req);

  // With bodyParser disabled, req is a stream; undici fetch requires duplex for streaming bodies.
  const hasBody = !(method === 'GET' || method === 'HEAD');
  const init = {
    method,
    headers
  };
  if (hasBody) {
    init.body = req;
    init.duplex = 'half';
  }

  return fetch(targetUrl, init);
}

module.exports = async function handler(req, res) {
  // If you don't see this header in the response, the request did not reach this function.
  res.setHeader('x-vendoscity-proxy', 'vercel-api-products');
  res.setHeader('x-vendoscity-upstream', getTargetBase());

  // Preflight: let the browser talk to this same-origin endpoint without surprises.
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
      // Avoid retries for streaming bodies (multipart uploads cannot be replayed).
      if (hasBody) await wakeBackend();
      upstream = await forwardOnce(req, targetUrl);
    } catch (e) {
      return res.status(502).json({ error: 'Bad gateway (proxy failed)', details: e?.message || String(e) });
    }

    // Only retry idempotent requests (no body).
    if (!hasBody && shouldRetry(upstream.status)) {
      await wakeBackend();
      try {
        upstream = await forwardOnce(req, targetUrl);
      } catch (_) {
        // ignore, we'll return the original status
      }
    }

    const ct = upstream.headers.get('content-type') || '';
    res.statusCode = upstream.status;
    res.setHeader('content-type', ct || 'application/json; charset=utf-8');
    // Avoid caching error pages in browsers/CDNs.
    res.setHeader('cache-control', 'no-store');

    const buf = Buffer.from(await upstream.arrayBuffer());
    return res.end(buf);
  } catch (e) {
    // Ensure we never let an exception bubble to Vercel (which would return an HTML 502).
    return res.status(500).json({ error: 'Proxy crashed', details: e?.message || String(e) });
  }
};

// Critical: keep the raw body for multipart/form-data uploads (do not parse).
module.exports.config = {
  api: {
    bodyParser: false
  }
};
