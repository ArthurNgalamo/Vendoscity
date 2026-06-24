// client/src/app/videos/page.js
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Plus, ShoppingBag, RefreshCw } from 'lucide-react';
import { getApiBaseUrl, fetchWithTimeout, formatCurrency } from '../../core/api';

function getImportImage(product) {
  const images = Array.isArray(product?.image_urls)
    ? product.image_urls.filter(Boolean)
    : [product?.image_urls].filter(Boolean);
  return images[0] || '/assets/images/default-product.png';
}

export default function VideosPage() {
  const [videos, setVideos] = useState([]);
  const [fallbackProducts, setFallbackProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVideos = async () => {
      setLoading(true);
      const base = getApiBaseUrl();
      try {
        const [videoData, productData] = await Promise.all([
          fetchWithTimeout(`${base}/api/imports/pool?video_only=true&page=1&limit=24`, {}, 12000)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => data?.items || [])
            .catch(() => []),
          fetchWithTimeout(`${base}/api/imports/pool?page=1&limit=12`, {}, 12000)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => data?.items || [])
            .catch(() => [])
        ]);
        setVideos(videoData);
        setFallbackProducts(productData);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, []);

  const feedItems = videos.length ? videos : fallbackProducts;

  return (
    <main className="videos-feed-page">
      <section className="videos-feed-hero">
        <div>
          <p className="home-section-kicker">Flux vendeur</p>
          <h1>Videos produits</h1>
          <p>Regroupez les videos fournisseurs, les apercus d'articles et les actions d'import dans un seul flux.</p>
        </div>
        <Link href="/dashboard?tab=import" className="videos-feed-primary">
          <Plus width="16" height="16" />
          Importer un article
        </Link>
      </section>

      <section className="videos-feed-grid" aria-live="polite">
        {loading && Array.from({ length: 6 }).map((_, idx) => (
          <article className="videos-feed-card skeleton-loading" key={idx}>
            <div className="videos-feed-preview vc-skeleton"></div>
            <div className="videos-feed-body">
              <div className="vc-skeleton-text long"></div>
              <div className="vc-skeleton-text short"></div>
            </div>
          </article>
        ))}

        {!loading && feedItems.length === 0 && (
          <div className="home-empty-inline">
            Aucun apercu video pour le moment. Les produits importes avec video_url seront affiches ici.
          </div>
        )}

        {!loading && feedItems.map((product) => (
          <article className="videos-feed-card" key={`${product.source || 'feed'}-${product.id || product.original_id}`}>
            <div className="videos-feed-preview">
              {product.video_url ? (
                <video src={product.video_url} poster={getImportImage(product)} muted playsInline preload="metadata" controls />
              ) : (
                <img src={getImportImage(product)} alt={product.title_fr || product.title || 'Produit fournisseur'} />
              )}
              <span className="videos-feed-play">
                <Play width="15" height="15" fill="currentColor" />
              </span>
              <span className="videos-feed-source">{product.source || 'source'}</span>
            </div>
            <div className="videos-feed-body">
              <h2>{product.title_fr || product.title || 'Produit fournisseur'}</h2>
              <div className="videos-feed-meta">
                <strong>{formatCurrency(product.price_final || product.price || 0)}</strong>
                <span>{product.views || 0} vues</span>
              </div>
              <div className="videos-feed-actions">
                <Link href="/dashboard?tab=import">
                  <ShoppingBag width="14" height="14" />
                  Ajouter
                </Link>
                <Link href={`/boutique?source=${encodeURIComponent(product.source || '')}`}>
                  <RefreshCw width="14" height="14" />
                  Comparer
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
