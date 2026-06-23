// client/src/components/Header/MobileHeader.js
import React from 'react';
import Link from 'next/link';
import { 
  Camera, 
  Heart, 
  ShoppingCart, 
  User, 
  LayoutDashboard, 
  LogOut, 
  LogIn,
  MessageSquare,
  Store,
  QrCode,
  Wallet,
  TrendingUp,
  ShieldCheck,
  Video
} from 'lucide-react';
import { GridIcon } from './HeaderIcons';
import { useTypingPlaceholder, getPersonalizedPhrases } from '../../hooks/useTypingPlaceholder';
import Sparkles from '../Sparkles';

// Mêmes phrases que le desktop — cohérence de l'expérience
const SEARCH_PHRASES = [
  'iPhone 15 Pro Max 256 Go...',
  'Robe de soirée tendance Yaoundé...',
  'Ordinateur portable Dell Core i7...',
  'Chaussures Nike Air Jordan neuves...',
  'Canapé 3 places cuir marron...',
  'Climatiseur Samsung 1.5 chevaux...',
  'Générateur électrique 3000W...',
  'Sac à main Louis Vuitton original...',
  'Télévision 55 pouces 4K UHD...',
  'Moto Yamaha YZF R15 2024...',
];

export default function MobileHeader({
  user,
  profile,
  logout,
  setCartOpen,
  totalItems,
  favorites,
  pathname,
  router,
  searchVal,
  setSearchVal,
  activeSearchTab,
  urlParams,
  menuOpen,
  toggleMenu,
  handleTabClick,
  handleSearchSubmit,
  showSearchRow,
  handleImageSearchClick,
  unreadCount
}) {
  // Placeholder animé machine à écrire — personnalisé selon le parcours de l'utilisateur
  const [phrases, setPhrases] = React.useState(SEARCH_PHRASES);
  React.useEffect(() => {
    setPhrases(getPersonalizedPhrases(SEARCH_PHRASES));
  }, []);

  const animatedPlaceholder = useTypingPlaceholder(
    phrases,
    75,   // ms/lettre frappe
    35,   // ms/lettre effacement
    2400, // pause phrase complète
    searchVal.length > 0
  );
  return (
    <div className="alibaba-header-mobile">
      {showSearchRow && (
        <>
          {/* ROW 1: Tabs */}
          <div className="mobile-tabs-row">
            <button 
              type="button" 
              className={`mobile-tab-item ${activeSearchTab === 'ai' ? 'active' : ''}`}
              onClick={() => handleTabClick('ai')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
            >
              AI Mode <Sparkles width="12" height="12" />
            </button>
            <button 
              type="button" 
              className={`mobile-tab-item ${activeSearchTab === 'products' ? 'active' : ''}`}
              onClick={() => handleTabClick('products')}
            >
              Produits
            </button>
            <button 
              type="button" 
              className={`mobile-tab-item ${activeSearchTab === 'sellers' ? 'active' : ''}`}
              onClick={() => handleTabClick('sellers')}
            >
              Vendeurs
            </button>
          </div>

          {/* ROW 2: Search Bar */}
          <div className="mobile-search-bar-row-premium">
            <form onSubmit={handleSearchSubmit} className="mobile-search-box-premium">
              <div className="mobile-search-camera-icon" title="Recherche par image" onClick={handleImageSearchClick} style={{ cursor: 'pointer' }}>
                <Camera width="20" height="20" />
              </div>
              <div className="mobile-search-input-wrap">
                <input
                  type="text"
                  placeholder={animatedPlaceholder || 'Rechercher...'}
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                />
              </div>
              <div className="mobile-search-mic-icon" title="Recherche vocale">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8" />
                </svg>
              </div>
              <button type="submit" className="mobile-search-submit-btn" aria-label="Rechercher">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </button>
            </form>
          </div>

          {/* ROW 3: Navigation shortcuts */}
          <div className="mobile-shortcuts-row">
            <Link href="/videos" className="mobile-shortcut-card">
              <div className="mobile-shortcut-icon">
                <Video width="20" height="20" style={{ color: '#8b5cf6' }} />
              </div>
              <span className="mobile-shortcut-text">Flux<br/>vidéos</span>
            </Link>
            <Link href="/ai-mode?message=Je%20souhaite%20demander%20un%20devis%20pour%20les%20produits%20suivants%20%3A%20" className="mobile-shortcut-card">
              <div className="mobile-shortcut-icon">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <span className="mobile-shortcut-text">Demander un<br/>devis</span>
            </Link>
            <Link href="/top-classement" className="mobile-shortcut-card">
              <div className="mobile-shortcut-icon">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
                  <path d="M12 2a6 6 0 0 1 6 6v3.5c0 1.63-.67 3.2-1.85 4.33L12 19.5l-4.15-3.67A5.79 5.79 0 0 1 6 11.5V8a6 6 0 0 1 6-6Z" />
                </svg>
              </div>
              <span className="mobile-shortcut-text">Top de<br/>classement</span>
            </Link>
          </div>

          {/* ROW 4: Promo banner */}
          <div className="mobile-promo-row">
            <div className="mobile-promo-banner">
              <div className="mobile-promo-icon">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div className="mobile-promo-info">
                <span className="mobile-promo-title">Livraison GRATUITE</span>
                <span className="mobile-promo-desc">sur votre première com...</span>
              </div>
            </div>
            <div className="mobile-promo-banner">
              <div className="mobile-promo-icon">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="mobile-promo-info">
                <span className="mobile-promo-title">Protection de remb...</span>
                <span className="mobile-promo-desc">pendant 60 jours maxim...</span>
              </div>
            </div>
          </div>

          {/* ROW 5: Filters pills (Hidden on homepage) */}
          {pathname !== '/' && (
            <div className="mobile-filters-row">
              <button 
                type="button" 
                className={`mobile-filter-pill ${(!urlParams.sort && !urlParams.custom) ? 'active' : ''}`}
                onClick={() => router.push('/boutique')}
              >
                <Heart width="12" height="12" className="mobile-filter-icon" fill="currentColor" />
                <span>Tous</span>
              </button>
              <button 
                type="button" 
                className={`mobile-filter-pill ${urlParams.sort === 'recommended' ? 'active' : ''}`}
                onClick={() => router.push('/boutique?sort=recommended')}
              >
                <svg viewBox="0 0 24 24" width="12" height="12" className="mobile-filter-icon" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span>Meilleures offres</span>
              </button>
              <button 
                type="button" 
                className={`mobile-filter-pill ${urlParams.custom === 'custom' ? 'active' : ''}`}
                onClick={() => router.push('/boutique?custom=custom')}
              >
                <svg viewBox="0 0 24 24" width="12" height="12" className="mobile-filter-icon" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                <span>Personnalisation</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Mobile Navigation Drawer Links */}
      {showSearchRow && (
        <ul className={`mobile-nav-bar-drawer ${menuOpen ? 'active' : ''}`}>
          <li>
            <Link href="/" className={pathname === '/' ? 'active' : ''}>
              Accueil
            </Link>
          </li>
          <li>
            <Link href="/boutique" className={pathname === '/boutique' ? 'active' : ''}>
              Boutique
            </Link>
          </li>
          <li>
            <Link href="/services" className={pathname === '/services' ? 'active' : ''}>
              Services
            </Link>
          </li>
          <li>
            <Link href="/imports" className={pathname?.startsWith('/imports') ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: pathname?.startsWith('/imports') ? '#8b5cf6' : undefined }}>
              🌍 Imports AliExpress / Alibaba
              <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: '0.6rem', fontWeight: '800', padding: '1px 5px', borderRadius: '8px' }}>NOUVEAU</span>
            </Link>
          </li>
          <li>
            <Link href="/messagerie" className={pathname === '/messagerie' ? 'active' : ''} style={{ fontWeight: 'bold', color: pathname === '/messagerie' ? 'var(--primary-blue)' : '#ff6a00', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Messagerie
              {unreadCount > 0 && (
                <span className="tabbar-badge" style={{ position: 'static', transform: 'none', background: 'var(--primary-blue)', color: '#fff', fontSize: '0.7rem', height: '16px', minWidth: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', padding: '0 4px', lineHeight: 1 }}>
                  {unreadCount}
                </span>
              )}
            </Link>
          </li>
          <li>
            <Link href="/contacts" className={pathname === '/contacts' ? 'active' : ''}>
              Contacts
            </Link>
          </li>
          <li>
            <Link href="/apropos" className={pathname === '/apropos' ? 'active' : ''}>
              À propos
            </Link>
          </li>

          {user ? (
            <>
              {(() => {
                const isSellerApproved = 
                  profile?.seller_status === 'approved' || 
                  (profile && (profile.shop_name || profile.phone));
                
                if (isSellerApproved) {
                  return (
                    <>
                      <li>
                        <Link href="/dashboard?tab=seller-area" className="mobile-nav-dashboard">
                          <Store width="16" height="16" />
                          <span>Espace Vendeur</span>
                        </Link>
                      </li>
                      <li>
                        <Link href="/dashboard?tab=orders" className="mobile-nav-dashboard">
                          <QrCode width="16" height="16" />
                          <span>Commandes Reçues</span>
                        </Link>
                      </li>
                      <li>
                        <Link href="/dashboard?tab=wallet" className="mobile-nav-dashboard">
                          <Wallet width="16" height="16" />
                          <span>Mon Portefeuille</span>
                        </Link>
                      </li>
                      <li>
                        <Link href="/dashboard?tab=stats" className="mobile-nav-dashboard">
                          <TrendingUp width="16" height="16" />
                          <span>Statistiques & Métriques</span>
                        </Link>
                      </li>
                      {!profile?.is_verified && (
                        <li>
                          <Link href="/dashboard?tab=seller-application" className="mobile-nav-dashboard">
                            <ShieldCheck width="16" height="16" style={{ color: '#3b82f6' }} />
                            <span>Certifier ma boutique</span>
                          </Link>
                        </li>
                      )}
                      <li>
                        <Link href={`/vendeur/${profile?.id || user?.sub || user?.user_id || user?.uid || ''}`} className="mobile-nav-dashboard">
                          <User width="16" height="16" />
                          <span>Mon Profil / Boutique</span>
                        </Link>
                      </li>
                    </>
                  );
                } else {
                  return (
                    <>
                      <li>
                        <Link href="/dashboard?tab=seller-application" className="mobile-nav-dashboard">
                          <Store width="16" height="16" />
                          <span>Devenir Vendeur</span>
                        </Link>
                      </li>
                      <li>
                        <Link href={`/vendeur/${profile?.id || user?.sub || user?.user_id || user?.uid || ''}`} className="mobile-nav-dashboard">
                          <User width="16" height="16" />
                          <span>Mon Profil</span>
                        </Link>
                      </li>
                    </>
                  );
                }
              })()}
              <li>
                <Link href="/messagerie" className="mobile-nav-dashboard" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare width="16" height="16" />
                    <span>Messagerie (Chat)</span>
                  </span>
                  {unreadCount > 0 && (
                    <span style={{ background: 'var(--primary-blue)', color: '#fff', borderRadius: '10px', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </li>
              <li className="mobile-nav-logout">
                <button onClick={logout}>
                  <LogOut width="16" height="16" />
                  <span>Quitter</span>
                </button>
              </li>
            </>
          ) : (
            <li className="mobile-nav-login">
              <Link href="/connexion">
                <LogIn width="16" height="16" />
                <span>Se connecter</span>
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
