// client/src/components/Header/DesktopHeader.js
import React from 'react';
import Link from 'next/link';
import { useTypingPlaceholder, getPersonalizedPhrases } from '../../hooks/useTypingPlaceholder';
import { getUserAvatarUrl } from '../../core/api';

// Exemples de recherche rotatifs — proportionnels à la durée d'affichage
const SEARCH_PHRASES = [
  'iPhone 15 Pro Max 256 Go...',
  'Robe de soirée tendance Yaoundé...',
  'Ordinateur portable Dell Core i7...',
  'Chaussures Nike Air Jordan neuves...',
  'Canapé 3 places cuir marron...',
  'Climatiseur Samsung 1.5 chevaux...',
  'Generateur electrique 3000W...',
  'Sac à main Louis Vuitton original...',
  'Télévision 55 pouces 4K UHD...',
  'Moto Yamaha YZF R15 2024...',
];
import { 
  ChevronDown, 
  Globe, 
  Heart, 
  ShoppingCart, 
  User, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  ShieldCheck, 
  Camera, 
  Search, 
  Store, 
  Award, 
  Star,
  MessageSquare,
  QrCode,
  Wallet,
  TrendingUp,
  Video
} from 'lucide-react';
import { CATEGORIES } from './constants';
import Sparkles from '../Sparkles';

export default function DesktopHeader({
  user,
  profile,
  logout,
  setCartOpen,
  totalItems,
  favorites,
  pathname,
  searchVal,
  setSearchVal,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  activeSearchTab,
  handleTabClick,
  handleSearchSubmit,
  showSearchRow,
  deliveryCountry,
  handleImageSearchClick,
  unreadCount,
  onCountryChange,
  countries = []
}) {
  // Placeholder animé — personnalisé selon le parcours de l'utilisateur
  const [phrases, setPhrases] = React.useState(SEARCH_PHRASES);
  React.useEffect(() => {
    setPhrases(getPersonalizedPhrases(SEARCH_PHRASES));
  }, []);

  const animatedPlaceholder = useTypingPlaceholder(
    phrases,
    75,   // vitesse de frappe ms/lettre
    35,   // vitesse d'effacement ms/lettre
    2400, // pause après phrase complète
    searchVal.length > 0 // pause si l'user est en train de taper
  );
  return (
    <div className="alibaba-header-desktop">
      {/* ROW 1: Logo & Actions Tools */}
      <div className="alibaba-top-row">
        <Link href="/" className="logo-brand" aria-label="Vendoscity - Accueil">
          <span className="logo-brand-main">Vendoscity</span>
          <span className="logo-brand-dotcom">.com</span>
        </Link>

        {/* Compact search bar (only visible when sticky on desktop) */}
        {showSearchRow && (
          <form onSubmit={handleSearchSubmit} className="alibaba-search-box-form desktop-sticky-search-form">
            <div className="search-image-btn" onClick={handleImageSearchClick} style={{ cursor: 'pointer', padding: '0 10px', display: 'flex', alignItems: 'center' }}>
              <Camera width="16" height="16" className="camera-icon" style={{ marginRight: 0 }} />
            </div>
            <div className="search-input-field-wrap">
              <input
                type="text"
                placeholder={animatedPlaceholder || 'Rechercher un produit...'}
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="alibaba-search-autocomplete-list">
                  {suggestions.map((p) => (
                    <li key={p.id}>
                      <Link href={`/product/${p.id}`} onClick={() => setShowSuggestions(false)}>
                        <span className="suggestion-title">{p.title}</span>
                        <span className="suggestion-price">{p.price.toLocaleString('fr-FR')} FCFA</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="submit" className="btn-alibaba-search-submit" style={{ height: '34px', padding: '0 14px' }}>
              <Search width="14" height="14" />
            </button>
          </form>
        )}

        <div className="top-row-tools">
          {/* Delivery address dropdown */}
          <div className="tool-dropdown-trigger delivery-address-tool">
            <span className="tool-label">Adresse de livraison :</span>
            <span className="tool-value">
              <span className="flag-icon">{deliveryCountry.flag}</span> {deliveryCountry.name && deliveryCountry.name.length > 20 ? deliveryCountry.name.substring(0, 18) + '...' : (deliveryCountry.name || deliveryCountry.code)} <ChevronDown width="10" height="10" className="chevron-icon" />
            </span>
            <div className="tool-dropdown-menu" style={{
              minWidth: '220px',
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              padding: '8px'
            }}>
              <p className="menu-title" style={{ margin: '0 0 6px 4px', fontSize: '11px', fontWeight: '800', color: '#111' }}>
                Région de livraison
              </p>
              {countries.map(c => {
                const isActive = c.code === deliveryCountry.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    className={`menu-item ${isActive ? 'active' : ''}`}
                    onClick={() => onCountryChange && onCountryChange({ code: c.code, name: c.name, flag: c.flag })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      border: 'none',
                      background: 'none',
                      textAlign: 'left',
                      width: '100%',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem', lineHeight: '1' }}>{c.flag}</span>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                    <span style={{ fontSize: '10px', opacity: 0.6 }}>{c.code}</span>
                  </button>
                );
              })}
              <hr className="menu-divider" style={{ margin: '6px 0' }} />
              <p className="menu-desc" style={{ fontSize: '11px', color: '#777', margin: 0, padding: '0 4px', lineHeight: '1.3' }}>
                Livraison locale et suivi des commandes sur Vendoscity.
              </p>
            </div>
          </div>

          {/* Language & Currency dropdown */}
          <div className="tool-dropdown-trigger lang-currency-tool">
            <Globe width="16" height="16" className="tool-icon" />
            <span className="tool-value">
              Français-XAF <ChevronDown width="10" height="10" className="chevron-icon" />
            </span>
            <div className="tool-dropdown-menu">
              <p className="menu-title">Langue & Devise</p>
              <div className="menu-item active">Français (FR)</div>
              <div className="menu-item">English (EN)</div>
              <hr className="menu-divider" />
              <div className="menu-item active">Franc CFA (XAF)</div>
            </div>
          </div>

          {/* Google Translate Widget container */}
          <div id="google_translate_element" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '10px' }}></div>

          {/* Favorites Icon */}
          <Link href="/favorites" className="tool-link-favorites" title="Voir mes favoris">
            <Heart width="18" height="18" />
            {favorites.length > 0 && <span className="badge-count">{favorites.length}</span>}
          </Link>

          {/* Shopping Cart */}
          <Link href="/panier" className="tool-link-cart" title="Ouvrir le panier" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="cart-wrapper">
              <ShoppingCart width="18" height="18" />
              {totalItems > 0 && <span className="badge-count">{totalItems}</span>}
            </div>
          </Link>

          {/* User Account / Connect / Register */}
          {user ? (
            <div className="tool-dropdown-trigger user-account-tool">
              {profile ? (
                <img 
                  src={getUserAvatarUrl(profile?.avatar_url, profile?.shop_name || 'V')} 
                  alt="" 
                  style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', marginRight: '6px' }}
                />
              ) : (
                <User width="16" height="16" className="tool-icon" />
              )}
              <span className="tool-value">
                {profile?.shop_name || user.shop_name || 'Mon Espace'} <ChevronDown width="10" height="10" className="chevron-icon" />
              </span>
              <div className="tool-dropdown-menu user-menu-dropdown">
                <div className="user-profile-summary">
                  <strong>{profile?.shop_name || user.shop_name || 'Boutique'}</strong>
                  <span>{profile?.email || user.email}</span>
                </div>
                <hr className="menu-divider" />
                {(() => {
                  const isSellerApproved = 
                    profile?.seller_status === 'approved' || 
                    (profile && (profile.shop_name || profile.phone));
                  
                  if (isSellerApproved) {
                    return (
                      <>
                        <Link href="/dashboard?tab=seller-area" className="menu-link-action">
                          <Store width="14" height="14" /> Espace Vendeur
                        </Link>
                        <Link href="/dashboard?tab=orders" className="menu-link-action">
                          <QrCode width="14" height="14" /> Commandes Reçues
                        </Link>
                        <Link href="/dashboard?tab=wallet" className="menu-link-action">
                          <Wallet width="14" height="14" /> Mon Portefeuille
                        </Link>
                        <Link href="/dashboard?tab=stats" className="menu-link-action">
                          <TrendingUp width="14" height="14" /> Statistiques & Métriques
                        </Link>
                        {!profile?.is_verified && (
                          <Link href="/dashboard?tab=seller-application" className="menu-link-action">
                            <ShieldCheck width="14" height="14" style={{ color: '#3b82f6' }} /> Certifier ma boutique
                          </Link>
                        )}
                        <Link href={`/vendeur/${profile?.id || user?.sub || user?.user_id || user?.uid || ''}`} className="menu-link-action">
                          <User width="14" height="14" /> Mon Profil / Boutique
                        </Link>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <Link href="/dashboard?tab=seller-application" className="menu-link-action">
                          <Store width="14" height="14" /> Devenir Vendeur
                        </Link>
                        <Link href={`/vendeur/${profile?.id || user?.sub || user?.user_id || user?.uid || ''}`} className="menu-link-action">
                          <User width="14" height="14" /> Mon Profil
                        </Link>
                      </>
                    );
                  }
                })()}
                <Link href="/messagerie" className="menu-link-action" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare width="14" height="14" /> Messagerie
                  </span>
                  {unreadCount > 0 && (
                    <span style={{ background: 'var(--primary-blue)', color: '#fff', borderRadius: '10px', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <button onClick={logout} className="menu-button-logout">
                  <LogOut width="14" height="14" /> Quitter
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-buttons-group">
              <div className="tool-dropdown-trigger user-guest-tool">
                <Link href="/connexion" className="btn-signin-text">
                  <User width="16" height="16" className="tool-icon" />
                  <span>Se connecter</span>
                </Link>
                <div className="tool-dropdown-menu guest-menu-dropdown">
                  <p className="welcome-text">Bienvenue sur Vendoscity !</p>
                  <Link href="/connexion" className="menu-btn-primary">Se connecter</Link>
                  <div className="signup-link-wrap">
                    Nouveau membre ? <Link href="/inscription">S&apos;inscrire ici</Link>
                  </div>
                </div>
              </div>
              <Link href="/inscription" className="btn-signup-pill">
                S&apos;inscrire
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ROW 2: Navigation & Categories */}
      <div className="alibaba-nav-bar">
        <div className="nav-bar-left">
          {/* Categories Mega Dropdown */}
          <div className="categories-dropdown-container">
            <button type="button" className="nav-categories-trigger">
              <Menu width="16" height="16" />
              <span>Toutes les catégories</span>
              <ChevronDown width="10" height="10" />
            </button>
            <div className="categories-mega-menu">
              <div className="categories-grid-nav">
                {CATEGORIES.map((cat) => (
                  <Link key={cat.key} href={`/boutique?category=${cat.key}`} className="category-menu-link">
                    {cat.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Brand primary links */}
          <Link href="/boutique" className="nav-main-link">Fabricants certifiés</Link>
          <Link href="/boutique?sort=recommended" className="nav-main-link">
            <ShieldCheck width="14" height="14" className="link-icon" /> Achat sécurisé
          </Link>
        </div>

        <div className="nav-bar-right">
          <Link href="/dashboard" className="nav-sub-link">Devenir fournisseur</Link>
          <Link href="/services" className="nav-sub-link">Services</Link>
          <Link href="/messagerie" className={`nav-sub-link ${pathname === '/messagerie' ? 'active' : ''}`} style={{ fontWeight: 'bold', color: pathname === '/messagerie' ? 'var(--primary-blue)' : '#ff6a00', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            Messagerie
            {unreadCount > 0 && (
              <span className="tabbar-badge" style={{ position: 'static', transform: 'none', background: 'var(--primary-blue)', color: '#fff', fontSize: '0.7rem', height: '16px', minWidth: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', padding: '0 4px', lineHeight: 1 }}>
                {unreadCount}
              </span>
            )}
          </Link>
          <Link href="/videos" className={`nav-sub-link ${pathname === '/videos' ? 'active' : ''}`} style={{ fontWeight: 'bold', color: pathname === '/videos' ? 'var(--primary-blue)' : '#8b5cf6', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            Vidéos
          </Link>
          <Link href="/apropos" className="nav-sub-link">À propos</Link>
          <Link href="/contacts" className="nav-sub-link">Contacts</Link>
        </div>
      </div>

      {/* ROW 3: Centered Alibaba-style search section */}
      {showSearchRow && (
        <div className="alibaba-search-row">
          <div className="alibaba-search-container">
            {/* Search Tabs */}
            <div className="search-tabs-list">
              <button 
                type="button" 
                className={`search-tab-item ${activeSearchTab === 'ai' ? 'active' : ''}`}
                onClick={() => handleTabClick('ai')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                AI Mode <Sparkles width="12" height="12" />
              </button>
              <button 
                type="button" 
                className={`search-tab-item ${activeSearchTab === 'products' ? 'active' : ''}`}
                onClick={() => handleTabClick('products')}
              >
                Produits
              </button>
              <button 
                type="button" 
                className={`search-tab-item ${activeSearchTab === 'sellers' ? 'active' : ''}`}
                onClick={() => handleTabClick('sellers')}
              >
                Fabricants <span className="tab-badge-verified">Certifiés</span>
              </button>
            </div>

            {/* Search box */}
            <form onSubmit={handleSearchSubmit} className="alibaba-search-box-form">
              <div className="search-image-btn" onClick={handleImageSearchClick} style={{ cursor: 'pointer' }}>
                <Camera width="18" height="18" className="camera-icon" />
                <span>Recherche par image</span>
              </div>
              <div className="search-input-field-wrap">
                <input
                  type="text"
                  placeholder={animatedPlaceholder || 'Rechercher un produit...'}
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="alibaba-search-autocomplete-list">
                    {suggestions.map((p) => (
                      <li key={p.id}>
                        <Link href={`/product/${p.id}`} onClick={() => setShowSuggestions(false)}>
                          <span className="suggestion-title">{p.title}</span>
                          <span className="suggestion-price">{p.price.toLocaleString('fr-FR')} FCFA</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="submit" className="btn-alibaba-search-submit">
                <Search width="16" height="16" />
                <span>Rechercher</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ROW 4: Bottom Welcome Row (Only on homepage) */}
      {pathname === '/' && (
        <div className="alibaba-welcome-row">
          <div className="welcome-left">
            <strong>Bienvenue sur Vendoscity.com</strong>
          </div>
          <div className="welcome-right">
            <Link href="/ai-mode?message=Je%20souhaite%20demander%20un%20devis%20personnalis%C3%A9%20pour%20les%20produits%20suivants%20%3A%20" className="welcome-item" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Store width="14" height="14" /> Demander un devis
            </Link>
            <Link href="/top-classement" className="welcome-item" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Award width="14" height="14" /> Top du classement
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
