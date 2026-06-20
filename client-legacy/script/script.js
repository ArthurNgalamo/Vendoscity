/**
 * ============================================================
 * MENU HAMBURGER MOBILE - CLASSE COMPLÈTE
 * ============================================================
 * 
 * Objectif: Gérer l'ouverture/fermeture du menu mobile
 * Quand: Sur les petits écrans (moins de 768px)
 * Comment: Click sur hamburger, clavier, clic dehors
 */

class MobileMenu {
    /**
     * CONSTRUCTOR - Exécuté quand on créée une nouvelle instance
     * ANALOGIE: C'est le "démarrage" de notre menu
     */
    constructor() {
        // Récupère l'élément hamburger (id="hamburger") du HTML
        // Si l'élément n'existe pas, hamburger = null
        this.hamburger = document.getElementById('hamburger');
        
        // Récupère l'élément nav-bar (id="nav-bar") du HTML
        this.navBar = document.getElementById('nav-bar');
        
        // Récupère tous les liens (<a>) dans le menu
        // ? = "si navBar existe, alors... sinon []"
        // Cette syntaxe s'appelle "optional chaining"
        this.navLinks = this.navBar ? this.navBar.querySelectorAll('a') : [];
        
        // VÉRIFICATION - S'il manque des éléments, on arrête
        if (!this.hamburger || !this.navBar) {
            console.warn('Erreur: Éléments du menu non trouvés dans le HTML');
            return;
        }
        
        // Variable d'état: true = menu ouvert, false = menu fermé
        this.isOpen = false;
        
        // Lance la méthode d'initialisation
        this.init();
    }
    
    /**
     * INITIALISER - Ajoute tous les événements (clics, clavier, etc)
     * C'est ici qu'on configure le comportement du menu
     */
    init() {
        /**
         * ÉVÉNEMENT 1: Clic sur le hamburger
         * addEventListener = "écoute" un événement
         * 'click' = quand on clique
         * e.stopPropagation() = empêche le clic de remonter
         */
        this.hamburger.addEventListener('click', (e) => {
            e.stopPropagation();        /* Évite que le clic ne remonte */
            this.toggleMenu();
        });
        
        /**
         * ÉVÉNEMENT 2: Clic sur les liens du menu
         * forEach = parcourir chaque lien
         * Quand on clique sur un lien, le menu se ferme
         * (Pour les petits écrans, c'est mieux pour l'UX)
         */
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();    /* Évite que le clic ne remonte */
                this.closeMenu();
            });
        });
        
        /**
         * ÉVÉNEMENT 3: Touche clavier Échap
         * keydown = quand on appuie sur une touche
         * e.key === 'Escape' = si la touche est Échap
         * this.isOpen = uniquement si le menu est ouvert
         */
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });
        
        /**
         * ÉVÉNEMENT 4: Clic en dehors du menu
         * e = l'événement du clic
         * e.target = l'élément sur lequel on a cliqué
         * closest('.header-nav') = cherche l'élément le plus proche avec la classe header-nav
         * Si on clique dehors, on ferme le menu
         */
        document.addEventListener('click', (e) => {
            /* Ferme le menu seulement si:
             * - Le menu est ouvert ET
             * - On a cliqué EN DEHORS du header (nav + hamburger)
             */
            if (this.isOpen && !e.target.closest('.header-nav')) {
                this.closeMenu();
            }
        });
    }
    
    /**
     * BASCULER LE MENU - toggleMenu
     * toggle = "basculer" (allumer/éteindre)
     * Si le menu est ouvert, on le ferme
     * Si le menu est fermé, on l'ouvre
     */
    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    /**
     * OUVRIR LE MENU - openMenu
     * Rend le menu visible et active l'animation
     */
    openMenu() {
        // Ajoute la classe 'active' au menu (CSS modifie son apparence)
        this.navBar.classList.add('active');
        
        // Ajoute la classe 'active' au hamburger (transforme les barres en X)
        this.hamburger.classList.add('active');
        
        // aria-expanded: indique aux lecteurs d'écran que le menu est ouvert
        this.hamburger.setAttribute('aria-expanded', 'true');
        
        // Actualise le label pour l'accessibilité
        this.hamburger.setAttribute('aria-label', 'Fermer navigation');
        
        // Change l'état
        this.isOpen = true;
        
        // Empêche le défilement du body (scroll) quand le menu est ouvert
        // C'est une meilleure UX sur mobile
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * FERMER LE MENU - closeMenu
     * Rend le menu invisible et annule l'animation
     */
    closeMenu() {
        // Retire la classe 'active' du menu (cache le menu)
        this.navBar.classList.remove('active');
        
        // Retire la classe 'active' du hamburger (remet les barres normales)
        this.hamburger.classList.remove('active');
        
        // aria-expanded: indique que le menu est fermé
        this.hamburger.setAttribute('aria-expanded', 'false');
        
        // Remet le label d'origine
        this.hamburger.setAttribute('aria-label', 'Afficher navigation');
        
        // Change l'état
        this.isOpen = false;
        
        // Restaure le défilement du body (permet de scroller à nouveau)
        document.body.style.overflow = '';
    }
}

/**
 * ============================================================
 * INITIALISATION DE L'APPLICATION
 * ============================================================
 * 
 * This function will be called by component-loader.js after the header is loaded.
 */
function initializeMobileMenu() {
    new MobileMenu();
}

/**
 * ============================================================
 * PWA - Installation + Service Worker
 * ============================================================
 *
 * - Android/Chrome: uses beforeinstallprompt to show an install button.
 * - iOS/Safari: no prompt event; the button shows a short help message.
 *
 * initializePWAInstall() must be called AFTER the header is injected (component-loader.js),
 * otherwise #pwa-install-btn won't exist yet.
 */
(function initVendoscityPWA() {
    // 1) Register service worker (safe no-op on unsupported browsers)
    try {
        if ('serviceWorker' in navigator) {
            const build = (typeof window.VENDOSCITY_BUILD_ID === 'string' && window.VENDOSCITY_BUILD_ID.trim())
                ? window.VENDOSCITY_BUILD_ID.trim()
                : '';
            const swUrl = build ? `/sw.js?v=${encodeURIComponent(build)}` : '/sw.js';

            window.addEventListener('load', () => {
                navigator.serviceWorker.register(swUrl).then((reg) => {
                    // Best-effort: force update check (helps when Vercel/clients are sticky).
                    try { reg.update(); } catch (_) { /* ignore */ }

                    // If a new SW takes control, reload once so the user gets the latest assets quickly.
                    try {
                        navigator.serviceWorker.addEventListener('controllerchange', () => {
                            try {
                                const k = 'vc_sw_reloaded';
                                if (sessionStorage.getItem(k) === '1') return;
                                sessionStorage.setItem(k, '1');
                                window.location.reload();
                            } catch (_) {
                                // If sessionStorage is blocked, still try a single reload.
                                window.location.reload();
                            }
                        }, { once: true });
                    } catch (_) { /* ignore */ }
                }).catch(() => {
                    // ignore (PWA still works as a website)
                });
            });
        }
    } catch (_) {
        // ignore
    }

    // 2) Capture install prompt (Chrome/Edge/Android)
    try {
        window.__vendoscityDeferredInstallPrompt = null;
        window.__vendoscityPwaInstalled = false;

        function isStandaloneNow() {
            const isStandalone = !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
            const isSafariStandalone = (typeof navigator.standalone === 'boolean') ? navigator.standalone : false;
            return isStandalone || isSafariStandalone;
        }

        function markInstalled() {
            window.__vendoscityPwaInstalled = true;
            try { localStorage.setItem('vc_pwa_installed', '1'); } catch (_) { /* ignore */ }
            try { if (typeof window.initializePWAInstall === 'function') window.initializePWAInstall(); } catch (_) {}
        }

        // Expose for debugging / manual override if needed.
        window.__vendoscityMarkPwaInstalled = markInstalled;

        // Bootstrap: if we are already running in standalone, persist it so the browser tab can hide the button too.
        try {
            const flag = localStorage.getItem('vc_pwa_installed') === '1';
            if (flag) window.__vendoscityPwaInstalled = true;
            if (isStandaloneNow()) markInstalled();
        } catch (_) {
            // ignore
        }

        // If the user installs and then returns, we may only detect standalone on the next show.
        window.addEventListener('pageshow', () => {
            try { if (isStandaloneNow()) markInstalled(); } catch (_) { /* ignore */ }
        });
        document.addEventListener('visibilitychange', () => {
            try { if (!document.hidden && isStandaloneNow()) markInstalled(); } catch (_) { /* ignore */ }
        });

        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent the mini-infobar and save for our custom button.
            e.preventDefault();
            window.__vendoscityDeferredInstallPrompt = e;
            // If the header is already present, update the button visibility.
            try { if (typeof window.initializePWAInstall === 'function') window.initializePWAInstall(); } catch (_) {}
        });

        window.addEventListener('appinstalled', () => {
            window.__vendoscityDeferredInstallPrompt = null;
            markInstalled();
        });
    } catch (_) {
        // ignore
    }
})();

function initializePWAInstall() {
    const btn = document.getElementById('pwa-install-btn');
    if (!btn) return;
    if (btn.dataset.vcBound === '1') {
        // Still re-sync visibility (prompt might have arrived later).
        syncPwaInstallVisibility(btn);
        return;
    }
    btn.dataset.vcBound = '1';

    btn.addEventListener('click', async () => {
        const deferred = window.__vendoscityDeferredInstallPrompt;
        if (deferred && typeof deferred.prompt === 'function') {
            try {
                deferred.prompt();
                const choice = await deferred.userChoice.catch(() => null);
                // In the browser tab, display-mode usually remains "browser" even after install.
                // Persist a flag so the install button can disappear immediately after acceptance.
                if (choice && choice.outcome === 'accepted') {
                    try { if (typeof window.__vendoscityMarkPwaInstalled === 'function') window.__vendoscityMarkPwaInstalled(); } catch (_) {}
                }
            } catch (_) {
                // ignore
            }
            window.__vendoscityDeferredInstallPrompt = null;
            syncPwaInstallVisibility(btn);
            return;
        }

        // iOS fallback (no prompt event)
        const ua = String(navigator.userAgent || '').toLowerCase();
        const isIOS = ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod');
        const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
        const isSafariStandalone = (typeof navigator.standalone === 'boolean') ? navigator.standalone : false;

        if (isIOS && !(isStandalone || isSafariStandalone)) {
            vendoscityToast("Sur iPhone: Safari > Partager > Sur l'ecran d'accueil. Apres installation, ouvre l'app depuis l'icone.");
            // iOS doesn't give a reliable "installed" signal in Safari. Allow a manual hide once the user confirms.
            try {
                const ok = window.confirm("Apres avoir ajoute a l'ecran d'accueil, appuie sur OK pour masquer le bouton Installer.");
                if (ok) {
                    try { if (typeof window.__vendoscityMarkPwaInstalled === 'function') window.__vendoscityMarkPwaInstalled(); } catch (_) {}
                }
            } catch (_) {
                // ignore
            }
        } else {
            vendoscityToast("Android: Chrome > menu (⋮) > Installer l'application (ou Ajouter a l'ecran d'accueil)");
        }
    });

    syncPwaInstallVisibility(btn);

    // Extra detection for Chromium: hide if the app is already installed (even if display-mode is still browser).
    try {
        const fn = navigator.getInstalledRelatedApps;
        if (typeof fn === 'function') {
            fn.call(navigator).then((apps) => {
                if (Array.isArray(apps) && apps.length > 0) {
                    try { if (typeof window.__vendoscityMarkPwaInstalled === 'function') window.__vendoscityMarkPwaInstalled(); } catch (_) {}
                }
            }).catch(() => { /* ignore */ });
        }
    } catch (_) {
        // ignore
    }
}

function syncPwaInstallVisibility(btn) {
    if (!btn) return;

    const deferred = window.__vendoscityDeferredInstallPrompt;
    const ua = String(navigator.userAgent || '').toLowerCase();
    const isIOS = ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod');
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    const isSafariStandalone = (typeof navigator.standalone === 'boolean') ? navigator.standalone : false;
    let flagInstalled = false;
    try { flagInstalled = localStorage.getItem('vc_pwa_installed') === '1'; } catch (_) { flagInstalled = false; }
    const alreadyInstalled = isStandalone || isSafariStandalone || !!window.__vendoscityPwaInstalled || flagInstalled;

    // Always show the icon when not installed (user asked for a visible "download" affordance).
    // If the browser doesn't expose an install prompt, clicking shows guidance.
    const shouldShow = !alreadyInstalled;
    const canPrompt = !!deferred;

    btn.hidden = !shouldShow;
    btn.style.display = shouldShow ? 'inline-flex' : 'none';
    btn.classList.toggle('is-ready', canPrompt);

    if (!shouldShow) return;

    if (canPrompt) {
        btn.setAttribute('title', "Installer l'application");
        btn.setAttribute('aria-label', "Installer l'application");
    } else if (isIOS) {
        btn.setAttribute('title', "Installer (iPhone): Partager > Sur l'ecran d'accueil");
        btn.setAttribute('aria-label', "Installer sur iPhone (Safari): Sur l'ecran d'accueil");
    } else {
        btn.setAttribute('title', "Installer: menu du navigateur > Installer l'application");
        btn.setAttribute('aria-label', "Installer l'application (instructions)");
    }
}

function vendoscityToast(message) {
    const text = String(message || '').trim();
    if (!text) return;

    let el = document.getElementById('vc-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'vc-toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
    }

    el.textContent = text;
    el.className = 'vc-toast is-on';

    window.clearTimeout(window.__vendoscityToastT);
    window.__vendoscityToastT = window.setTimeout(() => {
        el.className = 'vc-toast';
    }, 2600);
}

// Expose for component-loader.js (header injected after DOMContentLoaded on many pages)
window.initializePWAInstall = initializePWAInstall;

/**
 * ============================================================
 * NETWORK HELPERS - timeout + UX message when backend is waking up
 * ============================================================
 */
(function initVendoscityNet() {
    const WAKE_MSG = 'Serveur en réveil, réessayez dans 30-60s';

    function showWakeToastOnce() {
        const now = Date.now();
        const last = Number(window.__vcWakeToastAt || 0);
        // Avoid spamming the user if multiple requests timeout together.
        if (now - last < 20000) return;
        window.__vcWakeToastAt = now;

        if (typeof vendoscityToast === 'function') vendoscityToast(WAKE_MSG);
        else {
            try { window.alert(WAKE_MSG); } catch (_) { /* ignore */ }
        }
    }

    function shouldTreatAsNetworkTimeout(err) {
        // Chrome/Edge: TypeError "Failed to fetch" / "Load failed" when request can't connect or times out at network layer.
        // Firefox: "NetworkError when attempting to fetch resource."
        const name = String(err?.name || '');
        const msg = String(err?.message || '');
        if (name === 'AbortError') return false; // handled elsewhere
        if (name === 'TypeError') return true;
        if (/NetworkError/i.test(msg)) return true;
        if (/Failed to fetch/i.test(msg)) return true;
        if (/Load failed/i.test(msg)) return true;
        if (/timed?\s*out/i.test(msg)) return true;
        return false;
    }

    async function fetchWithTimeout(url, options = {}, timeoutMs = 0) {
        const ms = Number(timeoutMs);
        if (!Number.isFinite(ms) || ms <= 0) {
            return fetch(url, options).catch((e) => {
                if (shouldTreatAsNetworkTimeout(e)) showWakeToastOnce();
                throw e;
            });
        }

        const opts = options || {};
        const extSignal = opts.signal;
        const controller = new AbortController();

        // If caller already aborted, propagate immediately.
        if (extSignal && extSignal.aborted) controller.abort();

        let didTimeout = false;
        const timer = window.setTimeout(() => {
            didTimeout = true;
            try { controller.abort(); } catch (_) { /* ignore */ }
        }, ms);

        if (extSignal && typeof extSignal.addEventListener === 'function') {
            try {
                extSignal.addEventListener('abort', () => {
                    try { controller.abort(); } catch (_) { /* ignore */ }
                }, { once: true });
            } catch (_) { /* ignore */ }
        }

        try {
            return await fetch(url, { ...opts, signal: controller.signal });
        } catch (e) {
            // Only show the wake message for our own timeouts.
            if (didTimeout || shouldTreatAsNetworkTimeout(e)) showWakeToastOnce();
            throw e;
        } finally {
            window.clearTimeout(timer);
        }
    }

    window.VendoscityNet = window.VendoscityNet || {};
    // Signature: (url, options, timeoutMs)
    window.VendoscityNet.fetch = fetchWithTimeout;
    window.VendoscityNet.showWakeToastOnce = showWakeToastOnce;
})();

/**
 * ============================================================
 * SESSION SELLER (Supabase) - refresh automatique du token
 * ============================================================
 *
 * En production, l'access_token expire (souvent ~1h). Le refresh_token permet
 * de récupérer un nouveau token sans redemander le mot de passe.
 */
(function initVendoscitySession() {
    const STORAGE = {
        access: 'sellerToken',
        refresh: 'sellerRefreshToken',
        expiresAt: 'sellerTokenExpiresAt' // unix seconds
    };

    function normalizeAccessToken(raw) {
        const t = String(raw || '').trim();
        if (!t) return null;
        // Defensive: some code paths (or old storage) might accidentally store "Bearer <jwt>"
        // which would break both JWT parsing and Authorization header formatting.
        if (t.toLowerCase().startsWith('bearer ')) return t.slice(7).trim() || null;
        return t;
    }

    function read(key) {
        try { return localStorage.getItem(key); } catch (_) { return null; }
    }

    function write(key, value) {
        try {
            if (value === null || value === undefined || value === '') localStorage.removeItem(key);
            else localStorage.setItem(key, String(value));
        } catch (_) {
            // ignore
        }
    }

    function clearSession() {
        write(STORAGE.access, null);
        write(STORAGE.refresh, null);
        write(STORAGE.expiresAt, null);
    }

    function getAccessTokenRaw() {
        const t = normalizeAccessToken(read(STORAGE.access));
        if (!t) return null;
        // Self-heal storage if an old/buggy value is present.
        write(STORAGE.access, t);
        return t;
    }

    function getRefreshTokenRaw() {
        return read(STORAGE.refresh);
    }

    function parseJwtPayload(token) {
        const t = normalizeAccessToken(token);
        if (!t) return null;
        const parts = t.split('.');
        if (parts.length < 2) return null;
        try {
            // base64url decode
            const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
            const json = atob(padded);
            const payload = JSON.parse(json);
            return payload && typeof payload === 'object' ? payload : null;
        } catch (_) {
            return null;
        }
    }

    function getExpiresAt() {
        const raw = read(STORAGE.expiresAt);
        const n = raw ? parseInt(raw, 10) : NaN;
        if (Number.isFinite(n)) return n;

        // Back-compat: if expiresAt is not stored (older sessions), try to derive it from the JWT.
        const access = getAccessTokenRaw();
        const payload = parseJwtPayload(access);
        const exp = payload && Number.isFinite(Number(payload.exp)) ? Number(payload.exp) : null;
        if (exp) {
            write(STORAGE.expiresAt, String(exp));
            return exp;
        }
        return null;
    }

    function isExpiredSoon(expiresAt, skewSeconds = 30) {
        if (!expiresAt) return true; // if unknown, treat as expired to force refresh (mobile often has old storage)
        const now = Math.floor(Date.now() / 1000);
        return now >= (expiresAt - skewSeconds);
    }

    async function refreshSession() {
        const refresh_token = getRefreshTokenRaw();
        if (!refresh_token) throw new Error('Session invalide: reconnectez-vous.');

        const base = (typeof API_BASE_URL === 'string') ? API_BASE_URL : '';
        const url = `${base}/api/auth/refresh`;
        const netFetch = (window.VendoscityNet && typeof window.VendoscityNet.fetch === 'function')
            ? window.VendoscityNet.fetch
            : async (u, o) => fetch(u, o);
        let res;
        try {
            res = await netFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token })
            }, 15000);
        } catch (e) {
            // Don't fallback cross-origin here: it triggers CORS preflight and often fails when Render is cold (no ACAO on 5xx).
            throw e;
        }

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok) {
            clearSession();
            throw new Error(data?.error || 'Session invalide: reconnectez-vous.');
        }

        const session = data?.session;
        if (!session?.access_token) {
            clearSession();
            throw new Error('Session invalide: reconnectez-vous.');
        }

        write(STORAGE.access, normalizeAccessToken(session.access_token));
        if (session.refresh_token) write(STORAGE.refresh, session.refresh_token);
        if (session.expires_at) write(STORAGE.expiresAt, session.expires_at);
        return session.access_token;
    }

    async function getValidAccessToken({ forceRefresh = false } = {}) {
        const access = getAccessTokenRaw();
        const expiresAt = getExpiresAt();

        if (!access) {
            // If access token missing but refresh token exists, try refresh.
            if (getRefreshTokenRaw()) return refreshSession();
            return null;
        }

        // If expiresAt is missing but token contains exp, getExpiresAt() will populate it above.
        if (forceRefresh || isExpiredSoon(expiresAt)) {
            try {
                return await refreshSession();
            } catch (_) {
                // If refresh fails, return null; callers can decide to show login.
                return null;
            }
        }

        return access;
    }

    async function authFetch(url, options = {}) {
        const base = (typeof API_BASE_URL === 'string') ? API_BASE_URL : '';
        const token = await getValidAccessToken();
        const netFetch = (window.VendoscityNet && typeof window.VendoscityNet.fetch === 'function')
            ? window.VendoscityNet.fetch
            : async (u, o) => fetch(u, o);

        const opts = { ...(options || {}) };
        const userTimeout = Number(opts.timeoutMs);
        delete opts.timeoutMs;

        const method = String(opts.method || 'GET').toUpperCase();
        const hasBody = !!opts.body;
        const defaultTimeoutMs = (!hasBody && (method === 'GET' || method === 'HEAD')) ? 15000 : 0;
        const timeoutMs = (Number.isFinite(userTimeout) && userTimeout > 0) ? userTimeout : defaultTimeoutMs;

        const headers = new Headers(opts.headers || {});
        if (token) headers.set('Authorization', `Bearer ${token}`);

        // Avoid cross-origin fallbacks unless it's a public/simple GET:
        // - Authenticated requests add `Authorization` which triggers CORS preflight cross-origin.
        // - When Render is cold, preflight often returns a 5xx without ACAO and the browser blocks it.
        // - Non-idempotent methods (POST/PUT/DELETE) should never be retried against another origin.
        const hasAuthHeader = headers.has('Authorization');
        const isSimpleGet = (method === 'GET' || method === 'HEAD') && !hasBody && !hasAuthHeader;
        const canUseFallback = isSimpleGet;

        const direct = (typeof window.VENDOSCITY_API_DIRECT_URL === 'string') ? String(window.VENDOSCITY_API_DIRECT_URL).trim() : '';
        const primary = url.startsWith('http') ? url : `${base}${url}`;
        const fallback = (canUseFallback && !url.startsWith('http') && direct) ? `${direct}${url}` : '';
        const showWake = (window.VendoscityNet && typeof window.VendoscityNet.showWakeToastOnce === 'function')
            ? window.VendoscityNet.showWakeToastOnce
            : () => {};

        async function tryFallbackOnBadGateway(res) {
            if (!fallback || fallback === primary) return res;
            if (!res || res.ok) return res;
            // Vercel external rewrite can return HTML 502/504 which breaks JSON parsing on client.
            // In that case, retry once against the direct backend URL.
            const ct = (typeof res.headers?.get === 'function') ? String(res.headers.get('content-type') || '') : '';
            const shouldRetry = res.status === 502 || res.status === 504 || (res.status >= 500 && ct.includes('text/html'));
            if (!shouldRetry) return res;
            try {
                const res2 = await netFetch(fallback, { ...opts, headers }, timeoutMs);
                return res2 || res;
            } catch (_) {
                if (_ && _.name === 'AbortError') throw _; // Ne pas masquer une annulation
                return res;
            }
        }

        let res;
        try {
            res = await netFetch(primary, { ...opts, headers }, timeoutMs);
        } catch (e) {
            if (e && e.name === 'AbortError') throw e; // Respecter l'annulation (timeout utilisateur)
            if (fallback && fallback !== primary) {
                res = await netFetch(fallback, { ...opts, headers }, timeoutMs);
            } else {
                throw e;
            }
        }

        // If the backend is sleeping/unreachable, Vercel often returns 502/504. Show the UX hint.
        if (res && (res.status === 502 || res.status === 504)) {
            try { showWake(); } catch (_) { /* ignore */ }
        }
        res = await tryFallbackOnBadGateway(res);

        // Retry once on expired/invalid token
        if (res.status === 401 && getRefreshTokenRaw()) {
            try {
                const next = await getValidAccessToken({ forceRefresh: true });
                if (!next) return res;
                const headers2 = new Headers(opts.headers || {});
                headers2.set('Authorization', `Bearer ${next}`);
                const primary2 = url.startsWith('http') ? url : `${base}${url}`;
                let res2 = await netFetch(primary2, { ...opts, headers: headers2 }, timeoutMs);
                // If proxy path returns 5xx/HTML, retry against direct backend once.
                if (fallback && !url.startsWith('http') && fallback !== primary2 && res2 && !res2.ok) {
                    const ct2 = (typeof res2.headers?.get === 'function') ? String(res2.headers.get('content-type') || '') : '';
                    const shouldRetry2 = res2.status === 502 || res2.status === 504 || (res2.status >= 500 && ct2.includes('text/html'));
                    if (shouldRetry2) {
                        try {
                            const res3 = await netFetch(fallback, { ...opts, headers: headers2 }, timeoutMs);
                            if (res3) res2 = res3;
                        } catch (_) { /* ignore */ }
                    }
                }
                return res2;
            } catch (_) {
                return res;
            }
        }

        return res;
    }

    window.VendoscitySession = {
        getAccessTokenRaw,
        getRefreshTokenRaw,
        getValidAccessToken,
        refreshSession,
        clearSession,
        getUserId: () => {
            const payload = parseJwtPayload(getAccessTokenRaw());
            const uid = payload?.sub || payload?.user_id || payload?.uid || null;
            return uid ? String(uid) : null;
        },
        authFetch
    };
})();

/**
 * ============================================================
 * SHARE (Produits) - 1 clic, partage natif ou copie lien
 * ============================================================
 */
(function initVendoscityShare() {
    function safeText(x, fallback = '') {
        const s = String(x ?? '').trim();
        return s || fallback;
    }

    async function copyToClipboard(text) {
        const value = safeText(text);
        if (!value) return false;
        try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(value);
                return true;
            }
        } catch (_) {
            // ignore and fallback
        }

        // Old fallback: prompt
        try {
            window.prompt('Copiez le lien ci-dessous:', value);
        } catch (_) {
            // ignore
        }
        return false;
    }

    function buildFallbackShareSheet({ title, text, url }) {
        const shareUrl = safeText(url, window.location.href);
        const shareText = safeText(text, '');
        const shareTitle = safeText(title, 'Vendoscity');

        const encUrl = encodeURIComponent(shareUrl);
        const encText = encodeURIComponent(shareText || shareTitle);
        const encTitle = encodeURIComponent(shareTitle);

        const items = [
            { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent((shareText ? (shareText + ' ') : '') + shareUrl)}` },
            { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}` },
            { label: 'X', href: `https://twitter.com/intent/tweet?text=${encText}&url=${encUrl}` },
            { label: 'Telegram', href: `https://t.me/share/url?url=${encUrl}&text=${encText}` },
            { label: 'Email', href: `mailto:?subject=${encTitle}&body=${encodeURIComponent((shareText ? (shareText + '\\n\\n') : '') + shareUrl)}` }
        ];

        const overlay = document.createElement('div');
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.55)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'flex-end';
        overlay.style.justifyContent = 'center';
        overlay.style.padding = '16px';
        overlay.style.zIndex = '99999';

        const sheet = document.createElement('div');
        sheet.style.width = 'min(560px, 100%)';
        sheet.style.background = '#fff';
        sheet.style.borderRadius = '18px';
        sheet.style.boxShadow = '0 25px 70px rgba(0,0,0,0.35)';
        sheet.style.padding = '14px';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.justifyContent = 'space-between';
        header.style.gap = '12px';
        header.style.marginBottom = '10px';

        const h = document.createElement('div');
        h.style.fontWeight = '800';
        h.style.color = 'var(--primary-blue)';
        h.textContent = 'Partager';

        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = 'Fermer';
        close.style.border = '1px solid #e5e7eb';
        close.style.background = '#fff';
        close.style.borderRadius = '12px';
        close.style.padding = '10px 12px';
        close.style.cursor = 'pointer';
        close.addEventListener('click', () => overlay.remove());

        header.appendChild(h);
        header.appendChild(close);

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
        grid.style.gap = '10px';
        grid.style.marginBottom = '10px';

        for (const it of items) {
            const a = document.createElement('a');
            a.href = it.href;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = it.label;
            a.style.textDecoration = 'none';
            a.style.border = '1px solid #e5e7eb';
            a.style.borderRadius = '14px';
            a.style.padding = '12px';
            a.style.fontWeight = '800';
            a.style.color = 'var(--primary-blue)';
            a.style.background = '#fff';
            a.style.display = 'flex';
            a.style.alignItems = 'center';
            a.style.justifyContent = 'center';
            grid.appendChild(a);
        }

        const copy = document.createElement('button');
        copy.type = 'button';
        copy.textContent = 'Copier le lien';
        copy.style.width = '100%';
        copy.style.border = 'none';
        copy.style.borderRadius = '14px';
        copy.style.padding = '12px';
        copy.style.fontWeight = '900';
        copy.style.cursor = 'pointer';
        copy.style.background = 'var(--color-yellow)';
        copy.style.color = 'var(--primary-blue)';
        copy.addEventListener('click', async () => {
            await copyToClipboard(shareUrl);
        });

        sheet.appendChild(header);
        sheet.appendChild(grid);
        sheet.appendChild(copy);
        overlay.appendChild(sheet);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        document.addEventListener('keydown', function onKey(e) {
            if (e.key !== 'Escape') return;
            overlay.remove();
            document.removeEventListener('keydown', onKey);
        });

        document.body.appendChild(overlay);
        return { ok: true, mode: 'sheet' };
    }

    async function share({ title, text, url }) {
        const shareUrl = safeText(url, window.location.href);
        const rawTitle = safeText(title, 'Article Vendoscity');
        const rawText = safeText(text, '');

        // If caller didn't provide a message, build one that matches the platform positioning:
        // direct seller-buyer, order via WhatsApp, Cameroon-focused.
        const builtText = rawText || `${rawTitle}\n\nCommande directe via WhatsApp. Plateforme au Cameroun.`;

        const shareData = {
            title: rawTitle,
            text: builtText,
            url: shareUrl
        };

        try {
            if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
                await navigator.share(shareData);
                return { ok: true, mode: 'native' };
            }
        } catch (_) {
            // User canceled or browser refused -> fallback to copy
        }

        // Fallback share sheet with multiple networks + copy.
        return buildFallbackShareSheet(shareData);
    }

    window.VendoscityShare = { share };
})();

/**
 * ============================================================
 * IMAGES (Supabase Storage) - fallback anti-ORB
 * ============================================================
 *
 * Certains navigateurs peuvent bloquer une réponse "opaque" (ORB) si l'URL
 * signée renvoie autre chose qu'une image (HTML/JSON, challenge, etc.).
 * On tente automatiquement:
 * 1) signed -> public (render/object)
 * 2) render public -> object public
 * 3) placeholder local
 */
(function initVendoscityImages() {
    const DEFAULT = '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png';

    function safeUrl(input) {
        const s = String(input || '').trim();
        if (!s) return null;
        try {
            // Support relative URLs too
            return new URL(s, window.location.href);
        } catch (_) {
            return null;
        }
    }

    function replacePath(url, from, to) {
        if (!url) return null;
        if (!url.pathname.includes(from)) return null;
        url.pathname = url.pathname.replace(from, to);
        return url;
    }

    function stripToken(url) {
        if (!url) return null;
        url.searchParams.delete('token');
        return url;
    }

    function nextFallback(currentSrc, step) {
        const s = String(currentSrc || '').trim();
        const n = Number.isFinite(Number(step)) ? Number(step) : 0;
        const url = safeUrl(s);
        if (!url) return null;

        // Step 0: prefer object endpoints (render/image/* may be disabled on Supabase project)
        if (n === 0) {
            const u0 = new URL(url.toString());
            if (replacePath(u0, '/storage/v1/render/image/sign/', '/storage/v1/object/sign/')) {
                return { src: u0.toString(), step: 1 };
            }
            const u1 = new URL(url.toString());
            if (replacePath(u1, '/storage/v1/render/image/public/', '/storage/v1/object/public/')) {
                stripToken(u1);
                u1.searchParams.delete('width');
                u1.searchParams.delete('quality');
                return { src: u1.toString(), step: 1 };
            }
            const u2 = stripToken(new URL(url.toString()));
            if (replacePath(u2, '/storage/v1/object/sign/', '/storage/v1/object/public/')) {
                return { src: u2.toString(), step: 1 };
            }
        }

        // Step 1: if object/public fails, try stripping query params (some caches/extensions can break signed URLs)
        if (n === 1) {
            const u3 = new URL(url.toString());
            u3.search = '';
            return { src: u3.toString(), step: 2 };
        }

        return null;
    }

    function defaultImage() {
        return DEFAULT;
    }

    window.VendoscityImages = { nextFallback, defaultImage };
})();

/**
 * ============================================================
 * MOTION: reveal on scroll + small interactions
 * ============================================================
 */
(function initVendoscityMotion() {
    const prefersReduced = (() => {
        try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
    })();

    function markReveal(el, delayMs = 0) {
        if (!el || !(el instanceof Element)) return;
        if (prefersReduced) {
            el.classList.add('is-revealed');
            return;
        }
        el.classList.add('reveal');
        el.style.setProperty('--reveal-delay', `${Math.max(0, delayMs)}ms`);
    }

    function revealWithin(root) {
        const base = (root && root instanceof Element) ? root : document;
        const candidates = base.querySelectorAll('.reveal:not(.is-revealed)');
        if (!('IntersectionObserver' in window)) {
            candidates.forEach((el) => el.classList.add('is-revealed'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (!e.isIntersecting) continue;
                e.target.classList.add('is-revealed');
                io.unobserve(e.target);
            }
        }, { threshold: 0.12, rootMargin: '80px 0px' });

        candidates.forEach((el) => io.observe(el));
    }

    // Auto-mark common sections on first load (home + pages)
    document.addEventListener('DOMContentLoaded', () => {
        const blocks = [
            '.hero-content',
            '.features',
            '.home-categories',
            '.home-shelves',
            '.boutique-controls',
            '.products-grid',
            '.product-detail-container',
            '.reviews-section'
        ];
        let idx = 0;
        for (const sel of blocks) {
            document.querySelectorAll(sel).forEach((el) => {
                markReveal(el, Math.min(260, idx * 60));
                idx += 1;
            });
        }

        // Make obvious tap targets feel alive
        document.querySelectorAll('.cta-button, .btn-primary, .auth-btn, .home-disclosure-summary').forEach((el) => {
            el.classList.add('pressable');
        });

        revealWithin(document);
    });

    window.VendoscityMotion = { markReveal, revealWithin };
})();

/**
 * ============================================================
 * PASSWORD TOGGLE: show/hide password input (eye icon)
 * ============================================================
 */
(function initVendoscityPasswordToggle() {
    function positionToggle(parent, input, btn) {
        if (!parent || !input || !btn) return;
        try {
            const pr = parent.getBoundingClientRect();
            const ir = input.getBoundingClientRect();
            const top = (ir.top - pr.top) + (ir.height / 2);
            btn.style.top = `${Math.round(top)}px`;
        } catch (_) {
            // ignore
        }
    }

    function setIcon(btn, show) {
        btn.innerHTML = show ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
        btn.setAttribute('aria-pressed', show ? 'true' : 'false');
        btn.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
        if (window.lucide) lucide.createIcons();
    }

    function enhance(input) {
        if (!input || !(input instanceof HTMLInputElement)) return;
        if (input.dataset.vcPwEnhanced === '1') return;
        if (String(input.type || '').toLowerCase() !== 'password') return;

        const parent = input.parentElement;
        if (!parent) return;

        parent.classList.add('vc-pw-field');
        input.dataset.vcPwEnhanced = '1';

        // Make room for the toggle button without changing layout.
        try {
            const pr = parseInt(window.getComputedStyle(input).paddingRight || '0', 10) || 0;
            input.style.paddingRight = `${Math.max(pr, 54)}px`;
        } catch (_) {
            input.style.paddingRight = '54px';
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vc-pw-toggle pressable';
        btn.setAttribute('tabindex', '0');
        setIcon(btn, false);

        // Keep the cursor/focus in the input when pressing the icon.
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
        });

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const showing = String(input.type || '').toLowerCase() !== 'password';
            input.type = showing ? 'password' : 'text';
            setIcon(btn, !showing);
            positionToggle(parent, input, btn);
            try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
        });

        parent.appendChild(btn);

        // Initial positioning + keep aligned on resize.
        positionToggle(parent, input, btn);
        window.addEventListener('resize', () => positionToggle(parent, input, btn));
        window.addEventListener('scroll', () => positionToggle(parent, input, btn), { passive: true });
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('input[type="password"]').forEach(enhance);
    });
})();

/**
 * ============================================================
 * PRODUCT CARD AUTO-SLIDES (cards with dots) - 4s loop
 * ============================================================
 * Works wherever a product card has:
 * - img.product-image (main image)
 * - .product-dots with button.product-dot-btn[data-src] (sources)
 *
 * Built as progressive enhancement, compatible with infinite scroll.
 */
(function initVendoscityCardAutoSlides() {
    const prefersReduced = (() => {
        try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
    })();

    if (prefersReduced) return;

    const SLIDE_MS = 4000;
    const enhancedAttr = 'data-vc-card-slides';

    const controllers = new WeakMap(); // card -> controller

    const io = ('IntersectionObserver' in window)
        ? new IntersectionObserver((entries) => {
            for (const e of entries) {
                const card = e.target;
                const c = controllers.get(card);
                if (!c) continue;
                if (e.isIntersecting) c.start();
                else c.stop();
            }
        }, { threshold: 0.18, rootMargin: '140px 0px' })
        : null;

    function makeController(card) {
        const img = card.querySelector('img.product-image');
        const dots = card.querySelector('.product-dots');
        if (!img || !dots) return null;

        const btns = Array.from(dots.querySelectorAll('button.product-dot-btn[data-src]'));
        const sources = btns.map((b) => String(b.dataset.src || '').trim()).filter(Boolean);
        if (sources.length < 2) return null;

        const pickIdxFromDom = () => {
            const active = btns.findIndex((b) => b.classList.contains('active'));
            return active >= 0 ? active : 0;
        };

        let idx = pickIdxFromDom();
        let timer = null;
        let paused = false;

        const apply = (nextIdx) => {
            const i = ((nextIdx % sources.length) + sources.length) % sources.length;
            idx = i;
            const src = sources[i];
            if (src) img.src = src;
            btns.forEach((b, bi) => b.classList.toggle('active', bi === i));
        };

        const tick = () => {
            if (paused) return;
            apply(idx + 1);
        };

        const start = () => {
            if (timer) return;
            // Sync with any manual selection the user made.
            idx = pickIdxFromDom();
            timer = window.setInterval(tick, SLIDE_MS);
        };

        const stop = () => {
            if (!timer) return;
            window.clearInterval(timer);
            timer = null;
        };

        const pause = () => { paused = true; };
        const resume = () => { paused = false; };

        // Pause when user interacts to avoid fighting selection.
        card.addEventListener('pointerenter', pause);
        card.addEventListener('pointerleave', resume);
        card.addEventListener('focusin', pause);
        card.addEventListener('focusout', resume);
        dots.addEventListener('pointerdown', () => {
            pause();
            // Resume shortly after the tap/click.
            window.setTimeout(resume, 900);
        }, { passive: true });

        return { start, stop, apply };
    }

    function enhanceWithin(root) {
        const base = (root && root instanceof Element) ? root : document;
        const cards = base.matches?.('.product-card') ? [base] : Array.from(base.querySelectorAll('.product-card'));
        for (const card of cards) {
            if (!(card instanceof Element)) continue;
            if (card.hasAttribute(enhancedAttr)) continue;
            card.setAttribute(enhancedAttr, '1');

            const c = makeController(card);
            if (!c) continue;
            controllers.set(card, c);

            if (io) io.observe(card);
            else c.start();
        }
    }

    // Initial pass
    document.addEventListener('DOMContentLoaded', () => {
        enhanceWithin(document);
    });

    // Auto-enhance future cards (infinite scroll, dynamic rendering)
    let raf = 0;
    const mo = new MutationObserver((mutations) => {
        if (raf) return;
        raf = window.requestAnimationFrame(() => {
            raf = 0;
            for (const m of mutations) {
                for (const n of (m.addedNodes || [])) {
                    if (n && n.nodeType === 1) enhanceWithin(n);
                }
            }
        });
    });

    try {
        mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch (_) {
        // ignore
    }

    // Pause/resume all when tab is hidden/visible (single listener).
    document.addEventListener('visibilitychange', () => {
        try {
            // Only affect currently observed/enhanced cards.
            // WeakMap isn't iterable; rely on IO (visible cards auto start/stop) + a best-effort rescan.
            if (!document.hidden) enhanceWithin(document);
        } catch (_) {
            // ignore
        }
    });

    window.VendoscityCards = window.VendoscityCards || {};
    window.VendoscityCards.enhanceAutoSlides = enhanceWithin;

    // Mapping Emoji -> Icon ID (Lucide)
    const VENDOSCITY_EMOJI_MAP = {
        '🚚': 'truck', '📦': 'package', '🛡️': 'shield', '🛡': 'shield', '⚡': 'zap',
        '❤️': 'heart', '❤': 'heart', '⭐': 'star', '📞': 'phone', '📱': 'smartphone',
        '💳': 'credit-card', '🎁': 'gift', '🏷️': 'tag', '🏷': 'tag', '⏰': 'clock',
        '📍': 'map-pin', '✅': 'check-circle', '⚠️': 'alert-circle', '🛒': 'shopping-cart',
        '🛍️': 'shopping-bag', '🛍': 'shopping-bag', '🏠': 'home', '🔍': 'search',
        '⚙️': 'settings', '⚙': 'settings', '🗑️': 'trash', '🗑': 'trash', '✏️': 'edit',
        '➕': 'plus', '📷': 'camera', '🖼️': 'image', '🖼': 'image', '🎥': 'video', 
        '🎵': 'music', '🎤': 'mic', '📢': 'speaker', '📶': 'wifi', '🔋': 'battery',
        '🔒': 'lock', '👁️': 'eye', '👁': 'eye', '✉️': 'mail', '📤': 'share-2',
        '🚀': 'send', '👍': 'thumbs-up', '🏆': 'award', '💼': 'briefcase', '🌿': 'leaf',
        '☕': 'coffee', '🍴': 'utensils', '👕': 'shirt', '🚗': 'car', '🎧': 'headphones',
        '💻': 'monitor', '💾': 'hard-drive', '🔑': 'key', '🗺️': 'map', '🗺': 'map'
    };

    /**
     * FORMATAGE DES TEXTES VENDOSCITY
     * Supporte: 
     * - Protection XSS (auto-escape)
     * - Bold: *texte* -> <strong>texte</strong>
     * - Icons: :icon-name: ou emoji (🚚) -> SVG icon
     * - Newlines: \n -> <br>
     */
    window.formatVendoscityText = function(text) {
        if (!text) return "";
        // 1. Échappement HTML pour la sécurité
        let safe = String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        
        // 2. Conversion Emojis -> Tags d'icones (:icon-name:)
        for (const [emoji, id] of Object.entries(VENDOSCITY_EMOJI_MAP)) {
            // Use split/join to replace all occurrences even without regex
            safe = safe.split(emoji).join(`:${id}:`);
        }

        // 3. Gras: *texte* -> <strong>texte</strong>
        safe = safe.replace(/\*(.*?)\*/g, '<strong>$1</strong>');

        // 4. Icônes: :package: -> <i data-lucide="package" class="desc-icon"></i>
        safe = safe.replace(/:([a-z0-9-]+):/g, '<i data-lucide="$1" class="desc-icon"></i>');
        
        // 5. Retours à la ligne: \n -> <br>
        safe = safe.replace(/\n/g, '<br>');
        
        return safe;
    };

    window.escapeHTML = function(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // Ajout dynamique du style pour les descriptions de cartes + Icônes + Shop Badge
    const style = document.createElement('style');
    style.textContent = `
        .product-card-desc-snippet {
            font-size: 0.82rem;
            color: #666;
            margin-top: 4px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.3;
        }
        .product-card-desc-snippet strong {
            color: var(--primary-blue);
            font-weight: 700;
        }
        .desc-icon {
            display: inline-block;
            vertical-align: middle;
            width: 1.1em;
            height: 1.1em;
            margin-top: -3px;
            color: var(--primary-blue);
        }
        .product-card-shop {
            font-size: 0.62rem;
            font-weight: 800;
            color: var(--primary-blue);
            padding: 0;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: flex;
            align-items: center;
            gap: 4px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            opacity: 0.8;
        }
        .product-card-shop i {
            width: 10px;
            height: 10px;
            flex-shrink: 0;
            stroke-width: 3px;
        }
        .product-badge-discount {
            position: absolute;
            bottom: 8px; /* Move to bottom to avoid overlap with share/cart buttons at top */
            left: 8px;
            background: var(--color-red);
            color: white;
            font-size: 0.65rem;
            font-weight: 800;
            padding: 4px 8px;
            border-radius: 6px;
            z-index: 10;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            pointer-events: none;
        }
        .product-price-old {
            color: #64748b;
            text-decoration: line-through 2.5px #1a1a1a; /* Thicker and darker line */
            font-size: 0.95rem; /* Bigger than the new price */
            margin-right: 8px;
            font-weight: 700;
        }
        .product-price-mini {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.82rem; /* Ensure current price is slightly smaller than old price */
        }
        .product-price-mini span:not(.product-price-old) {
            color: var(--color-red);
            font-weight: 600;
        }
        /* Style pour la prévisualisation dans le dashboard */
        .desc-preview-container {
            margin-top: 10px;
            padding: 12px;
            background: #fdfdfd;
            border: 1px dashed #ddd;
            border-radius: 8px;
            min-height: 40px;
        }
        .desc-preview-label {
            font-size: 0.75rem;
            font-weight: 700;
            color: #999;
            text-transform: uppercase;
            margin-bottom: 6px;
        }
        /* Icon Picker (Autocomplete) UI */
        .vc-icon-picker {
            position: absolute;
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(15, 23, 42, 0.12);
            border-radius: 12px;
            box-shadow: 0 14px 44px rgba(0, 0, 0, 0.22);
            width: 250px;
            max-height: 280px;
            overflow: hidden;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            animation: vc-picker-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes vc-picker-pop {
            from { opacity: 0; transform: translateY(8px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .vc-picker-search-container {
            padding: 10px;
            border-bottom: 1px solid rgba(15, 23, 42, 0.08);
            background: rgba(255, 255, 255, 0.4);
        }
        .vc-picker-search {
            width: 100%;
            padding: 8px 10px;
            border: 1px solid rgba(15, 23, 42, 0.1);
            border-radius: 8px;
            font-size: 0.85rem;
            outline: none;
            background: #fff;
            transition: border-color 0.2s;
        }
        .vc-picker-search:focus {
            border-color: var(--primary-blue);
        }
        .vc-picker-list {
            flex: 1;
            overflow-y: auto;
            padding: 4px;
        }
        .vc-picker-item {
            display: flex;
            items-center: flex-start;
            gap: 10px;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.15s;
            user-select: none;
        }
        .vc-picker-item:hover, .vc-picker-item.is-active {
            background: rgba(var(--brand-accent-rgb), 0.08);
            color: var(--primary-blue);
        }
        .vc-picker-item .icon-preview {
            width: 18px;
            height: 18px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary-blue);
        }
        .vc-picker-item .icon-label {
            font-size: 0.82rem;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .vc-picker-item .icon-tags {
            font-size: 0.7rem;
            opacity: 0.5;
            margin-left: auto;
        }
        .vc-picker-empty {
            padding: 20px;
            text-align: center;
            color: #999;
            font-size: 0.8rem;
        }
        .icon-help-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 8px;
            margin-top: 10px;
            font-size: 0.8rem;
            color: #666;
        }
        .icon-help-item {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            background: #f5f5f5;
            border-radius: 4px;
            cursor: pointer;
        }
        .icon-help-item:hover {
            background: #eee;
        }
    `;
    document.head.appendChild(style);
})();
document.addEventListener('click', async (e) => {
    const shareShopBtn = e.target.closest('.btn-share-shop-mini') || e.target.closest('#btn-share-shop-header');
    if (shareShopBtn) {
        e.preventDefault();
        e.stopPropagation();
        const sellerId = shareShopBtn.dataset.sellerId;
        const shopName = shareShopBtn.dataset.shopName || 'Boutique';
        if (!sellerId) return;

        // Force "/pages/Vendeur.html" absolute path
        const url = new URL(`/pages/Vendeur.html?id=${encodeURIComponent(sellerId)}`, window.location.origin).toString();
        const title = `Boutique Vendoscity - ${shopName}`;
        const text = `Découvrez tous les articles de ${shopName} sur Vendoscity !`;

        if (window.VendoscityShare && typeof window.VendoscityShare.share === 'function') {
            await window.VendoscityShare.share({ title, text, url });
        } else if (navigator.share) {
            await navigator.share({ title, text, url }).catch(err => {
                if (err.name !== 'AbortError') console.error(err);
            });
        } else {
            try { 
                await navigator.clipboard.writeText(url); 
                vendoscityToast('Lien de la boutique copié !'); 
            } catch (_) { 
                window.prompt('Copiez le lien:', url); 
            }
        }
    }
});
