// client/src/context/CartContext.js
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

const CART_STORAGE_KEY = 'vendoscity_cart_v1';
const ORDERS_STORAGE_KEY = 'vendorOrders';

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setCartOpen] = useState(false);
  const showToast = useToast();
  const { user, authFetch } = useAuth();

  // Load cart on mount or when user session changes
  useEffect(() => {
    const loadCart = async () => {
      setLoading(true);
      if (user) {
        try {
          // 1. Fetch from database
          const res = await authFetch('/api/cart');
          if (res.ok) {
            const dbCart = await res.json();
            
            // 2. Merge local storage guest items if any
            const rawLocal = localStorage.getItem(CART_STORAGE_KEY);
            if (rawLocal) {
              const localCart = JSON.parse(rawLocal);
              if (Array.isArray(localCart) && localCart.length > 0) {
                // Post local items to DB (backend handles incrementing if exists)
                for (const item of localCart) {
                  await authFetch('/api/cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: item.id, quantity: item.quantity })
                  });
                }
                
                // Clear local guest cart
                localStorage.removeItem(CART_STORAGE_KEY);
                
                // Fetch fresh from backend
                const resFresh = await authFetch('/api/cart');
                if (resFresh.ok) {
                  const freshCart = await resFresh.json();
                  setCart(freshCart);
                } else {
                  setCart(dbCart);
                }
              } else {
                setCart(dbCart);
              }
            } else {
              setCart(dbCart);
            }
          }
        } catch (err) {
          console.error('Failed loading cart from database:', err);
        } finally {
          setLoading(false);
        }
      } else {
        // Guest mode
        try {
          const raw = localStorage.getItem(CART_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setCart(parsed);
            }
          } else {
            setCart([]);
          }
        } catch (_) {
          // ignore
        } finally {
          setLoading(false);
        }
      }
    };

    loadCart();
  }, [user, authFetch]);

  // Save cart helper (handles both local storage and database sync)
  const saveCartToStorage = async (newCart) => {
    const oldCart = [...cart];
    setCart(newCart);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
    } catch (_) {
      // ignore
    }

    if (user) {
      if (newCart.length === 0) {
        try {
          await authFetch('/api/cart', { method: 'DELETE' });
        } catch (err) {
          console.error('Failed clearing cart on server:', err);
        }
      } else {
        // Check which items were removed to delete them from DB
        const currentIds = new Set(newCart.map(x => String(x.id)));
        const removedItems = oldCart.filter(x => !currentIds.has(String(x.id)));
        for (const item of removedItems) {
          try {
            await authFetch(`/api/cart/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
          } catch (err) {
            console.error(`Failed deleting item ${item.id} on server:`, err);
          }
        }
      }
    }
  };

  const addToCart = useCallback(async (product, qty = 1) => {
    const defaultProductImage = '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png';
    const images = Array.isArray(product?.images) && product.images.length > 0
      ? product.images
      : [product?.image_url || product?.image || defaultProductImage].filter(Boolean);

    const item = {
      id: product?.id,
      title: String(product?.title || 'Produit'),
      price: Number(product?.price || 0),
      category: product?.category || '',
      whatsapp: product?.whatsapp || product?.seller?.whatsapp || '',
      image_url: product?.image_url || '',
      image: product?.image || '',
      images,
      seller_id: product?.seller_id || product?.seller?.id || '',
      shop_name: product?.seller?.shop_name || product?.seller?.first_name || product?.shop_name || product?.seller_name || 'Boutique',
      is_group_buy: !!product?.is_group_buy
    };

    if (!item.id || !Number.isFinite(item.price) || item.price <= 0) {
      showToast('Impossible d’ajouter ce produit au panier.');
      return;
    }

    const addQty = Math.max(1, parseInt(String(qty), 10) || 1);

    // Update UI state optimistically
    setCart((prevCart) => {
      const idx = prevCart.findIndex((x) => String(x.id) === String(item.id) && !!x.is_group_buy === !!item.is_group_buy);
      let nextCart;

      if (idx >= 0) {
        nextCart = prevCart.map((x, i) =>
          i === idx ? { ...x, quantity: Math.max(1, (parseInt(String(x.quantity), 10) || 1) + addQty) } : x
        );
        showToast(`Quantité mise à jour : ${item.title}`);
      } else {
        nextCart = [...prevCart, { ...item, quantity: addQty }];
        showToast(`Ajouté au panier : ${item.title}`);
      }

      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextCart));
      } catch (_) {}
      return nextCart;
    });

    // Sync with DB if logged in
    if (user) {
      try {
        const res = await authFetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: item.id, quantity: addQty })
        });
        if (!res.ok) throw new Error('DB add failed');
      } catch (err) {
        console.error('Failed syncing cart addition to DB:', err);
      }
    }
  }, [user, authFetch, showToast]);

  const updateQuantity = useCallback(async (itemId, qty) => {
    const nextQty = Math.max(1, parseInt(String(qty), 10) || 1);

    setCart((prevCart) => {
      const nextCart = prevCart.map((item) =>
        String(item.id) === String(itemId) ? { ...item, quantity: nextQty } : item
      );
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextCart));
      } catch (_) {}
      return nextCart;
    });

    if (user) {
      try {
        const res = await authFetch(`/api/cart/${encodeURIComponent(itemId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: nextQty })
        });
        if (!res.ok) throw new Error('DB update failed');
      } catch (err) {
        console.error('Failed syncing cart quantity to DB:', err);
      }
    }
  }, [user, authFetch]);

  const removeFromCart = useCallback(async (itemId) => {
    setCart((prevCart) => {
      const nextCart = prevCart.filter((item) => String(item.id) !== String(itemId));
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextCart));
      } catch (_) {}
      showToast('Article retiré du panier.');
      return nextCart;
    });

    if (user) {
      try {
        const res = await authFetch(`/api/cart/${encodeURIComponent(itemId)}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('DB delete failed');
      } catch (err) {
        console.error('Failed syncing cart deletion to DB:', err);
      }
    }
  }, [user, authFetch, showToast]);

  const clearCart = useCallback(async () => {
    await saveCartToStorage([]);
  }, [cart, user, authFetch]);

  // Format dynamic page URLs for WhatsApp message links
  const getOrderItemPageUrl = (item) => {
    const id = String(item?.id || '').trim();
    if (!id) return '';
    try {
      return new URL(`/product/${encodeURIComponent(id)}`, window.location.origin).toString();
    } catch (_) {
      return '';
    }
  };

  const getOrderItemImageUrl = (item) => {
    const raw = (Array.isArray(item?.images) && item.images[0]) ? item.images[0] : (item?.image_url || '');
    const s = String(raw || '').trim();
    if (!s) return '';
    try {
      return new URL(s, window.location.origin).toString();
    } catch (_) {
      return s;
    }
  };

  const normalizeWhatsApp = (raw) => {
    let s = String(raw || '').replace(/\D/g, ''); // garder uniquement les chiffres
    if (!s) return '';
    // Si format national camerounais sans code (9 chiffres)
    if (s.length === 9) {
      s = '237' + s;
    }
    return s;
  };

  const generateOrderId = () => {
    const prefix = 'VC';
    const rand = Math.floor(1000 + Math.random() * 9000);
    const ts = Date.now().toString().slice(-6);
    return `${prefix}-${ts}-${rand}`;
  };

  const buildWhatsAppMessage = (order) => {
    const lines = [];
    lines.push('Bonjour,');
    lines.push('');
    lines.push('Je souhaite passer une commande sur Vendoscity.');
    lines.push(`Référence : ${order.orderId}`);
    lines.push(`Mon WhatsApp : +${order.clientWhatsApp}`);
    lines.push('');
    lines.push('Articles :');
    for (const item of order.items) {
      const price = Math.round(item.price).toLocaleString('fr-FR');
      const subtotal = Math.round(item.subtotal).toLocaleString('fr-FR');
      lines.push(`- ${item.title} x${item.quantity} (${price} FCFA) = ${subtotal} FCFA`);

      const img = getOrderItemImageUrl(item);
      if (img) lines.push(`  Photo : ${img}`);
      const link = getOrderItemPageUrl(item);
      if (link) lines.push(`  Lien : ${link}`);
    }
    lines.push('');
    lines.push(`Total : ${Math.round(order.totalAmount).toLocaleString('fr-FR')} FCFA`);
    lines.push('');
    lines.push('Merci de me confirmer la disponibilité et les modalités de livraison.');
    return lines.join('\n');
  };

  const buildWaMeLink = (sellerWhatsApp, message) => {
    const wa = normalizeWhatsApp(sellerWhatsApp);
    const text = encodeURIComponent(message);
    return `https://wa.me/${wa}?text=${text}`;
  };

  const saveOrdersToLocalStorage = (orders) => {
    try {
      const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(existing) ? [...existing, ...orders] : [...orders];
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(next));
    } catch (_) {
      // ignore
    }
  };

  const checkout = useCallback((rawClientWhatsApp, onCheckoutCompleted) => {
    if (cart.length === 0) {
      showToast('Votre panier est vide !');
      return;
    }

    const clientWhatsApp = normalizeWhatsApp(rawClientWhatsApp);
    if (!clientWhatsApp || clientWhatsApp.length < 9) {
      showToast('Numéro WhatsApp client invalide.');
      return;
    }

    // Group items by seller whatsapp number
    const grouped = new Map();
    for (const item of cart) {
      const sellerWa = String(item.whatsapp || '').trim();
      const key = sellerWa ? sellerWa : '__unknown__';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(item);
    }

    const orders = [];
    const ordersWithLinks = [];
    const remainingCartItems = [];

    for (const [sellerWhatsAppKey, items] of grouped.entries()) {
      const sellerWhatsApp = sellerWhatsAppKey === '__unknown__' ? '' : sellerWhatsAppKey;
      const orderId = generateOrderId();
      
      const orderItems = items.map((i) => ({
        id: i.id,
        title: i.title,
        quantity: i.quantity,
        price: i.price,
        subtotal: i.price * i.quantity,
        image_url: i.image_url || i.image || '',
        images: Array.isArray(i.images) ? i.images : []
      }));

      const totalAmount = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
      const itemsCount = orderItems.reduce((sum, i) => sum + i.quantity, 0);

      const order = {
        orderId,
        clientWhatsApp,
        sellerWhatsApp,
        items: orderItems,
        itemsCount,
        totalAmount,
        orderDate: new Date().toLocaleString('fr-FR'),
        status: 'pending',
        shop_name: items[0]?.shop_name || 'Boutique'
      };

      orders.push(order);

      if (sellerWhatsApp) {
        const message = buildWhatsAppMessage(order);
        const link = buildWaMeLink(sellerWhatsApp, message);
        ordersWithLinks.push({ order, link });
      } else {
        // Guard cart item if seller WhatsApp is missing (prevents dropping it silently)
        remainingCartItems.push(...items);
        ordersWithLinks.push({ order, link: '' });
      }
    }

    saveOrdersToLocalStorage(orders);

    // Open first order automatically (standard user-intent browser behavior)
    const firstLink = ordersWithLinks.find(x => x.link)?.link;
    if (firstLink) {
      window.open(firstLink, '_blank', 'noopener,noreferrer');
    }

    // Clear cart for checked out items
    saveCartToStorage(remainingCartItems);

    // Trigger callback to render success dialog
    if (typeof onCheckoutCompleted === 'function') {
      onCheckoutCompleted(ordersWithLinks);
    }
  }, [cart, showToast]);

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        checkout,
        totalAmount,
        totalItems,
        isCartOpen,
        setCartOpen
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
