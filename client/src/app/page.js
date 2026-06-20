// client/src/app/page.js
'use client';

import React, { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import { getApiBaseUrl, fetchWithTimeout } from '../core/api';

const HERO_ROTATING_TITLES = [
  'Vendoscity - Marketplace de Mise en Relation Directe',
  'Vendoscity - Achetez et vendez près de chez vous',
  'Vendoscity - Des offres locales, simple et rapide',
  'Vendoscity - Contact direct, sans prise de tête',
  'Vendoscity - Publiez un article en 1 minute'
];

export default function HomePage() {
  const [heroTitleIdx, setHeroTitleIdx] = useState(0);
  const [heroTitleText, setHeroTitleText] = useState(HERO_ROTATING_TITLES[0]);
  const [titleFade, setTitleFade] = useState(false);
  
  const [newProducts, setNewProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loadingShelves, setLoadingShelves] = useState(true);

  // Hero Title Rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setTitleFade(true);
      setTimeout(() => {
        setHeroTitleIdx((prev) => {
          const next = (prev + 1) % HERO_ROTATING_TITLES.length;
          setHeroTitleText(HERO_ROTATING_TITLES[next]);
          return next;
        });
        setTitleFade(false);
      }, 170);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const [rawPool, setRawPool] = useState({ newest: [], trending: [] });

  // Load Products once (large pool), cache for 30 mins
  useEffect(() => {
    const CACHE_KEY = 'vc_home_products_cache_v2';
    const loadAll = async () => {
      setLoadingShelves(true);
      const base = getApiBaseUrl();
      try {
        const pNew = fetchWithTimeout(`${base}/api/products?page=0&limit=40&sort=recent`, {}, 12000)
          .then((res) => (res.ok ? res.json() : null))
          .then((j) => j?.products || []);
        const pTrend = fetchWithTimeout(`${base}/api/products?page=0&limit=40&sort=recommended`, {}, 12000)
          .then((res) => (res.ok ? res.json() : null))
          .then((j) => j?.products || []);
        const [newestData, trendingData] = await Promise.all([pNew, pTrend]);
        const pool = { newest: newestData, trending: trendingData };
        setRawPool(pool);
        // Save to cache
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ...pool, timestamp: Date.now() }));
        } catch (_) {}
      } catch (e) {
        console.error('Shelves fetch error:', e);
      } finally {
        setLoadingShelves(false);
      }
    };

    // Try cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - (Number(parsed?.timestamp) || 0);
        const isFresh = age < 1000 * 60 * 30;
        if (parsed?.newest && parsed?.trending) {
          setRawPool({ newest: parsed.newest, trending: parsed.trending });
          if (isFresh) { setLoadingShelves(false); return; }
        }
      }
    } catch (_) {}

    loadAll();
  }, []);

  // Load trending and new products from rawPool
  useEffect(() => {
    setNewProducts(rawPool.newest.slice(0, 8));
    setTrendingProducts(rawPool.trending.slice(0, 8));
  }, [rawPool]);

  const renderSkeletons = (count = 4) => {
    return Array(count)
      .fill(null)
      .map((_, idx) => (
        <article className="product-card skeleton-loading" key={idx}>
          <div className="product-media vc-skeleton" style={{ height: '180px' }}></div>
          <div className="product-info">
            <div className="vc-skeleton-text long"></div>
            <div className="product-loc-price-row">
              <div className="vc-skeleton-text short"></div>
              <div className="vc-skeleton-text short"></div>
            </div>
            <div className="product-meta-row">
              <div className="vc-skeleton-text medium"></div>
            </div>
          </div>
        </article>
      ));
  };

  return (
    <>
      {/* Temu-like Hero Section */}
      <section className="temu-hero-section">
        <h1 id="hero-title" style={{ transition: 'opacity 0.25s ease-in-out', opacity: titleFade ? 0 : 1 }}>{heroTitleText}</h1>
        <p>Achetez et vendez près de chez vous au Cameroun. Zéro frais de mise en relation.</p>
      </section>

      {/* Pink Header: Meilleurs choix (Trending shelf) */}
      <div className="temu-pink-header">
        Meilleurs choix
      </div>

      <section className="home-products-section">
        <div className="products-grid home-products-grid" id="home-trending-grid" aria-live="polite">
          {loadingShelves && trendingProducts.length === 0 ? (
            renderSkeletons(4)
          ) : trendingProducts.length > 0 ? (
            trendingProducts.map((p) => <ProductCard key={p.id} product={p} />)
          ) : (
            <div className="loading" style={{ gridColumn: '1 / -1' }}>Aucun produit pour le moment.</div>
          )}
        </div>
      </section>

      {/* Pink Header orange: Nouveautés */}
      <div className="temu-pink-header orange">
        Nouveautés
      </div>

      <section className="home-products-section">
        <div className="products-grid home-products-grid" id="home-new-grid" aria-live="polite">
          {loadingShelves && newProducts.length === 0 ? (
            renderSkeletons(4)
          ) : newProducts.length > 0 ? (
            newProducts.map((p) => <ProductCard key={p.id} product={p} />)
          ) : (
            <div className="loading" style={{ gridColumn: '1 / -1' }}>Aucun produit pour le moment.</div>
          )}
        </div>
      </section>
    </>
  );
}
