// client/src/components/Header/index.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { getApiBaseUrl, fetchWithTimeout } from '../../core/api';
import { buildApiQuery } from '../../core/fuzzySearch';
import { COUNTRIES } from '../../app/dashboard/constants';

import DesktopHeader from './DesktopHeader';
import MobileHeader from './MobileHeader';
import MobileTabbar from './MobileTabbar';
import { Camera } from 'lucide-react';
import './Header.css';

function getFlagEmoji(countryCode) {
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch (_) {
    return '🇨🇲';
  }
}

function getCountryName(countryCode) {
  try {
    const regionNames = new Intl.DisplayNames(['fr'], { type: 'region' });
    return regionNames.of(countryCode.toUpperCase());
  } catch (e) {
    return countryCode;
  }
}

export default function Header() {
  const { user, profile, logout, authFetch } = useAuth();
  const { setCartOpen, totalItems } = useCart();
  const { favorites } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const currentUserId = user?.id || user?.sub || user?.uid || user?.user_id;

  // Keep-alive : réveille le backend Render (plan gratuit) dès le montage
  // pour éviter le cold start quand l'utilisateur navigue
  useEffect(() => {
    const base = getApiBaseUrl();
    // Ping discret, on ignore la réponse
    fetch(`${base}/api/products?page=0&limit=1`, { method: 'GET' }).catch(() => {});
  }, []);

  // Poll unread messages count periodically
  useEffect(() => {
    if (!user || !currentUserId) {
      setUnreadCount(0);
      return;
    }

    const loadUnreadCount = async () => {
      // Ne pas poller si l'onglet est en arrière-plan (économie réseau)
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const res = await authFetch('/api/messages');
        if (res.ok) {
          const data = await res.json();
          const msgList = data || [];
          const count = msgList.filter(
            (msg) => msg.receiver_id === currentUserId && !msg.read_status
          ).length;
          setUnreadCount(count);
        }
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
    };

    // Délai initial de 5s avant le premier poll (laisse la page se charger d'abord)
    const initialTimeout = setTimeout(loadUnreadCount, 5000);
    // Intervalle réduit à 30s (était 8s) pour limiter les requêtes réseau
    const interval = setInterval(loadUnreadCount, 30000);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user, currentUserId, authFetch]);

  const [searchVal, setSearchVal] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSearchTab, setActiveSearchTab] = useState('products'); // 'products', 'sellers', 'global', 'ai'
  const [urlParams, setUrlParams] = useState({ filter: '', sort: '', custom: '' });
  const [deliveryCountry, setDeliveryCountry] = useState({
    code: 'CM',
    name: 'Cameroun',
    flag: '🇨🇲'
  });
  const suggestionTimer = useRef(null);

  // Image search states & handlers
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageSearchClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    
    // Simuler le traitement d'image avec délai de 1.8s
    setTimeout(() => {
      setIsScanning(false);
      const filename = file.name.toLowerCase();
      
      const keywords = [
        'iphone', 'samsung', 'robe', 'chaussure', 'nike', 'ordinateur', 'dell',
        'canape', 'climatiseur', 'generateur', 'sac', 'television', 'moto', 'vetement'
      ];
      
      let found = 'produits';
      for (const kw of keywords) {
        if (filename.includes(kw)) {
          found = kw;
          break;
        }
      }
      
      // Rediriger vers la boutique
      router.push(`/boutique?q=${encodeURIComponent(found)}&_raw=${encodeURIComponent(found)}&imageSearch=true`);
    }, 1800);
  };

  // Detect country location by IP with localStorage caching
  useEffect(() => {
    try {
      const cached = localStorage.getItem('vc_delivery_country');
      if (cached) {
        setDeliveryCountry(JSON.parse(cached));
        return;
      }
    } catch (_) {}

    const detectCountry = async () => {
      try {
        const base = getApiBaseUrl();
        const res = await fetchWithTimeout(`${base}/api/geolocation`, {}, 5000);
        if (res.ok) {
          const data = await res.json();
          if (data.code) {
            const code = data.code.toUpperCase();
            // Retrouver si possible les informations du pays dans la liste COUNTRIES
            const matched = COUNTRIES.find(c => c.code === code);
            const countryInfo = matched 
              ? { code: matched.code, name: matched.name, flag: matched.flag }
              : { code, name: data.name || getCountryName(code) || 'Cameroun', flag: getFlagEmoji(code) };
            
            setDeliveryCountry(countryInfo);
            try {
              localStorage.setItem('vc_delivery_country', JSON.stringify(countryInfo));
            } catch (_) {}
            return;
          }
        }
      } catch (err) {
        console.error('IP Geolocation failed:', err);
      }
    };

    detectCountry();
  }, []);

  const handleCountryChange = (countryInfo) => {
    setDeliveryCountry(countryInfo);
    try {
      localStorage.setItem('vc_delivery_country', JSON.stringify(countryInfo));
    } catch (_) {}
  };

  // Sync URL parameters on mount and when pathname change (avoiding next.js suspense bails)
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      setUrlParams({
        filter: params.get('filter') || '',
        sort: params.get('sort') || '',
        custom: params.get('custom') || ''
      });
    };
    
    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [pathname]);

  useEffect(() => {
    if (urlParams.filter) {
      setActiveSearchTab(urlParams.filter);
    } else {
      setActiveSearchTab('products');
    }
  }, [urlParams.filter]);

  const handleTabClick = (tabKey) => {
    setActiveSearchTab(tabKey);
    const queryParam = searchVal.trim() ? `q=${encodeURIComponent(searchVal.trim())}&` : '';
    router.push(`/boutique?${queryParam}filter=${tabKey}`);
  };

  // PWA Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      alert("Pour installer l'application sur iOS : ouvrez cette page dans Safari, appuyez sur le bouton de partage et sélectionnez 'Sur l'écran d'accueil'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Close Mobile Menu on navigation
  useEffect(() => {
    setMenuOpen(false);
    document.body.style.overflow = '';
  }, [pathname]);

  const toggleMenu = () => {
    setMenuOpen((prev) => {
      const next = !prev;
      document.body.style.overflow = next ? 'hidden' : '';
      return next;
    });
  };

  // Search Autocomplete Suggestion Logic
  useEffect(() => {
    if (suggestionTimer.current) {
      clearTimeout(suggestionTimer.current);
    }

    const query = searchVal.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    suggestionTimer.current = setTimeout(async () => {
      try {
        const base = getApiBaseUrl();
        // Construit une requête enrichie : stopwords retirés, synonymes ajoutés
        const apiQuery = buildApiQuery(query);
        const targetUrl = `${base}/api/products?page=0&limit=5&q=${encodeURIComponent(apiQuery)}`;
        const res = await fetchWithTimeout(targetUrl, {}, 8000);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.products || []);
        }
      } catch (e) {
        console.error('Error loading search suggestions:', e);
      }
    }, 350);

    return () => {
      if (suggestionTimer.current) {
        clearTimeout(suggestionTimer.current);
      }
    };
  }, [searchVal]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const raw = searchVal.trim();
    if (raw) {
      try {
        const searches = JSON.parse(localStorage.getItem('vendoscity_user_searches') || '[]');
        const updated = [raw, ...searches.filter(s => s !== raw)].slice(0, 10);
        localStorage.setItem('vendoscity_user_searches', JSON.stringify(updated));
      } catch (_) {}

      // Requête enrichie : nettoyée des stopwords et augmentée de synonymes
      const apiQuery = buildApiQuery(raw);
      const filterParam = activeSearchTab && activeSearchTab !== 'products' ? `&filter=${activeSearchTab}` : '';
      router.push(`/boutique?q=${encodeURIComponent(apiQuery)}&_raw=${encodeURIComponent(raw)}${filterParam}`);
      setShowSuggestions(false);
    }
  };

  const [scrollDir, setScrollDir] = useState('up');
  const [scrollY, setScrollY] = useState(0);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Determine scroll direction
      if (currentScrollY > lastScrollY.current && currentScrollY > 10) {
        setScrollDir('down');
      } else if (currentScrollY < lastScrollY.current) {
        setScrollDir('up');
      }
      
      setScrollY(currentScrollY);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isMessagerie = pathname === '/messagerie';
  const showSearchRow = pathname === '/' || pathname === '/boutique';

  const isStickyDesktop = scrollY > 15;
  const isStickyMobile = scrollY > 120 && scrollDir === 'up';
  const isHiddenMobile = scrollY > 120 && scrollDir === 'down';

  let headerClass = 'alibaba-global-header';
  if (!showSearchRow) {
    headerClass += ' hide-on-mobile';
  }
  if (isStickyDesktop) {
    headerClass += ' is-sticky-desktop';
  }
  if (isStickyMobile) {
    headerClass += ' is-sticky-mobile';
  }
  if (isHiddenMobile) {
    headerClass += ' is-hidden-mobile';
  }

  return (
    <>
      {!isMessagerie && (
        <header className={headerClass}>
          <div className="alibaba-header-bg"></div>
          {/* 🖥️ DESKTOP HEADER */}
          <DesktopHeader
            user={user}
            profile={profile}
            logout={logout}
            setCartOpen={setCartOpen}
            totalItems={totalItems}
            favorites={favorites}
            pathname={pathname}
            searchVal={searchVal}
            setSearchVal={setSearchVal}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            activeSearchTab={activeSearchTab}
            handleTabClick={handleTabClick}
            handleSearchSubmit={handleSearchSubmit}
            showSearchRow={showSearchRow}
            deliveryCountry={deliveryCountry}
            handleImageSearchClick={handleImageSearchClick}
            unreadCount={unreadCount}
            onCountryChange={handleCountryChange}
            countries={COUNTRIES}
          />

          {/* 📱 MOBILE HEADER */}
          <MobileHeader
            user={user}
            profile={profile}
            logout={logout}
            setCartOpen={setCartOpen}
            totalItems={totalItems}
            favorites={favorites}
            pathname={pathname}
            router={router}
            searchVal={searchVal}
            setSearchVal={setSearchVal}
            activeSearchTab={activeSearchTab}
            urlParams={urlParams}
            menuOpen={menuOpen}
            toggleMenu={toggleMenu}
            handleTabClick={handleTabClick}
            handleSearchSubmit={handleSearchSubmit}
            showSearchRow={showSearchRow}
            handleImageSearchClick={handleImageSearchClick}
            unreadCount={unreadCount}
          />
        </header>
      )}

      {/* 📱 MOBILE BOTTOM TABBAR */}
      {!isMessagerie && (
        <MobileTabbar
          pathname={pathname}
          user={user}
          profile={profile}
          setCartOpen={setCartOpen}
          totalItems={totalItems}
          unreadCount={unreadCount}
        />
      )}

      {/* Hidden file input for Image Search */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Modern Scanning overlay modal */}
      {isScanning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'inherit'
        }}>
          <div style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            border: '2px dashed var(--color-yellow)',
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: '24px',
            boxShadow: '0 0 25px rgba(255, 106, 0, 0.3)'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.03)'
            }}>
              <Camera width="48" height="48" style={{ color: 'var(--color-yellow)', animation: 'pulse 1s infinite' }} />
            </div>
            {/* Laser scan line effect */}
            <div style={{
              position: 'absolute',
              left: 0,
              width: '100%',
              height: '3px',
              background: 'linear-gradient(90deg, transparent, #ff6a00, transparent)',
              boxShadow: '0 0 10px #ff6a00',
              animation: 'scanLaser 1.8s infinite linear',
              top: 0
            }}></div>
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.3px' }}>Analyse de l&apos;Image</h3>
          <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>Scannage des caractéristiques visuelles...</p>
          <style>{`
            @keyframes scanLaser {
              0% { top: 0%; }
              50% { top: 100%; }
              100% { top: 0%; }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.4; transform: scale(0.93); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
