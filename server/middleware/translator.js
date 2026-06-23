/**
 * translator.js
 * Traduit du texte vers le français.
 * Utilise LibreTranslate en priorité (gratuit), DeepL en fallback si la clé est configurée.
 * 1688 = Chinois Simplifié (zh), AliExpress/Alibaba = Anglais (en)
 */


/**
 * Détecte la langue source en fonction de la plateforme.
 * @param {'alibaba'|'aliexpress'|'1688'} source
 * @returns {string} Code langue ISO
 */
function getSourceLanguage(source) {
  if (source === '1688') return 'zh';
  return 'en';
}

/**
 * Traduit un texte vers le français via LibreTranslate ou DeepL.
 * @param {string} text - Texte à traduire
 * @param {string} sourceLang - Langue source ('zh' | 'en')
 * @returns {Promise<string>} Texte traduit
 */
async function translateToFrench(text, sourceLang = 'en') {
  if (!text || text.trim() === '') return text;
  
  // Si déjà en français ou texte très court, ne pas traduire
  if (sourceLang === 'fr') return text;

  // Option 1 : DeepL (si clé configurée)
  if (process.env.DEEPL_API_KEY) {
    try {
      const deeplRes = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          auth_key: process.env.DEEPL_API_KEY,
          text,
          source_lang: sourceLang.toUpperCase(),
          target_lang: 'FR',
        }),
      });
      if (deeplRes.ok) {
        const data = await deeplRes.json();
        return data.translations?.[0]?.text || text;
      }
    } catch (err) {
      console.warn('[translator] DeepL error, falling back to LibreTranslate:', err.message);
    }
  }

  // Option 2 : LibreTranslate (gratuit)
  const ltUrl = process.env.LIBRETRANSLATE_API_URL || 'https://libretranslate.com/translate';
  try {
    const ltRes = await fetch(ltUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: 'fr',
        api_key: process.env.LIBRETRANSLATE_API_KEY || '',
      }),
    });
    if (ltRes.ok) {
      const data = await ltRes.json();
      return data.translatedText || text;
    }
  } catch (err) {
    console.warn('[translator] LibreTranslate error:', err.message);
  }

  // Fallback : retourner le texte original
  console.warn('[translator] Aucun service de traduction disponible. Texte original retourné.');
  return text;
}

module.exports = { translateToFrench, getSourceLanguage };
