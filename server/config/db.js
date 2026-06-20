require('dotenv').config();
const { hasSupabaseEnv, isHostingProd } = require('./env');
const useSupabase = hasSupabaseEnv();
const isProdHosting = isHostingProd();

if (isProdHosting && !useSupabase) {
    // Fail fast: deploying with local DB + mock auth is a serious security risk.
    throw new Error('Missing Supabase configuration in production hosting. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in env.');
}

console.log(`🔌 Database Connectivity: ${useSupabase ? 'REMOTE (Supabase)' : 'LOCAL (PostgreSQL)'}`);

/**
 * UNIFIED DB EXPORT
 * Exporte soit le client Supabase (Prod) soit le wrapper Postgres (Local)
 */
module.exports = useSupabase
    ? require('./supabaseClient')
    : require('./localPostgres');
