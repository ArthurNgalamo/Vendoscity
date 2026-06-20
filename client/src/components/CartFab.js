// client/src/components/CartFab.js
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { ShoppingCart } from 'lucide-react';

export default function CartFab() {
  const { totalItems, setCartOpen } = useCart();
  const pathname = usePathname();

  // Hide FAB if cart is empty or if on checkout/dashboard/messagerie page
  if (totalItems === 0 || pathname === '/dashboard' || pathname === '/checkout' || pathname === '/messagerie') {
    return null;
  }

  return (
    <button
      id="cart-fab"
      className="cart-fab pressable"
      type="button"
      onClick={() => setCartOpen(true)}
      aria-label="Ouvrir le panier"
      title="Ouvrir le panier"
    >
      <ShoppingCart width="24" height="24" />
      <span id="cart-fab-count" className="cart-fab-count">
        {totalItems}
      </span>
    </button>
  );
}
