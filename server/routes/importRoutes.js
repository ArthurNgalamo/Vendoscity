const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middleware/authenticate');
const { calculateFinalPrice } = require('../middleware/priceCalculator');
const { translateToFrench, getSourceLanguage } = require('../middleware/translator');

// Cache Utilities
const cache = require('../config/cache');
const { coalesce } = require('../utils/coalescer');
const { logApiCall, API_COSTS } = require('../utils/costLogger');

/**
 * Normalise le nom de la source depuis une URL
 */
function detectSource(url) {
  if (!url) return null;
  if (url.includes('1688.com')) return '1688';
  if (url.includes('aliexpress.com')) return 'aliexpress';
  if (url.includes('alibaba.com')) return 'alibaba';
  return null;
}

/**
 * Scrape un produit via RapidAPI selon la source
 */
async function scrapeProduct(productId, source) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error('RAPIDAPI_KEY non configurée dans les variables d\'environnement.');

  let url, host;
  if (source === 'aliexpress') {
    host = process.env.RAPIDAPI_ALIEXPRESS_HOST || 'aliexpress-datahub.p.rapidapi.com';
    url = `https://${host}/item_detail_2?itemid=${productId}&region=CM&currency=USD&locale=fr_FR`;
  } else {
    host = process.env.RAPIDAPI_ALIBABA_HOST || 'alibaba-datahub.p.rapidapi.com';
    url = `https://${host}/item_detail?itemId=${productId}`;
  }

  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': host,
    },
  });
  if (!res.ok) throw new Error(`Scraping API error: HTTP ${res.status}`);
  return res.json();
}

/**
 * Vérifie si le cache de prix est expiré (1 Heure)
 */
function isPriceExpired(product) {
  if (!product.price_cached_at) return true;
  const cachedTime = new Date(product.price_cached_at).getTime();
  const oneHourAgo = Date.now() - 1 * 60 * 60 * 1000;
  return cachedTime < oneHourAgo;
}

/**
 * Vérifie si le cache de détails/images est expiré (2 Semaines)
 */
function isDetailsExpired(product) {
  if (!product.details_cached_at) return true;
  const cachedTime = new Date(product.details_cached_at).getTime();
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  return cachedTime < twoWeeksAgo;
}

/**
 * Met à jour les détails d'un produit (prix, stock, descriptions, images) depuis l'API externe
 */
async function refreshProductDetails(productId, source) {
  try {
    const rawData = await scrapeProduct(productId, source);
    await logApiCall(`${source.toUpperCase()} Detail`, `item_detail_${productId}`, API_COSTS.DETAIL);

    let priceOriginal = 0;
    let titleRaw = '';
    let descRaw = '';
    let imageUrls = [];
    let videoUrl = null;
    let stock = 1;

    if (source === 'aliexpress') {
      const item = rawData?.result?.item || rawData?.item || {};
      priceOriginal = parseFloat(item.sku?.def?.promotionPrice || item.price?.value || item.salePrice || 0);
      titleRaw = item.title || '';
      descRaw = item.description || '';
      imageUrls = item.images || [];
      videoUrl = item.video?.url || null;
      stock = parseInt(item.stock || item.inventory || 1);
    } else {
      const item = rawData?.data || rawData || {};
      priceOriginal = parseFloat(item.price?.value || item.promotionPrice || 0);
      titleRaw = item.title || item.subject || '';
      descRaw = item.description || '';
      imageUrls = item.images || [];
      videoUrl = item.video?.url || null;
      stock = parseInt(item.stock || 1);
    }

    const sourceLang = getSourceLanguage(source);
    const currency = source === '1688' ? 'CNY' : 'USD';

    // Traduction
    let titleFr = titleRaw;
    let descFr = descRaw;
    if (sourceLang !== 'fr') {
      titleFr = await translateToFrench(titleRaw.substring(0, 200), sourceLang);
      descFr = await translateToFrench(descRaw.substring(0, 1000), sourceLang);
      await logApiCall('Translation', `Translate ${source}`, API_COSTS.TRANSLATION);
    }

    const { price_fcfa, price_final } = calculateFinalPrice(priceOriginal, currency, 'autres');

    const record = {
      source,
      original_id: productId,
      original_currency: currency,
      price_original: priceOriginal,
      price_fcfa,
      price_final,
      category: 'autres',
      title_fr: titleFr || titleRaw,
      description_fr: descFr || descRaw,
      image_urls: imageUrls.filter(Boolean),
      video_url: videoUrl,
      stock,
      price_cached_at: new Date().toISOString(),
      details_cached_at: new Date().toISOString()
    };

    // Upsert dans le pool
    const { data: inserted, error } = await db
      .from('imported_pool')
      .upsert(record)
      .select()
      .single();

    if (error) throw error;
    return inserted || record;
  } catch (err) {
    console.error(`[refreshProductDetails] Erreur pour ${productId} (${source}):`, err.message);
    throw err;
  }
}

/**
 * Déclenche le rafraîchissement asynchrone en arrière-plan d'une liste d'articles (Stale-While-Revalidate)
 */
function triggerBackgroundRefresh(products) {
  if (!Array.isArray(products)) return;
  products.forEach(p => {
    const isHot = (p.views || 0) > 10;
    const isPriceStale = isPriceExpired(p);
    const isDetailsStale = isDetailsExpired(p);

    if (isPriceStale || isDetailsStale) {
      console.log(`[Cache Background Sync] Refreshing stale item ${p.original_id} (${p.source}). Hot: ${isHot}`);
      coalesce(`refresh:${p.source}:${p.original_id}`, () => refreshProductDetails(p.original_id, p.source))
        .catch(err => {
          console.warn(`[Cache Background Sync Failed] ${p.original_id}:`, err.message);
        });
    }
  });
}

/**
 * GET /api/imports/pool
 * Liste paginée des articles en cache (public)
 */
router.get('/pool', async (req, res) => {
  try {
    const { source, category, page = 1, limit = 24, video_only } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db
      .from('imported_pool')
      .select('*', { count: 'exact' })
      .order('views', { ascending: false }) // Priorité aux plus consultés
      .range(offset, offset + parseInt(limit) - 1);

    if (source) query = query.eq('source', source);
    if (category) query = query.eq('category', category);
    if (video_only === 'true') query = query.not('video_url', 'is', null);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ items: data || [], total: count || 0, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[imports/pool]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/imports/pool/:id
 * Détail d'un produit spécifique en cache.
 * Si expiré ou non trouvé, déclenche la mise à jour correspondante.
 */
router.get('/pool/:id', async (req, res) => {
  const { id } = req.params;
  const { source = 'aliexpress' } = req.query;

  try {
    let { data: product, error } = await db
      .from('imported_pool')
      .select('*')
      .eq('source', source)
      .eq('original_id', id)
      .single();

    if (product) {
      // Incrémentation asynchrone des vues
      db.from('imported_pool')
        .update({ views: (product.views || 0) + 1 })
        .eq('id', product.id)
        .then(() => {});
    }

    const isNew = !product;
    const isStale = product && (isPriceExpired(product) || isDetailsExpired(product));

    if (isNew) {
      // Obligatoire de charger depuis l'API
      product = await refreshProductDetails(id, source);
    } else if (isStale) {
      // Stale-While-Revalidate : retourner la donnée en cache et rafraîchir en tâche de fond
      coalesce(`refresh:${source}:${id}`, () => refreshProductDetails(id, source))
        .catch(err => console.warn('[Background Details Refresh Failed]', err.message));
    }

    res.json(product);
  } catch (err) {
    console.error('[imports/pool/details]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/imports/search
 * Recherche dans le cache. Si résultat insuffisant, appel API externe.
 */
router.get('/search', async (req, res) => {
  try {
    const { q = '', source = 'aliexpress', page = 1, limit = 24 } = req.query;
    const limitVal = parseInt(limit);
    const pageVal = parseInt(page);
    const offset = (pageVal - 1) * limitVal;

    // 1. Chercher dans le cache de la base de données d'abord (recherche indexée)
    const { data: cached, error: cacheErr } = await db
      .from('imported_pool')
      .select('*')
      .eq('source', source)
      .ilike('title_fr', `%${q}%`)
      .order('price_final', { ascending: true }) // Proposer le prix le plus bas en priorité
      .range(offset, offset + limitVal - 1);

    // Déterminer s'il faut appeler l'API externe (cas obligatoire)
    // - page 1 : si cache vide ou trop petit (< 5)
    // - page > 1 : si l'utilisateur a scanné/scrollé et que le cache local pour cette page est vide
    const needsExternalCall = !cacheErr && (
      (pageVal === 1 && (!cached || cached.length < 5)) ||
      (pageVal > 1 && (!cached || cached.length === 0))
    );

    if (!needsExternalCall) {
      console.log(`[Search Cache Hit] ${cached?.length || 0} articles servis depuis le cache local.`);
      // Stale-While-Revalidate pour les éléments affichés
      triggerBackgroundRefresh(cached);
      return res.json({ items: cached || [], source: 'cache' });
    }

    // 2. Appel API externe obligatoire
    if (!process.env.RAPIDAPI_KEY) {
      return res.json({ items: cached || [], source: 'cache', warning: 'RAPIDAPI_KEY non configurée' });
    }

    const host = source === 'aliexpress'
      ? (process.env.RAPIDAPI_ALIEXPRESS_HOST || 'aliexpress-datahub.p.rapidapi.com')
      : (process.env.RAPIDAPI_ALIBABA_HOST || 'alibaba-datahub.p.rapidapi.com');

    const searchUrl = source === 'aliexpress'
      ? `https://${host}/item_search_2?q=${encodeURIComponent(q)}&page=${pageVal}&locale=fr_FR`
      : `https://${host}/product_search?keywords=${encodeURIComponent(q)}&page=${pageVal}`;

    const searchKey = `search:${source}:${q}:${pageVal}`;

    // Utilisation du coalescer pour éviter les appels d'API doublons simultanés
    const apiItems = await coalesce(searchKey, async () => {
      try {
        const apiRes = await fetch(searchUrl, {
          headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, 'X-RapidAPI-Host': host },
        });
        if (!apiRes.ok) throw new Error(`API HTTP ${apiRes.status}`);
        
        await logApiCall(`${source.toUpperCase()} Search`, `search_${q}`, API_COSTS.SEARCH);
        const apiData = await apiRes.json();

        const rawItems = (source === 'aliexpress'
          ? apiData?.result?.items || []
          : apiData?.data?.list || []).slice(0, limitVal);

        const sourceLang = getSourceLanguage(source);
        const currency = source === '1688' ? 'CNY' : 'USD';

        // Traiter et insérer les éléments en base de données
        const processed = await Promise.all(rawItems.map(async (item) => {
          const originalId = String(item.itemId || item.id || item.productId || '');
          const priceOriginal = parseFloat(item.sku?.def?.promotionPrice || item.price?.value || item.salePrice || 0);
          const titleRaw = item.title || item.subject || '';
          
          let titleFr = titleRaw;
          if (sourceLang !== 'fr') {
            titleFr = await translateToFrench(titleRaw.substring(0, 200), sourceLang);
            await logApiCall('Translation', `Translate Title`, API_COSTS.TRANSLATION);
          }

          const { price_fcfa, price_final } = calculateFinalPrice(priceOriginal, currency, 'autres');

          const record = {
            source,
            original_id: originalId,
            original_currency: currency,
            price_original: priceOriginal,
            price_fcfa,
            price_final,
            category: 'autres',
            title_fr: titleFr || titleRaw,
            description_fr: '',
            image_urls: [item.image || item.mainImage || ''].filter(Boolean),
            video_url: item.video?.url || null,
            stock: 1,
            price_cached_at: new Date().toISOString(),
            details_cached_at: new Date().toISOString()
          };

          const { data: inserted } = await db
            .from('imported_pool')
            .upsert(record)
            .select()
            .single();

          return inserted || record;
        }));

        return processed;
      } catch (err) {
        console.error(`[External Search API Failed]`, err.message);
        throw err;
      }
    });

    res.json({ items: apiItems, source: 'api' });
  } catch (err) {
    console.error('[imports/search] Error, falling back to cache:', err.message);
    
    // Fallback gracieux en cas d'erreur de l'API externe : retourner tout ce qu'on a en cache
    try {
      const { data: fallbackCached } = await db
        .from('imported_pool')
        .select('*')
        .eq('source', req.query.source || 'aliexpress')
        .ilike('title_fr', `%${req.query.q || ''}%`)
        .order('price_final', { ascending: true });

      return res.json({ 
        items: fallbackCached || [], 
        source: 'cache', 
        warning: "Le service d'importation externe est temporairement indisponible. Données en cache affichées." 
      });
    } catch (_) {
      res.status(500).json({ error: err.message });
    }
  }
});

/**
 * POST /api/imports/add-to-catalog
 * Ajoute un article du pool au catalogue du vendeur vérifié.
 */
router.post('/add-to-catalog', authenticate, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.user_id;

    // Vérifier que l'utilisateur est un vendeur vérifié
    const { data: profile, error: profileErr } = await db
      .from('profiles')
      .select('is_verified, seller_status, seller_level')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      return res.status(404).json({ error: 'Profil introuvable.' });
    }

    if (!profile.is_verified) {
      return res.status(403).json({ error: 'Accès réservé aux vendeurs vérifiés.' });
    }

    const { pool_product_id, custom_title, custom_description } = req.body;
    if (!pool_product_id) {
      return res.status(400).json({ error: 'pool_product_id est requis.' });
    }

    const { data, error } = await db
      .from('seller_imported_catalog')
      .upsert({ seller_id: userId, pool_product_id, custom_title, custom_description })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('[imports/add-to-catalog]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/imports/my-catalog
 * Retourne le catalogue importé du vendeur connecté.
 */
router.get('/my-catalog', authenticate, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.user_id;
    const { data, error } = await db
      .from('seller_imported_catalog')
      .select('*, pool_product:pool_product_id(*)')
      .eq('seller_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[imports/my-catalog]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/imports/catalog/:id
 * Retire un article du catalogue vendeur.
 */
router.delete('/catalog/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.user_id;
    const { id } = req.params;

    const { error } = await db
      .from('seller_imported_catalog')
      .delete()
      .eq('id', id)
      .eq('seller_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[imports/catalog/delete]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
