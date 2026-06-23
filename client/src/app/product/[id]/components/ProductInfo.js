// client/src/app/product/[id]/components/ProductInfo.js
import React from 'react';
import Link from 'next/link';
import { Star, Store, MapPin, Share2, Minus, Plus, ShoppingCart, Heart, MessageSquare, Phone } from 'lucide-react';
import { logAnalyticsEvent } from '../../../../core/api';

export default function ProductInfo({
  product,
  sellerId,
  sellerName,
  reviewsCount,
  ratingAvg,
  handleShareProduct,
  formatCurrency,
  price,
  oldPrice,
  quantity,
  setQuantity,
  addToCart,
  setCartOpen,
  handleToggleFavorite,
  isFav,
  sellerWhatsApp,
  specsList
}) {
  const [purchaseMode, setPurchaseMode] = React.useState('individual'); // 'individual' or 'group'

  const groupPrice = product.group_price && Number(product.group_price) > 0 
    ? Number(product.group_price) 
    : Math.round(price * 0.85);

  const displayPrice = purchaseMode === 'group' ? groupPrice : price;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Shop Tag */}
      {sellerId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Link href={`/vendeur/${sellerId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary-blue)', textDecoration: 'none', fontWeight: '700', fontSize: '0.95rem' }}>
            <Store width="16" height="16" />
            <span>{sellerName}</span>
          </Link>
        </div>
      )}

      <h1 style={{ fontSize: '1.8rem', color: '#111', margin: '0 0 10px 0', fontWeight: '800' }}>{product.title}</h1>

      {/* Rating */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--color-yellow)' }}>
          <Star width="16" height="16" fill="currentColor" />
        </div>
        <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{reviewsCount > 0 ? ratingAvg.toFixed(1) : 'Nouveau'}</span>
        <span style={{ color: '#888', fontSize: '0.9rem' }}>({reviewsCount} avis client)</span>
        
        <button
          onClick={handleShareProduct}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--primary-blue)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontWeight: '700',
            fontSize: '0.85rem'
          }}
          title="Partager cet article"
        >
          <Share2 width="16" height="16" /> Partager
        </button>
      </div>

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', margin: '10px 0 20px 0' }}>
        <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary-blue)' }}>
          {formatCurrency(displayPrice)}
        </span>
        {oldPrice > displayPrice && (
          <span style={{ textDecoration: 'line-through', color: '#888', fontSize: '1.1rem' }}>
            {formatCurrency(oldPrice)}
          </span>
        )}
      </div>

      {/* Location */}
      {product.quartier && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666', fontSize: '0.95rem', marginBottom: '20px' }}>
          <MapPin width="16" height="16" />
          <span>Quartier : <strong>{product.quartier}</strong> (Yaoundé)</span>
        </div>
      )}

      {/* Option d'achat */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Option d&apos;achat :
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div 
            onClick={() => {
              setPurchaseMode('individual');
              setQuantity(1);
            }}
            style={{
              border: `2px solid ${purchaseMode === 'individual' ? 'var(--primary-blue)' : '#cbd5e1'}`,
              background: purchaseMode === 'individual' ? '#f0f4ff' : '#ffffff',
              borderRadius: '10px',
              padding: '12px 16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0f172a' }}>Achat Individuel</span>
            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary-blue)' }}>{formatCurrency(price)}</span>
          </div>

          <div 
            onClick={() => {
              setPurchaseMode('group');
              setQuantity(product.group_min_participants || 3);
            }}
            style={{
              border: `2px solid ${purchaseMode === 'group' ? 'var(--primary-blue)' : '#cbd5e1'}`,
              background: purchaseMode === 'group' ? '#f0f4ff' : '#ffffff',
              borderRadius: '10px',
              padding: '12px 16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Achat Groupé 
              <span style={{ background: '#22c55e', color: 'white', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                -{product.group_price && Number(product.group_price) > 0 ? Math.round((1 - Number(product.group_price)/price) * 100) : 15}%
              </span>
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary-blue)' }}>
              {formatCurrency(groupPrice)}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              Min. {product.group_min_participants || 3} participants
            </span>
          </div>
        </div>
      </div>

      <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '0 0 20px 0' }} />

      {/* Add to Cart Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ccc', borderRadius: '8px', padding: '4px' }}>
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            style={{ background: 'none', border: 'none', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Minus width="14" height="14" />
          </button>
          <span style={{ width: '40px', textAlign: 'center', fontWeight: '700', fontSize: '1.1rem' }}>{quantity}</span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            style={{ background: 'none', border: 'none', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus width="14" height="14" />
          </button>
        </div>

        <button
          onClick={() => {
            const isGroup = purchaseMode === 'group';
            addToCart({
              ...product,
              price: isGroup ? groupPrice : price,
              is_group_buy: isGroup
            }, quantity);
            setCartOpen(true);
          }}
          className="pressable"
          style={{
            background: 'var(--primary-blue)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1,
            justifyContent: 'center'
          }}
        >
          <ShoppingCart width="18" height="18" /> Ajouter au Panier
        </button>

        {/* Heart toggle button */}
        <button
          onClick={handleToggleFavorite}
          className="pressable"
          style={{
            background: isFav ? '#fff0f2' : '#f3f4f6',
            color: isFav ? '#e11d48' : '#4b5563',
            border: '1px solid',
            borderColor: isFav ? '#ffe4e6' : '#e5e7eb',
            borderRadius: '8px',
            width: '48px',
            height: '48px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s'
          }}
          title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Heart width="20" height="20" fill={isFav ? '#e11d48' : 'none'} color={isFav ? '#e11d48' : 'currentColor'} />
        </button>
      </div>

      {/* Contact buttons */}
      {(sellerId || sellerWhatsApp) && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
          {sellerId && (
            <Link
              href={`/messagerie?seller=${sellerId}&product=${product.id}&title=${encodeURIComponent(product.title)}&price=${price}&image=${encodeURIComponent(product.images?.[0] || product.image_url || product.image || '')}`}
              className="pressable"
              onClick={() => logAnalyticsEvent('chat_click', sellerId, product.id)}
              style={{
                flex: 1,
                background: 'var(--primary-blue)',
                color: '#fff',
                border: '1px solid var(--primary-blue)',
                borderRadius: '8px',
                padding: '12px',
                fontWeight: '800',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.95rem',
                minWidth: '140px'
              }}
            >
              <MessageSquare width="18" height="18" /> Écrire au vendeur
            </Link>
          )}

          {sellerWhatsApp && (
            <a
              href={`tel:${sellerWhatsApp.replace(/\D/g, '')}`}
              className="pressable"
              onClick={() => logAnalyticsEvent('phone_click', sellerId, product.id)}
              style={{
                background: '#f3f4f6',
                color: '#1f2937',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                width: '48px',
                height: '48px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
              title="Appeler le vendeur"
            >
              <Phone width="18" height="18" />
            </a>
          )}
        </div>
      )}

      {/* Specs List */}
      {specsList.length > 0 && (
        <div style={{ marginTop: '20px', background: '#f9fafb', borderRadius: '8px', padding: '16px', border: '1px solid #f3f4f6' }}>
          <h3 style={{ fontSize: '0.95rem', color: '#111', margin: '0 0 10px 0', fontWeight: '800' }}>Caractéristiques techniques</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            {specsList.map((spec, sidx) => (
              <div key={sidx} style={{ fontSize: '0.85rem', color: '#444' }}>
                <span style={{ color: '#888' }}>{spec.key} : </span>
                <strong>{spec.val}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
