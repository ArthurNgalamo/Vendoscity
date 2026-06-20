const db = require('../config/db');

function extractBearerToken(req) {
  const h = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!h) return '';
  const s = String(h).trim();
  if (!s) return '';
  const parts = s.split(/\s+/);
  if (parts.length === 1) return parts[0];
  if (parts[0].toLowerCase() === 'bearer') return parts.slice(1).join(' ').trim();
  return parts[1] || '';
}

module.exports = async function authenticate(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Non autorisé' });

    const { data: userAuth, error } = await db.auth.getUser(token);
    if (error || !userAuth || !userAuth.user) return res.status(401).json({ error: 'Session invalide' });

    req.user = userAuth.user;
    req.accessToken = token;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Session invalide' });
  }
};

