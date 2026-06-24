// client/src/app/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from '../components/ProductCard';
import { getApiBaseUrl, fetchWithTimeout, formatCurrency } from '../core/api';

const HERO_ROTATING_TITLES = [
  'Vendoscity - Marketplace integree pour le commerce local',
  'Vendoscity - Achetez et vendez pres de chez vous',
  'Vendoscity - Des offres locales, simples et rapides',
  'Vendoscity - Commandes, messages et suivi au meme endroit',
  'Vendoscity - Catalogues fournisseurs importes depuis Alibaba, AliExpress et 1688'
];

const IMPORT_SOURCES = [
  { id: 'aliexpress', label: 'AliExpress' },
  { id: 'alibaba', label: 'Alibaba' },
  { id: '1688', label: '1688' }
];

function getImportImage(product) {
  const images = Array.isArray(product?.image_urls)
    ? product.image_urls.filter(Boolean)
    : [product?.image_urls].filter(Boolean);
  return images[0] || '/assets/images/default-product.png';
}

export default function HomePage() {
  const [heroTitleIdx, setHeroTitleIdx] = useState(0);
  const [heroTitleText, setHeroTitleText] = useState(HERO_ROTATING_TITLES[0]);
  const [titleFade, setTitleFade] = useState(false);

  const [newProducts, setNewProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loadingShelves, setLoadingShelves] = useState(true);
  const [rawPool, setRawPool] = useState({ newest: [], trending: [] });

  const [importProducts, setImportProducts] = useState([]);
  const [videoProducts, setVideoProducts] = useState([]);
  const [loadingImports, setLoadingImports] = useState(true);

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
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ...pool, timestamp: Date.now() }));
        } catch (_) {}
      } catch (e) {
        console.error('Shelves fetch error:', e);
      } finally {
        setLoadingShelves(false);
      }
    };

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - (Number(parsed?.timestamp) || 0);
        const isFresh = age < 1000 * 60 * 30;
        if (parsed?.newest && parsed?.trending) {
          setRawPool({ newest: parsed.newest, trending: parsed.trending });
          if (isFresh) {
            setLoadingShelves(false);
            return;
          }
        }
      }
    } catch (_) {}

    loadAll();
  }, []);

  useEffect(() => {
    setNewProducts(rawPool.newest.slice(0, 8));
    setTrendingProducts(rawPool.trending.slice(0, 8));
  }, [rawPool]);

  useEffect(() => {
    const loadImportPreviews = async () => {
      setLoadingImports(true);
      const base = getApiBaseUrl();
      try {
        const sourceRequests = IMPORT_SOURCES.map((source) =>
          fetchWithTimeout(`${base}/api/imports/pool?source=${source.id}&page=1&limit=4`, {}, 10000)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => (data?.items || []).map((item) => ({ ...item, source: item.source || source.id })))
            .catch(() => [])
        );
        const videoRequest = fetchWithTimeout(`${base}/api/imports/pool?video_only=true&page=1&limit=6`, {}, 10000)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => data?.items || [])
          .catch(() => []);

        const [sourceGroups, videos] = await Promise.all([
          Promise.all(sourceRequests),
          videoRequest
        ]);
        const merged = sourceGroups.flat().slice(0, 10);
        setImportProducts(merged);
        setVideoProducts((videos.length ? videos : merged.filter((item) => item.video_url)).slice(0, 6));
      } catch (err) {
        console.warn('Import previews fetch error:', err);
      } finally {
        setLoadingImports(false);
      }
    };

    loadImportPreviews();
  }, []);

  const renderSkeletons = (count = 4) => Array(count)
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

  const renderImportCards = () => {
    if (loadingImports && importProducts.length === 0) return renderSkeletons(4);

    if (!importProducts.length) {
      return (
        <div className="home-empty-inline">
          Les apercus fournisseurs seront affiches ici quand le cache Alibaba, AliExpress et 1688 contient des articles.
        </div>
      );
    }

    return importProducts.map((product) => (
      <article className="home-import-card" key={`${product.source}-${product.id || product.original_id}`}>
        <div className="home-import-media">
          <img src={getImportImage(product)} alt={product.title_fr || product.title || 'Article fournisseur'} />
          <span className="home-import-source">{product.source || 'source'}</span>
        </div>
        <div className="home-import-body">
          <h3>{product.title_fr || product.title || 'Article fournisseur'}</h3>
          <div className="home-import-meta">
            <strong>{formatCurrency(product.price_final || product.price || 0)}</strong>
            <span>{product.views || 0} vues</span>
          </div>
          <div className="home-import-actions">
            <Link href="/dashboard?tab=import">Ajouter</Link>
            <Link href={`/boutique?source=${encodeURIComponent(product.source || '')}`}>Voir</Link>
          </div>
        </div>
      </article>
    ));
  };

  return (
    <>
      <section className="temu-hero-section">
        <h1 id="hero-title" style={{ transition: 'opacity 0.25s ease-in-out', opacity: titleFade ? 0 : 1 }}>{heroTitleText}</h1>
        <p>Achetez, vendez et suivez vos echanges sur Vendoscity. La plateforme gere les commandes, produits, videos et imports fournisseurs au meme endroit.</p>
      </section>

      <section className="home-imports-section" aria-labelledby="home-imports-title">
        <div className="home-section-head compact">
          <div>
            <p className="home-section-kicker">Alibaba | AliExpress | 1688</p>
            <h2 id="home-imports-title">Articles fournisseurs a importer</h2>
          </div>
          <Link href="/dashboard?tab=import" className="home-section-link">Gerer mon catalogue</Link>
        </div>
        <div className="home-import-source-row">
          {IMPORT_SOURCES.map((source) => <span key={source.id}>{source.label}</span>)}
        </div>
        <div className="home-import-grid" aria-live="polite">
          {renderImportCards()}
        </div>
      </section>

      <section className="home-video-strip" aria-labelledby="home-videos-title">
        <div className="home-section-head compact">
          <div>
            <p className="home-section-kicker">Flux social vendeur</p>
            <h2 id="home-videos-title">Videos produits avec apercu</h2>
          </div>
          <Link href="/videos" className="home-section-link">Voir le flux</Link>
        </div>
        <div className="home-video-row">
          {videoProducts.length > 0 ? videoProducts.map((product) => (
            <article className="home-video-card" key={`video-${product.id || product.original_id}`}>
              <div className="home-video-preview">
                {product.video_url ? (
                  <video src={product.video_url} poster={getImportImage(product)} muted playsInline preload="metadata" />
                ) : (
                  <img src={getImportImage(product)} alt="" />
                )}
                <span>Preview</span>
              </div>
              <h3>{product.title_fr || product.title || 'Video produit'}</h3>
              <div className="home-video-actions">
                <Link href="/videos">Regarder</Link>
                <Link href="/dashboard?tab=import">Importer</Link>
              </div>
            </article>
          )) : (
            <div className="home-empty-inline">Les videos fournisseurs apparaitront ici avec leurs boutons d'action.</div>
          )}
        </div>
      </section>

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

      <div className="temu-pink-header orange">
        Nouveautes
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
