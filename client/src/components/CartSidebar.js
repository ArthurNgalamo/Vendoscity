// client/src/components/CartSidebar.js
'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { normalizeSupabaseImageUrl, formatCurrency } from '../core/api';
import { X, ShoppingBag, Plus, Minus, Trash2, MessageCircle, CheckCircle, AlertTriangle } from 'lucide-react';

export default function CartSidebar() {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    checkout,
    totalAmount,
    isCartOpen,
    setCartOpen
  } = useCart();

  const [clientWhatsApp, setClientWhatsApp] = useState('');
  const [checkoutOrders, setCheckoutOrders] = useState(null);

  // Load client WhatsApp from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vendoscity_client_whatsapp');
      if (stored) {
        setClientWhatsApp(stored);
      }
    } catch (_) {}
  }, []);

  const handleCheckout = (e) => {
    e.preventDefault();
    if (!clientWhatsApp.trim()) {
      alert('Veuillez entrer votre numéro de téléphone.');
      return;
    }
    // Save to localStorage for future checkout speed
    try {
      localStorage.setItem('vendoscity_client_whatsapp', clientWhatsApp);
    } catch (_) {}

    checkout(clientWhatsApp, (ordersWithLinks) => {
      setCheckoutOrders(ordersWithLinks);
    });
  };

  const closeConfirmation = () => {
    setCheckoutOrders(null);
    setCartOpen(false);
  };

  return (
    <>
      {/* Sidebar Overlay Backdrop */}
      {isCartOpen && (
        <div
          className="cart-backdrop"
          id="cart-backdrop"
          onClick={() => setCartOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 9990,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Cart Sidebar panel */}
      <aside className={`cart-sidebar ${isCartOpen ? 'active' : ''}`} id="cart-sidebar" aria-label="Panier d'achat">
        <span id="cart-badge" className="cart-badge">
          {cart.reduce((sum, item) => sum + item.quantity, 0)}
        </span>

        <div className="cart-header">
          <h2>
            <ShoppingBag width="20" height="20" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Votre Panier
          </h2>
          <button className="btn-close-cart" id="close-cart" aria-label="Fermer le panier" onClick={() => setCartOpen(false)}>
            <X width="18" height="18" />
          </button>
        </div>

        {/* Cart items list */}
        <div className="cart-items" id="cart-items">
          {cart.length === 0 ? (
            <p className="cart-empty">Votre panier est vide</p>
          ) : (
            cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <img
                  src={normalizeSupabaseImageUrl(item.image_url || item.image)}
                  alt={item.title}
                  className="cart-item-image"
                />
                <div className="cart-item-details">
                  <span className="cart-item-shop">{item.shop_name}</span>
                  <h4 className="cart-item-title">{item.title}</h4>
                  <span className="cart-item-price">{formatCurrency(item.price)}</span>
                  <div className="cart-item-qty-row">
                    <div className="qty-controls">
                      <button
                        type="button"
                        className="btn-qty minus"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label="Diminuer la quantité"
                      >
                        <Minus width="12" height="12" />
                      </button>
                      <span className="qty-val">{item.quantity}</span>
                      <button
                        type="button"
                        className="btn-qty plus"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Augmenter la quantité"
                      >
                        <Plus width="12" height="12" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn-delete-item"
                      onClick={() => removeFromCart(item.id)}
                      title="Retirer cet article"
                    >
                      <Trash2 width="14" height="14" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart footer & checkout form */}
        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total-row">
              <span>Sous-total</span>
              <span className="cart-total-val">{formatCurrency(totalAmount)}</span>
            </div>

            <form onSubmit={handleCheckout}>
              <div className="whatsapp-input-group">
                <label htmlFor="whatsapp-input" style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Votre téléphone (avec indicatif ex: 237681570075)
                </label>
                <input
                  type="tel"
                  id="whatsapp-input"
                  placeholder="ex: 237681570075"
                  value={clientWhatsApp}
                  onChange={(e) => setClientWhatsApp(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                    fontFamily: 'inherit',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              <button type="submit" className="btn-checkout pressable">
                Créer la commande
              </button>
            </form>
          </div>
        )}
      </aside>

      {/* Checkout Success Modal Dialog overlay */}
      {checkoutOrders && (
        <div
          className="order-confirmation-overlay"
          id="order-confirmation-overlay"
          onClick={closeConfirmation}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="order-confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Confirmation de commande"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
            }}
          >
            <div className="order-confirmation-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-green)', margin: 0, fontSize: '1.25rem' }}>
                <CheckCircle width="22" height="22" /> Commande créée !
              </h3>
              <button
                className="order-confirmation-close"
                aria-label="Fermer"
                type="button"
                onClick={closeConfirmation}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X width="18" height="18" />
              </button>
            </div>
            <p className="order-confirmation-subtitle" style={{ color: '#555', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5' }}>
              Nous avons regroupé vos articles par vendeur. Vous pouvez poursuivre avec chaque vendeur depuis les options ci-dessous pendant la transition vers un parcours entièrement intégré.
            </p>
            <div className="order-confirmation-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {checkoutOrders.map(({ order, link }, idx) => (
                <div
                  className="order-confirmation-item"
                  key={idx}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div className="order-confirmation-item-main" style={{ flex: 1 }}>
                    <div className="order-confirmation-ref" style={{ fontSize: '0.85rem', fontWeight: '700', color: '#111' }}>
                      Réf : {order.orderId}
                    </div>
                    <div className="order-confirmation-meta" style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>
                      Boutique : {order.shop_name} | Total : {formatCurrency(order.totalAmount)}
                    </div>
                  </div>
                  {link ? (
                    <a
                      className="order-confirmation-btn"
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--color-green)',
                        color: '#fff',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: '700',
                        fontSize: '0.8rem'
                      }}
                    >
                      <MessageCircle width="14" height="14" /> Contacter
                    </a>
                  ) : (
                    <button
                      className="order-confirmation-btn"
                      type="button"
                      disabled
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#f3f4f6',
                        color: '#9ca3af',
                        border: '1px solid #e5e7eb',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'not-allowed',
                        fontSize: '0.8rem'
                      }}
                    >
                      <AlertTriangle width="14" height="14" /> Pas de numéro
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="order-confirmation-footer" style={{ textAlign: 'right' }}>
              <button
                className="order-confirmation-done"
                type="button"
                onClick={closeConfirmation}
                style={{
                  background: 'var(--primary-blue)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
