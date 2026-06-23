/**
 * priceCalculator.js
 * Calcule le prix final en FCFA à partir du prix source (USD ou CNY)
 * Ordre : prix_source → conversion FCFA → +1$ flat → +majoration catégorie
 */

const CATEGORY_MARKUP = {
  'electronique': 0.12,
  'informatique': 0.12,
  'vetements': 0.18,
  'beaute': 0.15,
  'maison': 0.10,
  'cuisine': 0.10,
  'bebe': 0.12,
  'sante': 0.15,
  'animaux': 0.10,
  'jardin': 0.08,
  'jeux': 0.15,
  'musique': 0.12,
  'vehicules': 0.08,
  'sports': 0.10,
  'livres': 0.05,
  'autres': 0.10,
};

/**
 * Calcule le prix final affiché au client en FCFA.
 * @param {number} priceOriginal - Prix brut chez le fournisseur
 * @param {'USD'|'CNY'} currency - Devise d'origine
 * @param {string} category - Catégorie du produit (slug)
 * @returns {{ price_fcfa: number, price_final: number }}
 */
function calculateFinalPrice(priceOriginal, currency = 'USD', category = 'autres') {
  const USD_TO_FCFA = parseFloat(process.env.USD_TO_FCFA || '610');
  const CNY_TO_FCFA = parseFloat(process.env.CNY_TO_FCFA || '84');

  // Étape 0: Prix importé → Étape 1: Conversion FCFA
  const priceFcfa = currency === 'CNY'
    ? priceOriginal * CNY_TO_FCFA
    : priceOriginal * USD_TO_FCFA;

  // Étape 2: Majoration fixe +1 USD (= 610 FCFA)
  const priceWithFlat = priceFcfa + USD_TO_FCFA;

  // Étape 3: Majoration de catégorie
  const markup = CATEGORY_MARKUP[category?.toLowerCase()] ?? 0.10;
  const priceFinalRaw = priceWithFlat * (1 + markup);

  // Arrondi à la centaine de FCFA la plus proche
  const priceFinal = Math.round(priceFinalRaw / 100) * 100;

  return {
    price_fcfa: Math.round(priceFcfa),
    price_final: priceFinal,
  };
}

/**
 * Calcule la commission du vendeur sur un article importé.
 * Palier Standard : prix_final < 50 000 FCFA → 1/7
 * Palier Premium  : prix_final ≥ 50 000 FCFA → 1/6
 * Paliers sup (niveau vendeur) gérés dans walletRoutes au crédit.
 * @param {number} priceFinal - Prix final en FCFA
 * @param {string} sellerLevel - Niveau du vendeur ('bronze'|'silver'|'gold'|'diamond'|'elite')
 * @returns {{ commission: number, divisor: number }}
 */
function calculateCommission(priceFinal, sellerLevel = 'bronze') {
  let divisor;

  if (sellerLevel === 'elite') {
    divisor = 4;
  } else if (sellerLevel === 'diamond') {
    divisor = 5;
  } else if (priceFinal >= 50000) {
    divisor = 6; // Palier Premium
  } else {
    divisor = 7; // Palier Standard
  }

  const commission = Math.round(priceFinal / divisor);
  return { commission, divisor };
}

module.exports = { calculateFinalPrice, calculateCommission, CATEGORY_MARKUP };
