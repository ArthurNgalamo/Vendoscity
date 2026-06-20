// client/src/context/FavoritesContext.js
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

const FAVORITES_STORAGE_KEY = 'vendoscity_favorites_v1';

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();
  const { user, authFetch } = useAuth();

  // Load favorites
  useEffect(() => {
    const loadFavorites = async () => {
      setLoading(true);
      if (user) {
        try {
          // 1. Fetch from server
          const res = await authFetch('/api/favorites');
          if (res.ok) {
            const dbFavs = await res.json();
            // dbFavs is an array of { id, product_id, products: {...} }
            const formatted = dbFavs.map(item => item.products).filter(Boolean);
            
            // 2. Merge local storage guest favorites if any
            const rawLocal = localStorage.getItem(FAVORITES_STORAGE_KEY);
            if (rawLocal) {
              const localFavs = JSON.parse(rawLocal);
              if (Array.isArray(localFavs) && localFavs.length > 0) {
                const existingIds = new Set(formatted.map(x => String(x.id)));
                const toUpload = localFavs.filter(x => x && x.id && !existingIds.has(String(x.id)));
                
                for (const item of toUpload) {
                  await authFetch('/api/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: item.id })
                  });
                }
                
                // Clear local storage guest key
                localStorage.removeItem(FAVORITES_STORAGE_KEY);
                
                // Fetch fresh from backend again
                const resFresh = await authFetch('/api/favorites');
                if (resFresh.ok) {
                  const freshFavs = await resFresh.json();
                  setFavorites(freshFavs.map(item => item.products).filter(Boolean));
                } else {
                  setFavorites(formatted);
                }
              } else {
                setFavorites(formatted);
              }
            } else {
              setFavorites(formatted);
            }
          }
        } catch (err) {
          console.error('Failed loading favorites from database:', err);
        } finally {
          setLoading(false);
        }
      } else {
        // Guest mode: load from local storage
        try {
          const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setFavorites(parsed);
            }
          } else {
            setFavorites([]);
          }
        } catch (_) {
          // ignore
        } finally {
          setLoading(false);
        }
      }
    };

    loadFavorites();
  }, [user, authFetch]);

  const addFavorite = useCallback(async (product) => {
    if (!product || !product.id) return;

    // Check local state first to avoid duplicates
    const exists = favorites.some((x) => String(x.id) === String(product.id));
    if (exists) return;

    // Optimistically update UI state
    setFavorites((prev) => [product, ...prev]);
    showToast(`Ajouté aux favoris : ${product.title}`);

    if (user) {
      try {
        const res = await authFetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: product.id })
        });
        if (!res.ok) {
          throw new Error('Failed to save to database');
        }
      } catch (err) {
        console.error('Failed saving favorite to database:', err);
      }
    } else {
      // Guest mode
      try {
        const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
        let localFavs = [];
        if (raw) {
          localFavs = JSON.parse(raw) || [];
        }
        const next = [product, ...localFavs.filter((x) => String(x.id) !== String(product.id))];
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
    }
  }, [favorites, user, authFetch, showToast]);

  const removeFavorite = useCallback(async (productId) => {
    if (!productId) return;

    setFavorites((prev) => prev.filter((x) => String(x.id) !== String(productId)));
    showToast('Retiré des favoris.');

    if (user) {
      try {
        const res = await authFetch(`/api/favorites/${encodeURIComponent(productId)}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          throw new Error('Failed to delete from database');
        }
      } catch (err) {
        console.error('Failed deleting favorite from database:', err);
      }
    } else {
      // Guest mode
      try {
        const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (raw) {
          const localFavs = JSON.parse(raw) || [];
          const next = localFavs.filter((x) => String(x.id) !== String(productId));
          localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
        }
      } catch (_) {}
    }
  }, [user, authFetch, showToast]);

  const isFavorite = useCallback((productId) => {
    if (!productId) return false;
    return favorites.some((x) => String(x.id) === String(productId));
  }, [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, loading, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}
