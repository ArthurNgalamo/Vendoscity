// client/src/components/ProductCard.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from '../context/ToastContext';
import { normalizeSupabaseImageUrl, formatCurrency, getApiBaseUrl } from '../core/api';
import { shareLink } from '../core/share';
import { Store, Share2, Star, Heart } from 'lucide-react';

export default function ProductCard({ product }) {
  const { addToCart, setCartOpen } = useCart();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const showToast = useToast();
  
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimer = useRef(null);

  const images = Array.isArray(product?.images) && product.images.length > 0
    ? product.images.filter(Boolean)
    : [product?.image_url || product?.image].filter(Boolean);

  const mainImage = normalizeSupabaseImageUrl(images[activeImageIdx] || '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png');
  const title = String(product?.title || 'Produit');
  const price = Number(product?.price || 0);
  const oldPrice = Number(product?.old_price || 0);
  const rating = Number(product?.rating || 0);
  const reviewsCount = Number(product?.reviews ?? product?.reviews_count ?? product?.review_count ?? 0);
  const locationLabel = String(product?.quartier || product?.district || product?.location || '').trim();
  
  const sellerId = product?.seller_id || product?.seller?.id || '';
  const sellerRaw = product?.seller?.shop_name || product?.seller?.first_name || product?.shop_name || product?.seller_name || '';
  const sellerName = String(sellerRaw || 'Boutique').trim();

  const isFav = isFavorite(product?.id);

  const handleProductClick = async () => {
    try {
      const token = localStorage.getItem('sellerToken');
      if (token) {
        const base = getApiBaseUrl();
        fetch(`${base}/api/messages/auto-click`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ product_id: product.id }),
          keepalive: true
        }).catch(err => console.error('Error sending auto-click message:', err));
      }
    } catch (_) {}
  };

  // Discount badge calculation
  const discountPercent = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

  // Safe numeric hash from UUID/string ID to prevent NaN in sold count
  const getNumericId = (id) => {
    if (!id) return 1;
    if (typeof id === 'number') return id;
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };
  const numericId = getNumericId(product?.id);

  // Auto slides images on hover
  useEffect(() => {
    if (isHovered && images.length > 1) {
      hoverTimer.current = setInterval(() => {
        setActiveImageIdx((prev) => (prev + 1) % images.length);
      }, 2000);
    } else {
      clearInterval(hoverTimer.current);
      setActiveImageIdx(0);
    }

    return () => clearInterval(hoverTimer.current);
  }, [isHovered, images.length]);

  const handleShareShop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!sellerId) return;
    const shopUrl = `${window.location.origin}/vendeur/${sellerId}`;
    
    const res = await shareLink({
      title: sellerName,
      text: `Découvrez la boutique ${sellerName} sur Vendoscity ! Commande directe WhatsApp.`,
      url: shopUrl
    });

    if (res.ok) {
      if (res.mode === 'copy') {
        showToast('Lien de la boutique copié !');
      } else {
        showToast('Partage initié !');
      }
    } else {
      showToast('Impossible de partager la boutique.');
    }
  };

  const handleToggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFav) {
      removeFavorite(product.id);
    } else {
      addFavorite(product);
    }
  };

  return (
    <article
      className="product-card"
      role="article"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="product-media" style={{ position: 'relative', width: '100%' }}>
        {product?.is_featured && (
          <div 
            className="product-badge-featured" 
            style={{ 
              position: 'absolute',
              top: '8px',
              left: '8px',
              zIndex: 5,
              background: 'linear-gradient(135deg, #ff9e00, #ff6a00)',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '20px',
              boxShadow: '0 2px 8px rgba(255,106,0,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            ⭐ Vedette
          </div>
        )}
        {discountPercent > 0 && (
          <div className="product-badge-discount" style={{ zIndex: 5, left: product?.is_featured ? '85px' : '8px' }}>-{discountPercent}%</div>
        )}

        {/* Favorite heart button overlay */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
          className="btn-favorite-toggle pressable"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            color: isFav ? '#e11d48' : '#64748b',
            transition: 'color 0.2s, background 0.2s'
          }}
        >
          <Heart width="14" height="14" fill={isFav ? '#e11d48' : 'none'} color={isFav ? '#e11d48' : 'currentColor'} />
        </button>

        <Link href={`/product/${product.id}`} onClick={handleProductClick} className="product-link" aria-label={`Voir ${title}`} style={{ display: 'block', width: '100%', height: '100%', position: 'relative' }}>
          <Image
            src={mainImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            style={{ objectFit: 'cover' }}
            className="product-image vc-skeleton vc-loaded"
            loading="lazy"
          />
        </Link>
      </div>

      <div className="product-info" style={{ position: 'relative', padding: '6px 8px 8px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Shop name & share row */}
        <div className="product-card-shop" style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
          {sellerId ? (
            <Link
              href={`/vendeur/${sellerId}`}
              className="product-shop-link"
            >
              <Store width="11" height="11" />
              <span>{sellerName}</span>
            </Link>
          ) : (
            <span className="product-shop-link fallback">
              <Store width="11" height="11" />
              <span>{sellerName}</span>
            </span>
          )}
          
          {sellerId && (
            <button
              type="button"
              className="btn-share-shop-mini pressable"
              onClick={handleShareShop}
              aria-label="Partager la boutique"
              title="Partager la boutique"
              style={{
                background: 'none',
                border: 'none',
                padding: '0',
                cursor: 'pointer',
                marginLeft: 'auto',
                color: 'var(--primary-blue)'
              }}
            >
              <Share2 width="10" height="10" />
            </button>
          )}
        </div>

        {/* Title */}
        <h3 className="product-title product-title-compact" style={{ fontSize: '0.78rem', fontWeight: '500', height: '1.3em', overflow: 'hidden', margin: '2px 0', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
          <Link href={`/product/${product.id}`} onClick={handleProductClick} style={{ color: '#222', textDecoration: 'none' }}>{title}</Link>
        </h3>

        {/* Price & Sales row (Temu Style) */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
          {oldPrice > price ? (
            <>
              {/* Old Price (larger & crossed out) */}
              <span style={{ 
                color: '#64748b', 
                textDecoration: 'line-through',
                textDecorationThickness: '2.5px',
                textDecorationColor: '#1a1a1a', 
                fontSize: '0.95rem', 
                fontWeight: '700',
                marginRight: '2px'
              }}>
                {Math.round(oldPrice).toLocaleString('fr-FR')} F
              </span>
              {/* Final Price (smaller) */}
              <span style={{ 
                fontSize: '0.82rem', 
                fontWeight: '600', 
                color: 'var(--primary-blue)',
                marginRight: '2px'
              }}>
                {Math.round(price).toLocaleString('fr-FR')} FCFA
              </span>
              {/* Discount badge */}
              <span style={{ 
                fontSize: '0.68rem', 
                color: '#e53e3e', 
                fontWeight: '700',
                marginRight: '2px'
              }}>
                -{discountPercent}%
              </span>
            </>
          ) : (
            /* Standard Price (no discount) */
            <span style={{ fontSize: '0.95rem', fontWeight: '850', color: 'var(--primary-blue)' }}>
              {Math.round(price).toLocaleString('fr-FR')} FCFA
            </span>
          )}
          <span style={{ fontSize: '0.68rem', color: '#777' }}>
            {((numericId % 45) + 5) * 12}+ sold
          </span>
        </div>

        {/* Star Rating, Location & Cart Button row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap', minWidth: 0 }}>
            <div className="product-rating-mini" style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.68rem' }}>
              <Star width="8" height="8" fill="var(--color-yellow)" color="var(--color-yellow)" />
              <span style={{ fontWeight: '700', color: '#333' }}>{reviewsCount > 0 ? rating.toFixed(1) : '5.0'}</span>
              <span style={{ color: '#777' }}>({reviewsCount > 0 ? reviewsCount : ((numericId % 15) + 3)})</span>
            </div>
            {locationLabel && (
              <span style={{ fontSize: '0.65rem', color: '#555', backgroundColor: '#f1f5f9', padding: '1px 4px', borderRadius: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60px' }} title={locationLabel}>
                {locationLabel.split(' ')[0]}
              </span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addToCart(product);
              showToast('Ajouté au panier !');
            }}
            className="temu-cart-btn pressable"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              border: '1px solid var(--primary-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-blue)',
              boxShadow: '0 2px 6px rgba(var(--brand-accent-rgb), 0.08)',
              cursor: 'pointer',
              fontSize: '0.72rem',
              flexShrink: 0
            }}
            title="Ajouter au panier"
          >
            🛒
          </button>
        </div>
      </div>
    </article>
  );
}
