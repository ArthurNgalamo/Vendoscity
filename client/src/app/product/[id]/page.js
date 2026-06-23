// client/src/app/product/[id]/page.js
'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useCart } from '../../../context/CartContext';
import { useFavorites } from '../../../context/FavoritesContext';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { getApiBaseUrl, fetchWithTimeout, normalizeSupabaseImageUrl, formatCurrency, logAnalyticsEvent } from '../../../core/api';
import { shareLink } from '../../../core/share';

import ProductGallery from './components/ProductGallery';
import ProductInfo from './components/ProductInfo';
import ProductReviews from './components/ProductReviews';
import './product-detail.css';

export default function ProductDetailPage({ params }) {
  // Unwrap Next.js 15 params promise
  const resolvedParams = use(params);
  const productId = resolvedParams.id;

  const { addToCart, setCartOpen } = useCart();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const showToast = useToast();
  const { user, authFetch } = useAuth();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Review form states
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const isFav = isFavorite(productId);

  // Fetch product data on load
  useEffect(() => {
    if (!productId) return;

    const loadData = async () => {
      const base = getApiBaseUrl();
      setLoading(true);
      try {
        const prodRes = await fetchWithTimeout(`${base}/api/products/${productId}`, {}, 15000);
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          const p = prodData?.product || prodData;
          setProduct(p);
          if (p && p.id) {
            // Track product page view
            const sellerId = p.seller_id || p.seller?.id;
            if (sellerId) {
              logAnalyticsEvent('page_view', sellerId, p.id);
            }
            try {
              const history = JSON.parse(localStorage.getItem('vendoscity_user_history') || '[]');
              const updated = [{
                id: p.id,
                title: p.title || '',
                category: p.category || '',
                timestamp: Date.now()
              }, ...history.filter(item => item.id !== p.id)].slice(0, 20);
              localStorage.setItem('vendoscity_user_history', JSON.stringify(updated));
            } catch (_) {}
          }
        } else {
          showToast('Impossible de charger les détails de ce produit.');
        }

        const revRes = await fetchWithTimeout(`${base}/api/products/${productId}/reviews`, {}, 15000);
        if (revRes.ok) {
          const revData = await revRes.json();
          // API returns an array directly, not a wrapper object
          setReviews(Array.isArray(revData) ? revData : (revData?.reviews || []));
        }
      } catch (e) {
        console.error('Error fetching product data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [productId, showToast]);

  const handleShareProduct = async () => {
    if (!product) return;
    const res = await shareLink({
      title: product.title,
      text: `Découvrez ${product.title} sur Vendoscity.`,
      url: window.location.href
    });

    if (res.ok) {
      if (res.mode === 'copy') {
        showToast('Lien du produit copié !');
      } else {
        showToast('Partage initié !');
      }
    }
  };

  const handleToggleFavorite = () => {
    if (!product) return;
    if (isFav) {
      removeFavorite(product.id);
    } else {
      addFavorite(product);
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast('Veuillez vous connecter pour publier un avis.');
      return;
    }
    if (!reviewComment.trim()) {
      showToast('Veuillez rédiger un commentaire.');
      return;
    }
    setSubmittingReview(true);
    const base = getApiBaseUrl();

    try {
      const res = await authFetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: Number(reviewRating),
          comment: reviewComment
        })
      });

      if (res.ok) {
        const data = await res.json();
        // data may be the review directly or wrapped
        const newReview = data?.review || data;
        setReviews((prev) => [newReview, ...prev]);
        setReviewComment('');
        setReviewRating(5);
        showToast('Votre avis a été publié !');
      } else {
        const err = await res.json();
        showToast(err?.error || "Erreur lors de la publication de l'avis.");
      }
    } catch (_) {
      showToast("Impossible de contacter le serveur pour publier l'avis.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div className="loading">Chargement de l&apos;article...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ maxWidth: '900px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <h2>Article introuvable</h2>
        <p>Ce produit n&apos;existe plus ou a été retiré.</p>
        <Link href="/boutique" className="cta-button" style={{ display: 'inline-block', marginTop: '15px' }}>
          Retour à la boutique
        </Link>
      </div>
    );
  }

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images.filter(Boolean)
    : [product.image_url || product.image].filter(Boolean);

  const price = Number(product.price || 0);
  const oldPrice = Number(product.old_price || 0);
  const discountPercent = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
  const ratingAvg = Number(product.rating || 0);
  const reviewsCount = reviews.length;

  const sellerId = product.seller_id || product.seller?.id || '';
  const sellerRaw = product.seller?.shop_name || product.seller?.first_name || product.shop_name || product.seller_name || '';
  const sellerName = String(sellerRaw || 'Boutique').trim();
  const sellerWhatsApp = product.whatsapp || product.seller?.whatsapp || '';

  // Parse product specs
  let specsList = [];
  if (product.specs) {
    try {
      const parsed = typeof product.specs === 'string' ? JSON.parse(product.specs) : product.specs;
      if (Array.isArray(parsed)) {
        specsList = parsed.map(item => {
          if (item && typeof item === 'object') {
            const key = item.label || item.key || '';
            const val = item.value || '';
            return { key, val };
          }
          return null;
        }).filter(Boolean);
      } else if (parsed && typeof parsed === 'object') {
        specsList = Object.entries(parsed).map(([key, val]) => ({ key, val }));
      }
    } catch (_) {
      if (typeof product.specs === 'string') {
        specsList = product.specs
          .split('\n')
          .map((line) => {
            const parts = line.split(':');
            if (parts.length >= 2) {
              return { key: parts[0].trim(), val: parts.slice(1).join(':').trim() };
            }
            return null;
          })
          .filter(Boolean);
      }
    }
  }

  // Schema.org Structured Metadata JSON-LD
  const schemaJson = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': product.title,
    'description': product.description || '',
    'image': images.map(img => normalizeSupabaseImageUrl(img)),
    'offers': {
      '@type': 'Offer',
      'price': price,
      'priceCurrency': 'XAF',
      'availability': 'https://schema.org/InStock',
      'url': typeof window !== 'undefined' ? window.location.href : ''
    }
  };

  return (
    <>
      {/* Inject Structured Data for Google SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJson) }}
      />

      <div className="product-detail-container">
        
        {/* Back button */}
        <div style={{ marginBottom: '20px' }}>
          <Link href="/boutique" style={{ textDecoration: 'none', color: 'var(--primary-blue)', fontWeight: '700', fontSize: '0.95rem' }}>
            &larr; Retour à la boutique
          </Link>
        </div>

        <div className="product-detail-grid">
          {/* Images Column */}
          <ProductGallery
            product={product}
            images={images}
            activeImgIdx={activeImgIdx}
            setActiveImgIdx={setActiveImgIdx}
            discountPercent={discountPercent}
            normalizeSupabaseImageUrl={normalizeSupabaseImageUrl}
          />

          {/* Details Column */}
          <ProductInfo
            product={product}
            sellerId={sellerId}
            sellerName={sellerName}
            reviewsCount={reviewsCount}
            ratingAvg={ratingAvg}
            handleShareProduct={handleShareProduct}
            formatCurrency={formatCurrency}
            price={price}
            oldPrice={oldPrice}
            quantity={quantity}
            setQuantity={setQuantity}
            addToCart={addToCart}
            setCartOpen={setCartOpen}
            handleToggleFavorite={handleToggleFavorite}
            isFav={isFav}
            sellerWhatsApp={sellerWhatsApp}
            specsList={specsList}
          />
        </div>

        {/* Description Section */}
        <section style={{ background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', marginTop: '30px' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)', margin: '0 0 15px 0', fontWeight: '800' }}>Description de l&apos;article</h2>
          <div style={{ whiteSpace: 'pre-line', lineHeight: '1.7', color: '#444', fontSize: '0.95rem' }}>
            {product.description || 'Aucune description disponible pour cet article.'}
          </div>
        </section>

        {/* Reviews Section */}
        <ProductReviews
          reviews={reviews}
          handleAddReview={handleAddReview}
          user={user}
          reviewRating={reviewRating}
          setReviewRating={setReviewRating}
          reviewComment={reviewComment}
          setReviewComment={setReviewComment}
          submittingReview={submittingReview}
        />
      </div>
    </>
  );
}
