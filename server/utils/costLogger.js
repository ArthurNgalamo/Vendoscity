/**
 * costLogger.js
 * Journalise les appels API et gère les alertes de dépassement de budget.
 */

const db = require('../config/db');

// Coûts de base estimés par type d'appel (RapidAPI & Traduction)
const API_COSTS = {
  SEARCH: 1.0,         // Appel de recherche (AliExpress, Alibaba, 1688)
  DETAIL: 2.0,         // Appel de détails d'un article
  TRANSLATION: 0.1,    // Traduction de texte (par bloc/appel)
};

/**
 * Enregistre un appel API avec son coût en base de données.
 * @param {string} apiName - Nom de l'API (ex. 'AliExpress Search')
 * @param {string} endpoint - URL relative ou action
 * @param {number} cost - Coût en crédits (valeurs de API_COSTS ou personnalisé)
 */
async function logApiCall(apiName, endpoint, cost = 1.0) {
  try {
    const { error } = await db
      .from('api_call_logs')
      .insert({
        api_name: apiName,
        endpoint: endpoint || '',
        cost_credits: cost,
        timestamp: new Date().toISOString()
      });

    if (error) throw error;

    // Lancer la vérification du budget de façon asynchrone pour ne pas bloquer
    checkBudgetAndAlert().catch(err => {
      console.error('[CostLogger Alert Error]', err.message);
    });
  } catch (err) {
    console.error('[CostLogger Error]', err.message);
  }
}

/**
 * Calcule le coût mensuel et déclenche une alerte si le budget approche de sa limite.
 */
async function checkBudgetAndAlert() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // 1. Calculer la consommation totale du mois courant
  const { data: logs, error } = await db
    .from('api_call_logs')
    .select('cost_credits')
    .gte('timestamp', startOfMonth);

  if (error) {
    console.error('[CostLogger] Impossible de calculer le budget mensuel:', error.message);
    return;
  }

  const totalConsumed = (logs || []).reduce((sum, log) => sum + parseFloat(log.cost_credits || 0), 0);

  // Charger la configuration de budget depuis l'environnement
  const limit = parseFloat(process.env.API_MONTHLY_LIMIT || '10000'); // Défaut 10k crédits
  const thresholdPercent = parseFloat(process.env.API_ALERT_PERCENT || '90'); // Alerte à 90%
  const threshold = limit * (thresholdPercent / 100);

  console.log(`[CostLogger] Consommation mensuelle courante : ${totalConsumed.toFixed(2)} / ${limit} crédits (${((totalConsumed / limit) * 100).toFixed(1)}%)`);

  if (totalConsumed >= threshold) {
    // 2. Vérifier si une alerte a déjà été enregistrée aujourd'hui pour ne pas spammer
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const { data: existingAlerts, error: alertErr } = await db
      .from('api_alerts')
      .select('id')
      .eq('alert_type', 'BUDGET_WARNING')
      .gte('created_at', startOfToday);

    if (alertErr) return;

    if (!existingAlerts || existingAlerts.length === 0) {
      const warningMessage = `🚨 ALERTE BUDGET : La consommation d'API a atteint ${totalConsumed.toFixed(2)} crédits (limite mensuelle : ${limit}, seuil d'alerte : ${thresholdPercent}%). Risque de suspension imminente des importations.`;
      
      console.error(`\n[ALERT] ${warningMessage}\n`);

      // Enregistrer l'alerte en BDD
      await db
        .from('api_alerts')
        .insert({
          alert_type: 'BUDGET_WARNING',
          message: warningMessage,
          created_at: new Date().toISOString()
        });
    }
  }
}

module.exports = {
  logApiCall,
  API_COSTS
};
