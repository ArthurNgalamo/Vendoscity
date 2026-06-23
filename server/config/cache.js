/**
 * cache.js
 * Cache distribué temporaire.
 * Utilise Redis si REDIS_URL est configuré et que le module 'redis' ou 'ioredis' est disponible.
 * Sinon, utilise la table PostgreSQL public.temporary_cache.
 */

const db = require('./db');

let redisClient = null;
let useRedis = false;

if (process.env.REDIS_URL) {
  try {
    // Tentative de chargement dynamique pour éviter les dépendances lourdes si inutilisé
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL);
    useRedis = true;
    console.log('🔌 Cache: Connecté au serveur Redis distribué.');
  } catch (_) {
    try {
      const redis = require('redis');
      redisClient = redis.createClient({ url: process.env.REDIS_URL });
      redisClient.connect();
      useRedis = true;
      console.log('🔌 Cache: Connecté au serveur Redis distribué (node-redis).');
    } catch (_) {
      console.warn('⚠️ Cache: REDIS_URL configuré mais aucun package ioredis/redis trouvé. Utilisation du fallback PostgreSQL.');
    }
  }
}

if (!useRedis) {
  console.log('🔌 Cache: Utilisation du fallback PostgreSQL partagé comme cache distribué.');
}

/**
 * Récupère une valeur du cache.
 * @param {string} key - Clé de cache
 * @returns {Promise<any|null>} - Valeur désérialisée ou null si absente/expirée
 */
async function get(key) {
  if (!key) return null;
  const cacheKey = `vendoscity:cache:${key}`;

  try {
    if (useRedis) {
      const val = await redisClient.get(cacheKey);
      return val ? JSON.parse(val) : null;
    } else {
      // Fallback Postgres : Sélectionner uniquement si non expiré
      const { data, error } = await db
        .from('temporary_cache')
        .select('value')
        .eq('key', cacheKey)
        .single();

      if (error || !data) return null;

      // Double vérification de l'expiration (Postgres range gère normalement le select)
      // Mais avec notre mock, on s'assure d'une vérification robuste
      const { data: validData } = await db
        .from('temporary_cache')
        .select('value')
        .eq('key', cacheKey)
        .filter('expires_at', 'gt', new Date().toISOString())
        .single();

      if (!validData) {
        // Optionnel : Nettoyage asynchrone asynchrone des clés expirées
        db.from('temporary_cache').delete().eq('key', cacheKey).then(() => {});
        return null;
      }

      return JSON.parse(validData.value);
    }
  } catch (err) {
    console.error(`[Cache GET] Erreur pour la clé ${key}:`, err.message);
    return null; // Fail-safe
  }
}

/**
 * Stocke une valeur dans le cache avec un TTL.
 * @param {string} key - Clé de cache
 * @param {any} value - Valeur à sérialiser
 * @param {number} ttlSeconds - Durée de vie en secondes
 * @returns {Promise<boolean>}
 */
async function set(key, value, ttlSeconds = 3600) {
  if (!key) return false;
  const cacheKey = `vendoscity:cache:${key}`;
  const serialized = JSON.stringify(value);

  try {
    if (useRedis) {
      await redisClient.set(cacheKey, serialized, 'EX', ttlSeconds);
      return true;
    } else {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      const { error } = await db
        .from('temporary_cache')
        .upsert({
          key: cacheKey,
          value: serialized,
          expires_at: expiresAt
        });

      if (error) throw error;
      return true;
    }
  } catch (err) {
    console.error(`[Cache SET] Erreur d'écriture pour ${key}:`, err.message);
    return false;
  }
}

/**
 * Supprime une valeur du cache.
 * @param {string} key - Clé de cache
 * @returns {Promise<boolean>}
 */
async function del(key) {
  if (!key) return false;
  const cacheKey = `vendoscity:cache:${key}`;

  try {
    if (useRedis) {
      await redisClient.del(cacheKey);
      return true;
    } else {
      const { error } = await db
        .from('temporary_cache')
        .delete()
        .eq('key', cacheKey);

      if (error) throw error;
      return true;
    }
  } catch (err) {
    console.error(`[Cache DEL] Erreur de suppression pour ${key}:`, err.message);
    return false;
  }
}

module.exports = {
  get,
  set,
  del
};
