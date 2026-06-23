const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const router = express.Router();
const authenticate = require('../middleware/authenticate');

// Configuration Multer pour gérer les fichiers uploadés en mémoire
// Security: enforce size/type limits to avoid RAM exhaustion and unexpected file types.
const storage = multer.memoryStorage();
const maxMb = Math.max(1, Math.min(20, parseInt(String(process.env.UPLOAD_MAX_IMAGE_MB || '6'), 10) || 6));
const MAX_IMAGE_BYTES = maxMb * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXT_BY_MIME = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
};

function hasMagicBytes(mime, buf) {
    const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || '');
    if (b.length < 12) return false;
    const m = String(mime || '').toLowerCase();

    if (m === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

    if (m === 'image/png') {
        return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
            && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a;
    }

    if (m === 'image/gif') {
        return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38
            && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61;
    }

    if (m === 'image/webp') {
        return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
            && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    }

    return false;
}

function normalizePhone(raw) {
    const s = String(raw || '').trim();
    return s.replace(/[^\d+]/g, '');
}

function clampLen(s, max) {
    const t = String(s ?? '').trim();
    if (t.length <= max) return t;
    return t.slice(0, max);
}

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_IMAGE_BYTES,
        files: 6
    },
    fileFilter: (req, file, cb) => {
        const mime = String(file?.mimetype || '').toLowerCase();
        if (!mime || !ALLOWED_IMAGE_MIME.has(mime)) {
            const e = new Error('Type de fichier non supporté (images uniquement)');
            e.code = 'INVALID_FILE_TYPE';
            return cb(e);
        }
        return cb(null, true);
    }
});

let productImagesFeatureEnabled = null; // null=unknown, false=disabled (table missing), true=available
let productsTableNameCache = null;
let reviewsTableNameCache = null;

function getSupabaseUrlBase() {
    const raw = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return String(raw || '').trim().replace(/\/+$/, '');
}

function normalizeStorageUrl(u) {
    const s = String(u || '').trim();
    if (!s) return s;
    if (/^https?:\/\//i.test(s)) return s;

    // supabase-js may return signedUrl as a relative path like "/storage/v1/..."
    const base = getSupabaseUrlBase();
    if (base && s.startsWith('/')) return `${base}${s}`;
    return s;
}

// NOTE: Supabase "Image Transformations" (render/image/*) may not be enabled on all projects/plans.
// We therefore store plain object URLs (public or signed) and do NOT depend on render endpoints.

function isMissingRelationError(err) {
    const code = err?.code;
    if (code === '42P01') return true; // Postgres: undefined_table
    const msg = String(err?.message || '');
    return msg.includes('product_images') && (msg.includes('does not exist') || msg.includes("n'existe pas"));
}

function isPostgrestMissingTable(err, tableName) {
    const msg = String(err?.message || '');
    const t = String(tableName || '').trim();
    if (!t) return false;
    // PostgREST / Supabase can return: "could not find the table public.<table> in the schema cache"
    return msg.toLowerCase().includes('could not find the table') && msg.includes(t);
}

function isMissingTableError(err, tableName) {
    const code = err?.code;
    if (code === '42P01') return true; // undefined_table
    const msg = String(err?.message || '');
    const t = String(tableName || '');
    if (!t) return false;
    return msg.includes(t) && (msg.includes('does not exist') || msg.includes("n'existe pas"));
}

function isMissingColumn(err, columnName) {
    if (err?.code === '42703') return true; // undefined_column
    return String(err?.message || '').includes(`"${columnName}"`) || String(err?.message || '').includes(columnName);
}

function isUuidSyntaxErrorMessage(msg) {
    const s = String(msg || '').toLowerCase();
    return s.includes('invalid input syntax for type uuid');
}

async function detectTableName(candidates) {
    for (const t of candidates) {
        try {
            const { error } = await db.from(t).select('id').limit(1);
            if (!error) return t;
            if (isMissingTableError(error, t)) continue;
            // If it's not a missing-table error (RLS/permission/etc.), the table exists.
            return t;
        } catch (_) {
            // ignore and continue
        }
    }
    return candidates[0];
}

async function getProductsTableName() {
    if (productsTableNameCache) return productsTableNameCache;
    productsTableNameCache = await detectTableName(['products', 'produits']);
    return productsTableNameCache;
}

async function getReviewsTableName() {
    if (reviewsTableNameCache) return reviewsTableNameCache;
    // Some projects may use "avis" instead of "reviews"
    reviewsTableNameCache = await detectTableName(['reviews', 'avis']);
    return reviewsTableNameCache;
}

function clamp01(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
}

function safeLen(v) {
    if (v == null) return 0;
    return String(v).trim().length;
}

function parseDateMs(v) {
    if (!v) return 0;
    const ms = Date.parse(String(v));
    return Number.isFinite(ms) ? ms : 0;
}

function countProductImages(p) {
    const arr = Array.isArray(p?.images) ? p.images.filter(Boolean) : [];
    if (arr.length > 0) return arr.length;
    if (String(p?.image_url || p?.image || '').trim()) return 1;
    return 0;
}

function countProductSpecs(p) {
    const v = p?.specs ?? p?.specifications ?? p?.specs_json ?? null;
    if (!v) return 0;
    if (Array.isArray(v)) return v.filter(Boolean).length;
    if (typeof v === 'object') return Object.keys(v).length;
    return 0;
}

function computeBayesianRating(rating, reviewsCount, priorMean = 4.2, priorWeight = 8) {
    const r = Math.max(0, Math.min(5, Number(rating) || 0));
    const c = Math.max(0, Number(reviewsCount) || 0);
    const m = Number(priorMean) || 4.2;
    const C = Math.max(1, Number(priorWeight) || 8);
    return ((m * C) + (r * c)) / (C + c);
}

const doualaFormatter = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Africa/Douala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

function dayKeyInDouala(d) {
    if (!d) return '';
    try {
        const dt = (d instanceof Date) ? d : new Date(d);
        if (!Number.isFinite(dt.getTime())) return '';
        return doualaFormatter.format(dt);
    } catch (_) {
        return '';
    }
}

function computeRecommendedScore(p, ctx) {
    const now = ctx?.nowMs || Date.now();
    const maxReviews = Math.max(1, Number(ctx?.maxReviews) || 1);

    const createdMs = parseDateMs(p?.created_at);
    const ageHours = createdMs ? Math.max(0, (now - createdMs) / (1000 * 60 * 60)) : (24 * 30);
    const recency = Math.exp(-ageHours / 72); // ~3 days "half-life" feel (good for new marketplace)

    const reviewsCount = Math.max(0, Number(p?.reviews) || 0);
    const rating = Math.max(0, Math.min(5, Number(p?.rating) || 0));
    const bayes = computeBayesianRating(rating, reviewsCount, 4.2, 8);
    const ratingNorm = clamp01(bayes / 5);

    const popularityNorm = clamp01(Math.log1p(reviewsCount) / Math.log1p(maxReviews));

    const imagesCount = countProductImages(p);
    const descLen = safeLen(p?.description ?? p?.details ?? p?.desc);
    const specsCount = countProductSpecs(p);
    const hasQuartier = safeLen(p?.quartier ?? p?.district ?? p?.location) > 0 ? 1 : 0;

    const quality =
        (0.45 * clamp01(imagesCount / 6)) +
        (0.25 * clamp01(descLen / 280)) +
        (0.20 * clamp01(specsCount / 8)) +
        (0.10 * hasQuartier);

    // Recency-first (new platform), but still rewards quality and social proof.
    let score = (0.58 * recency) + (0.22 * ratingNorm) + (0.10 * popularityNorm) + (0.10 * quality);

    // 1. Dynamic Login Streak boost:
    // +5% visibility boost per day of login streak, up to a maximum of +25%.
    // If last login was yesterday, the boost is halved.
    const s = p?.seller || null;
    const lastLogin = s?.last_login_at || s?.lastLoginAt || null;
    const streak = Math.max(0, Number(s?.login_streak ?? s?.loginStreak) || 0);

    const todayKey = ctx?.todayKey || dayKeyInDouala(new Date(now));
    const yesterdayKey = ctx?.yesterdayKey || dayKeyInDouala(new Date(now - (24 * 60 * 60 * 1000)));
    const lastKey = dayKeyInDouala(lastLogin);

    let streakBoost = 1;
    if (lastKey && lastKey === todayKey) {
        streakBoost = 1 + (Math.min(streak, 5) * 0.05); // Up to +25%
    } else if (lastKey && lastKey === yesterdayKey) {
        streakBoost = 1 + (Math.min(streak, 5) * 0.025); // Up to +12.5%
    }
    score *= streakBoost;

    // 2. Technical Specifications boost:
    // Products with more than 3 specifications receive a +15% boost.
    if (specsCount > 3) {
        score *= 1.15;
    }

    // 3. High-quality Photos boost:
    // Products with 3 or more photos get a +20% boost.
    // Products with no photos get penalized by -50%.
    if (imagesCount >= 3) {
        score *= 1.20;
    } else if (imagesCount === 0) {
        score *= 0.50;
    }

    // 4. Chat Responsiveness boost:
    // Sellers with an average response time of less than 15 minutes get a +25% boost.
    const avgResponse = s?.avg_response_time !== undefined && s?.avg_response_time !== null 
        ? Number(s.avg_response_time) 
        : 30;
    if (avgResponse > 0 && avgResponse < 15) {
        score *= 1.25;
    }

    return score;
}

function computeRecentScore(p, ctx) {
    const now = ctx?.nowMs || Date.now();
    const createdMs = parseDateMs(p?.created_at);
    const ageHours = createdMs ? Math.max(0, (now - createdMs) / (1000 * 60 * 60)) : (24 * 30);
    
    // We prioritize recency (exponential decay: ~7-day half-life).
    let score = Math.exp(-ageHours / 168);

    const imagesCount = countProductImages(p);
    const descLen = safeLen(p?.description ?? p?.details ?? p?.desc);
    const specsCount = countProductSpecs(p);
    const hasQuartier = safeLen(p?.quartier ?? p?.district ?? p?.location) > 0 ? 1 : 0;

    // Penalty for missing image (very critical for e-commerce catalog quality)
    if (imagesCount === 0) {
        score -= 0.8;
    } else {
        score += 0.05 * clamp01(imagesCount / 6);
    }

    // Penalty or boost for description length
    if (descLen < 15) {
        score -= 0.15;
    } else {
        score += 0.05 * clamp01(descLen / 280);
    }

    // Minor boost for location detail
    if (hasQuartier) {
        score += 0.02;
    }

    // 1. Dynamic Login Streak boost:
    const s = p?.seller || null;
    const lastLogin = s?.last_login_at || s?.lastLoginAt || null;
    const streak = Math.max(0, Number(s?.login_streak ?? s?.loginStreak) || 0);

    const todayKey = ctx?.todayKey || dayKeyInDouala(new Date(now));
    const yesterdayKey = ctx?.yesterdayKey || dayKeyInDouala(new Date(now - (24 * 60 * 60 * 1000)));
    const lastKey = dayKeyInDouala(lastLogin);

    let streakBoost = 1;
    if (lastKey && lastKey === todayKey) {
        streakBoost = 1 + (Math.min(streak, 5) * 0.05); // Up to +25%
    } else if (lastKey && lastKey === yesterdayKey) {
        streakBoost = 1 + (Math.min(streak, 5) * 0.025); // Up to +12.5%
    }
    score *= streakBoost;

    // 2. Technical Specifications boost:
    if (specsCount > 3) {
        score *= 1.15;
    }

    // 3. High-quality Photos boost:
    if (imagesCount >= 3) {
        score *= 1.20;
    }

    // 4. Chat Responsiveness boost:
    const avgResponse = s?.avg_response_time !== undefined && s?.avg_response_time !== null 
        ? Number(s.avg_response_time) 
        : 30;
    if (avgResponse > 0 && avgResponse < 15) {
        score *= 1.25;
    }

    return score;
}

function computeLiquidationScore(p) {
    const price = Number(p?.price) || 0;
    if (price <= 0) return -999999; // Penalty for free/fake listings
    
    const imagesCount = countProductImages(p);
    const descLen = safeLen(p?.description ?? p?.details ?? p?.desc);
    
    let penalty = 0;
    if (imagesCount === 0) penalty += 500000;
    if (descLen < 15) penalty += 10000;
    
    return -price - penalty;
}

function computePriceDescScore(p) {
    const price = Number(p?.price) || 0;
    if (price <= 0) return -999999; // Penalty for free/fake listings
    
    const imagesCount = countProductImages(p);
    const descLen = safeLen(p?.description ?? p?.details ?? p?.desc);
    
    let penalty = 0;
    if (imagesCount === 0) penalty += 500000;
    if (descLen < 15) penalty += 10000;
    
    return price - penalty;
}

function diversifyBySeller(products, opts) {
    const cap = Math.max(1, Number(opts?.cap) || 3);
    const topN = Math.max(0, Number(opts?.topN) || 72);
    if (!Array.isArray(products) || products.length === 0) return products || [];

    const counts = new Map();
    const kept = [];
    const spill = [];

    for (const p of products) {
        const sellerId = String(p?.seller_id || p?.sellerId || '').trim();
        const cur = sellerId ? (counts.get(sellerId) || 0) : 0;
        const applyCap = kept.length < topN && sellerId;
        if (!applyCap || cur < cap) {
            kept.push(p);
            if (sellerId) counts.set(sellerId, cur + 1);
        } else {
            spill.push(p);
        }
    }

    return kept.concat(spill);
}

function normalizeSortKey(raw) {
    const s = String(raw || '').trim().toLowerCase().replace('_', '-');
    const allowed = new Set(['recommended', 'recent', 'price-asc', 'price-desc', 'popular', 'rating']);
    return allowed.has(s) ? s : 'recommended';
}

function computeWindowSize(page, limit) {
    const p = Math.max(0, Number(page) || 0);
    const l = Math.max(1, Number(limit) || 12);
    const want = (p + 1) * l * 10;
    const min = Math.max(l * 10, 120);
    return Math.min(400, Math.max(min, want));
}

function normalizeSpecsValue(specs) {
    // Accept array [{label,value}] or object {key:value}; return array.
    if (!specs) return [];

    if (Array.isArray(specs)) {
        return specs
            .map((it) => {
                if (!it || typeof it !== 'object') return null;
                const label = String(it.label ?? it.key ?? '').trim();
                const value = String(it.value ?? '').trim();
                if (!label) return null;
                return { label, value };
            })
            .filter(Boolean)
            .slice(0, 30);
    }

    if (typeof specs === 'object') {
        return Object.entries(specs)
            .map(([k, v]) => ({ label: String(k || '').trim(), value: String(v ?? '').trim() }))
            .filter((it) => it.label)
            .slice(0, 30);
    }

    return [];
}

function parseSpecsRaw(raw) {
    if (!raw) return [];
    if (Array.isArray(raw) || typeof raw === 'object') return normalizeSpecsValue(raw);
    const txt = String(raw).trim();
    if (!txt) return [];
    try {
        return normalizeSpecsValue(JSON.parse(txt));
    } catch (_) {
        // If it's not JSON, reject explicitly: specs should be sent as JSON from the dashboard.
        return null;
    }
}

async function ensureProfileRow({ userId, meta }) {
    const { data: existing, error: existingError } = await db
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (existing) return true;
    if (existingError && !isMissingRelationError(existingError)) {
        // If table exists but query failed, let caller proceed (Supabase triggers etc.)
    }

    const base = {
        id: userId,
        first_name: meta?.name || meta?.shop_name || '',
        last_name: '',
        phone: meta?.whatsapp || '',
        shop_name: meta?.shop_name || meta?.name || '',
        bio: '',
        created_at: new Date(),
        updated_at: new Date()
    };

    const insert1 = await db.from('profiles').insert([base]);
    if (!insert1?.error) return true;

    // Local DB might not have shop_name column (older schema)
    if (isMissingColumn(insert1.error, 'shop_name')) {
        const { shop_name, ...withoutShopName } = base;
        const insertShopFallback = await db.from('profiles').insert([withoutShopName]);
        if (!insertShopFallback?.error) return true;

        if (isMissingColumn(insertShopFallback.error, 'updated_at')) {
            const { updated_at, ...withoutUpdated } = withoutShopName;
            const insert2 = await db.from('profiles').insert([withoutUpdated]);
            if (!insert2?.error) return true;
        }

        return false;
    }

    // Local DB might not have updated_at column (older schema)
    if (isMissingColumn(insert1.error, 'updated_at')) {
        const { updated_at, ...withoutUpdated } = base;
        const insert2 = await db.from('profiles').insert([withoutUpdated]);
        if (!insert2?.error) return true;
    }

    return false;
}

async function attachImagesToProducts(products) {
    if (!Array.isArray(products) || products.length === 0) return products;

    // If the product row already has an "images" column (json/jsonb) populated,
    // prefer it and don't override. This keeps multi-images working even without
    // the separate product_images table.
    const missing = products.filter(p => !(Array.isArray(p?.images) && p.images.filter(Boolean).length > 0));
    if (missing.length === 0) {
        for (const p of products) {
            if (p?.image_url) p.image_url = normalizeStorageUrl(p.image_url);
            if (Array.isArray(p?.images)) p.images = p.images.map(normalizeStorageUrl);
        }
        return products;
    }

    const ids = missing.map(p => p?.id).filter(Boolean);
    if (ids.length === 0) return products;

    if (productImagesFeatureEnabled === false) return products;

    try {
        const orFilter = ids.map(id => `product_id.eq.${id}`).join(',');
        let { data: images, error } = await db
            .from('product_images')
            .select('*')
            .or(orFilter)
            .order('sort', { ascending: true });

        // Some schemas don't have "sort" (older DB). Retry without ordering.
        if (error && isMissingColumn(error, 'sort')) {
            const retry = await db
                .from('product_images')
                .select('*')
                .or(orFilter);
            images = retry.data;
            error = retry.error;
        }

        if (error) {
            if (isMissingRelationError(error) || isPostgrestMissingTable(error, 'public.product_images') || isPostgrestMissingTable(error, 'product_images')) {
                productImagesFeatureEnabled = false;
            }
            return products;
        }

        productImagesFeatureEnabled = true;

        const byProduct = new Map();
        for (const img of (images || [])) {
            const pid = img.product_id;
            if (!byProduct.has(pid)) byProduct.set(pid, []);
            byProduct.get(pid).push(normalizeStorageUrl(img.url));
        }

        for (const p of products) {
            const existing = Array.isArray(p?.images) ? p.images.filter(Boolean) : [];
            const urls = (existing.length > 0) ? existing : (byProduct.get(p.id) || []);
            p.images = urls.map(normalizeStorageUrl);
            if (p.image_url) p.image_url = normalizeStorageUrl(p.image_url);
        }
    } catch (_) {
        // Table inexistante ou requête non supportée -> on ignore
    }

    return products;
}

async function attachSellerProfilesToProducts(products) {
    if (!Array.isArray(products) || products.length === 0) return products;

    const ids = Array.from(new Set(products.map(p => p?.seller_id).filter(Boolean)));
    if (ids.length === 0) return products;

    try {
        const orFilter = ids.map(id => `id.eq.${id}`).join(',');
        let { data: sellers, error } = await db
            .from('profiles')
            .select('id,shop_name,first_name,last_name,phone,bio,last_login_at,login_streak,avg_response_time,is_verified')
            .or(orFilter);

        if (error && isMissingColumn(error, 'shop_name')) {
            const retry = await db
                .from('profiles')
                .select('id,first_name,last_name,bio,last_login_at,login_streak,avg_response_time,is_verified')
                .or(orFilter);
            sellers = retry.data;
            error = retry.error;
        }

        if (error && (isMissingColumn(error, 'last_login_at') || isMissingColumn(error, 'login_streak'))) {
            // Older schema without activity fields.
            const retry = await db
                .from('profiles')
                .select('id,shop_name,first_name,last_name,phone,bio,is_verified')
                .or(orFilter);
            sellers = retry.data;
            error = retry.error;
            if (error && isMissingColumn(error, 'shop_name')) {
                const retry2 = await db
                    .from('profiles')
                    .select('id,first_name,last_name,bio,is_verified')
                    .or(orFilter);
                sellers = retry2.data;
                error = retry2.error;
            }
        }

        if (error) return products;

        const byId = new Map();
        for (const s of (sellers || [])) byId.set(s.id, s);

        for (const p of products) {
            const seller = byId.get(p.seller_id);
            if (seller) p.seller = seller;
        }
    } catch (_) {
        // ignore
    }

    return products;
}

async function attachUserProfilesToReviews(reviews) {
    if (!Array.isArray(reviews) || reviews.length === 0) return reviews;

    const ids = Array.from(new Set(reviews.map(r => r?.user_id).filter(Boolean)));
    if (ids.length === 0) return reviews;

    try {
        const orFilter = ids.map(id => `id.eq.${id}`).join(',');
        const { data: users, error } = await db
            .from('profiles')
            .select('id,first_name,last_name')
            .or(orFilter);

        if (error) return reviews;
        const byId = new Map((users || []).map(u => [u.id, u]));
        for (const r of reviews) {
            const u = byId.get(r.user_id);
            if (u) r.user = u;
        }
    } catch (_) {
        // ignore
    }

    return reviews;
}

async function attachReviewStatsToProducts(products) {
    if (!Array.isArray(products) || products.length === 0) return products;
    const ids = products.map(p => p?.id).filter(Boolean);
    if (ids.length === 0) return products;

    try {
        const orFilter = ids.map(id => `product_id.eq.${id}`).join(',');
        const reviewsTable = await getReviewsTableName();
        const { data: rows, error } = await db
            .from(reviewsTable)
            .select('product_id,rating')
            .or(orFilter);

        if (error) return products;

        const stats = new Map(); // product_id -> { sum, count }
        for (const r of (rows || [])) {
            const pid = r?.product_id;
            if (!pid) continue;
            const rating = Number(r?.rating);
            if (!Number.isFinite(rating)) continue;
            const cur = stats.get(pid) || { sum: 0, count: 0 };
            cur.sum += rating;
            cur.count += 1;
            stats.set(pid, cur);
        }

        for (const p of products) {
            const cur = stats.get(p.id);
            const count = cur?.count || 0;
            p.reviews = count;
            p.rating = count > 0 ? (cur.sum / count) : 0;
        }
    } catch (_) {
        // ignore
    }

    return products;
}

// Récupérer les produits avec pagination
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 12;
    const from = page * limit;
    const to = from + limit - 1;

    const sellerId = String(req.query.seller_id || req.query.sellerId || '').trim();
    const sortType = normalizeSortKey(req.query.sort || req.query.order || '');
    const productsTable = await getProductsTableName();

    const computedSort = (!sellerId) && (sortType === 'recommended' || sortType === 'popular' || sortType === 'rating' || sortType === 'recent' || sortType === 'price-asc' || sortType === 'price-desc');
    const windowSize = computedSort ? computeWindowSize(page, limit) : 0;

    let query = db
        .from(productsTable)
        .select('*', { count: 'exact' });

    if (sellerId) query = query.eq('seller_id', sellerId);

    if (computedSort) {
        // Fetch a larger window from the top then rank in-memory to keep pagination stable.
        if (sortType === 'price-asc') {
            query = query.order('price', { ascending: true });
        } else if (sortType === 'price-desc') {
            query = query.order('price', { ascending: false });
        } else {
            query = query.order('created_at', { ascending: false });
        }
        query = query.range(0, Math.max(0, windowSize - 1));
    } else {
        // Keep pagination efficient for simple sorts.
        if (sortType === 'price-asc') query = query.order('price', { ascending: true });
        else if (sortType === 'price-desc') query = query.order('price', { ascending: false });
        else query = query.order('created_at', { ascending: false }); // recent (and seller pages default)

        query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) return res.status(400).json({ error: error.message });

    await attachImagesToProducts(data);
    await attachSellerProfilesToProducts(data);
    await attachReviewStatsToProducts(data);

    // Normalize URLs even if product_images feature is disabled.
    for (const p of (data || [])) {
        if (p?.image_url) p.image_url = normalizeStorageUrl(p.image_url);
        if (Array.isArray(p?.images)) p.images = p.images.map(normalizeStorageUrl);
    }

    let out = data || [];
    if (computedSort) {
        const nowMs = Date.now();
        const maxReviews = out.reduce((m, p) => Math.max(m, Number(p?.reviews) || 0), 0);
        const todayKey = dayKeyInDouala(new Date(nowMs));
        const yesterdayKey = dayKeyInDouala(new Date(nowMs - (24 * 60 * 60 * 1000)));
        const ctx = { nowMs, maxReviews, todayKey, yesterdayKey };

        if (sortType === 'popular') {
            const scored = out.map((p) => {
                const reviews = Number(p?.reviews) || 0;
                const bayes = computeBayesianRating(p?.rating, p?.reviews, 4.2, 8);
                const createdMs = parseDateMs(p?.created_at);
                return { p, reviews, bayes, createdMs };
            });
            scored.sort((a, b) => {
                if (b.reviews !== a.reviews) return b.reviews - a.reviews;
                if (b.bayes !== a.bayes) return b.bayes - a.bayes;
                return b.createdMs - a.createdMs;
            });
            out = scored.map((item) => item.p);
        } else if (sortType === 'rating') {
            const scored = out.map((p) => {
                const reviews = Number(p?.reviews) || 0;
                const bayes = computeBayesianRating(p?.rating, p?.reviews, 4.2, 8);
                const createdMs = parseDateMs(p?.created_at);
                return { p, reviews, bayes, createdMs };
            });
            scored.sort((a, b) => {
                if (b.bayes !== a.bayes) return b.bayes - a.bayes;
                if (b.reviews !== a.reviews) return b.reviews - a.reviews;
                return b.createdMs - a.createdMs;
            });
            out = scored.map((item) => item.p);
        } else if (sortType === 'recent') {
            const scored = out.map((p) => {
                const score = computeRecentScore(p, ctx);
                const createdMs = parseDateMs(p?.created_at);
                return { p, score, createdMs };
            });
            scored.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return b.createdMs - a.createdMs;
            });
            out = scored.map((item) => item.p);
            out = diversifyBySeller(out, { cap: 3, topN: Math.min(72, out.length) });
        } else if (sortType === 'price-asc') {
            const scored = out.map((p) => {
                const score = computeLiquidationScore(p);
                return { p, score };
            });
            scored.sort((a, b) => b.score - a.score);
            out = scored.map((item) => item.p);
            out = diversifyBySeller(out, { cap: 3, topN: Math.min(72, out.length) });
        } else if (sortType === 'price-desc') {
            const scored = out.map((p) => {
                const score = computePriceDescScore(p);
                return { p, score };
            });
            scored.sort((a, b) => b.score - a.score);
            out = scored.map((item) => item.p);
            out = diversifyBySeller(out, { cap: 3, topN: Math.min(72, out.length) });
        } else {
            // recommended / Meilleurs choix
            const scored = out.map((p) => {
                const score = computeRecommendedScore(p, ctx);
                const createdMs = parseDateMs(p?.created_at);
                return { p, score, createdMs };
            });
            scored.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return b.createdMs - a.createdMs;
            });
            out = scored.map((item) => item.p);
            out = diversifyBySeller(out, { cap: 3, topN: Math.min(72, out.length) });
        }

        out = out.slice(from, to + 1);
    }
    
    res.json({
        products: out,
        total: count,
        page: page,
        limit: limit,
        hasMore: (Number(count) || 0) > ((page + 1) * limit)
    });
});

// Récupérer les produits du vendeur connecté
router.get('/me', authenticate, async (req, res) => {
    const token = req.accessToken;
    const userAuth = { user: req.user };

    const productsTable = await getProductsTableName();
    const readDb = (db?.__vendoscityKeys?.hasServiceRole)
        ? db
        : (typeof db?.asUser === 'function' ? db.asUser(token) : db);

    const { data, error } = await readDb
        .from(productsTable)
        .select('*')
        .eq('seller_id', userAuth.user.id)
        .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    await attachImagesToProducts(data);
    await attachSellerProfilesToProducts(data);
    await attachReviewStatsToProducts(data);

    // Normalize URLs
    for (const p of (data || [])) {
        if (p?.image_url) p.image_url = normalizeStorageUrl(p.image_url);
        if (Array.isArray(p?.images)) p.images = p.images.map(normalizeStorageUrl);
    }

    res.json(data);
});

// Récupérer un seul produit par ID (avec infos vendeur)
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const productsTable = await getProductsTableName();
    let { data, error } = await db
        .from(productsTable)
        .select('*')
        .eq('id', id)
        .single();

    // If we guessed the wrong table name (ex: migration/prod), try the alternative once.
    if (error && isMissingTableError(error, productsTable)) {
        const alt = productsTable === 'products' ? 'produits' : 'products';
        const altRes = await db.from(alt).select('*').eq('id', id).single();
        data = altRes.data;
        error = altRes.error;
        if (!altRes.error) productsTableNameCache = alt;
    }

    if (error) {
        // Don't hide "table missing / permission denied" as "not found"
        const msg = String(error.message || '');
        const isNotFound = msg.toLowerCase().includes('row not found') || msg.toLowerCase().includes('not found');
        if (isNotFound) return res.status(404).json({ error: 'Produit non trouvé' });
        if (isUuidSyntaxErrorMessage(msg)) return res.status(400).json({ error: 'Lien invalide (ID produit incorrect).' });
        if (isMissingTableError(error, 'products') || isMissingTableError(error, 'produits')) {
            return res.status(400).json({ error: "Configuration BD: table produits/products introuvable sur Supabase." });
        }
        return res.status(400).json({ error: msg || 'Erreur BD' });
    }

    try {
        await attachReviewStatsToProducts([data]);
    } catch (_) { /* ignore */ }

    try {
        await attachSellerProfilesToProducts([data]);
    } catch (_) { /* ignore */ }

    // Prefer "images" column if present (json/jsonb). Fallback to product_images table.
    if (Array.isArray(data?.images) && data.images.filter(Boolean).length > 0) {
        data.images = data.images.map(normalizeStorageUrl);
    } else if (productImagesFeatureEnabled === false) {
        data.images = [];
    } else {
        try {
            let { data: images, error: imagesError } = await db
                .from('product_images')
                .select('*')
                .eq('product_id', id)
                .order('sort', { ascending: true });

            if (imagesError && isMissingColumn(imagesError, 'sort')) {
                const retry = await db
                    .from('product_images')
                    .select('*')
                    .eq('product_id', id);
                images = retry.data;
                imagesError = retry.error;
            }

            if (imagesError) {
                if (isMissingRelationError(imagesError) || isPostgrestMissingTable(imagesError, 'public.product_images') || isPostgrestMissingTable(imagesError, 'product_images')) {
                    productImagesFeatureEnabled = false;
                }
                data.images = [];
            } else {
                productImagesFeatureEnabled = true;
                data.images = (images || []).map(i => normalizeStorageUrl(i.url));
            }
        } catch (_) {
            data.images = [];
        }
    }
    if (data.image_url) data.image_url = normalizeStorageUrl(data.image_url);

    res.json(data);
});

// Récupérer les avis d'un produit
router.get('/:id/reviews', async (req, res) => {
    const { id } = req.params;
    const reviewsTable = await getReviewsTableName();
    const { data, error } = await db
        .from(reviewsTable)
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: false });

    if (error) {
        const msg = String(error.message || '');
        if (isUuidSyntaxErrorMessage(msg)) return res.status(400).json({ error: 'Lien invalide (ID produit incorrect).' });
        if (isMissingTableError(error, reviewsTable) || isMissingTableError(error, 'reviews') || isMissingTableError(error, 'avis')) {
            return res.json([]);
        }
        return res.status(400).json({ error: msg });
    }
    const enriched = await attachUserProfilesToReviews(data || []);
    res.json(enriched || []);
});

// Ajouter un avis sur un produit
router.post('/:id/reviews', authenticate, async (req, res) => {
    const { id } = req.params;
    const token = req.accessToken;
    const userAuth = { user: req.user };

    const { rating, comment } = req.body;
    const ratingInt = parseInt(String(rating), 10);
    if (!Number.isFinite(ratingInt) || ratingInt < 1 || ratingInt > 5) {
        return res.status(400).json({ error: 'Note invalide. Choisissez une note entre 1 et 5.' });
    }

    // Fetch the reviewer's profile to use their real name
    let reviewerName = 'Anonyme';
    try {
        const { data: profileData } = await db
            .from('profiles')
            .select('first_name, last_name, shop_name')
            .eq('id', userAuth.user.id)
            .single();
        if (profileData) {
            reviewerName = profileData.shop_name ||
                [profileData.first_name, profileData.last_name].filter(Boolean).join(' ') ||
                'Utilisateur Vendoscity';
        }
    } catch (_) { /* ignore */ }

    const writeDb = (db?.__vendoscityKeys?.hasServiceRole)
        ? db
        : (typeof db?.asUser === 'function' ? db.asUser(token) : db);

    const { data, error } = await writeDb
        .from(await getReviewsTableName())
        .insert([
            {
                product_id: id,
                user_id: userAuth.user.id,
                name: reviewerName,
                rating: ratingInt,
                comment: comment
            }
        ])
        .select()
        .single();

    if (error) return res.status(400).json({ error: error.message });
    // Return enriched review
    const enriched = data ? { ...data, reviewer_name: reviewerName } : data;
    res.status(201).json(enriched);
});

// Supprimer son avis (l'utilisateur ne peut supprimer que ses propres avis)
router.delete('/:productId/reviews/:reviewId', authenticate, async (req, res) => {
    const { productId, reviewId } = req.params;
    const token = req.accessToken;
    const userAuth = { user: req.user };

    const writeDb = (db?.__vendoscityKeys?.hasServiceRole)
        ? db
        : (typeof db?.asUser === 'function' ? db.asUser(token) : db);

    const reviewsTable = await getReviewsTableName();
    const { error } = await writeDb
        .from(reviewsTable)
        .delete()
        .eq('id', reviewId)
        .eq('product_id', productId)
        .eq('user_id', userAuth.user.id);

    if (error) return res.status(400).json({ error: error.message });
    return res.status(204).send();
});

// Ajouter un produit (avec 1+ images)
router.post(
    '/',
    authenticate,
    upload.fields([{ name: 'images', maxCount: 6 }, { name: 'image', maxCount: 1 }]),
    async (req, res) => {
    const token = req.accessToken;
    const userAuth = { user: req.user };

    // Local/dev safety: ensure a matching profile row exists for FK constraints (products.seller_id -> profiles.id).
    try {
        await ensureProfileRow({ userId: userAuth.user.id, meta: userAuth.user.user_metadata || {} });
    } catch (_) { /* ignore */ }

    const title = clampLen(req.body?.title, 100);
    const category = clampLen(req.body?.category, 40);
    const description = clampLen(req.body?.description, 500);
    const whatsapp = normalizePhone(req.body?.whatsapp);
    const quartier = clampLen(req.body?.quartier, 40);
    const priceNum = Number(req.body?.price);
    const discountAmount = Number(req.body?.discount_amount) || 0;
    const oldPrice = Number(req.body?.old_price) || 0;
    const parsedSpecs = parseSpecsRaw(req.body?.specs);
    if (parsedSpecs === null) {
        return res.status(400).json({ error: 'Format specs invalide. Envoyez un JSON (ex: [{\"label\":\"RAM\",\"value\":\"8GB\"}]).' });
    }
    let imageUrl = null;
    const imageUrls = [];

    if (!title || title.length < 2) {
        return res.status(400).json({ error: 'Titre invalide' });
    }
    if (!category) {
        return res.status(400).json({ error: 'Categorie obligatoire' });
    }
    if (!Number.isFinite(priceNum) || priceNum < 0 || priceNum > 1_000_000_000) {
        return res.status(400).json({ error: 'Prix invalide' });
    }
    if (!whatsapp || whatsapp.length < 6 || whatsapp.length > 20) {
        return res.status(400).json({ error: 'Le numero WhatsApp du vendeur est obligatoire pour publier un produit.' });
    }

    const files = [
        ...(req.files?.images || []),
        ...(req.files?.image || [])
    ];

    if (files.length === 0) {
        return res.status(400).json({ error: 'Ajoutez au moins une image pour publier le produit.' });
    }
    if (files.length > 6) {
        return res.status(400).json({ error: 'Maximum 6 images.' });
    }

    // Upload images to Storage
    // Prefer service-role (admin) client; fallback to a user-scoped client if available (anon key + policies).
    const storageDb = (db?.__vendoscityKeys?.hasServiceRole)
        ? db
        : (typeof db?.asUser === 'function' ? db.asUser(token) : db);

    // For DB writes under RLS, also use a user-scoped client when service role is not available.
    const writeDb = storageDb;
    const productsTable = await getProductsTableName();

    for (const f of files) {
        const mime = String(f?.mimetype || '').toLowerCase();
        if (!ALLOWED_IMAGE_MIME.has(mime)) {
            return res.status(400).json({ error: 'Type de fichier non supporte (images uniquement).' });
        }
        if (!f?.buffer || !hasMagicBytes(mime, f.buffer)) {
            return res.status(400).json({ error: 'Fichier image invalide.' });
        }

        const fileExt = EXT_BY_MIME[mime] || 'jpg';
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${userAuth.user.id}/${fileName}`;

        const { error: uploadError } = await storageDb.storage
            .from('product-images')
            .upload(filePath, f.buffer, { contentType: mime });

        if (uploadError) {
            const msg = String(uploadError.message || uploadError.error_description || uploadError || '');
            const isRls = msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('violates row-level security');
            if (isRls) {
                return res.status(400).json({
                    error: "Erreur upload image: blocage RLS (Storage). Ajoutez une policy d'upload sur le bucket 'product-images' (authenticated + dossier = auth.uid()) OU configurez SUPABASE_SERVICE_ROLE_KEY sur le serveur backend."
                });
            }
            return res.status(400).json({ error: 'Erreur upload image: ' + msg });
        }

        // Prefer PUBLIC object URLs when possible (stable, cacheable, no token).
        // If the bucket is private, the public URL won't be accessible: fallback to signed object URL.
        let finalUrl = null;
        let publicObjectUrl = null;

        try {
            const { data: publicUrlData } = db.storage.from('product-images').getPublicUrl(filePath);
            if (publicUrlData?.publicUrl) publicObjectUrl = publicUrlData.publicUrl;
        } catch (_) { /* ignore */ }

        if (publicObjectUrl) finalUrl = publicObjectUrl;

        if (!finalUrl) {
            try {
                const expiresIn = parseInt(String(process.env.SUPABASE_SIGNED_URL_EXPIRES_IN || ''), 10) || (60 * 60 * 24 * 365);
                const { data: signed, error: signErr } = await storageDb.storage
                    .from('product-images')
                    .createSignedUrl(filePath, expiresIn);

                if (!signErr && signed?.signedUrl) finalUrl = normalizeStorageUrl(signed.signedUrl);
            } catch (_) {
                // ignore
            }
        }

        if (finalUrl) imageUrls.push(normalizeStorageUrl(finalUrl));
    }

    imageUrl = imageUrls[0] || null;

    // Insérer dans la table products
    const row = {
        title,
        price: priceNum,
        category,
        description,
        image_url: imageUrl,
        images: imageUrls,
        quartier: String(quartier || '').trim(),
        seller_id: userAuth.user.id,
        whatsapp,
        specs: parsedSpecs && parsedSpecs.length > 0 ? parsedSpecs : [],
        discount_amount: discountAmount,
        old_price: oldPrice
    };

    // Ensure we get the created row back (needed for productId + consistent frontend display).
    let specsIgnored = false;
    let imagesIgnored = false;
    let curRow = { ...row };
    let insertRes = await writeDb.from(productsTable).insert([curRow]).select('*');

    // Retry strategy for older schemas (missing columns).
    for (let i = 0; i < 3 && insertRes?.error; i++) {
        if (insertRes?.error && isMissingColumn(insertRes.error, 'specs')) {
            const had = Array.isArray(curRow.specs) && curRow.specs.length > 0;
            delete curRow.specs;
            if (had) specsIgnored = true;
            insertRes = await writeDb.from(productsTable).insert([curRow]).select('*');
            continue;
        }
        if (insertRes?.error && isMissingColumn(insertRes.error, 'images')) {
            const had = Array.isArray(curRow.images) && curRow.images.length > 0;
            delete curRow.images;
            if (had) imagesIgnored = true;
            insertRes = await writeDb.from(productsTable).insert([curRow]).select('*');
            continue;
        }
        if (insertRes?.error && isMissingColumn(insertRes.error, 'quartier')) {
            delete curRow.quartier;
            insertRes = await writeDb.from(productsTable).insert([curRow]).select('*');
            continue;
        }
        if (insertRes?.error && isMissingColumn(insertRes.error, 'discount_amount')) {
            delete curRow.discount_amount;
            insertRes = await writeDb.from(productsTable).insert([curRow]).select('*');
            continue;
        }
        if (insertRes?.error && isMissingColumn(insertRes.error, 'old_price')) {
            delete curRow.old_price;
            insertRes = await writeDb.from(productsTable).insert([curRow]).select('*');
            continue;
        }
        break;
    }

    const { data, error } = insertRes;

    if (error) return res.status(400).json({ error: 'Erreur insertion bd: ' + error.message });

    const created = Array.isArray(data) ? data[0] : null;
    const productId = created?.id;

    // Best-effort: store all images in product_images table (if present).
    // If it fails (FK/RLS/missing table), we keep going; multi-images can still work via the JSON "images" column.
    let productImagesInsertWarning = null;
    if (productId && imageUrls.length > 0) {
        try {
            const rows = imageUrls.map((url, idx) => ({ product_id: productId, url, sort: idx }));
            const r1 = await writeDb.from('product_images').insert(rows);
            if (r1?.error && isMissingColumn(r1.error, 'sort')) {
                const r2 = await writeDb.from('product_images').insert(imageUrls.map((url) => ({ product_id: productId, url })));
                if (r2?.error) {
                    if (isMissingRelationError(r2.error) || isPostgrestMissingTable(r2.error, 'public.product_images') || isPostgrestMissingTable(r2.error, 'product_images')) {
                        productImagesFeatureEnabled = false;
                    } else {
                        productImagesInsertWarning = String(r2.error.message || r2.error);
                    }
                }
            } else if (r1?.error) {
                if (isMissingRelationError(r1.error) || isPostgrestMissingTable(r1.error, 'public.product_images') || isPostgrestMissingTable(r1.error, 'product_images')) {
                    productImagesFeatureEnabled = false;
                } else {
                    productImagesInsertWarning = String(r1.error.message || r1.error);
                }
            }
        } catch (e) {
            productImagesInsertWarning = String(e?.message || e || '');
        }
    }

    // Always return images to the frontend (even if stored in product_images table instead).
    const payload = created ? { ...created } : (Array.isArray(data) ? { ...data[0] } : {});
    payload.images = imageUrls;
    if (payload.image_url) payload.image_url = normalizeStorageUrl(payload.image_url);
    payload.images = Array.isArray(payload.images) ? payload.images.map(normalizeStorageUrl) : [];

    const warnings = [];
    if (specsIgnored) warnings.push('Les spécificités ont été ignorées car la colonne produits/products.specs n’existe pas dans la base.');
    if (imagesIgnored) warnings.push('Les images multiples ne sont pas stockées dans la table produits/products (colonne images manquante).');
    if (productImagesInsertWarning) {
        const msg = String(productImagesInsertWarning);
        const lower = msg.toLowerCase();
        if (lower.includes('foreign key') || lower.includes('clé étrangère') || lower.includes('23503')) {
            warnings.push("Multi-images: insertion dans product_images a échoué (clé étrangère). Si votre table principale est 'produits', créez une table images liée à 'produits' OU utilisez la colonne JSON 'images' (SQL fourni).");
        } else if (lower.includes('row level security') || lower.includes('violates row-level security')) {
            warnings.push("Multi-images: insertion dans product_images bloquée par RLS. Ajoutez une policy d'insert/select sur product_images (authenticated) ou utilisez la colonne JSON 'images'.");
        } else {
            warnings.push('Multi-images: insertion dans product_images a échoué: ' + msg);
        }
    }

    res.status(201).json({
        data: payload,
        warning: warnings.length > 0 ? warnings.join(' ') : null
    });
});

// Modifier un produit (le vendeur peut modifier ses champs, et optionnellement remplacer les images)
router.put('/:id', authenticate, upload.fields([{ name: 'images', maxCount: 6 }, { name: 'image', maxCount: 1 }]), async (req, res) => {
    const { id } = req.params;
    const token = req.accessToken;
    const userAuth = { user: req.user };

    const productsTable = await getProductsTableName();
    const writeDb = (db?.__vendoscityKeys?.hasServiceRole)
        ? db
        : (typeof db?.asUser === 'function' ? db.asUser(token) : db);

    // Ensure it exists and belongs to seller
    let existing = null;
    try {
        const ex = await writeDb.from(productsTable).select('*').eq('id', id).single();
        if (ex?.error) {
            const msg = String(ex.error.message || '');
            const isNotFound = msg.toLowerCase().includes('row not found') || msg.toLowerCase().includes('not found');
            if (isNotFound) return res.status(404).json({ error: 'Produit non trouvé' });
            return res.status(400).json({ error: ex.error.message || 'Erreur BD' });
        }
        existing = ex.data;
    } catch (e) {
        return res.status(400).json({ error: String(e?.message || e || 'Erreur BD') });
    }

    if (String(existing?.seller_id || '') !== String(userAuth.user.id || '')) {
        return res.status(403).json({ error: 'Accès refusé' });
    }

    const {
        title,
        price,
        category,
        description,
        whatsapp,
        quartier,
        discount_amount,
        old_price
    } = req.body || {};

    const parsedSpecs = parseSpecsRaw(req.body?.specs);
    if (parsedSpecs === null) {
        return res.status(400).json({ error: 'Format specs invalide. Envoyez un JSON (ex: [{\"label\":\"RAM\",\"value\":\"8GB\"}]).' });
    }

    // If images are provided, replace the image set. If not, keep current images.
    const files = [
        ...(req.files?.images || []),
        ...(req.files?.image || [])
    ];

    const nextImageUrls = [];
    if (files.length > 0) {
        if (files.length > 6) return res.status(400).json({ error: 'Vous pouvez ajouter au maximum 6 images.' });

        const storageDb = (db?.__vendoscityKeys?.hasServiceRole)
            ? db
            : (typeof db?.asUser === 'function' ? db.asUser(token) : db);

        for (const f of files) {
            const fileExt = String(f.originalname || '').split('.').pop() || 'jpg';
            const fileName = `${uuidv4()}.${fileExt}`;
            const filePath = `${userAuth.user.id}/${fileName}`;

            const { error: uploadError } = await storageDb.storage
                .from('product-images')
                .upload(filePath, f.buffer, { contentType: f.mimetype });

            if (uploadError) {
                const msg = String(uploadError.message || uploadError.error_description || uploadError || '');
                const isRls = msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('violates row-level security');
                if (isRls) {
                    return res.status(400).json({
                        error: "Erreur upload image: blocage RLS (Storage). Ajoutez une policy d'upload sur le bucket 'product-images' (authenticated + dossier = auth.uid()) OU configurez SUPABASE_SERVICE_ROLE_KEY sur le serveur backend."
                    });
                }
                return res.status(400).json({ error: 'Erreur upload image: ' + msg });
            }

            let finalUrl = null;
            try {
                const { data: publicUrlData } = db.storage.from('product-images').getPublicUrl(filePath);
                if (publicUrlData?.publicUrl) finalUrl = publicUrlData.publicUrl;
            } catch (_) { /* ignore */ }

            if (!finalUrl) {
                try {
                    const expiresIn = parseInt(String(process.env.SUPABASE_SIGNED_URL_EXPIRES_IN || ''), 10) || (60 * 60 * 24 * 365);
                    const { data: signed, error: signErr } = await storageDb.storage
                        .from('product-images')
                        .createSignedUrl(filePath, expiresIn);
                    if (!signErr && signed?.signedUrl) finalUrl = normalizeStorageUrl(signed.signedUrl);
                } catch (_) { /* ignore */ }
            }

            if (finalUrl) nextImageUrls.push(normalizeStorageUrl(finalUrl));
        }
    }

    const updateRow = {};
    if (title !== undefined) updateRow.title = title;
    if (price !== undefined && price !== '') updateRow.price = parseFloat(price);
    if (category !== undefined) updateRow.category = category;
    if (description !== undefined) updateRow.description = description;
    if (whatsapp !== undefined) updateRow.whatsapp = whatsapp;
    if (quartier !== undefined) updateRow.quartier = String(quartier || '').trim();
    if (parsedSpecs !== undefined && parsedSpecs !== null) updateRow.specs = parsedSpecs;
    if (discount_amount !== undefined) updateRow.discount_amount = parseFloat(discount_amount) || 0;
    if (old_price !== undefined) updateRow.old_price = parseFloat(old_price) || 0;

    if (files.length > 0) {
        updateRow.image_url = nextImageUrls[0] || null;
        updateRow.images = nextImageUrls;
    }

    // Retry strategy for older schemas (missing columns).
    let specsIgnored = false;
    let imagesIgnored = false;
    let cur = { ...updateRow };
    let updateRes = await writeDb
        .from(productsTable)
        .update(cur)
        .eq('id', id)
        .eq('seller_id', userAuth.user.id)
        .select('*');

    for (let i = 0; i < 3 && updateRes?.error; i++) {
        if (updateRes?.error && isMissingColumn(updateRes.error, 'specs') && 'specs' in cur) {
            const had = Array.isArray(cur.specs) && cur.specs.length > 0;
            delete cur.specs;
            if (had) specsIgnored = true;
            updateRes = await writeDb.from(productsTable).update(cur).eq('id', id).eq('seller_id', userAuth.user.id).select('*');
            continue;
        }
        if (updateRes?.error && isMissingColumn(updateRes.error, 'images') && 'images' in cur) {
            const had = Array.isArray(cur.images) && cur.images.length > 0;
            delete cur.images;
            if (had) imagesIgnored = true;
            updateRes = await writeDb.from(productsTable).update(cur).eq('id', id).eq('seller_id', userAuth.user.id).select('*');
            continue;
        }
        if (updateRes?.error && isMissingColumn(updateRes.error, 'quartier') && 'quartier' in cur) {
            delete cur.quartier;
            updateRes = await writeDb.from(productsTable).update(cur).eq('id', id).eq('seller_id', userAuth.user.id).select('*');
            continue;
        }
        if (updateRes?.error && isMissingColumn(updateRes.error, 'discount_amount') && 'discount_amount' in cur) {
            delete cur.discount_amount;
            updateRes = await writeDb.from(productsTable).update(cur).eq('id', id).eq('seller_id', userAuth.user.id).select('*');
            continue;
        }
        if (updateRes?.error && isMissingColumn(updateRes.error, 'old_price') && 'old_price' in cur) {
            delete cur.old_price;
            updateRes = await writeDb.from(productsTable).update(cur).eq('id', id).eq('seller_id', userAuth.user.id).select('*');
            continue;
        }
        break;
    }

    if (updateRes?.error) return res.status(400).json({ error: updateRes.error.message || 'Erreur BD' });

    const updatedRow = Array.isArray(updateRes.data) ? updateRes.data[0] : updateRes.data;

    // If images were replaced and product_images table exists, replace rows too.
    if (files.length > 0 && updatedRow?.id) {
        try {
            const del = await writeDb.from('product_images').delete().eq('product_id', updatedRow.id);
            if (del?.error && (isMissingRelationError(del.error) || isPostgrestMissingTable(del.error, 'public.product_images') || isPostgrestMissingTable(del.error, 'product_images'))) {
                productImagesFeatureEnabled = false;
            } else {
                const rows = nextImageUrls.map((url, idx) => ({ product_id: updatedRow.id, url, sort: idx }));
                const ins = await writeDb.from('product_images').insert(rows);
                if (ins?.error && (isMissingRelationError(ins.error) || isPostgrestMissingTable(ins.error, 'public.product_images') || isPostgrestMissingTable(ins.error, 'product_images'))) {
                    productImagesFeatureEnabled = false;
                }
            }
        } catch (_) { /* ignore */ }
    }

    const payload = { ...(updatedRow || {}) };
    // Always provide images list to frontend
    if (files.length > 0) payload.images = nextImageUrls;
    payload.images = Array.isArray(payload.images) ? payload.images.map(normalizeStorageUrl) : [];
    if (payload.image_url) payload.image_url = normalizeStorageUrl(payload.image_url);

    const warnings = [];
    if (specsIgnored) warnings.push('Les spécificités ont été ignorées car la colonne produits/products.specs n’existe pas dans la base.');
    if (imagesIgnored) warnings.push('Les images multiples ne sont pas stockées dans la table produits/products (colonne images manquante).');

    return res.json({ data: payload, warning: warnings.length ? warnings.join(' ') : null });
});

// Supprimer un produit du vendeur
router.delete('/:id', authenticate, async (req, res) => {
    const token = req.accessToken;
    const userAuth = { user: req.user };

    const productsTable = await getProductsTableName();
    const writeDb = (db?.__vendoscityKeys?.hasServiceRole)
        ? db
        : (typeof db?.asUser === 'function' ? db.asUser(token) : db);

    // Ensure they only delete their own product
    const { error } = await writeDb
        .from(productsTable)
        .delete()
        .eq('id', req.params.id)
        .eq('seller_id', userAuth.user.id);

    if (error) return res.status(400).json({ error: error.message });
    res.status(204).send();
});

// Multer / upload error handler (must be after routes)
router.use((err, req, res, next) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: `Image trop grande. Max: ${MAX_IMAGE_BYTES} octets.` });
        }
        return res.status(400).json({ error: 'Erreur upload: ' + err.message });
    }

    if (String(err?.code || '') === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ error: err.message || 'Type de fichier non supporté.' });
    }

    return res.status(400).json({ error: err.message || 'Erreur upload.' });
});

module.exports = router;
