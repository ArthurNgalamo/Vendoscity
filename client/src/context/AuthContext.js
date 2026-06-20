// client/src/context/AuthContext.js
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, fetchWithTimeout } from '../core/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const STORAGE_KEYS = {
  access: 'sellerToken',
  refresh: 'sellerRefreshToken',
  expiresAt: 'sellerTokenExpiresAt'
};

function normalizeAccessToken(raw) {
  const t = String(raw || '').trim();
  if (!t) return null;
  if (t.toLowerCase().startsWith('bearer ')) return t.slice(7).trim() || null;
  return t;
}

function parseJwtPayload(token) {
  const t = normalizeAccessToken(token);
  if (!t) return null;
  const parts = t.split('.');
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    return payload && typeof payload === 'object' ? payload : null;
  } catch (_) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  const getStorageItem = (key) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  };

  const setStorageItem = (key, val) => {
    if (typeof window === 'undefined') return;
    if (val === null || val === undefined || val === '') {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, String(val));
    }
  };

  const clearSession = useCallback(() => {
    setStorageItem(STORAGE_KEYS.access, null);
    setStorageItem(STORAGE_KEYS.refresh, null);
    setStorageItem(STORAGE_KEYS.expiresAt, null);
    setUser(null);
    setProfile(null);
  }, []);

  const getAccessTokenRaw = useCallback(() => {
    const t = normalizeAccessToken(getStorageItem(STORAGE_KEYS.access));
    if (!t) return null;
    setStorageItem(STORAGE_KEYS.access, t);
    return t;
  }, []);

  const getRefreshTokenRaw = useCallback(() => {
    return getStorageItem(STORAGE_KEYS.refresh);
  }, []);

  const getExpiresAt = useCallback(() => {
    const raw = getStorageItem(STORAGE_KEYS.expiresAt);
    const n = raw ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(n)) return n;

    const access = getAccessTokenRaw();
    const payload = parseJwtPayload(access);
    const exp = payload && Number.isFinite(Number(payload.exp)) ? Number(payload.exp) : null;
    if (exp) {
      setStorageItem(STORAGE_KEYS.expiresAt, String(exp));
      return exp;
    }
    return null;
  }, [getAccessTokenRaw]);

  const isExpiredSoon = useCallback((expiresAt, skewSeconds = 30) => {
    if (!expiresAt) return true;
    const now = Math.floor(Date.now() / 1000);
    return now >= (expiresAt - skewSeconds);
  }, []);

  const refreshSession = useCallback(async () => {
    const refresh_token = getRefreshTokenRaw();
    if (!refresh_token) {
      clearSession();
      throw new Error('Session expirée, veuillez vous reconnecter.');
    }

    const base = getApiBaseUrl();
    const url = `${base}/api/auth/refresh`;

    try {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token })
      }, 15000);

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        clearSession();
        throw new Error(data?.error || 'Session expirée, veuillez vous reconnecter.');
      }

      const session = data?.session;
      if (!session?.access_token) {
        clearSession();
        throw new Error('Session expirée, veuillez vous reconnecter.');
      }

      const accToken = normalizeAccessToken(session.access_token);
      setStorageItem(STORAGE_KEYS.access, accToken);
      if (session.refresh_token) setStorageItem(STORAGE_KEYS.refresh, session.refresh_token);
      if (session.expires_at) setStorageItem(STORAGE_KEYS.expiresAt, session.expires_at);

      // Parse payload to update user
      const payload = parseJwtPayload(accToken);
      setUser(payload);

      return accToken;
    } catch (e) {
      clearSession();
      throw e;
    }
  }, [getRefreshTokenRaw, clearSession]);

  const getValidAccessToken = useCallback(async ({ forceRefresh = false } = {}) => {
    const access = getAccessTokenRaw();
    const expiresAt = getExpiresAt();

    if (!access) {
      if (getRefreshTokenRaw()) return refreshSession();
      return null;
    }

    if (forceRefresh || isExpiredSoon(expiresAt)) {
      try {
        return await refreshSession();
      } catch (_) {
        return null;
      }
    }

    return access;
  }, [getAccessTokenRaw, getExpiresAt, getRefreshTokenRaw, isExpiredSoon, refreshSession]);

  // Toast recovery for Bad Gateway sleeping Render instances
  const showWakeToastOnce = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (window.__vendoscityWakeToastShown) return;
      window.__vendoscityWakeToastShown = true;
    }
    showToast("Le serveur se réveille (cela peut prendre 30 secondes)...");
  }, [showToast]);

  const authFetch = useCallback(async (url, options = {}) => {
    const base = getApiBaseUrl();
    const token = await getValidAccessToken();

    const opts = { ...(options || {}) };
    const userTimeout = Number(opts.timeoutMs);
    delete opts.timeoutMs;

    const method = String(opts.method || 'GET').toUpperCase();
    const hasBody = !!opts.body;
    const defaultTimeoutMs = (!hasBody && (method === 'GET' || method === 'HEAD')) ? 15000 : 0;
    const timeoutMs = (Number.isFinite(userTimeout) && userTimeout > 0) ? userTimeout : defaultTimeoutMs;

    const headers = new Headers(opts.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const hasAuthHeader = headers.has('Authorization');
    const isSimpleGet = (method === 'GET' || method === 'HEAD') && !hasBody && !hasAuthHeader;
    const canUseFallback = isSimpleGet;

    const direct = 'https://vendoscity.onrender.com';
    const primary = url.startsWith('http') ? url : `${base}${url}`;
    const fallback = (canUseFallback && !url.startsWith('http') && direct) ? `${direct}${url}` : '';

    const tryFallbackOnBadGateway = async (res) => {
      if (!fallback || fallback === primary) return res;
      if (!res || res.ok) return res;
      const ct = (typeof res.headers?.get === 'function') ? String(res.headers.get('content-type') || '') : '';
      const shouldRetry = res.status === 502 || res.status === 504 || (res.status >= 500 && ct.includes('text/html'));
      if (!shouldRetry) return res;
      try {
        const res2 = await fetchWithTimeout(fallback, { ...opts, headers }, timeoutMs);
        return res2 || res;
      } catch (_) {
        if (_ && _.name === 'AbortError') throw _;
        return res;
      }
    };

    let res;
    try {
      res = await fetchWithTimeout(primary, { ...opts, headers }, timeoutMs);
    } catch (e) {
      if (e && e.name === 'AbortError') throw e;
      if (fallback && fallback !== primary) {
        res = await fetchWithTimeout(fallback, { ...opts, headers }, timeoutMs);
      } else {
        throw e;
      }
    }

    if (res && (res.status === 502 || res.status === 504)) {
      showWakeToastOnce();
    }
    res = await tryFallbackOnBadGateway(res);

    if (res.status === 401 && getRefreshTokenRaw()) {
      try {
        const next = await getValidAccessToken({ forceRefresh: true });
        if (!next) return res;
        const headers2 = new Headers(opts.headers || {});
        headers2.set('Authorization', `Bearer ${next}`);
        const primary2 = url.startsWith('http') ? url : `${base}${url}`;
        let res2 = await fetchWithTimeout(primary2, { ...opts, headers: headers2 }, timeoutMs);
        
        if (fallback && !url.startsWith('http') && fallback !== primary2 && res2 && !res2.ok) {
          const ct2 = (typeof res2.headers?.get === 'function') ? String(res2.headers.get('content-type') || '') : '';
          const shouldRetry2 = res2.status === 502 || res2.status === 504 || (res2.status >= 500 && ct2.includes('text/html'));
          if (shouldRetry2) {
            try {
              const res3 = await fetchWithTimeout(fallback, { ...opts, headers: headers2 }, timeoutMs);
              if (res3) res2 = res3;
            } catch (_) {}
          }
        }
        return res2;
      } catch (_) {
        return res;
      }
    }

    return res;
  }, [getValidAccessToken, getRefreshTokenRaw, showWakeToastOnce]);

  const fetchProfile = useCallback(async () => {
    try {
      const base = getApiBaseUrl();
      const token = await getValidAccessToken();
      if (!token) return null;
      const res = await fetch(`${base}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        return data;
      }
    } catch (e) {
      console.error('Error fetching profile in context:', e);
    }
    return null;
  }, [getValidAccessToken]);

  const login = useCallback(async (email, password) => {
    const base = getApiBaseUrl();
    const res = await fetchWithTimeout(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }, 15000);

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      throw new Error(data?.error || 'Identifiants incorrects');
    }

    const session = data?.session;
    if (!session?.access_token) {
      throw new Error('Erreur de session');
    }

    const accToken = normalizeAccessToken(session.access_token);
    setStorageItem(STORAGE_KEYS.access, accToken);
    if (session.refresh_token) setStorageItem(STORAGE_KEYS.refresh, session.refresh_token);
    if (session.expires_at) setStorageItem(STORAGE_KEYS.expiresAt, session.expires_at);

    const payload = parseJwtPayload(accToken);
    setUser(payload);
    await fetchProfile();
    showToast('Connexion réussie !');
    return payload;
  }, [showToast, fetchProfile]);

  const register = useCallback(async (name, email, password, whatsapp) => {
    const base = getApiBaseUrl();
    const res = await fetchWithTimeout(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, whatsapp })
    }, 15000);

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      throw new Error(data?.error || "Erreur lors de l'inscription");
    }

    showToast('Inscription réussie ! Veuillez vous connecter.');
    return data;
  }, [showToast]);

  const logout = useCallback(() => {
    clearSession();
    showToast('Déconnexion réussie.');
  }, [clearSession, showToast]);

  // Load session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const token = await getValidAccessToken();
        if (token) {
          const payload = parseJwtPayload(token);
          setUser(payload);
          await fetchProfile();
        }
      } catch (_) {
        clearSession();
      } finally {
        setLoading(false);
      }
    };
    initSession();
  }, [getValidAccessToken, clearSession, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        setProfile,
        fetchProfile,
        loading,
        login,
        register,
        logout,
        authFetch,
        getValidAccessToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
