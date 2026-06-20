// Détection de l'URL de base de l'API
// Objectif: éviter les 502 Vercel "ROUTER_EXTERNAL_TARGET_ERROR" quand un proxy/rewrite externe échoue.
// - Local: localhost/127.0.0.1 -> backend local sur :3000
// - Réseau local (tests mobile): IP privée -> backend local sur :3000 (même hostname)
// - Production (Vercel): appeler en same-origin `/api` (via vercel.json rewrites) pour éviter les soucis réseau/CORS.
//   Fallback possible: appeler directement Render si besoin.
var API_BASE_URL = (function initApiBase() {
  // Build id (helps debug Vercel cache / wrong deployment).
  // Bump this when you want to force component reloads in production.
  try { window.VENDOSCITY_BUILD_ID = '2026-04-01-net5'; } catch (_) { /* ignore */ }

  const host = String(window.location.hostname || '').trim();

  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  const isPrivateIp =
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host);

  // Allow overriding from console if needed.
  // window.VENDOSCITY_API_BASE_URL = 'https://...'
  const override = (typeof window.VENDOSCITY_API_BASE_URL === 'string')
    ? String(window.VENDOSCITY_API_BASE_URL).trim()
    : '';

  const direct = (typeof window.VENDOSCITY_API_FALLBACK_BASE_URL === 'string')
    ? String(window.VENDOSCITY_API_FALLBACK_BASE_URL).trim()
    : 'https://vendoscity.onrender.com';

  let base = '';
  if (override) base = override;
  else if (isLocalhost) base = 'http://localhost:3000';
  else if (isPrivateIp) base = `http://${host}:3000`;
  else base = ''; // same-origin (Vercel rewrite to backend)

  // eslint-disable-next-line no-console
  console.log(`[Vendoscity ${String(window.VENDOSCITY_BUILD_ID || '').trim() || 'dev'}] API Mode: ${base ? 'Direct' : 'Proxy'} (${base || 'same-origin /api'}), fallback: ${direct}`);
  // Expose the direct URL for optional fallback/recovery.
  try { window.VENDOSCITY_API_DIRECT_URL = direct; } catch (_) { /* ignore */ }
  return base;
})();
