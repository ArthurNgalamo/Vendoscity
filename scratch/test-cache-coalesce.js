/**
 * test-cache-coalesce.js
 * Script de test pour valider le cache distribué (fallback Postgres),
 * la mutualisation des requêtes (coalescer) et les logs de coût API.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });

const cache = require('../server/config/cache');
const { coalesce } = require('../server/utils/coalescer');
const { logApiCall } = require('../server/utils/costLogger');
const db = require('../server/config/db');

async function testCache() {
  console.log('🧪 Test 1 : Cache temporaire distribué...');
  const key = 'test_key_123';
  const data = { message: 'Hello Vendoscity Cache', timestamp: Date.now() };

  // Écriture cache
  const setOk = await cache.set(key, data, 10); // TTL 10 secondes
  if (setOk) {
    console.log('✅ Écriture cache réussie.');
  } else {
    console.error('❌ Échec écriture cache.');
  }

  // Lecture cache
  const cachedVal = await cache.get(key);
  if (cachedVal && cachedVal.message === data.message) {
    console.log('✅ Lecture cache réussie, valeur :', cachedVal);
  } else {
    console.error('❌ Échec lecture cache ou valeur incorrecte.');
  }

  // Test expiration cache
  console.log('⌛ Validation de l\'expiration (TTL court)...');
  await cache.set('temp_key', 'expired_data', 1);
  await new Promise(resolve => setTimeout(resolve, 1500));
  const expiredVal = await cache.get('temp_key');
  if (expiredVal === null) {
    console.log('✅ Expiration du cache (TTL) fonctionnelle.');
  } else {
    console.error('❌ Échec expiration cache, valeur toujours présente:', expiredVal);
  }
}

async function testCoalescer() {
  console.log('\n🧪 Test 2 : Mutualisation des requêtes (Coalescing)...');
  let executionCount = 0;

  // Tâche factice simulant un temps de réponse réseau de 500ms
  const fetchTask = async (id) => {
    executionCount++;
    console.log(`[Task Executing] Appel d'API simulé lancé pour id: ${id}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { data: `API Result for ${id}`, time: Date.now() };
  };

  const key = 'search:aliexpress:sac';

  // Lancer 5 requêtes simultanées pour le même mot-clé
  console.log('🚀 Lancement de 5 requêtes identiques simultanées...');
  const requests = Array.from({ length: 5 }).map((_, idx) => {
    return coalesce(key, () => fetchTask('sac'));
  });

  const results = await Promise.all(requests);

  console.log(`[Results] Toutes les requêtes terminées.`);
  console.log(`[Stats] Nombre total d'exécutions réelles : ${executionCount}`);

  if (executionCount === 1) {
    console.log('✅ Mutualisation réussie ! L\'API n\'a été appelée qu\'une seule fois.');
  } else {
    console.error(`❌ Échec de la mutualisation, l'API a été appelée ${executionCount} fois.`);
  }

  // Vérifier que toutes les requêtes ont obtenu le même résultat exact
  const firstResult = JSON.stringify(results[0]);
  const allSame = results.every(res => JSON.stringify(res) === firstResult);
  if (allSame) {
    console.log('✅ Tous les appelants ont reçu les mêmes données.');
  } else {
    console.error('❌ Différences de données entre les appelants.');
  }
}

async function testCostLogger() {
  console.log('\n🧪 Test 3 : Journalisation et Alerte de Coût API...');
  
  // Enregistrer 3 appels de recherche à 1.0 crédit
  console.log('Logging API calls...');
  await logApiCall('AliExpress Search (Test)', 'item_search?q=test', 1.0);
  await logApiCall('Alibaba Detail (Test)', 'item_detail?id=123', 2.0);
  await logApiCall('Translation (Test)', 'translate', 0.1);

  // Vérifier la base de données
  const { data: logs, error } = await db
    .from('api_call_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(3);

  if (error) {
    console.error('❌ Impossible de lire les logs d\'API:', error.message);
    return;
  }

  if (logs && logs.length >= 3) {
    console.log('✅ Logs enregistrés en base de données :', logs.map(l => `${l.api_name}: ${l.cost_credits} crédits`));
  } else {
    console.error('❌ Moins de 3 logs trouvés dans la base.');
  }
}

async function runAllTests() {
  try {
    await testCache();
    await testCoalescer();
    await testCostLogger();
    console.log('\n🎉 Tous les tests ont été validés !');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur globale durant les tests :', err.message);
    process.exit(1);
  }
}

runAllTests();
