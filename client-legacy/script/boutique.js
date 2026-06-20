/**
 * ============================================================
 * SCRIPT BOUTIQUE - Logique Marketplace Vendoscity
 * ============================================================
 */

class Boutique {
    constructor() {
        // Éléments HTML
        this.searchInput = document.getElementById('search-input');
        this.categorySelect = document.getElementById('category-select');
        this.sortSelect = document.getElementById('sort-select');
        this.productsGrid = document.getElementById('products-grid');
        this.filterChips = document.getElementById('vc-filter-chips');
        this.filterChipsDrawer = document.getElementById('vc-filter-chips-drawer');
        this.filterDrawer = document.getElementById('vc-filter-drawer');
        this.filterDrawerBackdrop = document.getElementById('vc-filter-drawer-backdrop');
        this.drawerCategory = document.getElementById('vc-drawer-category');
        this.drawerSort = document.getElementById('vc-drawer-sort');
        this.drawerCloseBtn = document.getElementById('vc-filter-drawer-close');
        this.drawerResetBtn = document.getElementById('vc-drawer-reset');
        this.drawerApplyBtn = document.getElementById('vc-drawer-apply');
        this.cartSidebar = document.getElementById('cart-sidebar');
        this.cartBackdrop = document.getElementById('cart-backdrop');
        this.cartFab = document.getElementById('cart-fab');
        this.cartFabCount = document.getElementById('cart-fab-count');
        this.cartItems = document.getElementById('cart-items');
        this.cartTotal = document.getElementById('cart-total');
        this.cartCount = document.getElementById('cart-count');
        this.cartBadge = document.getElementById('cart-badge');
        
        this.sentinel = document.getElementById('infinite-scroll-sentinel');
        this.infiniteLoader = document.getElementById('infinite-loader');

        this.btnCartMobile = document.querySelector('.btn-cart-mobile');
        this.btnCloseCart = document.querySelector('.btn-close-cart');
        this.btnCheckout = document.querySelector('.btn-checkout');
        this.btnContinueShopping = document.querySelector('.btn-continue-shopping');

        // DATA
        this.products = [];
        this.filteredProducts = [];
        this.cart = [];
        this.cartStorageKey = 'vendoscity_cart_v1';
        this.selectedCategory = 'all';
        this.searchTerm = '';

        // STATE
        this.isCartOpen = false;
        this.currentPage = 0;
        this.itemsPerPage = 12;
        this.hasMore = true;
        this.isLoading = false;

        this.defaultProductImage = '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png';

        this.loadCartFromStorage();
        if (window.lucide) lucide.createIcons();
    }

    clampText(raw, max) {
        const s = String(raw ?? '').trim();
        if (!s) return '';
        if (s.length <= max) return s;
        return s.slice(0, Math.max(0, max - 1)) + '…';
    }

    skeletonCard() {
        const card = document.createElement('div');
        card.className = 'product-card skeleton-loading';
        card.innerHTML = `
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
        `;
        return card;
    }

    renderSkeletons(count = 6) {
        if (!this.productsGrid) return;
        this.productsGrid.innerHTML = '';
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            fragment.appendChild(this.skeletonCard());
        }
        this.productsGrid.appendChild(fragment);
    }


    getSelectLabel(selectEl, value) {
        if (!selectEl) return '';
        const v = String(value ?? '');
        const opt = Array.from(selectEl.options || []).find(o => String(o.value) === v);
        return String(opt?.text ?? '').trim();
    }

    renderFilterChips() {
        const wrap = this.filterChips;
        if (!wrap) return;

        const chips = [];

        const qRaw = this.searchInput ? String(this.searchInput.value || '').trim() : '';
        const q = qRaw || '';
        const cat = String(this.selectedCategory || 'all');
        const sort = String(this.sortSelect?.value || 'recommended');

        if (q) {
            chips.push({
                key: 'search',
                label: `Recherche: ${this.clampText(q, 22)}`
            });
        }

        if (cat && cat !== 'all') {
            const lbl = this.getSelectLabel(this.categorySelect, cat) || cat;
            chips.push({
                key: 'category',
                label: `Categorie: ${this.clampText(lbl, 22)}`
            });
        }

        if (sort && sort !== 'recommended') {
            const lbl = this.getSelectLabel(this.sortSelect, sort) || sort;
            chips.push({
                key: 'sort',
                label: `Tri: ${this.clampText(lbl, 22)}`
            });
        }

        const hasAny = chips.length > 0;
        wrap.textContent = '';

        if (!hasAny) return;

        // Reset chip first (fast escape hatch, Temu-like)
        const reset = document.createElement('button');
        reset.type = 'button';
        reset.className = 'vc-chip is-reset pressable';
        reset.dataset.vcChip = 'reset';
        reset.setAttribute('role', 'listitem');
        reset.textContent = 'Reinitialiser';
        wrap.appendChild(reset);

        chips.forEach((c) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'vc-chip pressable';
            btn.dataset.vcChip = c.key;
            btn.setAttribute('role', 'listitem');
            btn.appendChild(document.createTextNode(c.label));
            const x = document.createElement('span');
            x.className = 'vc-chip-x';
            x.setAttribute('aria-hidden', 'true');
            x.textContent = '×';
            btn.appendChild(x);
            wrap.appendChild(btn);
        });
    }

    isMobileUi() {
        try { return window.matchMedia && window.matchMedia('(max-width: 899px)').matches; } catch (_) { return true; }
    }

    openFilterDrawer() {
        const drawer = this.filterDrawer;
        const backdrop = this.filterDrawerBackdrop;
        if (!drawer || !backdrop) return;
        if (!this.isMobileUi()) return;

        this.renderFilterDrawer();

        drawer.hidden = false;
        drawer.setAttribute('aria-hidden', 'false');
        backdrop.hidden = false;
        backdrop.setAttribute('aria-hidden', 'false');
        backdrop.classList.add('is-open');

        try { document.body.style.overflow = 'hidden'; } catch (_) { /* ignore */ }
    }

    closeFilterDrawer() {
        const drawer = this.filterDrawer;
        const backdrop = this.filterDrawerBackdrop;
        if (!drawer || !backdrop) return;

        drawer.hidden = true;
        drawer.setAttribute('aria-hidden', 'true');
        backdrop.classList.remove('is-open');
        backdrop.hidden = true;
        backdrop.setAttribute('aria-hidden', 'true');

        try { document.body.style.overflow = ''; } catch (_) { /* ignore */ }
    }

    renderFilterDrawer() {
        // Chips inside drawer (reuse same rendering logic, but target a different container).
        if (this.filterChipsDrawer) {
            const prev = this.filterChips;
            this.filterChips = this.filterChipsDrawer;
            try { this.renderFilterChips(); } finally { this.filterChips = prev; }
        }

        const renderOpts = (target, selectEl) => {
            if (!target || !selectEl) return;
            target.textContent = '';

            const selected = String(selectEl.value || '');
            Array.from(selectEl.options || []).forEach((o) => {
                const value = String(o.value ?? '');
                const label = String(o.text ?? value).trim() || value;

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `vc-drawer-opt pressable ${value === selected ? 'is-selected' : ''}`.trim();
                btn.dataset.value = value;
                btn.textContent = label;

                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectEl.value = value;
                    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                    // Re-render quickly so selection state updates immediately.
                    this.renderFilterDrawer();
                });

                target.appendChild(btn);
            });
        };

        renderOpts(this.drawerCategory, this.categorySelect);
        renderOpts(this.drawerSort, this.sortSelect);

        if (window.lucide) lucide.createIcons();
    }

    normalizeCategoryKey(raw) {
        const s = String(raw || '').trim().toLowerCase();
        if (!s) return '';
        try {
            // Remove diacritics (é -> e) then normalize spaces.
            const noMarks = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return noMarks
                .replace(/&/g, ' ')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
        } catch (_) {
            return s;
        }
    }

    applyUrlState() {
        try {
            const params = new URLSearchParams(window.location.search || '');
            const q = String(params.get('q') || params.get('search') || '').trim();
            const category = String(params.get('category') || params.get('cat') || '').trim();

            if (q) {
                this.searchTerm = q.toLowerCase();
                if (this.searchInput) this.searchInput.value = q;
            }

            if (category) {
                this.selectedCategory = this.normalizeCategoryKey(category) || category;
                if (this.categorySelect) {
                    const hasOption = Array.from(this.categorySelect.options || []).some(o => o.value === this.selectedCategory);
                    if (hasOption) this.categorySelect.value = this.selectedCategory;
                }
            }
        } catch (_) {
            // ignore
        }
    }

    loadCartFromStorage() {
        try {
            const raw = localStorage.getItem(this.cartStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;

            this.cart = parsed
                .filter(x => x && (x.id || x.id === 0) && x.title && Number.isFinite(Number(x.price)) && Number.isFinite(Number(x.quantity)))
                .map(x => ({
                    id: x.id,
                    title: String(x.title),
                    price: Number(x.price),
                    quantity: Math.max(1, parseInt(String(x.quantity), 10) || 1),
                    category: x.category || '',
                    whatsapp: x.whatsapp || x.seller_whatsapp || '',
                    seller_whatsapp: x.seller_whatsapp || x.whatsapp || '',
                    image_url: x.image_url || '',
                    image: x.image || '',
                    images: Array.isArray(x.images) ? x.images : []
                }));
        } catch (_) {
            // ignore
        }
    }

    saveCartToStorage() {
        try {
            const minimal = this.cart.map(i => ({
                id: i.id,
                title: i.title,
                price: i.price,
                quantity: i.quantity,
                category: i.category,
                whatsapp: i.whatsapp || i.seller_whatsapp || '',
                image_url: i.image_url || '',
                image: i.image || '',
                images: Array.isArray(i.images) ? i.images : []
            }));
            localStorage.setItem(this.cartStorageKey, JSON.stringify(minimal));
        } catch (_) {
            // ignore
        }
    }

    resolveProductImage(src) {
        const raw = String(src || '').trim();
        if (!raw) return this.defaultProductImage;
        // Certaines seeds/historiques pointent vers raw.githubusercontent.com mais les fichiers n'existent plus.
        if (raw.includes('raw.githubusercontent.com')) return this.defaultProductImage;
        // Defensive: never render local file paths or blob urls inside cards.
        if (raw.toLowerCase().startsWith('blob:')) return this.defaultProductImage;
        if (raw.toLowerCase().startsWith('file:')) return this.defaultProductImage;
        if (raw.includes('fakepath')) return this.defaultProductImage;
        if (/^[a-zA-Z]:\\/.test(raw)) return this.defaultProductImage; // Windows path like C:\...
        // Supabase: image transformations (render/image/*) may be disabled. Normalize older URLs back to object/*.
        try {
            if (raw.includes('/storage/v1/render/image/public/')) {
                const url = new URL(raw);
                url.pathname = url.pathname.replace('/storage/v1/render/image/public/', '/storage/v1/object/public/');
                url.searchParams.delete('width');
                url.searchParams.delete('quality');
                return url.toString();
            }
            if (raw.includes('/storage/v1/render/image/sign/')) {
                const url = new URL(raw);
                url.pathname = url.pathname.replace('/storage/v1/render/image/sign/', '/storage/v1/object/sign/');
                return url.toString();
            }
        } catch (_) { /* ignore */ }
        return raw;
    }

    async init() {
        this.initSearchPlaceholderRotation();
        this.applyUrlState();
        this.setupEventListeners();
        this.updateCartDisplay();

        // If another page requested "open cart", honor it once.
        try {
            const shouldOpen = localStorage.getItem('vendoscity_open_cart') === '1';
            if (shouldOpen) {
                localStorage.removeItem('vendoscity_open_cart');
                this.openCart();
            }
        } catch (_) {
            // ignore
        }

        await this.loadProducts();
        // Apply URL state after products load.
        if (this.searchTerm || (this.selectedCategory && this.selectedCategory !== 'all')) {
            this.filterAndSort();
        }
        this.setupInfiniteScroll();
    }

    initSearchPlaceholderRotation() {
        const input = this.searchInput;
        if (!input) return;

        const container = input.closest('.search-box') || input.parentElement;
        if (!container) return;

        const messages = [
            'Rechercher des produits...',
            'Essayez: iPhone, TV 55", PS5...',
            'Essayez: robe, baskets, montre...',
            'Tapez un quartier: Omnisports, Bastos...',
            'Essayez: terrain, studio, maison...'
        ];

        container.classList.add('vc-search-wrap');
        input.setAttribute('placeholder', '');

        const hint = document.createElement('span');
        hint.className = 'vc-search-hint';
        hint.setAttribute('aria-hidden', 'true');
        hint.textContent = messages[0];
        container.appendChild(hint);

        const placeHint = () => {
            try {
                const c = container.getBoundingClientRect();
                const r = input.getBoundingClientRect();
                const left = Math.round((r.left - c.left) + 15);
                const top = Math.round((r.top - c.top) + (r.height / 2));
                const maxw = Math.max(120, Math.round(r.width - 30));
                container.style.setProperty('--hint-left', `${left}px`);
                container.style.setProperty('--hint-top', `${top}px`);
                container.style.setProperty('--hint-maxw', `${maxw}px`);
            } catch (_) {
                // ignore
            }
        };

        const syncVisibility = () => {
            const hasValue = String(input.value || '').trim().length > 0;
            const hasFocus = document.activeElement === input;
            hint.classList.toggle('is-hidden', hasValue || hasFocus);
        };

        let idx = 0;
        const animateTo = (nextText) => {
            hint.classList.remove('is-out');
            hint.classList.add('is-out');
            window.setTimeout(() => {
                hint.textContent = nextText;
                hint.classList.remove('is-out');
            }, 140);
        };

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
    }

    async loadProducts(isAppend = false) {
        if (this.isLoading) return;
        this.isLoading = true;

        if (this.infiniteLoader) this.infiniteLoader.style.display = 'block';

        const CACHE_KEY = `vc_boutique_cache_${this.sortSelect?.value || 'recommended'}`;

        try {
            if (!isAppend) {
                this.currentPage = 0;
                this.products = [];
                
                // 1. Tenter de charger le cache pour l'affichage immédiat
                try {
                    const cached = localStorage.getItem(CACHE_KEY);
                    if (cached) {
                        const data = JSON.parse(cached);
                        if (Array.isArray(data) && data.length > 0) {
                            this.products = data;
                            this.filterAndSort();
                        } else {
                            this.renderSkeletons(6);
                        }
                    } else {
                        this.renderSkeletons(6);
                    }
                } catch (_) {
                    this.renderSkeletons(6);
                }
                
                if (window.lucide) lucide.createIcons();
            }

            const sortType = this.sortSelect?.value || 'recommended';
            const netFetch = (window.VendoscityNet && typeof window.VendoscityNet.fetch === 'function')
                ? window.VendoscityNet.fetch
                : async (u, o) => fetch(u, o);
            const url = `${API_BASE_URL}/api/products?page=${this.currentPage}&limit=${this.itemsPerPage}&sort=${encodeURIComponent(sortType)}`;
            const response = await netFetch(url, {}, 15000);
            if (response.ok) {
                const data = await response.json();
                const newProducts = data.products || [];
                this.hasMore = data.hasMore;

                const getId = (p) => String(p?.id ?? '').trim();
                const dedupe = (arr) => {
                    const out = [];
                    const seen = new Set();
                    for (const p of (arr || [])) {
                        const id = getId(p);
                        if (!id) continue;
                        if (seen.has(id)) continue;
                        seen.add(id);
                        out.push(p);
                    }
                    return out;
                };

                if (isAppend) {
                    const existingIds = new Set((this.products || []).map(getId).filter(Boolean));
                    const toAdd = [];
                    for (const p of newProducts) {
                        const id = getId(p);
                        if (!id) continue;
                        if (existingIds.has(id)) continue;
                        existingIds.add(id);
                        toAdd.push(p);
                    }
                    this.products = [...(this.products || []), ...toAdd];
                } else {
                    this.products = dedupe(newProducts);
                    // 2. Mettre à jour le cache (uniquement pour la page 0)
                    try {
                        localStorage.setItem(CACHE_KEY, JSON.stringify(this.products));
                    } catch (_) {}
                }
                
                this.filterAndSort();
            } else {
                throw new Error('Erreur API');
            }
        } catch (error) {
            console.error('Erreur:', error);
            if (!isAppend && this.products.length === 0) {
                this.productsGrid.innerHTML = '<div class="error"><p><i data-lucide="x-circle"></i> Erreur de chargement. Vérifiez le serveur.</p></div>';
                if (window.lucide) lucide.createIcons();
            }
        } finally {
            this.isLoading = false;
            if (this.infiniteLoader) this.infiniteLoader.style.display = 'none';
        }
    }

    setupInfiniteScroll() {
        if (!this.sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && this.hasMore && !this.isLoading) {
                if (this.filteredProducts.length === this.products.length) {
                    this.currentPage++;
                    this.loadProducts(true);
                }
            }
        }, { root: null, rootMargin: '100px', threshold: 0.1 });

        observer.observe(this.sentinel);
    }

    setupEventListeners() {
        this.searchInput?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterAndSort();
        });

        this.categorySelect?.addEventListener('change', (e) => {
            this.selectedCategory = e.target.value;
            this.filterAndSort();
        });

        this.sortSelect?.addEventListener('change', (e) => {
            // Server-driven sort: reload from page 0 so pagination stays coherent.
            this.loadProducts(false);
        });

        // Mobile drawer button (all filters in one place)
        const filtersBtn = document.getElementById('vc-btn-filters');
        filtersBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openFilterDrawer();
        });

        this.drawerCloseBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeFilterDrawer();
        });

        this.filterDrawerBackdrop?.addEventListener('click', () => this.closeFilterDrawer());

        this.drawerApplyBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeFilterDrawer();
            try { document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) { /* ignore */ }
        });

        this.drawerResetBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Same as reset chip.
            this.searchTerm = '';
            if (this.searchInput) this.searchInput.value = '';
            this.selectedCategory = 'all';
            if (this.categorySelect) this.categorySelect.value = 'all';

            const shouldReloadSort = (String(this.sortSelect?.value || '') !== 'recommended');
            if (this.sortSelect) this.sortSelect.value = 'recommended';

            if (shouldReloadSort) this.loadProducts(false);
            else this.filterAndSort();

            this.renderFilterDrawer();
        });

        // Active filter chips (clear/search/category/sort/reset)
        this.filterChips?.addEventListener('click', (e) => {
            const btn = e.target.closest?.('button.vc-chip[data-vc-chip]');
            if (!btn) return;

            const key = String(btn.dataset.vcChip || '').trim();
            if (!key) return;

            if (key === 'reset') {
                this.searchTerm = '';
                if (this.searchInput) this.searchInput.value = '';
                this.selectedCategory = 'all';
                if (this.categorySelect) this.categorySelect.value = 'all';

                const shouldReloadSort = (String(this.sortSelect?.value || '') !== 'recommended');
                if (this.sortSelect) this.sortSelect.value = 'recommended';

                if (shouldReloadSort) this.loadProducts(false);
                else this.filterAndSort();

                return;
            }

            if (key === 'search') {
                this.searchTerm = '';
                if (this.searchInput) this.searchInput.value = '';
                this.filterAndSort();
                return;
            }

            if (key === 'category') {
                this.selectedCategory = 'all';
                if (this.categorySelect) this.categorySelect.value = 'all';
                this.filterAndSort();
                return;
            }

            if (key === 'sort') {
                if (this.sortSelect) {
                    this.sortSelect.value = 'recommended';
                    this.sortSelect.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                    this.filterAndSort();
                }
                return;
            }
        });

        // Close drawer via Escape
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (this.filterDrawer && !this.filterDrawer.hidden) this.closeFilterDrawer();
        });

        // Category and sort are handled inside the Filter Drawer now.
        this.cartBadge?.addEventListener('click', (e) => { e.stopPropagation(); this.openCart(); });
        this.cartFab?.addEventListener('click', (e) => { e.stopPropagation(); this.openCart(); });
        this.btnCartMobile?.addEventListener('click', () => this.toggleCart());
        this.btnCloseCart?.addEventListener('click', () => this.closeCart());
        this.btnCheckout?.addEventListener('click', (e) => { e.stopPropagation(); this.checkout(); });
        this.btnContinueShopping?.addEventListener('click', () => this.closeCart());

        // Event delegation: avoid inline onclick handlers (framework-friendly).
        this.cartItems?.addEventListener('click', (e) => {
            const btn = e.target.closest?.('button.btn-qty');
            if (!btn) return;

            const idFromDom = btn.dataset.id;
            const delta = parseInt(btn.dataset.delta || '0', 10);
            if (!idFromDom || !Number.isFinite(delta) || delta === 0) return;

            const item = this.cart.find(i => String(i.id) === String(idFromDom));
            if (!item) return;

            this.updateQuantity(item.id, item.quantity + delta);
        });

        document.addEventListener('click', (e) => {
            if (!this.isCartOpen) return;
            const insideCart = this.cartSidebar && this.cartSidebar.contains(e.target);
            const insideFab = this.cartFab && this.cartFab.contains(e.target);
            const insideMobileBtn = this.btnCartMobile && this.btnCartMobile.contains(e.target);
            if (!insideCart && !insideFab && !insideMobileBtn) this.closeCart();
        });

        this.cartBackdrop?.addEventListener('click', () => this.closeCart());

        this.setupInfiniteScroll();
    }

    filterAndSort() {
        let filtered = this.products.filter(product => {
            const matchCategory = this.selectedCategory === 'all'
                || this.normalizeCategoryKey(product.category) === this.selectedCategory
                || String(product.category || '') === String(this.selectedCategory || '');
            const matchSearch = (product.title + ' ' + product.seller).toLowerCase().includes(this.searchTerm);
            return matchCategory && matchSearch;
        });

        const sortType = this.sortSelect?.value || 'recommended';
        this.filteredProducts = this.sortProducts(filtered, sortType);
        this.renderProducts();
        this.renderFilterChips();
    }

    sortProducts(products, sortType) {
        // L'algorithme de tri complet (Bayésien, date, prix) est géré globalement par le backend.
        // Il ne faut pas re-trier le tableau partiel (paginé) en Javascript, sinon on casse l'ordre global !
        return products;
    }

    renderProducts() {
        if (this.currentPage === 0) this.productsGrid.innerHTML = '';
        
        if (this.filteredProducts.length === 0) {
            this.productsGrid.innerHTML = '<div class="loading"><p>Aucun produit trouvé</p></div>';
            return;
        }

        // Si on n'est pas en mode "filtre actif", on peut juste vider et tout re-rendre
        // (Pour l'infinite scroll, on rend tout ce qu'on a en mémoire)
        this.productsGrid.innerHTML = '';
        this.filteredProducts.forEach((product, idx) => {
            const card = this.createProductCard(product);
            if (window.VendoscityMotion && typeof window.VendoscityMotion.markReveal === 'function') {
                window.VendoscityMotion.markReveal(card, Math.min(260, idx * 35));
            }
            this.productsGrid.appendChild(card);
        });

        if (window.VendoscityMotion && typeof window.VendoscityMotion.revealWithin === 'function') {
            window.VendoscityMotion.revealWithin(this.productsGrid);
        }
        
        if (window.lucide) lucide.createIcons();
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';

        // Nom de la boutique tout en haut
        let sellerInfo = product?.seller?.shop_name || product?.seller?.first_name || product?.shop_name || product?.seller_name || '';
        if (!sellerInfo && product?.seller && typeof product.seller !== 'object') {
            sellerInfo = product.seller;
        }
        const sName = String(sellerInfo || 'Boutique').trim();
        const escapeHtml = window.escapeHTML || ((s) => s);
        const esc = escapeHtml;
        const shopBadge = document.createElement('div');
        shopBadge.className = 'product-card-shop';
        shopBadge.style.display = 'flex';
        shopBadge.style.alignItems = 'center';
        shopBadge.innerHTML = `<a href="./Vendeur.html?id=${escapeHtml(product.seller_id)}" style="display:inline-flex; align-items:center; gap:5px; color:inherit; text-decoration:none;"><i data-lucide="store"></i><span>${esc(sName)}</span></a>
        <button type="button" class="btn-share-shop-mini pressable" data-seller-id="${escapeHtml(product.seller_id)}" data-shop-name="${escapeHtml(sName)}" aria-label="Partager la boutique" title="Partager la boutique" style="background:none; border:none; padding:0; cursor:pointer; margin-left:auto; color:var(--primary-blue);"><i data-lucide="share-2" width="14" height="14"></i></button>`;

        // Rating is computed server-side;
        const primary = Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : (product.image_url || product.image || this.defaultProductImage);
        const image = this.resolveProductImage(primary);
        const safeId = String(product?.id ?? '').trim();
        const titleText = String(product?.title || 'Produit');
        const href = `./Product-Detail.html?id=${encodeURIComponent(safeId)}`;

        // Temu-like cards: keep minimum info on the card (image + price + title).
        const shareIconSvg = `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M22 2L11 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M22 2l-7 20-4-9-9-4 20-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `.trim();

        const media = document.createElement('div');
        media.className = 'product-media';

        const link = document.createElement('a');
        link.className = 'product-link';
        link.href = href;
        link.setAttribute('aria-label', 'Voir le produit');

        const img = document.createElement('img');
        img.className = 'product-image vc-skeleton';
        img.loading = 'lazy';
        img.src = image;
        img.alt = titleText;
        img.onload = function() { this.classList.add('vc-loaded'); };
        link.appendChild(img);

        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add-cart-mini btn-add-cart-overlay pressable';
        addBtn.type = 'button';
        addBtn.dataset.id = safeId;
        addBtn.setAttribute('aria-label', 'Ajouter au panier');
        addBtn.innerHTML = '<i data-lucide="shopping-cart"></i>';

        const shareBtn = document.createElement('button');
        shareBtn.className = 'btn-share-mini btn-share-inline btn-share-overlay pressable';
        shareBtn.type = 'button';
        shareBtn.dataset.id = safeId;
        shareBtn.setAttribute('aria-label', 'Partager cet article');
        shareBtn.title = 'Partager';
        shareBtn.innerHTML = shareIconSvg;

        // Top actions on image (less clutter below the card).
        const actions = document.createElement('div');
        actions.className = 'product-media-actions';
        actions.appendChild(shareBtn);
        actions.appendChild(addBtn);

        const productPrice = Number(product?.price) || 0;
        const productOldPrice = Number(product?.old_price) || 0;
        if (productOldPrice > 0 && productOldPrice > productPrice) {
            const disc = document.createElement('div');
            disc.className = 'product-badge-discount';
            disc.textContent = `-${Math.round(((productOldPrice - productPrice) / productOldPrice) * 100)}%`;
            media.appendChild(disc);
        }

        media.appendChild(link);
        media.appendChild(actions);

        const info = document.createElement('div');
        info.className = 'product-info';
        info.appendChild(shopBadge);

        const h3 = document.createElement('h3');
        h3.className = 'product-title product-title-compact';
        const titleLink = document.createElement('a');
        titleLink.href = href;
        titleLink.textContent = titleText;
        h3.appendChild(titleLink);
        info.appendChild(h3);

        // Ajout du snippet de description (formate)
        if (product.description) {
            const descSnippet = document.createElement('div');
            descSnippet.className = 'product-card-desc-snippet';
            const formatter = window.formatVendoscityText || ((t) => t);
            // On ne garde que le début si c'est trop long, mais le CSS tronque aussi via line-clamp
            descSnippet.innerHTML = formatter(product.description);
            info.appendChild(descSnippet);
        }

        const locPrice = document.createElement('div');
        locPrice.className = 'product-loc-price-row';

        const loc = document.createElement('div');
        loc.className = 'product-loc-mini';
        let locSellerRaw = product?.seller?.shop_name || product?.seller?.first_name || product?.shop_name || product?.seller_name || '';
        if (!locSellerRaw) {
            locSellerRaw = product?.seller;
        }
        const seller = (typeof locSellerRaw === 'object') ? '' : String(locSellerRaw || '').trim();
        const q = String(product?.quartier || product?.district || product?.location || '').trim();

        // The user specifically requested to only show the "quartier" and drop "Cameroun" and seller name.
        loc.textContent = q;
        loc.title = q;
        if (!q) {
            loc.style.display = 'none';
        }
        loc.title = loc.textContent;

        const priceEl = document.createElement('div');
        priceEl.className = 'product-price product-price-mini';
        
        if (productOldPrice > productPrice) {
            const oldEl = document.createElement('span');
            oldEl.className = 'product-price-old';
            oldEl.textContent = `${Math.round(productOldPrice).toLocaleString('fr-FR')}`;
            priceEl.appendChild(oldEl);
        }
        
        const currentPriceEl = document.createElement('span');
        currentPriceEl.textContent = `${Math.round(productPrice).toLocaleString('fr-FR')} FCFA`;
        priceEl.appendChild(currentPriceEl);

        locPrice.appendChild(loc);
        locPrice.appendChild(priceEl);

        const metaRow = document.createElement('div');
        metaRow.className = 'product-meta-row';

        const ratingMini = document.createElement('div');
        ratingMini.className = 'product-rating-mini';
        ratingMini.setAttribute('aria-label', 'Note globale');

        const star = document.createElement('span');
        star.className = 'star';
        star.textContent = '★';

        const ratingText = document.createElement('span');
        const r = Number(product?.rating) || 0;
        const c = Number(product?.reviews ?? product?.reviews_count ?? product?.review_count ?? product?.reviewsCount) || 0;
        ratingText.textContent = c > 0 ? r.toFixed(1) : 'Nouveau';

        ratingMini.appendChild(star);
        ratingMini.appendChild(ratingText);
        if (c > 0) {
            const count = document.createElement('span');
            count.className = 'count';
            count.textContent = `(${c})`;
            ratingMini.appendChild(count);
        }

        metaRow.appendChild(ratingMini);

        info.appendChild(locPrice);
        info.appendChild(metaRow);

        card.appendChild(media);
        card.appendChild(info);

        // Multi-images selector on cards (Temu-like dots, doesn't reduce image height)
        const urls = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
        if (urls.length > 1) {
            const dots = document.createElement('div');
            dots.className = 'product-dots';
            const show = urls.slice(0, 6);
            show.forEach((u, idx) => {
                const resolved = this.resolveProductImage(u);
                const b = document.createElement('button');
                b.type = 'button';
                b.className = `product-dot-btn ${idx === 0 ? 'active' : ''}`.trim();
                b.dataset.src = resolved;
                b.setAttribute('aria-label', `Voir image ${idx + 1}`);
                dots.appendChild(b);
            });

            // Put dots on the image, but at the top (keeps center of the photo clear).
            media.appendChild(dots);

            const mainImg = img;

            const onPick = (e) => {
                const btn = e.target.closest?.('button.product-dot-btn[data-src]');
                if (!btn) return;
                e.preventDefault();
                e.stopPropagation();
                const src = btn.dataset.src;
                if (mainImg && src) mainImg.src = src;
                dots.querySelectorAll('button.product-dot-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
            };

            // Mobile: pointerdown is more reliable than click for tiny targets.
            dots.addEventListener('pointerdown', onPick, { passive: false });
            dots.addEventListener('click', onPick);
        }

        addBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.addToCart(product);
            const btn = e.currentTarget;
            btn.innerHTML = '<i data-lucide="check"></i>';
            if (window.lucide) lucide.createIcons();
            setTimeout(() => {
                btn.innerHTML = '<i data-lucide="shopping-cart"></i>';
                if (window.lucide) lucide.createIcons();
            }, 1000);
        });

        shareBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            // Share a server-rendered OG page so WhatsApp shows a visual preview card.
            // Use /api/share because /api rewrites are known to work reliably on Vercel.
            const u = new URL(`/api/share/${encodeURIComponent(safeId)}`, window.location.origin);
            // Retiré le cache buster aléatoire (Date.now()) car il empêche WhatsApp de mettre l'image en cache
            // et cause le non-affichage de l'aperçu si le serveur met plus de 2s à répondre.
            const url = u.toString();
            const title = String(product?.title || 'Article Vendoscity');
            const price = Math.round(Number(product?.price) || 0).toLocaleString('fr-FR');
            const text = `Bon plan: ${title} a ${price} FCFA.\nCommande directe via WhatsApp.`;
            if (window.VendoscityShare && typeof window.VendoscityShare.share === 'function') {
                await window.VendoscityShare.share({ title, text, url });
            } else {
                try { await navigator.clipboard.writeText(url); alert('Lien copié.'); } catch (_) { window.prompt('Copiez le lien:', url); }
            }
        });

        if (img) {
            img.addEventListener('error', () => {
                const step = parseInt(img.dataset.fallbackStep || '0', 10);
                const helper = window.VendoscityImages && window.VendoscityImages.nextFallback;
                const next = typeof helper === 'function' ? helper(img.src, step) : null;
                if (next && next.src) {
                    img.dataset.fallbackStep = String(next.step || (step + 1));
                    img.src = next.src;
                    return;
                }
                if (img.dataset.fallbackApplied) return;
                img.dataset.fallbackApplied = '1';
                img.src = this.defaultProductImage;
            });
        }

        return card;
    }

    addToCart(product) {
        const item = this.cart.find(i => i.id === product.id);
        if (item) item.quantity++;
        else this.cart.push({ ...product, quantity: 1 });
        this.updateCartDisplay();
    }

    removeFromCart(id) {
        this.cart = this.cart.filter(i => i.id !== id);
        this.updateCartDisplay();
    }

    updateQuantity(id, qty) {
        const item = this.cart.find(i => i.id === id);
        if (item) {
            item.quantity = Math.max(0, qty);
            if (item.quantity === 0) this.removeFromCart(id);
            else this.updateCartDisplay();
        }
    }

    updateCartDisplay() {
        const prevCount = (() => {
            const raw = this.cartCount ? String(this.cartCount.textContent || '') : '';
            const n = parseInt(raw, 10);
            return Number.isFinite(n) ? n : 0;
        })();

        const bump = (el) => {
            if (!el || !(el instanceof Element)) return;
            el.classList.remove('count-bump');
            // Force reflow so the animation restarts reliably.
            // eslint-disable-next-line no-unused-expressions
            el.offsetWidth;
            el.classList.add('count-bump');
        };

        this.cartItems.innerHTML = '';
        if (this.cart.length === 0) {
            this.cartItems.innerHTML = '<div class="cart-empty"><p>Panier vide</p></div>';
            this.cartTotal.textContent = '0 FCFA';
            if (this.cartCount) this.cartCount.textContent = '0';
            if (this.cartBadge) this.cartBadge.textContent = '0';
            if (this.cartFabCount) this.cartFabCount.textContent = '0';

            if (prevCount !== 0) {
                bump(this.cartCount);
                bump(this.cartBadge);
                bump(this.cartFabCount);
            }

            this.saveCartToStorage();
            return;
        }

        this.cart.forEach(item => {
            const div = document.createElement('div');
            div.className = 'cart-item';

            const info = document.createElement('div');
            info.className = 'cart-item-info';

            const name = document.createElement('div');
            name.className = 'cart-item-name';
            name.textContent = String(item?.title || '');

            const price = document.createElement('div');
            price.className = 'cart-item-price';
            price.textContent = `${Math.round(Number(item?.price) || 0).toLocaleString('fr-FR')} FCFA`;

            info.appendChild(name);
            info.appendChild(price);

            const qty = document.createElement('div');
            qty.className = 'cart-item-qty';

            const dec = document.createElement('button');
            dec.className = 'btn-qty';
            dec.type = 'button';
            dec.dataset.id = String(item?.id ?? '');
            dec.dataset.delta = '-1';
            dec.setAttribute('aria-label', 'Diminuer la quantite');
            dec.textContent = '−';

            const span = document.createElement('span');
            span.textContent = String(item?.quantity ?? 1);

            const inc = document.createElement('button');
            inc.className = 'btn-qty';
            inc.type = 'button';
            inc.dataset.id = String(item?.id ?? '');
            inc.dataset.delta = '1';
            inc.setAttribute('aria-label', 'Augmenter la quantite');
            inc.textContent = '+';

            qty.appendChild(dec);
            qty.appendChild(span);
            qty.appendChild(inc);

            div.appendChild(info);
            div.appendChild(qty);
            this.cartItems.appendChild(div);
        });

        const total = this.cart.reduce((s, i) => s + i.price * i.quantity, 0);
        this.cartTotal.textContent = Math.round(total).toLocaleString('fr-FR') + ' FCFA';
        const count = this.cart.reduce((s, i) => s + i.quantity, 0);
        if (this.cartCount) this.cartCount.textContent = String(count);
        if (this.cartBadge) this.cartBadge.textContent = String(count);
        if (this.cartFabCount) this.cartFabCount.textContent = String(count);

        if (count !== prevCount) {
            bump(this.cartCount);
            bump(this.cartBadge);
            bump(this.cartFabCount);
        }

        this.saveCartToStorage();
        if (window.lucide) lucide.createIcons();
    }

    toggleCart() { this.isCartOpen ? this.closeCart() : this.openCart(); }
    openCart() {
        this.cartSidebar.classList.add('active');
        if (this.cartBackdrop) this.cartBackdrop.classList.add('active');
        if (this.cartFab) this.cartFab.classList.add('hidden');
        this.isCartOpen = true;
        document.body.style.overflow = 'hidden';
    }
    closeCart() {
        this.cartSidebar.classList.remove('active');
        if (this.cartBackdrop) this.cartBackdrop.classList.remove('active');
        if (this.cartFab) this.cartFab.classList.remove('hidden');
        this.isCartOpen = false;
        document.body.style.overflow = 'auto';
    }

    generateOrderId() {
        // Référence lisible et unique (client-side).
        const suffix = Math.floor(100 + Math.random() * 900);
        return `VEN-${Date.now()}-${suffix}`;
    }

    normalizeWhatsApp(raw) {
        if (!raw) return '';
        // Conserver + et chiffres, enlever espaces/parenthèses/tirets.
        const trimmed = String(raw).trim();
        const hasPlus = trimmed.startsWith('+');
        const digits = trimmed.replace(/[^\d]/g, '');
        if (!digits) return '';
        return hasPlus ? `+${digits}` : digits;
    }

    isValidWhatsApp(normalized) {
        // Validation minimale: 6+ chiffres (ex: 681570075) ou +237681570075
        const digits = String(normalized).replace(/[^\d]/g, '');
        return digits.length >= 6;
    }

    toWaMeNumber(normalized) {
        // wa.me attend uniquement les chiffres (sans +).
        return String(normalized).replace(/[^\d]/g, '');
    }

    groupCartBySellerWhatsApp() {
        const groups = new Map();

        for (const item of this.cart) {
            const sellerWa = this.normalizeWhatsApp(item?.seller?.phone || item?.whatsapp || item?.seller_whatsapp || '');
            const key = sellerWa || '__unknown__';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(item);
        }

        return groups;
    }

    buildOrderDetails({ orderId, clientWhatsApp, sellerWhatsApp, items }) {
        const orderItems = items.map(i => ({
            id: i.id,
            title: i.title,
            quantity: i.quantity,
            price: i.price,
            subtotal: i.price * i.quantity,
            // Keep image(s) for WhatsApp message.
            image_url: i.image_url || i.image || '',
            images: Array.isArray(i.images) ? i.images : []
        }));

        const totalAmount = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
        const itemsCount = orderItems.reduce((sum, i) => sum + i.quantity, 0);

        return {
            orderId,
            clientWhatsApp,
            sellerWhatsApp,
            items: orderItems,
            itemsCount,
            totalAmount,
            orderDate: new Date().toLocaleString('fr-FR'),
            status: 'pending'
        };
    }

    getOrderItemImageUrl(item) {
        const raw = (Array.isArray(item?.images) && item.images[0])
            ? item.images[0]
            : (item?.image_url || '');
        const s = String(raw || '').trim();
        if (!s) return '';
        try {
            return new URL(s, window.location.href).toString();
        } catch (_) {
            return s;
        }
    }

    getOrderItemPageUrl(item) {
        const id = String(item?.id || '').trim();
        if (!id) return '';
        try {
            return new URL(`./Product-Detail.html?id=${encodeURIComponent(id)}`, window.location.href).toString();
        } catch (_) {
            return '';
        }
    }

    saveOrdersToLocalStorage(orders) {
        try {
            const raw = localStorage.getItem('vendorOrders');
            const existing = raw ? JSON.parse(raw) : [];
            const next = Array.isArray(existing) ? [...existing, ...orders] : [...orders];
            localStorage.setItem('vendorOrders', JSON.stringify(next));
        } catch (e) {
            console.warn('Impossible de sauvegarder vendorOrders:', e);
        }
    }

    buildWhatsAppMessage(order) {
        const lines = [];
        lines.push('Bonjour,');
        lines.push('');
        lines.push(`Je souhaite passer une commande sur Vendoscity.`);
        lines.push(`Reference: ${order.orderId}`);
        lines.push(`Mon WhatsApp: ${order.clientWhatsApp}`);
        lines.push('');
        lines.push('Articles:');
        for (const item of order.items) {
            const price = Math.round(item.price).toLocaleString('fr-FR');
            const subtotal = Math.round(item.subtotal).toLocaleString('fr-FR');
            lines.push(`- ${item.title} x${item.quantity} (${price} FCFA) = ${subtotal} FCFA`);

            const img = this.getOrderItemImageUrl(item);
            if (img) lines.push(`  Photo: ${img}`);
            const link = this.getOrderItemPageUrl(item);
            if (link) lines.push(`  Lien: ${link}`);
        }
        lines.push('');
        lines.push(`Total: ${Math.round(order.totalAmount).toLocaleString('fr-FR')} FCFA`);
        lines.push('');
        lines.push('Merci de me confirmer la disponibilite et les modalites de livraison.');
        return lines.join('\n');
    }

    buildWaMeLink(sellerWhatsApp, message) {
        const wa = this.toWaMeNumber(sellerWhatsApp);
        const text = encodeURIComponent(message);
        return `https://wa.me/${wa}?text=${text}`;
    }

    showOrderConfirmation(ordersWithLinks) {
        const existing = document.getElementById('order-confirmation-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'order-confirmation-overlay';
        overlay.className = 'order-confirmation-overlay';
        overlay.innerHTML = `
            <div class="order-confirmation-modal" role="dialog" aria-modal="true" aria-label="Confirmation de commande">
                <div class="order-confirmation-header">
                    <h3><i data-lucide="check-circle"></i> Commande creee</h3>
                    <button class="order-confirmation-close" aria-label="Fermer" type="button"><i data-lucide="x"></i></button>
                </div>
                <p class="order-confirmation-subtitle">
                    Ouvrez WhatsApp pour contacter le ou les vendeurs. Si une fenetre ne s'ouvre pas automatiquement,
                    utilisez les boutons ci-dessous.
                </p>
                <div class="order-confirmation-list"></div>
                <div class="order-confirmation-footer">
                    <button class="order-confirmation-done" type="button">Terminer</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Fill list safely (no HTML injection).
        const list = overlay.querySelector('.order-confirmation-list');
        if (list) {
            (ordersWithLinks || []).forEach(({ order, link }) => {
                const item = document.createElement('div');
                item.className = 'order-confirmation-item';

                const main = document.createElement('div');
                main.className = 'order-confirmation-item-main';

                const ref = document.createElement('div');
                ref.className = 'order-confirmation-ref';
                const strong = document.createElement('strong');
                strong.textContent = String(order?.orderId || '');
                ref.appendChild(strong);

                const meta = document.createElement('div');
                meta.className = 'order-confirmation-meta';
                const seller = String(order?.sellerWhatsApp || 'WhatsApp inconnu');
                const total = Math.round(Number(order?.totalAmount) || 0).toLocaleString('fr-FR');
                meta.textContent = `Vendeur: ${seller} | Total: ${total} FCFA`;

                main.appendChild(ref);
                main.appendChild(meta);

                item.appendChild(main);

                if (link) {
                    const a = document.createElement('a');
                    a.className = 'order-confirmation-btn';
                    a.href = String(link);
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.innerHTML = '<i data-lucide="message-circle"></i> Ouvrir WhatsApp';
                    item.appendChild(a);
                } else {
                    const b = document.createElement('button');
                    b.className = 'order-confirmation-btn';
                    b.type = 'button';
                    b.disabled = true;
                    b.style.opacity = '0.6';
                    b.style.cursor = 'not-allowed';
                    b.innerHTML = '<i data-lucide="alert-triangle"></i> WhatsApp vendeur manquant';
                    item.appendChild(b);
                }

                list.appendChild(item);
            });
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();

        const close = () => overlay.remove();
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
        overlay.querySelector('.order-confirmation-close')?.addEventListener('click', close);
        overlay.querySelector('.order-confirmation-done')?.addEventListener('click', close);
    }

    checkout() {
        if (this.cart.length === 0) return alert('Panier vide');

        const waRaw = document.getElementById('whatsapp-input')?.value;
        const clientWhatsApp = this.normalizeWhatsApp(waRaw);
        if (!clientWhatsApp) return alert('Entrez votre numero WhatsApp');
        if (!this.isValidWhatsApp(clientWhatsApp)) return alert('Numero WhatsApp invalide');

        const grouped = this.groupCartBySellerWhatsApp();

        const orders = [];
        const ordersWithLinks = [];
        const remainingCartItems = [];

        for (const [sellerWhatsAppKey, items] of grouped.entries()) {
            const sellerWhatsApp = sellerWhatsAppKey === '__unknown__' ? '' : sellerWhatsAppKey;
            const orderId = this.generateOrderId();
            const order = this.buildOrderDetails({ orderId, clientWhatsApp, sellerWhatsApp, items });
            orders.push(order);

            if (sellerWhatsApp) {
                const message = this.buildWhatsAppMessage(order);
                const link = this.buildWaMeLink(sellerWhatsApp, message);
                ordersWithLinks.push({ order, link });
            } else {
                // Pas de WhatsApp vendeur: ne pas envoyer, garder les articles dans le panier.
                remainingCartItems.push(...items);
                ordersWithLinks.push({ order, link: '' });
            }
        }

        this.saveOrdersToLocalStorage(orders);

        // Essayer d'ouvrir au moins le premier vendeur automatiquement (souvent autorise car clic utilisateur).
        const firstLink = ordersWithLinks.find(x => x.link)?.link;
        if (firstLink) {
            window.open(firstLink, '_blank', 'noopener,noreferrer');
        }

        this.showOrderConfirmation(ordersWithLinks);

        this.cart = remainingCartItems;
        this.updateCartDisplay();
        this.closeCart();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Guard against double-init (bfcache restores, duplicate script loads, etc.).
    if (window.__vendoscityBoutiqueBooted) return;
    window.__vendoscityBoutiqueBooted = true;

    window.boutique = new Boutique();
    window.boutique.init();
});
