// client/src/app/imports/page.js
'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiBaseUrl, fetchWithTimeout, formatCurrency } from '../../core/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Search, X, ChevronDown, Package, ShoppingBag,
  Zap, RefreshCw, Star, TrendingUp, Globe, Clock,
  Plus, Check, Filter, AlertCircle, Flame, ExternalLink,
  Loader2, ChevronRight, Database
} from 'lucide-react';

// ─── Sources disponibles ───────────────────────────────────────────────────────
const SOURCES = [
  {
    id: 'aliexpress',
    label: 'AliExpress',
    flag: '🇨🇳',
    color: '#e55a2b',
    gradient: 'linear-gradient(135deg, #e55a2b 0%, #ff8a50 100%)',
    currency: 'USD',
    description: 'Millions de produits à prix réduits'
  },
  {
    id: 'alibaba',
    label: 'Alibaba',
    flag: '🏭',
    color: '#ff6900',
    gradient: 'linear-gradient(135deg, #ff6900 0%, #ffab40 100%)',
    currency: 'USD',
    description: 'Grossiste B2B international'
  },
  {
    id: '1688',
    label: '1688',
    flag: '🇨🇳',
    color: '#c0392b',
    gradient: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
    currency: 'CNY',
    description: 'Marché de gros Chinois'
  }
];

const CATEGORIES = [
  { value: 'all', label: 'Toutes' },
  { value: 'electronique', label: 'Électronique' },
  { value: 'vetements', label: 'Vêtements' },
  { value: 'beaute', label: 'Beauté' },
  { value: 'maison', label: 'Maison' },
  { value: 'sports', label: 'Sports' },
  { value: 'jeux', label: 'Jeux & Jouets' },
  { value: 'autres', label: 'Autres' }
];

// ─── Composant : ImportProductCard ────────────────────────────────────────────
function ImportProductCard({ product, onAddToCatalog, isInCatalog, isAdding }) {
  const [imgError, setImgError] = useState(false);
  const source = SOURCES.find(s => s.id === product.source) || SOURCES[0];

  const images = Array.isArray(product.image_urls)
    ? product.image_urls.filter(Boolean)
    : [product.image_urls].filter(Boolean);
  const mainImage = images[0] || null;

  const priceExpiry = product.price_cached_at
    ? new Date(product.price_cached_at).getTime() + 60 * 60 * 1000
    : null;
  const isPriceFresh = priceExpiry && priceExpiry > Date.now();

  return (
    <article
      className="import-product-card"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Badge Source */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: source.gradient,
        color: '#fff',
        fontSize: '0.65rem',
        fontWeight: '700',
        padding: '3px 8px',
        borderRadius: '20px',
        zIndex: 2,
        letterSpacing: '0.05em',
        textTransform: 'uppercase'
      }}>
        {source.flag} {source.label}
      </div>

      {/* Badge Hot (vues élevées) */}
      {(product.views || 0) > 10 && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'linear-gradient(135deg, #ff4757, #ff6b81)',
          color: '#fff',
          fontSize: '0.65rem',
          fontWeight: '700',
          padding: '3px 8px',
          borderRadius: '20px',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: '3px'
        }}>
          <Flame size={10} /> Hot
        </div>
      )}

      {/* Image */}
      <div style={{
        width: '100%',
        paddingTop: '75%',
        position: 'relative',
        background: 'rgba(255,255,255,0.05)',
        overflow: 'hidden'
      }}>
        {mainImage && !imgError ? (
          <img
            src={mainImage}
            alt={product.title_fr || 'Produit'}
            onError={() => setImgError(true)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease'
            }}
          />
        ) : (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.2)',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <Package size={40} />
            <span style={{ fontSize: '0.7rem' }}>Pas d&apos;image</span>
          </div>
        )}
      </div>

      {/* Infos */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Titre */}
        <h3 style={{
          fontSize: '0.85rem',
          fontWeight: '600',
          color: '#f0f0f0',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          margin: 0
        }}>
          {product.title_fr || 'Produit sans titre'}
        </h3>

        {/* Prix */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '1rem',
            fontWeight: '800',
            color: '#4ade80',
            letterSpacing: '-0.02em'
          }}>
            {formatCurrency(product.price_final || 0)}
          </span>
          {product.price_original > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
              {product.original_currency === 'CNY'
                ? `¥${product.price_original}`
                : `$${product.price_original?.toFixed(2)}`}
            </span>
          )}
        </div>

        {/* Statut cache prix */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.68rem',
          color: isPriceFresh ? '#4ade80' : 'rgba(255,200,100,0.8)'
        }}>
          <Clock size={10} />
          <span>{isPriceFresh ? 'Prix récent' : 'Prix expiré (MAJ en cours)'}</span>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.72rem',
          color: 'rgba(255,255,255,0.45)',
          marginTop: 'auto'
        }}>
          {(product.views || 0) > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <TrendingUp size={10} /> {product.views} vues
            </span>
          )}
          {product.stock > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Package size={10} /> En stock
            </span>
          )}
        </div>

        {/* Bouton Ajouter au catalogue */}
        <button
          onClick={e => {
            e.stopPropagation();
            onAddToCatalog(product.id);
          }}
          disabled={isInCatalog || isAdding}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '10px',
            border: 'none',
            cursor: isInCatalog ? 'default' : 'pointer',
            fontWeight: '700',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            marginTop: '4px',
            background: isInCatalog
              ? 'rgba(74, 222, 128, 0.15)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: isInCatalog ? '#4ade80' : '#fff'
          }}
        >
          {isAdding ? (
            <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Ajout...</>
          ) : isInCatalog ? (
            <><Check size={12} /> Dans votre catalogue</>
          ) : (
            <><Plus size={12} /> Ajouter au catalogue</>
          )}
        </button>
      </div>
    </article>
  );
}

// ─── Composant : Skeleton Loading ─────────────────────────────────────────────
function ImportCardSkeleton() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      overflow: 'hidden',
      animation: 'pulse 1.5s ease-in-out infinite'
    }}>
      <div style={{ width: '100%', paddingTop: '75%', background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ height: '14px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', width: '90%' }} />
        <div style={{ height: '14px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', width: '60%' }} />
        <div style={{ height: '20px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', width: '50%' }} />
        <div style={{ height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', marginTop: '4px' }} />
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
function ImportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, authFetch } = useAuth();
  const showToast = useToast();

  // State
  const [activeSource, setActiveSource] = useState(
    searchParams.get('source') || 'aliexpress'
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [inputValue, setInputValue] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [dataSource, setDataSource] = useState(null); // 'cache' | 'api'
  const [catalogIds, setCatalogIds] = useState(new Set());
  const [addingId, setAddingId] = useState(null);
  const [totalFound, setTotalFound] = useState(0);

  const sentinelRef = useRef(null);
  const abortRef = useRef(null);

  // ─── Charger le catalogue vendeur (pour savoir ce qui y est déjà) ─────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const base = getApiBaseUrl();
        const token = localStorage.getItem('sellerToken') || localStorage.getItem('authToken');
        const res = await fetch(`${base}/api/imports/my-catalog`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const ids = new Set((data || []).map(c => c.pool_product_id));
          setCatalogIds(ids);
        }
      } catch (_) {}
    })();
  }, [user]);

  // ─── Fetch produits ───────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (pageNum, append = false) => {
    if (isLoading) return;

    // Annuler l'éventuelle précédente requête
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    const base = getApiBaseUrl();

    try {
      let url;
      if (searchQuery.trim()) {
        url = `${base}/api/imports/search?q=${encodeURIComponent(searchQuery)}&source=${activeSource}&page=${pageNum}&limit=24`;
      } else {
        url = `${base}/api/imports/pool?source=${activeSource}&page=${pageNum}&limit=24`;
        if (selectedCategory !== 'all') url += `&category=${selectedCategory}`;
      }

      const res = await fetch(url, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const newItems = data.items || data || [];
      const newHasMore = newItems.length >= 24;

      setDataSource(data.source || 'cache');
      setTotalFound(prev => append ? prev : newItems.length);

      setProducts(prev => {
        if (append) {
          const existingIds = new Set(prev.map(p => p.id));
          const unique = newItems.filter(p => !existingIds.has(p.id));
          return [...prev, ...unique];
        }
        return newItems;
      });
      setHasMore(newHasMore);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[imports/fetch]', err);
      if (!append) setProducts([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsFirstLoad(false);
    }
  }, [searchQuery, activeSource, selectedCategory, isLoading]);

  // ─── Déclencher le premier chargement ou quand les filtres changent ────────
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    setIsFirstLoad(true);
    fetchProducts(1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSource, searchQuery, selectedCategory]);

  // ─── Scroll infini ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchProducts(nextPage, true);
        }
      },
      { rootMargin: '200px', threshold: 0.1 }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, isLoading, page, fetchProducts]);

  // ─── Recherche ────────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(inputValue.trim());
    const params = new URLSearchParams();
    if (inputValue.trim()) params.set('q', inputValue.trim());
    params.set('source', activeSource);
    router.replace(`/imports?${params.toString()}`);
  };

  // ─── Ajouter au catalogue ────────────────────────────────────────────────
  const handleAddToCatalog = async (poolProductId) => {
    if (!user) {
      showToast('Connectez-vous pour ajouter des articles à votre catalogue', 'error');
      router.push('/connexion');
      return;
    }
    setAddingId(poolProductId);
    try {
      const base = getApiBaseUrl();
      const token = localStorage.getItem('sellerToken') || localStorage.getItem('authToken');
      const res = await fetch(`${base}/api/imports/add-to-catalog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pool_product_id: poolProductId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue');
      setCatalogIds(prev => new Set([...prev, poolProductId]));
      showToast('✅ Article ajouté à votre catalogue !', 'success');
    } catch (err) {
      showToast(err.message || 'Erreur lors de l\'ajout', 'error');
    } finally {
      setAddingId(null);
    }
  };

  const currentSource = SOURCES.find(s => s.id === activeSource) || SOURCES[0];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0c29 40%, #1a0a2e 100%)',
      color: '#f0f0f0',
      fontFamily: "'Inter', 'Outfit', sans-serif"
    }}>
      {/* Styles globaux */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=Outfit:wght@400;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .import-product-card { animation: fadeInUp 0.3s ease forwards; }
        .import-tab:hover { background: rgba(255,255,255,0.08) !important; }
        .import-tab.active { background: rgba(255,255,255,0.12) !important; }
        .import-category-pill:hover { border-color: rgba(139,92,246,0.6) !important; background: rgba(139,92,246,0.15) !important; }
        .import-category-pill.active { background: rgba(139,92,246,0.2) !important; border-color: #8b5cf6 !important; color: #c4b5fd !important; }
        .import-products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
        }
        @media (max-width: 640px) {
          .import-products-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
        }
      `}</style>

      {/* Hero Header */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '32px 24px 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Titre */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Globe size={22} color="#fff" />
              </div>
              <h1 style={{
                fontSize: '1.8rem',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #f0f0f0, #c4b5fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0
              }}>
                Marketplace Import
              </h1>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', margin: 0 }}>
              Sourcez des produits depuis AliExpress, Alibaba et 1688 · Prix en FCFA · Cache intelligent
            </p>
          </div>

          {/* Barre de recherche */}
          <form onSubmit={handleSearch} style={{ marginBottom: '24px', position: 'relative' }}>
            <div style={{
              display: 'flex',
              gap: '12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px',
              padding: '8px 8px 8px 16px',
              backdropFilter: 'blur(20px)',
              transition: 'border-color 0.2s ease'
            }}>
              <Search size={18} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0, marginTop: '10px' }} />
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={`Rechercher sur ${currentSource.label}...`}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#f0f0f0',
                  fontSize: '0.95rem',
                  padding: '8px 0'
                }}
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => { setInputValue(''); setSearchQuery(''); }}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '8px' }}
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  padding: '10px 20px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'opacity 0.2s ease',
                  flexShrink: 0
                }}
              >
                <Search size={14} /> Rechercher
              </button>
            </div>
          </form>

          {/* Onglets Source */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '0' }}>
            {SOURCES.map(source => (
              <button
                key={source.id}
                className={`import-tab${activeSource === source.id ? ' active' : ''}`}
                onClick={() => {
                  setActiveSource(source.id);
                  router.replace(`/imports?source=${source.id}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`);
                }}
                style={{
                  padding: '12px 20px',
                  borderRadius: '12px 12px 0 0',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderBottom: activeSource === source.id ? '2px solid ' + source.color : '1px solid rgba(255,255,255,0.08)',
                  background: activeSource === source.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: activeSource === source.id ? '#fff' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: activeSource === source.id ? '700' : '500',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <span>{source.flag}</span>
                <span>{source.label}</span>
                {activeSource === source.id && (
                  <span style={{
                    background: source.gradient,
                    fontSize: '0.65rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    color: '#fff',
                    fontWeight: '700'
                  }}>
                    {source.currency}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu Principal */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>

        {/* Barre d'info + filtres catégories */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          {/* Indicateur source de données */}
          {dataSource && !isFirstLoad && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: dataSource === 'cache' ? '#4ade80' : '#facc15',
              background: dataSource === 'cache' ? 'rgba(74,222,128,0.1)' : 'rgba(250,204,21,0.1)',
              border: `1px solid ${dataSource === 'cache' ? 'rgba(74,222,128,0.2)' : 'rgba(250,204,21,0.2)'}`,
              padding: '4px 10px',
              borderRadius: '20px'
            }}>
              <Database size={12} />
              {dataSource === 'cache' ? 'Données du cache local' : 'Données fraîches depuis l\'API'}
            </div>
          )}

          {searchQuery && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: '#c4b5fd',
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.2)',
              padding: '4px 10px',
              borderRadius: '20px'
            }}>
              <Search size={12} />
              Résultats pour &quot;<strong>{searchQuery}</strong>&quot;
              <button
                onClick={() => { setInputValue(''); setSearchQuery(''); }}
                style={{ background: 'transparent', border: 'none', color: '#c4b5fd', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
              >
                <X size={11} />
              </button>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Filtres catégories */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', maxWidth: '100%' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                className={`import-category-pill${selectedCategory === cat.value ? ' active' : ''}`}
                onClick={() => setSelectedCategory(cat.value)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grille de produits */}
        {isFirstLoad && isLoading ? (
          <div className="import-products-grid">
            {Array(12).fill(null).map((_, i) => <ImportCardSkeleton key={i} />)}
          </div>
        ) : products.length === 0 && !isLoading ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 24px',
            color: 'rgba(255,255,255,0.3)'
          }}>
            <Package size={60} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <h3 style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontSize: '1.2rem' }}>
              Aucun produit trouvé
            </h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>
              {searchQuery
                ? `Essayez d'autres mots-clés pour "${searchQuery}"`
                : 'Lancez une recherche pour importer des produits'}
            </p>
            {searchQuery && (
              <button
                onClick={() => { setInputValue(''); setSearchQuery(''); }}
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  padding: '10px 20px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Voir tous les produits
              </button>
            )}
          </div>
        ) : (
          <div className="import-products-grid">
            {products.map((product, idx) => (
              <ImportProductCard
                key={product.id || idx}
                product={product}
                onAddToCatalog={handleAddToCatalog}
                isInCatalog={catalogIds.has(product.id)}
                isAdding={addingId === product.id}
              />
            ))}
            {/* Skeletons en fin de liste lors du chargement de nouvelles pages */}
            {isLoading && !isFirstLoad &&
              Array(4).fill(null).map((_, i) => <ImportCardSkeleton key={`sk-${i}`} />)
            }
          </div>
        )}

        {/* Sentinelle scroll infini */}
        <div
          ref={sentinelRef}
          style={{ height: '40px', margin: '24px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {!hasMore && products.length > 0 && (
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>
              ✓ Tous les articles ont été chargés ({products.length} produits)
            </p>
          )}
        </div>

        {/* Section d'info sur le système de cache */}
        <div style={{
          marginTop: '40px',
          padding: '24px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          {[
            { icon: <Clock size={20} color="#4ade80" />, title: 'Prix mis à jour', desc: 'Toutes les heures depuis les fournisseurs' },
            { icon: <Database size={20} color="#60a5fa" />, title: 'Cache intelligent', desc: 'Descriptions stockées 2 semaines en local' },
            { icon: <Flame size={20} color="#fb923c" />, title: 'Hot Cache', desc: 'Produits populaires toujours disponibles' },
            { icon: <Zap size={20} color="#facc15" />, title: 'Réponse instantanée', desc: 'DB-first, API uniquement si nécessaire' }
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#e0e0e0', marginBottom: '3px' }}>{item.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ImportsPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a1a, #1a0a2e)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f0f0f0'
      }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <ImportsContent />
    </Suspense>
  );
}
