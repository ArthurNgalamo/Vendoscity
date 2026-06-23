// client/src/app/panier/page.js
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { 
  ShoppingCart, 
  Trash2, 
  Heart, 
  Plus, 
  Minus, 
  MessageSquare, 
  Tag, 
  Truck, 
  ShieldCheck, 
  ArrowLeft,
  ArrowRight,
  CreditCard
} from 'lucide-react';
import { formatCurrency, normalizeSupabaseImageUrl } from '../../core/api';
import './panier.css';

export default function PanierPage() {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const { addFavorite, isFavorite } = useFavorites();
  const showToast = useToast();
  const { user, authFetch } = useAuth();

  const [deliveryLocation, setDeliveryLocation] = useState('standard-yde'); // 'pickup', 'standard-yde', 'standard-dla', 'express'
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);

  // Group items by seller/boutique
  const groupedItems = cart.reduce((groups, item) => {
    const seller = item.shop_name || 'Boutique Locale';
    if (!groups[seller]) {
      groups[seller] = [];
    }
    groups[seller].push(item);
    return groups;
  }, {});

  // Shipping cost calculation
  const getShippingCost = (loc) => {
    if (appliedPromo?.code === 'MARCHE237') return 0;
    if (loc === 'pickup') return 0;
    if (loc === 'standard-yde') return 1000;
    if (loc === 'standard-dla') return 1500;
    if (loc === 'express') return 2500;
    return 1000;
  };

  const getShippingLabel = (loc) => {
    if (loc === 'pickup') return 'Retrait physique (Yaoundé / Douala)';
    if (loc === 'standard-yde') return 'Livraison Standard Yaoundé';
    if (loc === 'standard-dla') return 'Livraison Standard Douala';
    if (loc === 'express') return 'Expédition Express (Autres villes)';
    return 'Livraison';
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = getShippingCost(deliveryLocation);

  // Promo discount calculation
  const getDiscount = (promo, sub, ship) => {
    if (!promo) return 0;
    if (promo.code === 'VENDOS10') {
      return Math.round(sub * 0.1);
    }
    if (promo.code === 'WELCOME500') {
      return 500;
    }
    if (promo.code === 'MARCHE237') {
      return ship; // free standard delivery
    }
    return 0;
  };

  const discount = getDiscount(appliedPromo, subtotal, shippingCost);
  const total = Math.max(0, subtotal + shippingCost - discount);

  // Apply promo handler with minimum amount and unique-usage restrictions
  const handleApplyPromo = async (e) => {
    e.preventDefault();
    const code = String(promoInput || '').trim().toUpperCase();
    if (!code) return;

    // Enforce minimum order amount
    if (subtotal < 50000) {
      showToast('Les codes promo sont disponibles uniquement pour les commandes ≥ 50 000 FCFA.');
      return;
    }

    const validCodes = ['VENDOS10', 'WELCOME500', 'MARCHE237'];
    if (!validCodes.includes(code)) {
      showToast('Code promotionnel invalide ou expiré.');
      return;
    }

    // Check if user already used this promo code
    if (user) {
      try {
        const res = await authFetch('/api/orders');
        if (res.ok) {
          const orders = await res.json();
          const alreadyUsed = orders.some(o => o.promo_code === code);
          if (alreadyUsed) {
            showToast('Vous avez déjà utilisé ce code promo. Chaque code est limité à 1 utilisation par compte.');
            return;
          }
        }
      } catch (_) { /* ignore network errors, allow promo */ }
    }

    if (code === 'VENDOS10') {
      setAppliedPromo({ code: 'VENDOS10', label: '10% de réduction sur vos articles' });
      showToast('Code promo VENDOS10 appliqué ! (-10%)');
    } else if (code === 'WELCOME500') {
      setAppliedPromo({ code: 'WELCOME500', label: '500 FCFA offerts sur votre commande' });
      showToast('Code promo WELCOME500 appliqué ! (-500 FCFA)');
    } else if (code === 'MARCHE237') {
      setAppliedPromo({ code: 'MARCHE237', label: 'Livraison standard gratuite' });
      showToast('Code promo MARCHE237 appliqué ! (Livraison gratuite)');
    }
    setPromoInput('');
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    showToast('Code promotionnel retiré.');
  };

  // Save for later (Favorite)
  const handleSaveForLater = (item) => {
    addFavorite(item);
    removeFromCart(item.id, item.is_group_buy);
    showToast(`${item.title} sauvegardé pour plus tard !`);
  };

  // Global multi-seller checkout
  const handleCheckoutAll = () => {
    if (cart.length === 0) return;

    // Build sellers groups
    const sellerGroups = Object.entries(groupedItems).map(([sellerName, items]) => ({
      sellerId: items[0]?.seller_id || '',
      sellerName,
      sellerWhatsApp: items[0]?.whatsapp || '',
      items
    }));

    const checkoutData = {
      isMultiSeller: sellerGroups.length > 1,
      sellers: sellerGroups,
      // For backward compat with single-seller checkout page
      sellerId: sellerGroups[0]?.sellerId || '',
      sellerName: sellerGroups.length === 1 ? sellerGroups[0].sellerName : `${sellerGroups.length} boutiques`,
      sellerWhatsApp: sellerGroups[0]?.sellerWhatsApp || '',
      items: cart,
      deliveryLocation,
      appliedPromo
    };
    localStorage.setItem('checkout_data', JSON.stringify(checkoutData));
    window.location.href = '/checkout';
  };

  return (
    <div className="cart-page-wrapper">
      <div className="cart-page-container">
        
        {/* Breadcrumbs / Header back link */}
        <div className="cart-back-nav">
          <Link href="/boutique" className="back-link-btn">
            <ArrowLeft width="16" height="16" /> Continuer les achats
          </Link>
        </div>

        <h1 className="cart-main-heading">
          <ShoppingCart width="28" height="28" style={{ color: 'var(--primary-blue)' }} /> Mon Panier d&apos;Achats
        </h1>

        {cart.length === 0 ? (
          /* EMPTY CART STATE */
          <div className="empty-cart-card">
            <div className="empty-cart-icon-wrapper">
              <ShoppingCart width="48" height="48" style={{ opacity: 0.5 }} />
            </div>
            <h2>Votre panier est vide</h2>
            <p>Découvrez des milliers d&apos;articles en direct de nos vendeurs à Yaoundé & Douala.</p>
            <Link href="/boutique" className="cta-shop-btn">
              Parcourir les articles <ArrowRight width="16" height="16" />
            </Link>
          </div>
        ) : (
          /* FULL CART CONTENT */
          <div className="cart-page-content-grid">
            
            {/* LEFT COLUMN: Cart Items list grouped by seller */}
            <div className="cart-items-column">
              {Object.entries(groupedItems).map(([sellerName, items], gIdx) => (
                <div key={gIdx} className="seller-cart-group">
                  
                  {/* Seller Header */}
                  <div className="seller-group-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="seller-group-badge">Vendeur</span>
                      <h3 className="seller-group-title">{sellerName}</h3>
                    </div>
                    <span className="seller-items-count">
                      {items.length} article{items.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Products inside this seller group */}
                  <div className="seller-products-list">
                    {items.map((item, itemIdx) => (
                      <div key={itemIdx} className="cart-item-card">
                        
                        {/* Thumbnail image */}
                        <div className="cart-item-image">
                          <img 
                            src={normalizeSupabaseImageUrl(item.images?.[0] || item.image_url || item.image)} 
                            alt={item.title}
                            onError={(e) => { e.target.src = '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png'; }}
                          />
                        </div>

                        {/* Details */}
                        <div className="cart-item-info">
                          <h4 className="cart-item-title">
                            <span>{item.title}</span>
                          </h4>
                          <span className="cart-item-category">{item.category}</span>
                          <div className="cart-item-price-unit">{formatCurrency(item.price)} / unité</div>
                        </div>

                        {/* Controls */}
                        <div className="cart-item-controls-block">
                          {/* Quantity selector */}
                          <div className="cart-quantity-selector">
                            <button 
                              type="button" 
                              onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              className="qty-btn"
                              aria-label="Diminuer quantité"
                            >
                              <Minus width="14" height="14" />
                            </button>
                            <span className="qty-value">{item.quantity}</span>
                            <button 
                              type="button" 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="qty-btn"
                              aria-label="Augmenter quantité"
                            >
                              <Plus width="14" height="14" />
                            </button>
                          </div>

                          {/* Action row (Delete & Save for later) */}
                          <div className="cart-item-actions-row">
                            <button 
                              onClick={() => handleSaveForLater(item)}
                              className="item-action-btn fav"
                              title="Enregistrer pour plus tard"
                            >
                              <Heart width="14" height="14" /> <span>Mettre de côté</span>
                            </button>
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="item-action-btn delete"
                              title="Retirer du panier"
                            >
                              <Trash2 width="14" height="14" /> <span>Supprimer</span>
                            </button>
                          </div>
                        </div>

                        {/* Total unit price */}
                        <div className="cart-item-total-price">
                          {formatCurrency(item.price * item.quantity)}
                        </div>

                      </div>
                    ))}
                  </div>

                  {/* Per-seller chat link only */}
                  <div className="seller-group-footer-checkout">
                    <div className="seller-checkout-text">
                      Vendeur : <strong>{sellerName}</strong>
                    </div>
                    <div className="seller-checkout-actions">
                      <Link 
                        href={`/messagerie?seller=${items[0]?.seller_id || ''}&product=${items[0]?.id || ''}&title=${encodeURIComponent(items[0]?.title || '')}&price=${items[0]?.price || ''}&image=${encodeURIComponent(items[0]?.images?.[0] || items[0]?.image_url || items[0]?.image || '')}`}
                        className="seller-chat-btn"
                      >
                        <MessageSquare width="16" height="16" /> Contacter le vendeur
                      </Link>
                    </div>
                  </div>

                </div>
              ))}
            </div>

            {/* RIGHT COLUMN: Total Summary, Delivery options and Promo codes */}
            <div className="cart-summary-column">
              
              {/* Box 1: Delivery Location Selection */}
              <div className="summary-section-card">
                <h3 className="section-card-title">
                  <Truck width="18" height="18" style={{ color: 'var(--primary-blue)' }} /> Options de Livraison
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                  <label className={`delivery-option-item ${deliveryLocation === 'pickup' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="delLocation" 
                      value="pickup" 
                      checked={deliveryLocation === 'pickup'}
                      onChange={() => setDeliveryLocation('pickup')}
                    />
                    <div>
                      <strong>Retrait Physique (Gratuit)</strong>
                      <span>Point relais Yaoundé ou Douala</span>
                    </div>
                  </label>
                  <label className={`delivery-option-item ${deliveryLocation === 'standard-yde' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="delLocation" 
                      value="standard-yde" 
                      checked={deliveryLocation === 'standard-yde'}
                      onChange={() => setDeliveryLocation('standard-yde')}
                    />
                    <div>
                      <strong>Standard Yaoundé (+1 000 FCFA)</strong>
                      <span>Livraison à domicile sous 24-48h</span>
                    </div>
                  </label>
                  <label className={`delivery-option-item ${deliveryLocation === 'standard-dla' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="delLocation" 
                      value="standard-dla" 
                      checked={deliveryLocation === 'standard-dla'}
                      onChange={() => setDeliveryLocation('standard-dla')}
                    />
                    <div>
                      <strong>Standard Douala (+1 500 FCFA)</strong>
                      <span>Livraison à domicile sous 24-48h</span>
                    </div>
                  </label>
                  <label className={`delivery-option-item ${deliveryLocation === 'express' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="delLocation" 
                      value="express" 
                      checked={deliveryLocation === 'express'}
                      onChange={() => setDeliveryLocation('express')}
                    />
                    <div>
                      <strong>Expédition Express (+2 500 FCFA)</strong>
                      <span>Autres villes via agences de voyage</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Box 2: Promo Codes */}
              <div className="summary-section-card">
                <h3 className="section-card-title">
                  <Tag width="18" height="18" style={{ color: 'var(--primary-blue)' }} /> Code Promotionnel
                </h3>
                
                {appliedPromo ? (
                  <div className="applied-promo-box">
                    <div>
                      <div className="promo-badge-tag">{appliedPromo.code}</div>
                      <p className="promo-badge-desc">{appliedPromo.label}</p>
                    </div>
                    <button onClick={handleRemovePromo} className="promo-remove-btn">
                      Retirer
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className="promo-code-form">
                    <input 
                      type="text" 
                      placeholder="Ex: VENDOS10, WELCOME500" 
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      className="promo-input-field"
                    />
                    <button type="submit" className="promo-apply-btn">
                      Appliquer
                    </button>
                  </form>
                )}
                
                {/* Promo hints */}
                <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span>💡 Codes disponibles pour commandes ≥ 50 000 FCFA</span>
                  <span>💡 Essayez <strong>VENDOS10</strong> (-10%) • <strong>WELCOME500</strong> (-500 F) • <strong>MARCHE237</strong> (livraison gratuite)</span>
                </div>
              </div>

              {/* Box 3: Total Summary */}
              <div className="summary-section-card summary-totals-card">
                <h3 className="section-card-title">Récapitulatif</h3>
                
                <div className="totals-rows-list">
                  <div className="total-row-item">
                    <span>Sous-total articles :</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>

                  <div className="total-row-item">
                    <span>Frais de livraison :</span>
                    <span>{shippingCost > 0 ? formatCurrency(shippingCost) : 'Gratuit'}</span>
                  </div>

                  {appliedPromo && (
                    <div className="total-row-item discount">
                      <span>Réduction ({appliedPromo.code}) :</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}

                  <hr className="totals-separator" />

                  <div className="total-row-item grand-total">
                    <span>Total Estimé :</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* Safe purchase assurance */}
                <div className="cart-security-badge">
                  <ShieldCheck width="18" height="18" style={{ color: '#16a34a', flexShrink: 0 }} />
                  <div>
                    <strong>Paiement sécurisé en cours de déploiement</strong>
                    <p>Vendoscity évolue vers des paiements gérés sur la plateforme. Les vendeurs en transition peuvent encore proposer un règlement local.</p>
                  </div>
                </div>

                {/* Global checkout button */}
                <button
                  id="btn-checkout-global"
                  onClick={handleCheckoutAll}
                  className="global-checkout-btn"
                  style={{
                    marginTop: '18px',
                    width: '100%',
                    padding: '14px',
                    background: 'linear-gradient(135deg, var(--primary-blue), #4f46e5)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '800',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(18,18,147,0.25)',
                    transition: 'transform 0.15s, box-shadow 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(18,18,147,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(18,18,147,0.25)'; }}
                >
                  <CreditCard width="18" height="18" />
                  Passer la commande globale · {formatCurrency(total)}
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
