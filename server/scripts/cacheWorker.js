/**
 * cacheWorker.js
 * Script Worker / Cron quotidien pour le rafraîchissement du cache
 * et la comparaison de prix sur AliExpress, Alibaba et 1688.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');
const { calculateFinalPrice } = require('../middleware/priceCalculator');
const { translateToFrench, getSourceLanguage } = require('../middleware/translator');
const { logApiCall, API_COSTS } = require('../utils/costLogger');

// Durée de timeout d'API pour le worker (pour ne pas bloquer indéfiniment)
const WORKER_TIMEOUT_MS = 15000;

/**
 * Scrape les détails d'un produit spécifique
 */
async function scrapeProduct(productId, source) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error('RAPIDAPI_KEY non configurée.');

  const host = source === 'aliexpress'
    ? (process.env.RAPIDAPI_ALIEXPRESS_HOST || 'aliexpress-datahub.p.rapidapi.com')
    : (process.env.RAPIDAPI_ALIBABA_HOST || 'alibaba-datahub.p.rapidapi.com');

  const url = source === 'aliexpress'
    ? `https://${host}/item_detail_2?itemid=${productId}&region=CM&currency=USD&locale=fr_FR`
    : `https://${host}/item_detail?itemId=${productId}`;

  const res = await fetch(url, {
    headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': host },
    signal: AbortSignal.timeout(WORKER_TIMEOUT_MS)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Récupère le prix le plus bas pour un mot-clé sur une plateforme donnée
 */
async function searchCheapestPrice(keyword, source) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return null;

  const host = source === 'aliexpress'
    ? (process.env.RAPIDAPI_ALIEXPRESS_HOST || 'aliexpress-datahub.p.rapidapi.com')
    : (process.env.RAPIDAPI_ALIBABA_HOST || 'alibaba-datahub.p.rapidapi.com');

  const searchUrl = source === 'aliexpress'
    ? `https://${host}/item_search_2?q=${encodeURIComponent(keyword)}&page=1&locale=fr_FR`
    : `https://${host}/product_search?keywords=${encodeURIComponent(keyword)}&page=1`;

  try {
    const res = await fetch(searchUrl, {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': host },
      signal: AbortSignal.timeout(WORKER_TIMEOUT_MS)
    });
    if (!res.ok) return null;
    await logApiCall(`${source.toUpperCase()} Search (Worker)`, `worker_search_${keyword}`, API_COSTS.SEARCH);
    const data = await res.json();

    const rawItems = (source === 'aliexpress'
      ? data?.result?.items || []
      : data?.data?.list || []).slice(0, 5);

    if (rawItems.length === 0) return null;

    let minPriceFinal = Infinity;
    const currency = source === '1688' ? 'CNY' : 'USD';

    for (const item of rawItems) {
      const priceOriginal = parseFloat(item.sku?.def?.promotionPrice || item.price?.value || item.salePrice || 0);
      if (priceOriginal > 0) {
        const { price_final } = calculateFinalPrice(priceOriginal, currency, 'autres');
        if (price_final < minPriceFinal) {
          minPriceFinal = price_final;
        }
      }
    }

    return minPriceFinal === Infinity ? null : minPriceFinal;
  } catch (err) {
    console.error(`[Worker Search Price Failed] ${source} - "${keyword}":`, err.message);
    return null;
  }
}

/**
 * Extrait les 3 premiers mots d'un titre de produit pour faire une recherche comparative
 */
function extractSearchKeyword(title) {
  if (!title) return '';
  const clean = title.replace(/[^\w\sÀ-ÿ]/gu, ' ').trim();
  const words = clean.split(/\s+/).filter(w => w.length > 2);
  return words.slice(0, 3).join(' ');
}

/**
 * Rafraîchit les détails d'un produit et retourne l'objet mis à jour
 */
async function refreshProduct(p) {
  console.log(`[Worker] Refreshing details for product: ${p.original_id} (${p.source})`);
  try {
    const rawData = await scrapeProduct(p.original_id, p.source);
    await logApiCall(`${p.source.toUpperCase()} Detail (Worker)`, `worker_detail_${p.original_id}`, API_COSTS.DETAIL);

    let priceOriginal = 0;
    let titleRaw = '';
    let descRaw = '';
    let imageUrls = [];
    let videoUrl = null;
    let stock = 1;

    if (p.source === 'aliexpress') {
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

    const sourceLang = getSourceLanguage(p.source);
    const currency = p.source === '1688' ? 'CNY' : 'USD';

    // Traduction si le titre original a changé
    let titleFr = p.title_fr;
    let descFr = p.description_fr;
    if (titleRaw && titleRaw !== p.title_fr) {
      if (sourceLang !== 'fr') {
        titleFr = await translateToFrench(titleRaw.substring(0, 200), sourceLang);
        descFr = await translateToFrench(descRaw.substring(0, 1000), sourceLang);
        await logApiCall('Translation (Worker)', 'Translate details', API_COSTS.TRANSLATION);
      } else {
        titleFr = titleRaw;
        descFr = descRaw;
      }
    }

    const { price_fcfa, price_final } = calculateFinalPrice(priceOriginal, currency, 'autres');

    const updated = {
      ...p,
      price_original: priceOriginal,
      price_fcfa,
      price_final,
      title_fr: titleFr || p.title_fr,
      description_fr: descFr || p.description_fr,
      image_urls: imageUrls.length > 0 ? imageUrls.filter(Boolean) : p.image_urls,
      video_url: videoUrl || p.video_url,
      stock,
      price_cached_at: new Date().toISOString(),
      details_cached_at: new Date().toISOString()
    };

    return updated;
  } catch (err) {
    console.error(`[Worker Details Refresh Failed] ${p.original_id}:`, err.message);
    return null; // Conserver les anciennes données en cas d'erreur
  }
}

/**
 * Exécute le processus complet du Worker de cache
 */
async function run() {
  console.log('🏁 Démarrage du Cache Worker quotidien...');

  try {
    // 1. Sélectionner les produits les plus consultés (Hot Cache)
    let { data: products, error } = await db
      .from('imported_pool')
      .select('*')
      .gt('views', 10)
      .order('views', { ascending: false })
      .limit(30);

    if (error) throw error;

    // Si aucun produit avec > 10 vues, rafraîchir les 10 derniers insérés (pour validation/dev)
    if (!products || products.length === 0) {
      console.log("[Worker] Aucun produit 'Hot Cache' (views > 10) trouvé. Utilisation des 10 derniers articles.");
      const { data: recent } = await db
        .from('imported_pool')
        .select('*')
        .order('cached_at', { ascending: false })
        .limit(10);
      products = recent || [];
    }

    console.log(`[Worker] ${products.length} articles identifiés pour mise à jour.`);

    for (const p of products) {
      // Étape A : Rafraîchir les détails du produit d'origine
      const refreshed = await refreshProduct(p);
      if (!refreshed) continue;

      // Étape B : Exécuter la comparaison de prix sur AliExpress, Alibaba et 1688
      const keyword = extractSearchKeyword(refreshed.title_fr);
      if (keyword) {
        console.log(`[Worker Price Comparison] Analyse comparative pour "${keyword}"...`);
        
        const priceAliExpress = await searchCheapestPrice(keyword, 'aliexpress');
        const priceAlibaba = await searchCheapestPrice(keyword, 'alibaba');
        const price1688 = await searchCheapestPrice(keyword, '1688');

        const comparisons = {};
        if (priceAliExpress) comparisons.aliexpress = priceAliExpress;
        if (priceAlibaba) comparisons.alibaba = priceAlibaba;
        if (price1688) comparisons['1688'] = price1688;

        refreshed.price_comparison = comparisons;

        // Trouver le prix final le plus bas trouvé parmi les plateformes
        const availablePrices = [
          refreshed.price_final,
          priceAliExpress,
          priceAlibaba,
          price1688
        ].filter(Boolean);

        if (availablePrices.length > 0) {
          const lowestPrice = Math.min(...availablePrices);
          if (lowestPrice < refreshed.price_final) {
            console.log(`[Worker Comparative Pricing] Prix réduit de ${refreshed.price_final} à ${lowestPrice} FCFA.`);
            refreshed.price_final = lowestPrice;
          }
        }
      }

      // Étape C : Enregistrer le produit mis à jour avec comparaison de prix
      const { error: upsertErr } = await db
        .from('imported_pool')
        .upsert(refreshed);

      if (upsertErr) {
        console.error(`[Worker Save Failed] ${p.original_id}:`, upsertErr.message);
      } else {
        console.log(`[Worker Save Success] Article ${p.original_id} mis à jour.`);
      }

      // Petite pause pour éviter le spam d'API
      await new Promise(r => setTimeout(r, 1500));
    }

    console.log('🎉 Cache Worker terminé avec succès !');
    process.exit(0);
  } catch (err) {
    console.error('❌ Cache Worker en échec :', err.message || err);
    process.exit(1);
  }
}

// Exécuter si lancé directement
if (require.main === module) {
  run();
}

module.exports = { run };
