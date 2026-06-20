function securityHeaders(options) {
  const isProd = !!options?.isProd;

  return function setSecurityHeaders(req, res, next) {
    // Hide server tech
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    // HSTS only when behind HTTPS (production hosting)
    if (isProd) {
      res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }

    // Avoid caching auth/session responses accidentally.
    const p = String(req.path || '');
    if (p.startsWith('/api/auth')) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Pragma', 'no-cache');
    }

    return next();
  };
}

module.exports = securityHeaders;

