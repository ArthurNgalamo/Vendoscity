// Simple in-memory rate limiter (no external deps).
// NOTE: This protects a single instance. For multi-instance scaling, use a shared store (Redis).

function defaultKey(req) {
  const ip = String(req.ip || '').trim() || 'ip:unknown';
  return `${ip}:${String(req.path || '').trim()}`;
}

function createRateLimiter(options) {
  const windowMs = Math.max(1000, Number(options?.windowMs) || 60_000);
  const max = Math.max(1, Number(options?.max) || 60);
  const keyGenerator = typeof options?.keyGenerator === 'function' ? options.keyGenerator : defaultKey;
  const message = String(options?.message || 'Trop de requetes. Reessayez plus tard.');

  const hits = new Map(); // key -> { count, resetAt }

  function cleanup(now) {
    // Opportunistic cleanup: avoid unbounded growth.
    if (hits.size < 2000) return;
    for (const [k, v] of hits.entries()) {
      if (!v || typeof v !== 'object' || (v.resetAt || 0) <= now) hits.delete(k);
    }
  }

  return function rateLimit(req, res, next) {
    const now = Date.now();
    cleanup(now);

    let key = '';
    try { key = String(keyGenerator(req) || '').trim(); } catch (_) { key = ''; }
    if (!key) key = defaultKey(req);

    const cur = hits.get(key);
    if (!cur || cur.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - 1)));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));
      return next();
    }

    cur.count += 1;
    hits.set(key, cur);

    const remaining = Math.max(0, max - cur.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(cur.resetAt / 1000)));

    if (cur.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((cur.resetAt - now) / 1000))));
      return res.status(429).json({ error: message });
    }

    return next();
  };
}

module.exports = {
  createRateLimiter
};

