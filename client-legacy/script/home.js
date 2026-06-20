/* Home shelves: make the boutique visible from the first screen without rewriting the frontend. */
(function initHome() {
  function $(id) { return document.getElementById(id); }

  const API = (typeof API_BASE_URL === 'string' ? API_BASE_URL : '').trim()
    ? `${API_BASE_URL}/api`
    : '/api';

  const DEFAULT_IMG = '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png';

  function wireHeroTitleRotation() {
    const el = $('hero-title');
    if (!el) return;

    // Keep a stable default in the HTML for SEO/No-JS.
    const base = String(el.textContent || '').trim() || 'Vendoscity';

    const messages = [
      base,
      'Vendoscity - Achetez et vendez pres de chez vous',
      'Vendoscity - Des offres locales, simple et rapide',
      'Vendoscity - Contact direct, sans prise de tete',
      'Vendoscity - Publiez un article en 1 minute'
    ];

    // Avoid double wiring if the script is re-executed.
    if (el.dataset.vcRotateBound === '1') return;
    el.dataset.vcRotateBound = '1';

    // Small transition (no external CSS dependency).
    const style = document.createElement('style');
    style.textContent = `
      #hero-title.vc-rotate {
        transition: opacity 160ms ease, transform 160ms ease;
        will-change: opacity, transform;
      }
      #hero-title.vc-rotate.is-out {
        opacity: 0;
        transform: translateY(-2px);
      }
    `;
    document.head.appendChild(style);

    el.classList.add('vc-rotate');

    let idx = 0;
    window.setInterval(() => {
      idx = (idx + 1) % messages.length;
      el.classList.add('is-out');
      window.setTimeout(() => {
        el.textContent = messages[idx];
        el.classList.remove('is-out');
      }, 170);
    }, 4000);
  }

  const CATEGORIES = [
    { key: 'electronique', label: 'Electronique', icon: 'smartphone' },
    { key: 'informatique', label: 'Informatique', icon: 'laptop' },
    { key: 'vetements', label: 'Vetements', icon: 'shirt' },
    { key: 'beaute', label: 'Beaute', icon: 'sparkles' },
    { key: 'maison', label: 'Maison & Deco', icon: 'home' },
    { key: 'cuisine', label: 'Cuisine', icon: 'utensils' },
    { key: 'bebe-enfants', label: 'Bebe & Enfants', icon: 'baby' },
    { key: 'sante', label: 'Sante', icon: 'heart-pulse' },
    { key: 'animaux', label: 'Animaux', icon: 'paw-print' },
    { key: 'jardin', label: 'Jardin', icon: 'sprout' },
    { key: 'jeux', label: 'Jeux', icon: 'gamepad-2' },
    { key: 'musique', label: 'Musique', icon: 'headphones' },
    { key: 'vehicules', label: 'Vehicules', icon: 'car' },
    { key: 'immobilier', label: 'Immobilier', icon: 'home' },
    { key: 'services', label: 'Services', icon: 'wrench' },
    { key: 'sports', label: 'Sports', icon: 'dumbbell' },
    { key: 'livres', label: 'Livres', icon: 'book' },
    { key: 'emploi', label: 'Emploi', icon: 'briefcase' },
    { key: 'autres', label: 'Autres', icon: 'sparkles' }
  ];

  function escapeHtml(s) {
    return String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function normalizeSupabaseImageUrl(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (s.includes('raw.githubusercontent.com')) return '';
    try {
      if (s.includes('/storage/v1/render/image/public/')) {
        const u = new URL(s);
        u.pathname = u.pathname.replace('/storage/v1/render/image/public/', '/storage/v1/object/public/');
        u.searchParams.delete('width');
        u.searchParams.delete('quality');
        return u.toString();
      }
      if (s.includes('/storage/v1/render/image/sign/')) {
        const u = new URL(s);
        u.pathname = u.pathname.replace('/storage/v1/render/image/sign/', '/storage/v1/object/sign/');
        return u.toString();
      }
    } catch (_) { /* ignore */ }
    return s;
  }

  function pickImage(p) {
    const imgs = Array.isArray(p?.images) ? p.images.filter(Boolean) : [];
    const url = imgs[0] || p?.image_url || p?.image || '';
    return normalizeSupabaseImageUrl(url) || DEFAULT_IMG;
  }

  function productCard(p) {
    const id = encodeURIComponent(p?.id || '');
    const href = `/pages/Product-Detail.html?id=${id}`;
    const img = pickImage(p);
    const title = escapeHtml(p?.title || 'Produit');
    const price = Math.round(Number(p?.price) || 0).toLocaleString('fr-FR');
    const rating = Number(p?.rating) || 0;
    const reviews = Number(p?.reviews ?? p?.reviews_count ?? p?.review_count ?? p?.reviewsCount) || 0;
    const ratingLabel = reviews > 0 ? rating.toFixed(1) : 'Nouveau';
    const quartier = String(p?.quartier || p?.district || p?.location || '').trim();
    const locLabel = quartier;
    const countLabel = reviews > 0 ? `(${reviews})` : '';

// Nom de la boutique tout en haut
    const sellerRaw = p?.seller?.shop_name || p?.seller?.first_name || p?.shop_name || p?.seller_name || '';
    const sellerName = String((typeof sellerRaw === 'object' ? '' : sellerRaw) || 'Boutique').trim();
    const esc = window.escapeHTML || ((s) => s);
    const productPrice = Number(p?.price) || 0;
    const productOldPrice = Number(p?.old_price) || 0;

    const discountBadge = (productOldPrice > 0 && productOldPrice > productPrice)
      ? `<div class="product-badge-discount">-${Math.round(((productOldPrice - productPrice) / productOldPrice) * 100)}%</div>`
      : '';

    return `
      <article class="product-card" role="article">
        <div class="product-media">
          ${discountBadge}
          <a href="${href}" class="product-link" aria-label="Voir ${title}">
            <img src="${esc(img)}" alt="${title}" class="product-image vc-skeleton" loading="lazy" decoding="async" onload="this.classList.add('vc-loaded')">
          </a>
        </div>
        <div class="product-info">
          <div class="product-card-shop" style="display:flex; align-items:center;">
             <a href="./pages/Vendeur.html?id=${escapeHtml(p.seller_id)}" style="display:inline-flex; align-items:center; gap:5px; color:inherit; text-decoration:none;"><i data-lucide="store"></i><span>${esc(sellerName)}</span></a>
             <button type="button" class="btn-share-shop-mini pressable" data-seller-id="${escapeHtml(p.seller_id)}" data-shop-name="${escapeHtml(sellerName)}" aria-label="Partager la boutique" title="Partager la boutique" style="background:none; border:none; padding:0; cursor:pointer; margin-left:auto; color:var(--primary-blue);"><i data-lucide="share-2" width="14" height="14"></i></button>
          </div>
          <h3 class="product-title product-title-compact"><a href="${href}">${title}</a></h3>
          ${p.description ? `<div class="product-card-desc-snippet">${(window.formatVendoscityText || (t => t))(p.description)}</div>` : ''}
          <div class="product-loc-price-row">
            ${locLabel ? `<div class="product-loc-mini">${escapeHtml(locLabel)}</div>` : ''}
            <div class="product-price product-price-mini">
              ${productOldPrice > productPrice ? `<span class="product-price-old">${Math.round(productOldPrice).toLocaleString('fr-FR')}</span>` : ''}
              <span>${price} FCFA</span>
            </div>
          </div>
          <div class="product-meta-row">
            <div class="product-rating-mini" aria-label="Note globale">
              <span class="star">★</span>
              <span>${ratingLabel}</span>
              ${countLabel ? `<span class="count">${escapeHtml(countLabel)}</span>` : ''}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function skeletonCard() {
    return `
      <article class="product-card skeleton-loading" role="presentation">
        <div class="product-media vc-skeleton"></div>
        <div class="product-info">
          <div class="vc-skeleton-text long"></div>
          <div class="product-loc-price-row">
            <div class="vc-skeleton-text short"></div>
            <div class="vc-skeleton-text short"></div>
          </div>
          <div class="product-meta-row">
            <div class="vc-skeleton-text medium"></div>
          </div>
        </div>
      </article>
    `;
  }

  function renderSkeletons(grid, count = 4) {
    if (!grid) return;
    grid.innerHTML = Array(count).fill(skeletonCard()).join('');
  }

  function buildCategoryTiles() {
    const grid = $('home-category-grid');
    if (!grid) return;
    grid.innerHTML = CATEGORIES.map((c) => {
      const href = `/pages/Boutique.html?category=${encodeURIComponent(c.key)}`;
      return `
        <a class="home-category-tile" href="${href}" aria-label="Voir la categorie ${escapeHtml(c.label)}">
          <span class="home-category-ico"><i data-lucide="${escapeHtml(c.icon)}"></i></span>
          <span class="home-category-label">${escapeHtml(c.label)}</span>
        </a>
      `;
    }).join('');
    grid.querySelectorAll('a.home-category-tile').forEach((el) => el.classList.add('pressable'));
    if (window.lucide) lucide.createIcons();
  }

  function wireHeroSearch() {
    const form = $('home-search-form');
    const input = $('home-search-input');
    if (!form || !input) return;

    // Modern rotating hint (smooth fade/slide). Pauses while typing/focus.
    (function rotateSearchHint() {
      const messages = [
        "Rechercher: téléphone, robe, voiture...",
        'Essayez: TV 55", iPhone, PS5...',
        "Essayez: terrain, studio, maison...",
        "Essayez: coiffure, plombier, designer...",
        "Tapez un quartier: Omnisports, Bastos..."
      ];

      form.classList.add('vc-search-wrap');
      input.setAttribute('placeholder', '');

      const hint = document.createElement('span');
      hint.className = 'vc-search-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = messages[0];
      form.appendChild(hint);

      function placeHint() {
        try {
          const c = form.getBoundingClientRect();
          const r = input.getBoundingClientRect();
          const left = Math.round((r.left - c.left) + 14);
          const top = Math.round((r.top - c.top) + (r.height / 2));
          const maxw = Math.max(120, Math.round(r.width - 28));
          form.style.setProperty('--hint-left', `${left}px`);
          form.style.setProperty('--hint-top', `${top}px`);
          form.style.setProperty('--hint-maxw', `${maxw}px`);
        } catch (_) {
          // ignore
        }
      }

      function syncVisibility() {
        const hasValue = String(input.value || '').trim().length > 0;
        const hasFocus = document.activeElement === input;
        hint.classList.toggle('is-hidden', hasValue || hasFocus);
      }

      let idx = 0;
      function animateTo(nextText) {
        hint.classList.remove('is-out');
        // Fade out
        hint.classList.add('is-out');
        window.setTimeout(() => {
          hint.textContent = nextText;
          hint.classList.remove('is-out');
        }, 140);
      }

      const tick = () => {
        const hasValue = String(input.value || '').trim().length > 0;
        const hasFocus = document.activeElement === input;
        if (hasValue || hasFocus) return;
        idx = (idx + 1) % messages.length;
        animateTo(messages[idx]);
      };

      placeHint();
      syncVisibility();

      window.addEventListener('resize', placeHint);
      window.addEventListener('scroll', placeHint, { passive: true });
      input.addEventListener('focus', syncVisibility);
      input.addEventListener('blur', syncVisibility);
      input.addEventListener('input', syncVisibility);

      window.setInterval(() => {
        placeHint();
        syncVisibility();
        tick();
      }, 4000);
    })();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = String(input.value || '').trim();
      const url = new URL('/pages/Boutique.html', window.location.href);
      if (q) url.searchParams.set('q', q);
      window.location.href = url.toString();
    });
  }

  async function loadShelves() {
    const newGrid = $('home-new-grid');
    const trendingGrid = $('home-trending-grid');
    if (!newGrid || !trendingGrid) return;

    const CACHE_KEY = 'vc_home_products_cache_v2';
    
    // 1. Essayer de charger depuis le cache local pour un affichage instantané
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        const age = Date.now() - (Number(data?.timestamp) || 0);
        const isFresh = age < (1000 * 60 * 30); // 30 minutes
        
        if (isFresh && data && data.newest) {
          renderProducts(data.newest, data.trending || []);
        } else {
          renderSkeletons(newGrid, 4);
          renderSkeletons(trendingGrid, 4);
        }
      } else {
        // Pas de cache ? Afficher les squelettes
        renderSkeletons(newGrid, 4);
        renderSkeletons(trendingGrid, 4);
      }
    } catch (_) {
      renderSkeletons(newGrid, 4);
      renderSkeletons(trendingGrid, 4);
    }

    function getGridCols(gridEl) {
      if (!gridEl) return 2;
      try {
        const computed = window.getComputedStyle(gridEl);
        const colsStr = computed.getPropertyValue('grid-template-columns');
        const count = colsStr.split(' ').filter(c => c.trim().length > 0).length;
        return count >= 1 ? count : 2;
      } catch (e) {
        return 2;
      }
    }

    let globalNewest = [];
    let globalTrending = [];

    function renderProducts(newestData, trendingData) {
      globalNewest = newestData || [];
      globalTrending = trendingData || [];
      
      const newCols = getGridCols(newGrid);
      const newCount = newCols * (Math.floor(8 / newCols) || 1);
      const newestToRender = globalNewest.slice(0, Math.max(newCols, newCount));

      const trendingCols = getGridCols(trendingGrid);
      const trendingCount = trendingCols * (Math.floor(12 / trendingCols) || 1);
      const trendingToRender = globalTrending.slice(0, Math.max(trendingCols, trendingCount));

      newGrid.innerHTML = newestToRender.length
        ? newestToRender.map(productCard).join('')
        : '<div class="loading">Aucun produit pour le moment.</div>';

      trendingGrid.innerHTML = trendingToRender.length
        ? trendingToRender.map(productCard).join('')
        : '<div class="loading">Aucun produit pour le moment.</div>';

      const applyReveals = (root) => {
        if (!root || !window.VendoscityMotion) return;
        const { markReveal, revealWithin } = window.VendoscityMotion;
        if (typeof markReveal !== 'function' || typeof revealWithin !== 'function') return;
        let idx = 0;
        root.querySelectorAll('.product-card').forEach((el) => {
          markReveal(el, Math.min(260, idx * 35));
          idx += 1;
        });
        revealWithin(root);
      };
      applyReveals(newGrid);
      applyReveals(trendingGrid);
    }

    // Réagir au changement de taille d'écran pour éviter les éléments seuls sur une ligne
    window.addEventListener('resize', () => {
      if (globalNewest.length === 0) return;
      clearTimeout(window._vcHomeResizeTimer);
      window._vcHomeResizeTimer = setTimeout(() => {
        renderProducts(globalNewest, globalTrending);
      }, 200);
    });

    const netFetch = (window.VendoscityNet && typeof window.VendoscityNet.fetch === 'function')
      ? window.VendoscityNet.fetch
      : async (u, o) => fetch(u, o);

    try {
      const pNewest = netFetch(`${API}/products?page=0&limit=12&sort=recent`, {}, 15000)
        .then(res => res.ok ? res.json() : null).then(j => j?.products || []);

      const pTrending = netFetch(`${API}/products?page=0&limit=12&sort=recommended`, {}, 15000)
        .then(res => res.ok ? res.json() : null).then(j => j?.products || []);

      const [newestData, trendingData] = await Promise.all([pNewest, pTrending]);

      if (newestData.length > 0 || trendingData.length > 0) {
        // 2. Mettre à jour le cache et rafraîchir l'UI
        const cacheObj = { 
          newest: newestData, 
          trending: trendingData,
          timestamp: Date.now() 
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObj));
        renderProducts(newestData, trendingData);
      }
    } catch (e) {
      console.error(e);
      // Si le cache est vide et que le réseau échoue, montrer l'erreur
      if (!localStorage.getItem(CACHE_KEY)) {
        newGrid.innerHTML = '<div class="loading">Impossible de charger les nouveautés.</div>';
        trendingGrid.innerHTML = '<div class="loading">Impossible de charger les tendances.</div>';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireHeroTitleRotation();
    wireHeroSearch();
    buildCategoryTiles();
    loadShelves();
  });
})();
