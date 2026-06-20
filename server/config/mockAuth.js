/**
 * MOCK AUTH SYSTEM - Development/Testing
 * Supporte les inscriptions sans limites pour le développement
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, '../data/users.json');

// Créer le répertoire s'il n'existe pas
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Charger ou créer la base de données
function loadUsers() {
    if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(content);
    }
    return {};
}

function saveUsers(users) {
    // JSON.stringify with UTF-8 support - no replacer needed
    const jsonString = JSON.stringify(users, null, 2);
    fs.writeFileSync(DB_FILE, jsonString, { encoding: 'utf8' });
}

function makeSalt() {
    return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
    const pwd = String(password || '');
    const s = String(salt || '');
    // scrypt is built-in and provides good resistance for password hashing for dev/mock use.
    return crypto.scryptSync(pwd, s, 32).toString('hex');
}

function verifyPassword(user, password) {
    if (!user) return false;

    // Preferred (new) format
    if (user.password_hash && user.password_salt) {
        const expected = String(user.password_hash);
        const actual = hashPassword(password, user.password_salt);
        return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
    }

    // Legacy fallback (plaintext) for old dev users. Will be migrated on successful login.
    return String(user.password || '') === String(password || '');
}

// Générer un token JWT simple
function generateToken(user) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
        sub: user.id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    })).toString('base64');
    const signature = 'mock_signature_' + user.id;
    return `${header}.${payload}.${signature}`;
}

function generateRefreshToken() {
    return `mock_refresh_${uuidv4()}`;
}

function decodeToken(token) {
    try {
        const parts = String(token || '').split('.');
        if (parts.length < 2) return null;
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
        const payload = JSON.parse(payloadJson);
        return payload && typeof payload === 'object' ? payload : null;
    } catch (_) {
        return null;
    }
}

function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function ensureUserId(users, email) {
    if (!users[email]) return;

    // Ensure UUID ids for compatibility with local Postgres schema (profiles.id UUID, products.seller_id UUID).
    if (!users[email].id || !isUuid(users[email].id)) {
        users[email].legacy_id = users[email].id || null;
        users[email].id = uuidv4();
        saveUsers(users);
    }
}

module.exports = {
    isMock: true,
    /**
     * Simuler l'inscription
     */
    signUp: async (email, password, userData) => {
        const users = loadUsers();
        
        if (users[email]) {
            return {
                error: 'Email already registered',
                status: 400
            };
        }
        
        // Créer l'utilisateur
        const salt = makeSalt();
        const password_hash = hashPassword(password, salt);
        users[email] = {
            id: uuidv4(),
            email,
            password: null, // legacy (do not use); kept for backward compatibility of old records
            password_hash,
            password_salt: salt,
            metadata: userData,
            refresh_tokens: [],
            created_at: new Date().toISOString()
        };

        const refresh_token = generateRefreshToken();
        users[email].refresh_tokens.push(refresh_token);
        
        saveUsers(users);
        
        const expires_at = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
        return {
            data: {
                user: {
                    id: users[email].id,
                    email,
                    user_metadata: userData
                },
                session: {
                    access_token: generateToken(users[email]),
                    refresh_token,
                    expires_at,
                    token_type: 'bearer'
                }
            }
        };
    },

    /**
     * Simuler la connexion
     */
    signInWithPassword: async (email, password) => {
        const users = loadUsers();
        
        if (!users[email]) {
            return {
                error: 'Invalid email or password',
                status: 400
            };
        }

        // Migration: anciens comptes (assurer UUID)
        ensureUserId(users, email);
        
        if (!verifyPassword(users[email], password)) {
            return {
                error: 'Invalid email or password',
                status: 400
            };
        }

        // Migrate legacy plaintext password to hash on first successful login.
        if (!users[email].password_hash || !users[email].password_salt) {
            const salt = makeSalt();
            users[email].password_hash = hashPassword(password, salt);
            users[email].password_salt = salt;
            users[email].password = null;
        }

        users[email].refresh_tokens = Array.isArray(users[email].refresh_tokens) ? users[email].refresh_tokens : [];
        const refresh_token = generateRefreshToken();
        users[email].refresh_tokens.push(refresh_token);
        saveUsers(users);
        
        const expires_at = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
        return {
            data: {
                user: {
                    id: users[email].id,
                    email,
                    user_metadata: users[email].metadata
                },
                session: {
                    access_token: generateToken(users[email]),
                    refresh_token,
                    expires_at,
                    token_type: 'bearer'
                }
            }
        };
    },

    /**
     * Simuler getUser(token) (API Supabase)
     */
    getUser: async (token) => {
        const payload = decodeToken(token);
        const userId = payload?.sub;
        const email = payload?.email;
        if (!userId && !email) return { data: { user: null }, error: { message: 'Session invalide' } };

        const now = Math.floor(Date.now() / 1000);
        if (payload?.exp && now > payload.exp) return { data: { user: null }, error: { message: 'Session expirée' } };

        const users = loadUsers();
        // Rechercher par ID d'abord, puis par email pour la compatibilité
        let user = Object.values(users).find(u => u.id === userId);
        if (!user && email) user = users[email];
        
        if (!user) return { data: { user: null }, error: { message: 'Session invalide' } };

        ensureUserId(users, user.email);

        return {
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    user_metadata: user.metadata
                }
            },
            error: null
        };
    }
    ,

    /**
     * Simuler refreshSession({ refresh_token })
     */
    refreshSession: async ({ refresh_token }) => {
        const rt = String(refresh_token || '').trim();
        if (!rt) return { data: null, error: { message: 'refresh_token manquant' } };

        const users = loadUsers();
        const email = Object.keys(users).find((e) => Array.isArray(users[e]?.refresh_tokens) && users[e].refresh_tokens.includes(rt));
        if (!email) return { data: null, error: { message: 'Session invalide' } };

        ensureUserId(users, email);

        // Rotate refresh token (optional) to mimic real behavior
        users[email].refresh_tokens = users[email].refresh_tokens.filter((x) => x !== rt);
        const newRefresh = generateRefreshToken();
        users[email].refresh_tokens.push(newRefresh);
        saveUsers(users);

        const expires_at = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
        return {
            data: {
                user: {
                    id: users[email].id,
                    email,
                    user_metadata: users[email].metadata
                },
                session: {
                    access_token: generateToken(users[email]),
                    refresh_token: newRefresh,
                    expires_at,
                    token_type: 'bearer'
                }
            },
            error: null
        };
    },
    
    /**
     * Simuler updateUser({ email, password }) (API Supabase)
     */
    updateUser: async (token, attributes) => {
        const payload = decodeToken(token);
        const userId = payload?.sub;
        const emailFromToken = payload?.email;
        if (!userId && !emailFromToken) return { data: { user: null }, error: { message: 'Session invalide' } };

        const users = loadUsers();
        let user = Object.values(users).find(u => u.id === userId);
        if (!user && emailFromToken) user = users[emailFromToken];
        
        if (!user) return { data: { user: null }, error: { message: 'Utilisateur introuvable' } };
        const oldEmail = user.email;

        const { email: newEmail, password: newPassword } = attributes;

        if (newPassword) {
            const salt = makeSalt();
            user.password_hash = hashPassword(newPassword, salt);
            user.password_salt = salt;
            user.password = null;
        }

        if (newEmail && newEmail !== oldEmail) {
            if (users[newEmail]) return { data: null, error: { message: 'Cet email est déjà utilisé' } };
            
            // Re-key the users object
            user.email = newEmail;
            users[newEmail] = user;
            delete users[oldEmail];
        }

        saveUsers(users);

        return {
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    user_metadata: user.metadata
                }
            },
            error: null
        };
    }
};
