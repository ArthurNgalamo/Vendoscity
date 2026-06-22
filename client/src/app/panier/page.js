// client/src/app/panier/page.js
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useToast } from '../../context/ToastContext';
import { 
  ShoppingCart, 
  Trash2, 
  Heart, 
  Plus, 
  Minus, 
  MessageSquare, 
  Phone, 
  Tag, 
  Truck, 
  ShieldCheck, 
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import Sparkles from '../../components/Sparkles';
import { formatCurrency, normalizeSupabaseImageUrl } from '../../core/api';
import './panier.css';

export default function PanierPage() {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const { addFavorite, isFavorite } = useFavorites();
  const showToast = useToast();

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

  // Apply promo handler
  const handleApplyPromo = (e) => {
    e.preventDefault();
    const code = String(promoInput || '').trim().toUpperCase();
    if (!code) return;

    if (code === 'VENDOS10') {
      setAppliedPromo({ code: 'VENDOS10', label: '10% de réduction sur vos articles' });
      showToast('Code promo VENDOS10 appliqué ! (-10%)');
      setPromoInput('');
    } else if (code === 'WELCOME500') {
      setAppliedPromo({ code: 'WELCOME500', label: '500 FCFA offerts sur votre commande' });
      showToast('Code promo WELCOME500 appliqué ! (-500 FCFA)');
      setPromoInput('');
    } else if (code === 'MARCHE237') {
      setAppliedPromo({ code: 'MARCHE237', label: 'Livraison standard gratuite' });
      showToast('Code promo MARCHE237 appliqué ! (Livraison gratuite)');
      setPromoInput('');
    } else {
      showToast('Code promotionnel invalide ou expiré.');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    showToast('Code promotionnel retiré.');
  };

  // Save for later (Favorite)
  const handleSaveForLater = (item) => {
    addFavorite(item);
    removeFromCart(item.id);
    showToast(`${item.title} sauvegardé pour plus tard !`);
  };

  // Per-seller checkout via WhatsApp
  const handleCheckoutSeller = (sellerName, items) => {
    const orderId = `VC-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const sellerWhatsApp = items[0]?.whatsapp || '';
    if (!sellerWhatsApp) {
      alert("Ce vendeur n'a pas renseigné son numéro WhatsApp.");
      return;
    }

    const lines = [];
    lines.push(`*📦 COMMANDE VENDOSCITY*`);
    lines.push(`Référence : *${orderId}*`);
    lines.push(`Boutique : *${sellerName}*`);
    lines.push(`=========================`);
    
    items.forEach(item => {
      lines.push(`• *${item.title}* x${item.quantity} (${formatCurrency(item.price)})`);
    });
    
    lines.push(`=========================`);
    const sellerSubtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    lines.push(`Sous-total : ${formatCurrency(sellerSubtotal)}`);
    
    // Delivery info
    let delCost = getShippingCost(deliveryLocation);
    if (appliedPromo?.code === 'MARCHE237') {
      lines.push(`Livraison : ${getShippingLabel(deliveryLocation)} (Gratuit via code promo)`);
    } else {
      lines.push(`Livraison : ${getShippingLabel(deliveryLocation)} (+${formatCurrency(delCost)})`);
    }

    // Promo
    let sellerDiscount = 0;
    if (appliedPromo) {
      if (appliedPromo.code === 'VENDOS10') {
        sellerDiscount = Math.round(sellerSubtotal * 0.1);
        lines.push(`Code promo : *VENDOS10* (-10% : -${formatCurrency(sellerDiscount)})`);
      } else if (appliedPromo.code === 'WELCOME500') {
        sellerDiscount = 500;
        lines.push(`Code promo : *WELCOME500* (-500 FCFA : -${formatCurrency(sellerDiscount)})`);
      } else if (appliedPromo.code === 'MARCHE237') {
        sellerDiscount = delCost;
        lines.push(`Code promo : *MARCHE237* (Livraison gratuite : -${formatCurrency(sellerDiscount)})`);
      }
    }

    const sellerTotal = sellerSubtotal + (appliedPromo?.code === 'MARCHE237' ? 0 : delCost) - (appliedPromo?.code === 'MARCHE237' ? 0 : sellerDiscount);
    lines.push(`*TOTAL À PAYER : ${formatCurrency(Math.max(0, sellerTotal))}*`);
    lines.push(`=========================`);
    lines.push(`Négocié en direct sur Vendoscity.com`);

    const waUrl = `https://wa.me/${sellerWhatsApp.replace(/\D/g, '')}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(waUrl, '_blank');
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
                          <h4 className="cart-item-title">{item.title}</h4>
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

                  {/* Checkout CTA per seller (Direct order WhatsApp link) */}
                  <div className="seller-group-footer-checkout">
                    <div className="seller-checkout-text">
                      Prêt à commander auprès de <strong>{sellerName}</strong> ?
                    </div>
                    <div className="seller-checkout-actions">
                      <Link 
                        href={`/messagerie?seller=${items[0]?.seller_id || ''}&product=${items[0]?.id || ''}&title=${encodeURIComponent(items[0]?.title || '')}&price=${items[0]?.price || ''}&image=${encodeURIComponent(items[0]?.images?.[0] || items[0]?.image_url || items[0]?.image || '')}`}
                        className="seller-chat-btn"
                      >
                        <MessageSquare width="16" height="16" /> Chat
                      </Link>
                      <button 
                        onClick={() => handleCheckoutSeller(sellerName, items)}
                        className="seller-whatsapp-btn"
                      >
                        <Sparkles width="16" height="16" /> Commander par WhatsApp
                      </button>
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
                  <span>💡 Essayez <strong>VENDOS10</strong> (-10% sur articles)</span>
                  <span>💡 Essayez <strong>WELCOME500</strong> (-500 FCFA)</span>
                  <span>💡 Essayez <strong>MARCHE237</strong> (Livraison standard offerte)</span>
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
                    <strong>Paiement de gré à gré à la livraison</strong>
                    <p>Aucun paiement n&apos;est fait sur le site. Vous inspectez l&apos;article et payez le vendeur MOMO/Cash.</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
