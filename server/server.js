require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const { isHostingProd, parseAllowedOriginsEnv } = require('./config/env');
const isProd = isHostingProd();
const securityHeaders = require('./middleware/securityHeaders');
const { createRateLimiter } = require('./middleware/rateLimit');

app.disable('x-powered-by');
// Ensure req.ip is correct behind Render/Vercel proxies.
if (isProd) app.set('trust proxy', 1);

// Middlewares
// Configuration CORS
// - Dev: permissif (on autorise tout) pour éviter de bloquer Live Server / IP LAN.
// - Prod: strict (whitelist) via env CORS_ALLOWED_ORIGINS.
const defaultProdOrigins = [
    'https://vendoscity.vercel.app',
    'https://vendoscity-market.vercel.app'
];
const allowedOrigins = isProd
    ? Array.from(new Set([...defaultProdOrigins, ...parseAllowedOriginsEnv()]))
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:5501',
        'http://127.0.0.1:5501'
    ]; // Live Server + local

app.use(cors({
    origin: (origin, callback) => {
        // En développement, on autorise tout
        if (!isProd) {
            return callback(null, true);
        }

        const o = String(origin || '').trim().replace(/\/+$/, '');
        // En production, whitelist stricte (et on autorise les requêtes sans Origin: curl, server-to-server).
        const isVercelSubdomain = o.endsWith('.vercel.app');
        if (!o || allowedOrigins.includes(o) || isVercelSubdomain) {
            callback(null, true);
        } else {
            console.error(`🔴 CORS Bloqué pour l'origine: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    // We use Bearer tokens, not cookies. Avoid credentialed cross-site requests by default.
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-SMS-Gateway-Token']
}));

// Basic security headers for API responses
app.use(securityHeaders({ isProd }));

// Route de test pour vérifier que le serveur répond
app.get('/api/ping', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Le serveur Vendoscity répond correctement!',
        time: new Date().toISOString()
    });
});

// Keepalive route (used by Vercel Cron and client-side "server waking up" UX).
// Must be fast and must not depend on DB connectivity.
app.get('/api/keepalive', (req, res) => {
    res.json({
        status: 'ok',
        message: 'keepalive',
        time: new Date().toISOString()
    });
});

// Limit JSON payload size to reduce abuse (uploads are multipart and handled by multer in routes).
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));

// Global API rate limiting (soft protection against scraping & abuse)
const apiLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: isProd ? 600 : 2000,
    message: 'Trop de requetes. Reessayez dans quelques minutes.'
});
app.use('/api', apiLimiter);

// Routes API Backend (avant le middleware statique !)
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const addressRoutes = require('./routes/addressRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const messageRoutes = require('./routes/messageRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const shareRoutes = require('./routes/shareRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const walletRoutes = require('./routes/walletRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/user', userRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wallet', walletRoutes);

// Endpoint de géolocalisation par IP avec fallbacks (évite CORS et blocages pub/privacy)
app.get('/api/geolocation', async (req, res) => {
    try {
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        
        // Nettoyer l'IP (gérer le format IPv6 local/mappé ou les proxies multiples)
        if (ip.includes(',')) {
            ip = ip.split(',')[0].trim();
        }
        if (ip.startsWith('::ffff:')) {
            ip = ip.replace('::ffff:', '');
        }

        // Détecter si c'est une adresse IP locale (pour la phase de dev)
        const isLocalIp = 
            ip === '::1' || 
            ip === '127.0.0.1' || 
            ip.startsWith('192.168.') || 
            ip.startsWith('10.') || 
            ip.startsWith('172.');
            
        const queryIp = isLocalIp ? '' : ip;
        const ipParam = queryIp ? `/${queryIp}` : '';

        // 1. Essayer free.freeipapi.com (l'API officielle gratuite)
        try {
            const response = await fetch(`https://free.freeipapi.com/api/json${ipParam}`, {
                signal: AbortSignal.timeout(3500)
            });
            if (response.ok) {
                const data = await response.json();
                if (data.countryCode) {
                    return res.json({
                        code: data.countryCode.toUpperCase(),
                        name: data.countryName || 'Cameroun',
                        cityName: data.cityName || ''
                    });
                }
            }
        } catch (err) {
            console.warn('Geolocation fallback 1 (freeipapi) failed:', err.message);
        }

        // 2. Essayer ipwho.is (sûr côté serveur car pas de politique CORS bloquante)
        try {
            const response = await fetch(`https://ipwho.is/${queryIp}`, {
                signal: AbortSignal.timeout(3500)
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.country_code) {
                    return res.json({
                        code: data.country_code.toUpperCase(),
                        name: data.country || 'Cameroun',
                        cityName: data.city || ''
                    });
                }
            }
        } catch (err) {
            console.warn('Geolocation fallback 2 (ipwho.is) failed:', err.message);
        }

        // 3. Essayer ipapi.co
        try {
            const url = queryIp ? `https://ipapi.co/${queryIp}/json/` : 'https://ipapi.co/json/';
            const response = await fetch(url, {
                signal: AbortSignal.timeout(3500)
            });
            if (response.ok) {
                const data = await response.json();
                if (data.country_code) {
                    return res.json({
                        code: data.country_code.toUpperCase(),
                        name: data.country_name || 'Cameroun',
                        cityName: data.city || ''
                    });
                }
            }
        } catch (err) {
            console.warn('Geolocation fallback 3 (ipapi.co) failed:', err.message);
        }

        // Fallback ultime si toutes les APIs échouent
        return res.json({
            code: 'CM',
            name: 'Cameroun',
            cityName: 'Douala'
        });
    } catch (globalErr) {
        console.error('All backend geolocation attempts failed:', globalErr);
        return res.json({
            code: 'CM',
            name: 'Cameroun',
            cityName: 'Douala'
        });
    }
});


// Public share/preview pages (Open Graph cards for WhatsApp/Facebook/etc.)
app.use('/p', shareRoutes);
// Also mount under /api/share so it works on Vercel even if non-/api rewrites are not applied.
app.use('/api/share', shareRoutes);

// Serve the static frontend in local/dev.
// In hosted production (Vercel/Render/etc.), the frontend is served separately.
if (!isProd) {
    const clientRoot = path.join(__dirname, '../client');

    // Normalize accidental nested paths like /pages/pages/pages/... back to /pages/...
    // This can happen when a user follows a relative link while already under /pages/.
    app.use((req, res, next) => {
        if (req.path.startsWith('/api/')) return next();

        const original = req.originalUrl;
        const normalized = original.replace(/^\/(?:pages\/){2,}/, '/pages/');
        if (normalized !== original) return res.redirect(308, normalized);

        return next();
    });

    // Dev UX: prevent stale JS/CSS being served from browser cache (avoids "it still calls old URLs").
    app.use((req, res, next) => {
        const p = String(req.path || '');
        if (p.endsWith('.js') || p.endsWith('.css') || p.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store');
        }
        return next();
    });

    // Serve the static frontend.
    app.use(express.static(clientRoot));

    // Compatibility alias: if a page uses relative URLs like `style/style.css` while being under `/pages/*`,
    // the browser will request `/pages/style/style.css`. Mount the same static root under `/pages` so it works.
    app.use('/pages', express.static(clientRoot));

    // Fallback to index.html for any other frontend route
    app.use((req, res) => {
        // If it's not an HTML navigation request, don't return HTML (prevents MIME type issues for missing assets).
        const accept = req.headers.accept || '';
        if (!accept.includes('text/html')) return res.status(404).end();

        res.sendFile(path.join(clientRoot, 'index.html'));
    });
}

// Lancement local + export pour Vercel Serverless
if (require.main === module) {
    // Lancement direct (local): démarre le serveur
    app.listen(PORT, () => {
        const mode = process.env.NODE_ENV === 'production' ? 'PRODUCTION (Supabase)' : 'DÉVELOPPEMENT (Mock Auth)';
        console.log(`🔧 Mode ${mode}`);
        console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
}

// Export pour Vercel (serverless)
module.exports = app;

// Global error handler (avoid leaking stack traces in production).
// Keep after `module.exports` so Vercel can still import the app.
app.use((err, req, res, next) => {
    if (!err) return next();
    const msg = String(err?.message || 'Erreur serveur');
    if (msg === 'Not allowed by CORS') return res.status(403).json({ error: 'Origine non autorisee' });
    if (!isProd) return res.status(500).json({ error: msg });
    return res.status(500).json({ error: 'Erreur serveur' });
});
