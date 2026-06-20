const express = require('express');
const db = require('../config/db');

const router = express.Router();

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getOrigin(req) {
  const protoRaw = String(req.headers['x-forwarded-proto'] || req.protocol || 'https');
  const proto = protoRaw.split(',')[0].trim() || 'https';
  const hostRaw = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const host = hostRaw.split(',')[0].trim();
  if (!host) return '';
  return `${proto}://${host}`;
}

function pickPublicSiteOrigin(req) {
  const env = String(process.env.PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  if (env) return env;

  const origin = getOrigin(req);
  // When Vercel rewrites to Render, host headers can sometimes point to backend.
  if (origin.includes('onrender.com')) return 'https://vendoscity.vercel.app';
  if (origin.includes('localhost')) return origin;
  if (origin.includes('127.0.0.1')) return origin;
  return origin || 'https://vendoscity.vercel.app';
}

function absUrl(u, origin) {
  const s = String(u || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return `${origin}${s}`;
  return s;
}

function normalizeSupabaseStorageUrl(u, options = {}) {
  const s = String(u || '').trim();
  if (!s) return s;
  
  // If it's already an absolute external link, use it as is.
  if (/^https?:\/\//i.test(s)) return s;
  
  const base = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  if (!base) return s;

  const path = s.startsWith('/') ? s : `/${s}`;
  
  // If the path is already for public storage, we can try to use the 'render' service for resizing.
  // WhatsApp prefers images under 300KB. Standardizing to 600px width/height is usually safe.
  if (path.includes('/storage/v1/object/public/')) {
    const renderPath = path.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    const w = options.width || 600;
    const h = options.height || 600;
    const q = options.quality || 80;
    return `${base}${renderPath}?width=${w}&height=${h}&quality=${q}&resize=contain`;
  }

  // Fallback to simple concatenation if it's just a raw bucket path.
  return `${base}${path}`;
}

function isMissingTable(err, tableName) {
  if (err?.code === '42P01') return true; // undefined_table
  const msg = String(err?.message || '').toLowerCase();
  const t = String(tableName || '').toLowerCase();
  if (!t) return false;
  return msg.includes(t) && (msg.includes('does not exist') || msg.includes("n'existe pas") || msg.includes('could not find the table'));
}

async function detectProductsTable() {
  for (const t of ['products', 'produits']) {
    try {
      const { error } = await db.from(t).select('id').limit(1);
      if (!error) return t;
      if (isMissingTable(error, t)) continue;
      return t;
    } catch (_) {
      // ignore
    }
  }
  return 'products';
}

async function loadProduct(id) {
  const productsTable = await detectProductsTable();
  let row = null;
  try {
    const r = await db.from(productsTable).select('*').eq('id', id).single();
    if (!r.error && r.data) row = r.data;
  } catch (_) {
    row = null;
  }

  if (!row) return { product: null, images: [] };

  // Try to load images from product_images (optional feature).
  let images = [];
  try {
    const r = await db.from('product_images').select('url').eq('product_id', id).limit(6);
    if (!r.error && Array.isArray(r.data)) {
      images = r.data.map(x => String(x?.url || '').trim()).filter(Boolean);
    }
  } catch (_) {
    images = [];
  }

  // Fallback to in-row columns.
  if (!images.length) {
    const raw = row.images;
    if (Array.isArray(raw)) images = raw.map(String).filter(Boolean);
    else if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) images = parsed.map(String).filter(Boolean);
      } catch (_) {
        // ignore
      }
    }
  }
  if (!images.length) {
    const one = row.image_url || row.image;
    if (one) images = [String(one)];
  }

  return { product: row, images };
}

function guessImageContentType(pathOrUrl) {
  const s = String(pathOrUrl || '').toLowerCase();
  if (s.endsWith('.png')) return 'image/png';
  if (s.endsWith('.webp')) return 'image/webp';
  if (s.endsWith('.gif')) return 'image/gif';
  if (s.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

function extractStorageObjectPathFromUrl(url) {
  const s = String(url || '').trim();
  if (!s) return '';

  // Typical forms:
  // https://<proj>.supabase.co/storage/v1/object/public/product-images/<path>
  // https://<proj>.supabase.co/storage/v1/object/sign/product-images/<path>?token=...
  const m = s.match(/\/storage\/v1\/object\/(?:public|sign)\/product-images\/([^?]+)/i);
  if (m && m[1]) return decodeURIComponent(m[1]);

  const idx = s.toLowerCase().indexOf('/product-images/');
  if (idx >= 0) return s.slice(idx + '/product-images/'.length).split('?')[0] || '';

  return '';
}

// Proxy image for WhatsApp/FB scrapers:
// - Avoids falling back to favicon when Storage URLs are not publicly reachable.
// - Uses service role (if configured) via supabase-js storage.download().
router.get('/img/:id', async (req, res) => {
  const id = String(req.params.id || '').trim();
  const siteOrigin = pickPublicSiteOrigin(req);
  const fallbackImg = `${siteOrigin}/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png`;

  try {
    const { product, images } = await loadProduct(id);
    const imgRaw = (Array.isArray(images) && images.length) ? images[0] : '';
    const normalized = normalizeSupabaseStorageUrl(imgRaw);

    // Best-effort: if we can download through the backend (service role), serve bytes.
    const objectPath = extractStorageObjectPathFromUrl(normalized);
    if (objectPath && db?.storage?.from && typeof db.storage.from === 'function') {
      try {
        const bucket = db.storage.from('product-images');
        if (bucket && typeof bucket.download === 'function') {
          const out = await bucket.download(objectPath);
          const data = out?.data;
          const err = out?.error;
          if (!err && data) {
            // supabase-js returns a Blob in Node; convert to Buffer
            const ab = (typeof data.arrayBuffer === 'function') ? await data.arrayBuffer() : null;
            const buf = ab ? Buffer.from(ab) : Buffer.from([]);
            if (buf.length > 0) {
              res.setHeader('Content-Type', guessImageContentType(objectPath));
              res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600');
              return res.status(200).send(buf);
            }
          }
        }
      } catch (_) {
        // fallback below
      }
    }

    // Fallback: redirect to a direct URL (works if bucket is public).
    if (normalized && /^https?:\/\//i.test(normalized)) {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=600');
      return res.redirect(302, normalized);
    }
  } catch (_) {
    // ignore
  }

  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=600');
  return res.redirect(302, fallbackImg);
});

router.get('/:id', async (req, res) => {
  const id = String(req.params.id || '').trim();
  const siteOrigin = pickPublicSiteOrigin(req);
  const detailUrl = `${siteOrigin}/pages/Product-Detail.html?id=${encodeURIComponent(id)}`;
  const rawUrl = String(req.originalUrl || '').trim();
  const pathOnly = rawUrl.split('?')[0] || rawUrl;
  const shareUrlFull = `${siteOrigin}${rawUrl}`; // includes cache-busters like ?v=
  const shareUrlCanonical = `${siteOrigin}${pathOnly}`;

  const fallbackImg = `${siteOrigin}/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png`;

  let title = 'Article Vendoscity';
  let description = 'Découvre cet article sur Vendoscity. Commande directe via WhatsApp.';
  let ogImagesHtml = '';
  // Default image generated via proxy fallback
  let defaultImage = `${siteOrigin}/api/share/img/${encodeURIComponent(id)}`;
  let twitterImage = defaultImage;

  try {
    const { product, images } = await loadProduct(id);
    if (product) {
      const price = Math.round(Number(product.price) || 0).toLocaleString('fr-FR');
      const quartier = String(product.quartier || product.district || product.location || '').trim();

      title = String(product.title || title);
      const descRaw = String(product.description || '').trim();
      const short = descRaw ? descRaw.slice(0, 140) : '';
      const loc = quartier ? `Cameroun · ${quartier}` : 'Cameroun';
      description = short || `${title} a ${price} FCFA (${loc}). Commande directe via WhatsApp.`;

      if (Array.isArray(images) && images.length > 0) {
        twitterImage = normalizeSupabaseStorageUrl(images[0], { width: 600, height: 600 }) || defaultImage;
        images.slice(0, 4).forEach((imgUrl) => {
          const u = normalizeSupabaseStorageUrl(imgUrl, { width: 600, height: 600 });
          if (u) {
             ogImagesHtml += `\n  <meta property="og:image" content="${escapeHtml(u)}"/>`;
             ogImagesHtml += `\n  <meta property="og:image:secure_url" content="${escapeHtml(u)}"/>`;
             ogImagesHtml += `\n  <meta property="og:image:type" content="image/jpeg"/>`;
             ogImagesHtml += `\n  <meta property="og:image:width" content="600"/>`;
             ogImagesHtml += `\n  <meta property="og:image:height" content="600"/>`;
          }
        });
      }
    } else {
      title = 'Produit introuvable';
      description = 'Cet article est indisponible. Ouvrez la boutique pour voir les articles disponibles.';
    }
  } catch (_) {
    // fallback to defaults
  }
  
  if (!ogImagesHtml) {
      ogImagesHtml = `
  <meta property="og:image" content="${escapeHtml(defaultImage)}"/>
  <meta property="og:image:secure_url" content="${escapeHtml(defaultImage)}"/>
  <meta property="og:image:type" content="image/jpeg"/>
  <meta property="og:image:width" content="600"/>
  <meta property="og:image:height" content="600"/>`;
  }


  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)} | Vendoscity</title>
  <meta name="description" content="${escapeHtml(description)}"/>
  <link rel="canonical" href="${escapeHtml(shareUrlCanonical)}"/>

  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="Vendoscity"/>
  <meta property="og:title" content="${escapeHtml(title)}"/>
  <meta property="og:description" content="${escapeHtml(description)}"/>
  <meta property="og:url" content="${escapeHtml(shareUrlFull)}"/>${ogImagesHtml}
  <meta property="og:image:alt" content="${escapeHtml(title)}"/>

  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${escapeHtml(title)}"/>
  <meta name="twitter:description" content="${escapeHtml(description)}"/>
  <meta name="twitter:image" content="${escapeHtml(twitterImage)}"/>
</head>
<body style="margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f8fafc; padding: 16px; color: #0f172a;">
  <main style="max-width:400px; width:100%; background:#fff; padding:24px; border-radius:24px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); text-align:center;">
    <div style="width: 120px; height: 120px; margin: 0 auto 20px; border-radius: 20px; overflow: hidden; background: #f1f5f9; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <img src="${escapeHtml(twitterImage)}" alt="${escapeHtml(title)}" style="width: 100%; height: 100%; object-fit: cover;">
    </div>
    <h1 style="font-size:22px; margin:0 0 12px 0; font-weight:900; line-height:1.2;">${escapeHtml(title)}</h1>
    <p style="margin:0 0 24px 0; color:#64748b; font-size:15px; line-height:1.6;">${escapeHtml(description)}</p>
    <a href="${escapeHtml(detailUrl)}" style="display:block; width: 100%; box-sizing: border-box; padding:16px; border-radius:16px; text-decoration:none; background:#ffcc00; color:#0f172a; font-weight:800; font-size:16px; box-shadow: 0 4px 14px rgba(255, 204, 0, 0.4);">
      Ouvrir dans Vendoscity
    </a>
  </main>
  <script>
    // Auto-redirect human users to the actual interactive frontend app.
    // Crawlers (WhatsApp, Facebook) will ignore this and parse the OG tags above.
    setTimeout(function() { window.location.replace("${escapeHtml(detailUrl)}"); }, 50);
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Share pages should be static: lock them down with CSP but allow the inline redirect script.
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; script-src 'unsafe-inline'; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  );
  // Keep caching short because scrapers can mis-cache previews.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=120');
  return res.status(200).send(html);
});

module.exports = router;
