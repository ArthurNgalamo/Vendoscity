import React from 'react';
import Link from 'next/link';
import { ShoppingCart, User, Home, Video } from 'lucide-react';
import { VendoscityLogoMini, MessageIcon } from './HeaderIcons';
import { getUserAvatarUrl } from '../../core/api';

export default function MobileTabbar({
  pathname,
  user,
  profile,
  setCartOpen,
  totalItems,
  unreadCount
}) {
  return (
    <div className="alibaba-mobile-tabbar">
      <Link href="/" className={`tabbar-item ${pathname === '/' ? 'active' : ''}`}>
        <div className="tabbar-icon-wrap">
          {pathname === '/' ? (
            <VendoscityLogoMini />
          ) : (
            <Home width="20" height="20" />
          )}
        </div>
        <span>Accueil</span>
      </Link>

      <Link href="/videos" className={`tabbar-item ${pathname?.startsWith('/videos') ? 'active' : ''}`}>
        <div className="tabbar-icon-wrap">
          <Video width="20" height="20" />
        </div>
        <span>Videos</span>
      </Link>

      <Link href="/messagerie" className={`tabbar-item ${pathname === '/messagerie' ? 'active' : ''}`}>
        <div className="tabbar-icon-wrap">
          <MessageIcon />
          {unreadCount > 0 && <span className="tabbar-badge">{unreadCount}</span>}
        </div>
        <span>Messagerie</span>
      </Link>

      <Link href="/panier" className={`tabbar-item ${pathname === '/panier' ? 'active' : ''}`}>
        <div className="tabbar-icon-wrap">
          <ShoppingCart width="20" height="20" />
          {totalItems > 0 && <span className="tabbar-badge">{totalItems}</span>}
        </div>
        <span>Panier</span>
      </Link>

      <Link href="/mon-espace" className={`tabbar-item ${pathname === '/mon-espace' ? 'active' : ''}`}>
        <div className="tabbar-icon-wrap">
          {user && profile ? (
            <img 
              src={getUserAvatarUrl(profile?.avatar_url, profile?.shop_name || 'V')} 
              alt="" 
              style={{ 
                width: '20px', 
                height: '20px', 
                borderRadius: '50%', 
                objectFit: 'cover',
                border: pathname === '/mon-espace' ? '1.5px solid #ff6a00' : 'none'
              }}
            />
          ) : (
            <User width="20" height="20" />
          )}
        </div>
        <span>Mon espace</span>
      </Link>
    </div>
  );
}
