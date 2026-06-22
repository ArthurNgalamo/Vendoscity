const express = require('express');
const router = express.Router();

// Utiliser la couche d'abstraction (Unified DB)
const db = require('../config/db');
const authClient = db.auth;
const { hasSupabaseEnv } = require('../config/env');
const hasSupabase = hasSupabaseEnv();
const useMockAuth = (!hasSupabase) || process.env.FORCE_MOCK_AUTH === '1';
const isProd = !useMockAuth;
const { createRateLimiter } = require('../middleware/rateLimit');

const isRuntimeProd = (
    process.env.NODE_ENV === 'production' ||
    !!process.env.VERCEL ||
    !!process.env.RENDER ||
    !!process.env.FLY_APP_NAME
);

// Never allow mock auth on a hosted production runtime (misconfiguration guard).
router.use((req, res, next) => {
    if (isRuntimeProd && useMockAuth) {
        return res.status(500).json({
            error: 'Configuration serveur invalide: Supabase n’est pas configuré (ou FORCE_MOCK_AUTH=1).'
        });
    }
    return next();
});

function isValidEmail(raw) {
    const s = String(raw || '').trim();
    if (!s || s.length > 254) return false;
    // Simple, pragmatic validation (avoid rejecting valid-but-rare emails too aggressively).
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function normalizePhone(raw) {
    // Keep digits/+ only to avoid storing arbitrary strings.
    const s = String(raw || '').trim();
    const cleaned = s.replace(/[^\d+]/g, '');
    return cleaned;
}

function safeServerError(res, err) {
    if (!isRuntimeProd) {
        return res.status(500).json({ error: 'Erreur serveur: ' + String(err?.message || err || '') });
    }
    return res.status(500).json({ error: 'Erreur serveur' });
}

const registerLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: isRuntimeProd ? 15 : 200,
    keyGenerator: (req) => `register:${req.ip}`,
    message: 'Trop de tentatives d’inscription. Réessayez plus tard.'
});

const loginLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: isRuntimeProd ? 25 : 300,
    keyGenerator: (req) => {
        const email = String(req?.body?.email || '').trim().toLowerCase();
        return `login:${req.ip}:${email}`;
    },
    message: 'Trop de tentatives de connexion. Réessayez plus tard.'
});

const refreshLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: isRuntimeProd ? 80 : 500,
    keyGenerator: (req) => `refresh:${req.ip}`,
    message: 'Trop de requetes de session. Réessayez plus tard.'
});

async function signInWithPasswordUnified(email, password) {
    // Supabase v2: signInWithPassword({ email, password })
    // Local mock: signInWithPassword(email, password)
    try {
        const out = await authClient.signInWithPassword({ email, password });
        if (out && typeof out === 'object' && ('data' in out || 'error' in out)) return out;
        return { data: out, error: null };
    } catch (e1) {
        // If local mock expects (email, password), the object call may throw quickly. Try the legacy signature.
        try {
            const out = await authClient.signInWithPassword(email, password);
            if (out && typeof out === 'object' && ('data' in out || 'error' in out)) return out;
            return { data: out, error: null };
        } catch (_) {
            throw e1;
        }
    }
}

async function signUpUnified(email, password, meta) {
    // Supabase v2: signUp({ email, password, options: { data: meta } })
    // Local mock: signUp(email, password, meta)
    try {
        const out = await authClient.signUp({ email, password, options: { data: meta } });
        if (out && typeof out === 'object' && ('data' in out || 'error' in out)) return out;
        return { data: out, error: null };
    } catch (e1) {
        try {
            const out = await authClient.signUp(email, password, meta);
            if (out && typeof out === 'object' && ('data' in out || 'error' in out)) return out;
            return { data: out, error: null };
        } catch (_) {
            throw e1;
        }
    }
}

function isMissingColumn(err, columnName) {
    if (err?.code === '42703') return true; // undefined_column
    return String(err?.message || '').includes(`"${columnName}"`) || String(err?.message || '').includes(columnName);
}

function dayKeyInDouala(d) {
    try {
        const dt = (d instanceof Date) ? d : new Date(d);
        if (!Number.isFinite(dt.getTime())) return '';
        // fr-CA yields YYYY-MM-DD which is stable for day comparisons.
        return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Douala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(dt);
    } catch (_) {
        return '';
    }
}

function dayKeysNowDouala() {
    const now = new Date();
    const today = dayKeyInDouala(now);
    const y = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const yesterday = dayKeyInDouala(y);
    return { now, today, yesterday };
}

async function bumpLoginStreakBestEffort(userId) {
    const uid = String(userId || '').trim();
    if (!uid) return;

    const { now, today, yesterday } = dayKeysNowDouala();

    try {
        const { data: profile, error: selErr } = await db
            .from('profiles')
            .select('id,last_login_at,login_streak')
            .eq('id', uid)
            .single();

        if (selErr) {
            if (isMissingColumn(selErr, 'last_login_at') || isMissingColumn(selErr, 'login_streak')) return;
            return;
        }

        const prevKey = dayKeyInDouala(profile?.last_login_at);
        const prevStreak = Math.max(0, Number(profile?.login_streak) || 0);
        if (prevKey && prevKey === today) {
            // Already counted today; just refresh timestamp.
            await db.from('profiles').update({ last_login_at: now }).eq('id', uid);
            return;
        }

        let nextStreak = 1;
        if (prevKey) {
            if (prevKey === yesterday) {
                nextStreak = prevStreak + 1;
            } else {
                // Intelligent streak decay: instead of resetting to 1 directly,
                // we decrease it by the number of missed days.
                try {
                    const todayDate = new Date(today);
                    const prevDate = new Date(prevKey);
                    const diffTime = Math.abs(todayDate - prevDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays > 1) {
                        nextStreak = Math.max(1, prevStreak - (diffDays - 1));
                    }
                } catch (_) {
                    nextStreak = 1;
                }
            }
        }

        await db.from('profiles').update({ last_login_at: now, login_streak: nextStreak }).eq('id', uid);
    } catch (_) {
        // ignore: ranking will just not get the boost
    }
}

router.post('/register', registerLimiter, async (req, res) => {
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    const name = String(req.body?.name || '').trim();
    const whatsapp = req.body?.whatsapp ? normalizePhone(req.body.whatsapp) : '';

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Tous les champs (nom, email, mot de passe) sont obligatoires' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Email invalide' });
    }
    if (password.length < 8 || password.length > 72) {
        return res.status(400).json({ error: 'Mot de passe invalide (8 a 72 caracteres)' });
    }
    if (name.length < 2 || name.length > 60) {
        return res.status(400).json({ error: 'Nom complet invalide (2 a 60 caracteres)' });
    }
    if (whatsapp && (whatsapp.length < 6 || whatsapp.length > 20)) {
        return res.status(400).json({ error: 'Numero WhatsApp invalide' });
    }

    try {
        let result;
        
        if (!isProd) {
            // Mock auth
            result = await signUpUnified(email, password, { name, whatsapp, role: 'user' });
            
            // CORRECTIF: En local, on doit aussi créer le profil manuellement (pas de trigger)
            if (!result.error) {
                console.log('👤 Création du profil local pour:', email);
                const insert1 = await db.from('profiles').insert([{
                    id: result.data.user.id,
                    first_name: name,
                    last_name: '',
                    phone: whatsapp,
                    shop_name: '',
                    seller_status: 'none',
                    created_at: new Date(),
                    updated_at: new Date()
                }]);
                if (insert1?.error && isMissingColumn(insert1.error, 'shop_name')) {
                    const fallback = await db.from('profiles').insert([{
                        id: result.data.user.id,
                        first_name: name,
                        last_name: '',
                        phone: whatsapp,
                        created_at: new Date(),
                        updated_at: new Date()
                    }]);
                    if (fallback?.error && isMissingColumn(fallback.error, 'updated_at')) {
                        await db.from('profiles').insert([{
                            id: result.data.user.id,
                            first_name: name,
                            last_name: '',
                            phone: whatsapp,
                            created_at: new Date()
                        }]);
                    }
                } else if (insert1?.error && isMissingColumn(insert1.error, 'updated_at')) {
                    await db.from('profiles').insert([{
                        id: result.data.user.id,
                        first_name: name,
                        last_name: '',
                        phone: whatsapp,
                        shop_name: '',
                        created_at: new Date()
                    }]);
                }
            }
        } else {
            // Supabase
            const { data, error } = await authClient.signUp({
                email,
                password,
                options: {
                    data: { name, whatsapp, role: 'user' }
                }
            });
            result = error ? { error: error.message } : { data };
        }
        
        if (result.error) {
            console.error('❌ Erreur Auth:', result.error);
            return res.status(result.status || 400).json({ error: result.error });
        }
        
        if (!isRuntimeProd) console.log('✅ Inscription réussie:', email);
        // On ne renvoie que ce qui est nécessaire pour alléger la réponse
        return res.status(201).json({ 
            user: result.data.user,
            message: 'Inscription réussie' 
        });
    } catch (err) {
        console.error('❌ Erreur serveur:', err);
        return safeServerError(res, err);
    }
});

router.post('/login', loginLimiter, async (req, res) => {
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');

    if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe obligatoires' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Email invalide' });
    }
    if (password.length < 1 || password.length > 72) {
        return res.status(400).json({ error: 'Mot de passe invalide' });
    }
    
    try {
        let result;
        
        if (!isProd) {
            // Mock auth
            result = await signInWithPasswordUnified(email, password);

            // En local, s'assurer qu'un profil existe (sinon FK products.seller_id peut casser).
            if (!result.error && result.data?.user?.id) {
                try {
                    const userId = result.data.user.id;
                    const meta = result.data.user.user_metadata || {};

                    const { data: existing } = await db
                        .from('profiles')
                        .select('*')
                        .eq('id', userId)
                        .single();

                    if (!existing) {
                        const insert1 = await db.from('profiles').insert([{
                            id: userId,
                            first_name: meta.name || '',
                            last_name: '',
                            phone: meta.whatsapp || '',
                            created_at: new Date(),
                            updated_at: new Date()
                        }]);
                        if (insert1?.error && isMissingColumn(insert1.error, 'updated_at')) {
                            await db.from('profiles').insert([{
                                id: userId,
                                first_name: meta.name || '',
                                last_name: '',
                                phone: meta.whatsapp || '',
                                created_at: new Date()
                            }]);
                        }
                    }
                } catch (_) {
                    // ignore
                }
            }
        } else {
            // Supabase
            const { data, error } = await authClient.signInWithPassword({
                email,
                password
            });
            result = error ? { error: error.message } : { data };
        }
        
        if (result.error) {
            console.error('❌ Erreur Auth:', result.error);
            return res.status(result.status || 400).json({ error: result.error });
        }
        
        if (!isRuntimeProd) console.log('✅ Connexion réussie:', email);
        // Daily login visibility boost (best effort): update last_login_at + login_streak.
        try {
            const uid = result?.data?.user?.id;
            if (uid) await bumpLoginStreakBestEffort(uid);
        } catch (_) {
            // ignore
        }
        res.json(result.data);
    } catch (err) {
        console.error('❌ Erreur serveur:', err);
        return safeServerError(res, err);
    }
});

// Refresh access token (Supabase sessions expire; frontend stores refresh_token)
router.post('/refresh', refreshLimiter, async (req, res) => {
    const refresh_token = req.body?.refresh_token;
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token manquant' });

    try {
        if (!isProd) {
            // Mock auth
            if (typeof authClient.refreshSession !== 'function') {
                return res.status(400).json({ error: 'refreshSession non supporté en local' });
            }
            const { data, error } = await authClient.refreshSession({ refresh_token });
            if (error) return res.status(401).json({ error: error.message || 'Session invalide' });
            return res.json(data);
        }

        const { data, error } = await authClient.refreshSession({ refresh_token });
        if (error) return res.status(401).json({ error: error.message || 'Session invalide' });
        return res.json(data);
    } catch (err) {
        console.error('❌ Erreur refresh:', err);
        return safeServerError(res, err);
    }
});

// Google Login Mock/OAuth Unified Route
router.post('/google', async (req, res) => {
    const email = String(req.body?.email || 'google.user@gmail.com').trim().toLowerCase();
    const name = String(req.body?.name || 'Boutique Google').trim();
    const whatsapp = normalizePhone(req.body?.whatsapp || '+237690000000');

    try {
        let userResult;
        
        if (!isProd) {
            const mockAuth = require('../config/mockAuth');
            const fs = require('fs');
            const path = require('path');
            const DB_FILE = path.join(__dirname, '../data/users.json');
            let userExists = false;
            if (fs.existsSync(DB_FILE)) {
                const users = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
                if (users[email]) userExists = true;
            }

            if (!userExists) {
                // Register a new mock user
                const mockPass = 'GoogleOAuthMockedPassword123!';
                await mockAuth.signUp(email, mockPass, { name, shop_name: name, whatsapp, role: 'seller' });
                
                // Also create the profile in local postgres
                const users = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
                const createdUser = users[email];
                if (createdUser) {
                    await db.from('profiles').insert([{
                        id: createdUser.id,
                        first_name: name,
                        last_name: '',
                        phone: whatsapp,
                        shop_name: name,
                        created_at: new Date()
                    }]);
                }
            }

            // Log them in
            userResult = await mockAuth.signInWithPassword(email, 'GoogleOAuthMockedPassword123!');
        } else {
            const mockPass = 'GoogleOAuthMockedPassword123!';
            let authData;
            try {
                const { data, error } = await authClient.signInWithPassword({ email, password: mockPass });
                if (error) throw error;
                authData = data;
            } catch (signInErr) {
                // SignUp first
                const { data, error } = await authClient.signUp({
                    email,
                    password: mockPass,
                    options: {
                        data: { name, shop_name: name, whatsapp, role: 'seller' }
                    }
                });
                if (error) return res.status(400).json({ error: error.message });
                
                // Then signIn
                const loginRes = await authClient.signInWithPassword({ email, password: mockPass });
                if (loginRes.error) return res.status(400).json({ error: loginRes.error.message });
                authData = loginRes.data;
            }
            userResult = { data: authData, error: null };
        }

        if (userResult.error) {
            return res.status(400).json({ error: userResult.error });
        }

        try {
            const uid = userResult?.data?.user?.id;
            if (uid) await bumpLoginStreakBestEffort(uid);
        } catch (_) {}

        res.json(userResult.data);
    } catch (err) {
        console.error('❌ Erreur Google Auth:', err);
        return safeServerError(res, err);
    }
});

module.exports = router;
