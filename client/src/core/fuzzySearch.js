/**
 * client/src/core/fuzzySearch.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Moteur de recherche tolérant aux fautes de frappe, longues phrases et
 * mots mal orthographiés.
 *
 * Techniques combinées :
 *  1. Normalisation unicode (accents, casse, ponctuation)
 *  2. Tokenisation de la requête en mots individuels
 *  3. Distance de Levenshtein pour corriger les fautes de frappe
 *  4. Matching partiel (préfixes, sous-mots)
 *  5. Synonymes et abréviations courants (contexte camerounais)
 *  6. Score de pertinence pondéré (titre > vendeur > description)
 */

// ── 1. Normalisation ──────────────────────────────────────────────────────────

/**
 * Normalize une chaîne : minuscules, sans accents, sans ponctuation superflue.
 * "Téléphone SAMSUNG !!" → "telephone samsung"
 */
export function normalize(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retire les diacritiques
    .replace(/[^a-z0-9\s]/g, ' ')   // garde lettres, chiffres, espaces
    .replace(/\s+/g, ' ')
    .trim();
}

// ── 2. Synonymes & expansions ────────────────────────────────────────────────

/**
 * Dictionnaire de synonymes courants (abréviations, fautes communes,
 * termes locaux camerounais).
 * Chaque clé est normalisée. La valeur est un tableau de termes équivalents.
 */
const SYNONYMS = {
  // Électronique
  'tel':   ['telephone', 'portable', 'mobile', 'smartphone'],
  'tele':  ['television', 'tv', 'ecran'],
  'ordi':  ['ordinateur', 'pc', 'laptop', 'notebook'],
  'tel portable': ['smartphone', 'telephone portable'],
  'iphone': ['apple', 'ios'],
  'samsung': ['galaxy'],
  'clim':  ['climatiseur', 'climatisation', 'air conditionne'],
  'frigo': ['refrigerateur', 'congelateur'],
  'groupe electrogene': ['generateur', 'groupe'],
  'gen':   ['generateur'],

  // Vêtements
  'veste': ['blouson', 'manteau', 'veston'],
  'shoes': ['chaussures', 'sneakers', 'basket'],
  'basket':['chaussures', 'sneakers', 'tennis'],
  'dress': ['robe'],
  'bag':   ['sac'],
  'pagne': ['tissu', 'batik', 'wax'],

  // Mobilier / Maison
  'canape': ['sofa', 'divan'],
  'sofa':  ['canape', 'divan'],
  'table': ['bureau', 'meuble'],
  'lit':   ['matelas', 'sommier'],

  // Véhicules
  'voiture': ['auto', 'automobile', 'berline'],
  'moto':    ['scooter', 'deux roues', 'motocyclette'],
  'benz':    ['mercedes'],
  'toyota':  ['yaris', 'corolla', 'hilux', 'rav4'],

  // Termes locaux
  'njangui': ['tontine', 'cotisation'],
  'attieku': ['manioc', 'cassave'],
  'poulet dg': ['poulet directeur general'],
  'ndole':   ['legume camerounais'],
  'kpa':     ['chaussure locale'],
};

/**
 * Expande un token avec ses synonymes.
 */
function expandToken(token) {
  const synonyms = SYNONYMS[token] || [];
  return [token, ...synonyms];
}

/**
 * Tokenise et expande une requête en liste de termes alternatifs.
 * "tel samsung" → [['tel','telephone','portable',...], ['samsung','galaxy']]
 */
export function expandQuery(rawQuery) {
  const normalized = normalize(rawQuery);
  const tokens = normalized.split(' ').filter(Boolean);
  return tokens.map(expandToken);
}

// ── 3. Distance de Levenshtein ───────────────────────────────────────────────

/**
 * Calcule la distance de Levenshtein entre deux chaînes.
 * Optimisé pour les mots courts (< 30 chars).
 */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Élagage : si la différence de longueur est trop grande, inutile de calculer
  if (Math.abs(a.length - b.length) > 4) return 99;

  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // suppression
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Retourne true si `word` est "proche" de `candidate`.
 * La tolérance dépend de la longueur du mot :
 *  < 4 chars → exact uniquement
 *  4-6 chars → 1 faute tolérée
 *  7+ chars  → 2 fautes tolérées
 */
export function isFuzzyMatch(word, candidate) {
  if (candidate.includes(word)) return true; // match partiel direct
  const maxDist = word.length <= 3 ? 0 : word.length <= 6 ? 1 : 2;
  return levenshtein(word, candidate) <= maxDist;
}

// ── 4. Score de pertinence ───────────────────────────────────────────────────

/**
 * Pondération des champs :
 *  - title       : ×10 (correspondance exacte) / ×6 (fuzzy)
 *  - seller/shop : ×4
 *  - description : ×2
 *  - category    : ×3
 */
const FIELD_WEIGHTS = {
  title:       { exact: 10, partial: 7, fuzzy: 5 },
  category:    { exact: 6,  partial: 4, fuzzy: 3 },
  seller:      { exact: 5,  partial: 3, fuzzy: 2 },
  description: { exact: 3,  partial: 2, fuzzy: 1 },
};

/**
 * Calcule le score d'un produit pour une liste de groupes de tokens.
 * @param {Object} product
 * @param {string[][]} tokenGroups - sortie de expandQuery()
 * @returns {number} score >= 0
 */
export function scoreProduct(product, tokenGroups) {
  if (!tokenGroups || tokenGroups.length === 0) return 0;

  const fields = {
    title:       normalize(product.title || ''),
    category:    normalize(product.category || ''),
    seller:      normalize(product.seller || product.shop_name || product.seller_name || ''),
    description: normalize(product.description || ''),
  };

  let totalScore = 0;

  for (const group of tokenGroups) {
    // group = [original_token, ...synonyms]
    let groupScore = 0;

    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      const weights = FIELD_WEIGHTS[fieldName];
      const fieldWords = fieldValue.split(' ');

      for (const token of group) {
        if (!token) continue;

        // Exact full match dans le champ
        if (fieldValue === token) {
          groupScore += weights.exact * 2;
          continue;
        }

        // Contient le token (sous-chaîne)
        if (fieldValue.includes(token)) {
          groupScore += weights.partial;
          continue;
        }

        // Match par mots individuels du champ
        for (const fw of fieldWords) {
          if (!fw) continue;
          if (fw === token) {
            groupScore += weights.exact;
            break;
          }
          if (fw.startsWith(token) || token.startsWith(fw)) {
            groupScore += weights.partial;
            break;
          }
          if (isFuzzyMatch(token, fw)) {
            groupScore += weights.fuzzy;
            break;
          }
        }
      }
    }

    totalScore += groupScore;
  }

  // Bonus si TOUS les groupes de tokens ont trouvé une correspondance
  const allMatched = tokenGroups.every(group =>
    group.some(token => {
      const allText = Object.values(fields).join(' ');
      return allText.includes(token) || 
        allText.split(' ').some(fw => isFuzzyMatch(token, fw));
    })
  );
  if (allMatched && tokenGroups.length > 1) {
    totalScore *= 1.4; // boost multi-mots tous matchés
  }

  return totalScore;
}

// ── 5. Filtre principal ───────────────────────────────────────────────────────

/**
 * Filtre et trie une liste de produits selon une requête en langage naturel.
 * Supporte :
 *  - Fautes de frappe ("ipohne" → iPhone)
 *  - Longues phrases ("je cherche un ordinateur portable pas cher")
 *  - Synonymes ("tel" → telephone, "ordi" → ordinateur)
 *  - Mots partiels ("sams" → samsung)
 *  - Mots-clés multiples (tous doivent contribuer)
 *
 * @param {Object[]} products
 * @param {string} rawQuery
 * @param {number} [minScore=1] - score minimum pour être inclus
 * @returns {Object[]} produits triés par pertinence décroissante
 */
export function fuzzyFilterProducts(products, rawQuery, minScore = 1) {
  if (!rawQuery || rawQuery.trim().length === 0) return products;

  const tokenGroups = expandQuery(rawQuery);

  if (tokenGroups.length === 0) return products;

  const scored = products
    .map(p => ({ product: p, score: scoreProduct(p, tokenGroups) }))
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score);

  return scored.map(({ product }) => product);
}

// ── 6. Nettoyage de la requête pour l'API ────────────────────────────────────

/**
 * Construit la meilleure requête API à partir d'une entrée brute.
 * - Tronque à 5 mots significatifs (les API full-text n'aiment pas les romans)
 * - Retire les mots vides (stopwords)
 * - Ajoute les synonymes les plus probables
 *
 * @param {string} rawQuery
 * @returns {string} query optimisée pour l'API
 */
const STOPWORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
  'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car', 'en', 'dans', 'sur',
  'par', 'pour', 'avec', 'sans', 'sous', 'entre', 'vers', 'chez',
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
  'ce', 'mon', 'ma', 'mes', 'ton', 'ta', 'son', 'sa', 'ses',
  'cherche', 'veux', 'voudrais', 'besoin', 'trouve', 'trouver',
  'acheter', 'achat', 'pas', 'trop', 'cher', 'moins', 'plus',
  'bonne', 'bon', 'bien', 'meilleur', 'neuf', 'occasion'
]);

export function buildApiQuery(rawQuery) {
  const normalized = normalize(rawQuery);
  const tokens = normalized
    .split(' ')
    .filter(t => t.length >= 3 && !STOPWORDS.has(t));

  // Prend les 4 premiers tokens significatifs
  const meaningful = tokens.slice(0, 4);

  // Ajoute le premier synonyme de chaque token si disponible
  const expanded = meaningful.flatMap(t => {
    const syns = SYNONYMS[t];
    return syns ? [t, syns[0]] : [t];
  });

  // Déduplique et prend les 5 premiers
  const unique = [...new Set(expanded)].slice(0, 5);

  return unique.join(' ') || normalized.slice(0, 60);
}
