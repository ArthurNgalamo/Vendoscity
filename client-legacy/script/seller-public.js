// seller-public.js - Page publique "Vendeur": liste ses articles

const API = `${API_BASE_URL}/api`;
const CART_STORAGE_KEY = 'vendoscity_cart_v1';

function escapeHtml(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function resolveImage(src) {
    const fallback = '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png';
    const raw = String(src || '').trim();
    if (!raw) return fallback;
    if (raw.includes('raw.githubusercontent.com')) return fallback;
    if (raw.toLowerCase().startsWith('blob:')) return fallback;
    if (raw.toLowerCase().startsWith('file:')) return fallback;
    if (raw.includes('fakepath')) return fallback;
    if (/^[a-zA-Z]:\\/.test(raw)) return fallback;
    try {
        // Supabase image transformations (render/image/*) may be disabled. Normalize older URLs back to object/*.
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
    } catch (_) {
        // ignore
    }
    return raw;
}

function loadCart() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

function saveCart(cart) {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (_) {
        // ignore
    }
}

function normalizeProductForCart(p) {
    const fallback = '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png';
    const images = Array.isArray(p?.images) && p.images.length > 0
        ? p.images
        : [p?.image_url || p?.image || fallback].filter(Boolean);

    return {
        id: p?.id,
        title: String(p?.title || 'Produit'),
        price: Number(p?.price || 0),
        quantity: 1,
        category: p?.category || '',
        whatsapp: p?.whatsapp || '',
        image_url: p?.image_url || '',
        image: p?.image || '',
        images
    };
}

function addToCart(product, qty = 1) {
    const item = normalizeProductForCart(product);
    if (!item.id || !Number.isFinite(item.price) || item.price <= 0) {
        alert('Impossible d’ajouter ce produit au panier.');
        return;
    }

    const cart = loadCart();
    const idx = cart.findIndex(x => String(x?.id) === String(item.id));
    const addQty = Math.max(1, parseInt(String(qty), 10) || 1);
    if (idx >= 0) {
        cart[idx].quantity = Math.max(1, (parseInt(String(cart[idx].quantity), 10) || 1) + addQty);
    } else {
        cart.push({ ...item, quantity: addQty });
    }
    saveCart(cart);
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    // Nom de la boutique tout en haut
    let sInfo = product?.seller?.shop_name || product?.seller?.first_name || product?.shop_name || product?.seller_name || '';
    if (!sInfo && product?.seller && typeof product.seller !== 'object') { sInfo = product.seller; }
    const sName = String(sInfo || 'Boutique').trim();
    const esc = window.escapeHTML || ((s) => s);

    const urls = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    const primary = urls[0] || product.image_url || product.image || '';
    const image = resolveImage(primary);
    const shareIconSvg = `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M22 2L11 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M22 2l-7 20-4-9-9-4 20-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
    `.trim();

    const pPrice = Number(product?.price) || 0;
    const pOldPrice = Number(product?.old_price) || 0;
    const badge = (pOldPrice > 0 && pOldPrice > pPrice)
        ? `<div class="product-badge-discount">-${Math.round(((pOldPrice - pPrice) / pOldPrice) * 100)}%</div>`
        : '';

    card.innerHTML += `
        <div class="product-media">
            ${badge}
            <a href="./Product-Detail.html?id=${escapeHtml(product.id)}" class="product-link" aria-label="Voir le produit">
                <img src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" class="product-image" loading="lazy">
            </a>
            <button class="btn-add-cart-mini btn-add-cart-overlay pressable" type="button" data-id="${escapeHtml(product.id)}" aria-label="Ajouter au panier">
                <i data-lucide="shopping-cart"></i>
            </button>
        </div>
        <div class="product-info">
            <div class="product-card-shop" style="display:flex; align-items:center;">
                <a href="./Vendeur.html?id=${escapeHtml(product.seller_id)}" style="display:inline-flex; align-items:center; gap:5px; color:inherit; text-decoration:none;"><i data-lucide="store"></i><span>${esc(sName)}</span></a>
                <button type="button" class="btn-share-shop-mini pressable" data-seller-id="${escapeHtml(product.seller_id)}" data-shop-name="${escapeHtml(sName)}" aria-label="Partager la boutique" title="Partager la boutique" style="background:none; border:none; padding:0; cursor:pointer; margin-left:auto; color:var(--primary-blue);"><i data-lucide="share-2" width="14" height="14"></i></button>
            </div>
            <h3 class="product-title product-title-compact"><a href="./Product-Detail.html?id=${escapeHtml(product.id)}">${escapeHtml(product.title || '')}</a></h3>
            ${product.description ? `<div class="product-card-desc-snippet">${(window.formatVendoscityText || (t => t))(product.description)}</div>` : ''}
            <div class="product-loc-price-row">
                <div class="product-loc-mini">${escapeHtml((() => {
                    const q = String(product?.quartier || product?.district || product?.location || '').trim();
                    return q;
                })())}</div>
                <div class="product-price product-price-mini">
                    ${pOldPrice > pPrice ? `<span class="product-price-old">${Math.round(pOldPrice).toLocaleString('fr-FR')}</span>` : ''}
                    <span>${Math.round(pPrice).toLocaleString('fr-FR')} FCFA</span>
                </div>
            </div>
            <div class="product-meta-row">
                <div class="product-rating-mini" aria-label="Note globale">
                    <span class="star">★</span>
                    <span>${(() => {
                        const r = Number(product?.rating) || 0;
                        const c = Number(product?.reviews ?? product?.reviews_count ?? product?.review_count ?? product?.reviewsCount) || 0;
                        return c > 0 ? r.toFixed(1) : 'Nouveau';
                    })()}</span>
                    ${(() => {
                        const c = Number(product?.reviews ?? product?.reviews_count ?? product?.review_count ?? product?.reviewsCount) || 0;
                        return c > 0 ? `<span class="count">(${c})</span>` : '';
                    })()}
                </div>
                <button class="btn-share-mini btn-share-inline pressable" type="button" data-id="${escapeHtml(product.id)}" aria-label="Partager cet article" title="Partager">
                    ${shareIconSvg}
                </button>
            </div>
        </div>
    `;

    if (urls.length > 1) {
        const dots = document.createElement('div');
        dots.className = 'product-dots';
        dots.innerHTML = urls.slice(0, 6).map((u, idx) => {
            const src = resolveImage(u);
            return `<button type="button" class="product-dot-btn ${idx === 0 ? 'active' : ''}" data-src="${escapeHtml(src)}" aria-label="Voir image ${idx + 1}"></button>`;
        }).join('');

        const media = card.querySelector('.product-media');
        if (media) media.appendChild(dots);

        const mainImg = card.querySelector('img.product-image');
        const onPick = (e) => {
            const btn = e.target.closest?.('button.product-dot-btn[data-src]');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            const src = btn.dataset.src;
            if (mainImg && src) mainImg.src = src;
            dots.querySelectorAll('button.product-dot-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
        dots.addEventListener('pointerdown', onPick, { passive: false });
        dots.addEventListener('click', onPick);
    }

    const addBtn = card.querySelector('button.btn-add-cart-mini');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            addToCart(product, 1);
            addBtn.innerHTML = '<i data-lucide="check"></i>';
            if (window.lucide) lucide.createIcons();
            setTimeout(() => {
                addBtn.innerHTML = '<i data-lucide="shopping-cart"></i>';
                if (window.lucide) lucide.createIcons();
            }, 1000);
        });
    }

    const shareBtn = card.querySelector('button.btn-share-mini');
    if (shareBtn) {
        shareBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Share a server-rendered OG page so WhatsApp shows a visual preview card.
            // Use /api/share because /api rewrites are known to work reliably on Vercel.
            const u = new URL(`/api/share/${encodeURIComponent(String(product.id))}`, window.location.origin);
            // Retiré le cache buster aléatoire pour permettre à WhatsApp de conserver
            // l'aperçu de l'article en cache.
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
    }

    const img = card.querySelector('img.product-image');
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
            img.src = '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png';
        });
    }

    return card;
}

async function loadSellerPage() {
    const params = new URLSearchParams(window.location.search);
    const sellerId = params.get('id');
    if (!sellerId) {
        window.location.href = './Boutique.html';
        return;
    }

    const nameEl = document.getElementById('seller-name');
    const bioCard = document.getElementById('seller-bio-card');
    const bioEl = document.getElementById('seller-bio');

    const grid = document.getElementById('seller-products-grid');
    const emptyEl = document.getElementById('seller-products-empty');
    const errEl = document.getElementById('seller-products-error');

    try {
        const netFetch = (window.VendoscityNet && typeof window.VendoscityNet.fetch === 'function')
            ? window.VendoscityNet.fetch
            : async (u, o) => fetch(u, o);

        const [sellerRes, productsRes] = await Promise.all([
            netFetch(`${API}/sellers/${encodeURIComponent(sellerId)}`, {}, 15000),
            netFetch(`${API}/products?seller_id=${encodeURIComponent(sellerId)}&page=0&limit=100`, {}, 15000)
        ]);

        if (sellerRes.ok) {
            const seller = await sellerRes.json();
            const displayName = String(seller?.shop_name || '').trim()
                || `${seller?.first_name || ''} ${seller?.last_name || ''}`.trim()
                || 'Vendeur';
            if (nameEl) nameEl.textContent = displayName;
            if (bioEl) bioEl.innerHTML = (window.formatVendoscityText || (t => t))(seller?.bio || '');
            if (bioCard) bioCard.style.display = seller?.bio ? 'block' : 'none';
            
            const shareBtn = document.getElementById('btn-share-shop-header');
            if (shareBtn) {
                shareBtn.dataset.sellerId = sellerId;
                shareBtn.dataset.shopName = displayName;
                // Click handler is delegated in script.js
            }
        }

        if (!productsRes.ok) throw new Error('products');
        const payload = await productsRes.json();
        const products = Array.isArray(payload?.products) ? payload.products : (Array.isArray(payload) ? payload : []);

        if (grid) grid.innerHTML = '';
        if (!products.length) {
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';
        for (let idx = 0; idx < products.length; idx += 1) {
            const p = products[idx];
            const card = createProductCard(p);
            if (window.VendoscityMotion && typeof window.VendoscityMotion.markReveal === 'function') {
                window.VendoscityMotion.markReveal(card, Math.min(260, idx * 35));
            }
            grid.appendChild(card);
        }

        if (window.VendoscityMotion && typeof window.VendoscityMotion.revealWithin === 'function') {
            window.VendoscityMotion.revealWithin(grid);
        }

        if (window.lucide) lucide.createIcons();
    } catch (e) {
        if (errEl) errEl.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadSellerPage();
});
