// product-detail.js - Gestion dynamique de la page détail produit

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        window.location.href = 'Boutique.html';
        return;
    }

    setupCartFabOnProductDetail();
    loadProductDetails(productId);
    loadProductReviews(productId);
    setupReviewForm(productId);
    setupQuantityAndCartActions();
    setupShareButton(productId);
});

const CART_STORAGE_KEY = 'vendoscity_cart_v1';

function loadCartFromStorage() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

function saveCartToStorage(cart) {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (_) {
        // ignore
    }
}

function getCartCount() {
    const cart = loadCartFromStorage();
    return cart.reduce((s, i) => s + (parseInt(String(i?.quantity), 10) || 0), 0);
}

function setupCartFabOnProductDetail() {
    const fab = document.getElementById('cart-fab');
    const countEl = document.getElementById('cart-fab-count');
    if (!fab || !countEl) return;

    const render = () => {
        countEl.textContent = String(getCartCount());
    };

    render();
    if (window.lucide) lucide.createIcons();

    fab.addEventListener('click', () => {
        try {
            localStorage.setItem('vendoscity_open_cart', '1');
        } catch (_) {
            // ignore
        }
        window.location.href = './Boutique.html';
    });

    window.addEventListener('storage', (e) => {
        if (e.key === CART_STORAGE_KEY) render();
    });
}

function normalizeProductForCart(product) {
    const defaultProductImage = '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png';
    const images = Array.isArray(product?.images) && product.images.length > 0
        ? product.images
        : [product?.image_url || product?.image || defaultProductImage].filter(Boolean);

    return {
        id: product?.id,
        title: String(product?.title || 'Produit'),
        price: Number(product?.price || 0),
        quantity: 1,
        category: product?.category || '',
        whatsapp: product?.whatsapp || '',
        image_url: product?.image_url || '',
        image: product?.image || '',
        images
    };
}

function addItemToCart(item, qty) {
    const quantity = Math.max(1, parseInt(String(qty), 10) || 1);
    const cart = loadCartFromStorage();
    const idx = cart.findIndex(x => String(x?.id) === String(item?.id));

    if (idx >= 0) {
        const nextQty = Math.max(1, (parseInt(String(cart[idx].quantity), 10) || 1) + quantity);
        cart[idx].quantity = nextQty;
    } else {
        cart.push({ ...item, quantity });
    }

    saveCartToStorage(cart);

    // Update local badge on this page (same-tab updates don't trigger storage event)
    const countEl = document.getElementById('cart-fab-count');
    if (countEl) countEl.textContent = String(getCartCount());
}

function setupShareButton(productId) {
    const btn = document.getElementById('btn-share-product');
    if (!btn) return;

    btn.addEventListener('click', async (e) => {
        try { e.preventDefault(); e.stopPropagation(); } catch (_) { /* ignore */ }
        // Share a server-rendered OG page so WhatsApp shows a visual preview card.
        // Use /api/share because /api rewrites are known to work reliably on Vercel.
        const url = new URL(`/api/share/${encodeURIComponent(String(productId))}`, window.location.origin);
        // Removed the random cache buster here too so WhatsApp can cache the image.

        const product = window.__vendoscityCurrentProduct;
        const title = String(product?.title || 'Article Vendoscity');
        const price = Math.round(Number(product?.price) || 0).toLocaleString('fr-FR');
        const text = `Bon plan: ${title} a ${price} FCFA.\nCommande directe via WhatsApp.`;

        if (window.VendoscityShare && typeof window.VendoscityShare.share === 'function') {
            await window.VendoscityShare.share({ title, text, url: url.toString() });
        } else {
            try { await navigator.clipboard.writeText(url.toString()); alert('Lien copié.'); } catch (_) { window.prompt('Copiez le lien:', url.toString()); }
        }
    });
}

function clampInt(value, { min, max, fallback }) {
    const n = parseInt(String(value), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

function escapeHtml(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function normalizePhoneForWa(raw) {
    const s = String(raw ?? '').trim();
    if (!s) return '';

    // Keep digits only.
    let digits = s.replace(/[^\d]/g, '');
    if (!digits) return '';

    // Cameroon: local numbers are often 9 digits. Prefix country code if missing.
    if (digits.length === 9) digits = `237${digits}`;

    // Remove common international prefixes if present (best-effort).
    if (digits.startsWith('00237')) digits = digits.slice(2);

    // WhatsApp wa.me expects a full international number without +.
    if (digits.length < 8 || digits.length > 16) return '';
    return digits;
}

function buildWhatsAppLink({ phone, message }) {
    const p = normalizePhoneForWa(phone);
    if (!p) return '';
    const text = String(message ?? '').trim();
    const q = text ? `?text=${encodeURIComponent(text)}` : '';
    return `https://wa.me/${encodeURIComponent(p)}${q}`;
}

function computeCameroonLocLabel(product) {
    const q = String(product?.quartier || product?.district || product?.location || '').trim();
    return q;
}

function normalizeSpecs(specsRaw) {
    if (!specsRaw) return [];

    let specs = specsRaw;
    if (typeof specsRaw === 'string') {
        const txt = specsRaw.trim();
        if (!txt) return [];
        try { specs = JSON.parse(txt); } catch (_) { return []; }
    }

    if (Array.isArray(specs)) {
        return specs
            .map((it) => {
                if (!it || typeof it !== 'object') return null;
                const label = String(it.label ?? it.key ?? '').trim();
                const value = String(it.value ?? '').trim();
                if (!label) return null;
                return { label, value };
            })
            .filter(Boolean)
            .slice(0, 30);
    }

    if (specs && typeof specs === 'object') {
        return Object.entries(specs)
            .map(([k, v]) => ({ label: String(k || '').trim(), value: String(v ?? '').trim() }))
            .filter((it) => it.label)
            .slice(0, 30);
    }

    return [];
}

function renderProductSpecs(specsRaw) {
    const container = document.getElementById('product-specs');
    if (!container) return;

    const specs = normalizeSpecs(specsRaw);
    if (!specs.length) {
        container.style.gridTemplateColumns = '1fr';
        container.innerHTML = '<p style="color:#666; margin:0;">Aucune spécificité renseignée par le vendeur.</p>';
        return;
    }

    container.style.gridTemplateColumns = '1fr 1fr';
    container.innerHTML = '';

    const colA = document.createElement('div');
    const colB = document.createElement('div');
    colA.style.lineHeight = '1.8';
    colB.style.lineHeight = '1.8';

    specs.forEach((it, idx) => {
        const target = (idx % 2 === 0) ? colA : colB;
        const label = escapeHtml(it.label);
        const value = escapeHtml(it.value || '');
        const line = document.createElement('div');
        line.innerHTML = value
            ? `<strong>${label}:</strong> ${value}`
            : `<strong>${label}</strong>`;
        target.appendChild(line);
    });

    container.appendChild(colA);
    container.appendChild(colB);
}

function setupQuantityAndCartActions() {
    const qtyInput = document.getElementById('quantity');
    if (!qtyInput) return;

    const readQty = () => clampInt(qtyInput.value, { min: 1, max: 10, fallback: 1 });
    const writeQty = (n) => {
        const next = clampInt(n, { min: 1, max: 10, fallback: 1 });
        qtyInput.value = String(next);
        try { if (typeof window.__vendoscityUpdateWhatsAppLinks === 'function') window.__vendoscityUpdateWhatsAppLinks(next); } catch (_) { /* ignore */ }
    };

    // Back-compat (if old HTML still calls these)
    window.increaseQty = () => writeQty(readQty() + 1);
    window.decreaseQty = () => writeQty(readQty() - 1);
    window.addToCart = () => {
        const qty = readQty();
        const product = window.__vendoscityCurrentProduct;
        if (!product) {
            alert('Produit indisponible. Rechargez la page.');
            return;
        }
        const item = normalizeProductForCart(product);
        if (!item.id || !Number.isFinite(item.price) || item.price <= 0) {
            alert('Impossible d\'ajouter ce produit au panier.');
            return;
        }
        addItemToCart(item, qty);
        alert(`${qty} produit(s) ajoutés au panier.`);
    };

    document.addEventListener('click', (e) => {
        const btn = e.target.closest?.('button[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        if (action === 'qty-increase') window.increaseQty();
        if (action === 'qty-decrease') window.decreaseQty();
        if (action === 'add-to-cart') window.addToCart();
    });

    qtyInput.addEventListener('change', () => writeQty(readQty()));
}

function setupReviewForm(productId) {
    // NOTE: For now we reuse the existing Supabase session token stored by the app.
    // (No dedicated "buyer" auth yet.)
    const getToken = async () => {
        if (window.VendoscitySession && typeof window.VendoscitySession.getValidAccessToken === 'function') {
            return await window.VendoscitySession.getValidAccessToken();
        }
        return localStorage.getItem('sellerToken');
    };
    const addSection = document.getElementById('add-review-section');
    const loginSection = document.getElementById('login-to-review');
    const form = document.getElementById('review-form');

    setupClickableReviewStars();

    // Resolve token once for initial UI state (submit will re-check for refresh).
    getToken().then((t) => {
        if (!t) {
            addSection.style.display = 'none';
            loginSection.style.display = 'block';
            return;
        }

        addSection.style.display = 'block';
        loginSection.style.display = 'none';
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rating = document.getElementById('review-rating').value;
            const comment = document.getElementById('review-comment').value;

            try {
                const ratingInt = parseInt(String(rating), 10);
                if (!Number.isFinite(ratingInt) || ratingInt < 1 || ratingInt > 5) {
                    throw new Error('Note invalide. Choisissez une note entre 1 et 5.');
                }
                const tokenNow = await getToken();
                if (!tokenNow) throw new Error('Session expirée. Connectez-vous puis réessayez.');

                const res = (window.VendoscitySession && typeof window.VendoscitySession.authFetch === 'function')
                    ? await window.VendoscitySession.authFetch(`/api/products/${encodeURIComponent(productId)}/reviews`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rating: ratingInt, comment })
                    })
                    : await ((window.VendoscityNet && typeof window.VendoscityNet.fetch === 'function')
                        ? window.VendoscityNet.fetch
                        : async (u, o) => fetch(u, o))(`${API_BASE_URL}/api/products/${productId}/reviews`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${tokenNow}`
                        },
                        body: JSON.stringify({ rating: ratingInt, comment })
                    }, 20000);

                const text = await res.text();
                let payload = {};
                if (text) {
                    try { payload = JSON.parse(text); } catch (_) { /* ignore */ }
                }

                if (!res.ok) {
                    const msg = payload?.error || text || 'Erreur lors de l\'envoi de l\'avis';
                    if (res.status === 401) throw new Error('Session invalide. Reconnectez-vous puis réessayez.');
                    throw new Error(msg);
                }

                alert('Merci pour votre avis !');
                form.reset();
                loadProductReviews(productId); // Recharger la liste
            } catch (err) {
                alert(err.message);
            }
        });
    });
}

function setupClickableReviewStars() {
    const widget = document.getElementById('review-rating-widget');
    const input = document.getElementById('review-rating');
    const caption = document.getElementById('review-rating-caption');
    if (!widget || !input) return;

    const btns = Array.from(widget.querySelectorAll('button.review-star-btn[data-value]'));
    if (btns.length === 0) return;

    const clamp = (n) => Math.max(1, Math.min(5, n));
    const parseStarValue = (raw) => {
        const n = parseInt(String(raw), 10);
        if (!Number.isFinite(n)) return null;
        return clamp(n);
    };
    const labelFor = (n) => {
        const v = clamp(n);
        if (v === 5) return 'Excellent (5/5)';
        if (v === 4) return 'Très Bon (4/5)';
        if (v === 3) return 'Bien (3/5)';
        if (v === 2) return 'Médiocre (2/5)';
        return 'Mauvais (1/5)';
    };

    const setValue = (n) => {
        const parsed = parseStarValue(n);
        const v = parsed ?? (parseStarValue(input.value) ?? 5);
        input.value = String(v);
        if (caption) caption.textContent = labelFor(v);
        btns.forEach((b) => {
            const bvRaw = parseStarValue(b.dataset.value);
            const bv = bvRaw ?? 0;
            const filled = bv <= v;
            b.classList.toggle('is-filled', filled);
            b.setAttribute('aria-checked', String(bv === v));
            b.tabIndex = (bv === v) ? 0 : -1;
        });
    };

    const previewValue = (n) => {
        const parsed = parseStarValue(n);
        if (parsed === null) return;
        const v = parsed;
        btns.forEach((b) => {
            const bv = parseStarValue(b.dataset.value) ?? 0;
            b.classList.toggle('is-filled', bv <= v);
        });
        if (caption) caption.textContent = labelFor(v);
    };

    // Init from existing value
    const initialFromChecked = (() => {
        const checkedBtn = btns.find((b) => String(b.getAttribute('aria-checked')) === 'true');
        return checkedBtn ? checkedBtn.dataset.value : null;
    })();
    setValue(parseStarValue(input.value) ?? initialFromChecked ?? 5);

    widget.addEventListener('click', (e) => {
        const btn = e.target.closest?.('button.review-star-btn[data-value]');
        if (!btn) return;
        setValue(btn.dataset.value);
    });

    // Mobile/tactile: pointerdown is more reliable than click.
    widget.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest?.('button.review-star-btn[data-value]');
        if (!btn) return;
        e.preventDefault();
        setValue(btn.dataset.value);
    }, { passive: false });

    widget.addEventListener('mousemove', (e) => {
        const btn = e.target.closest?.('button.review-star-btn[data-value]');
        if (!btn) return;
        previewValue(btn.dataset.value);
    });

    widget.addEventListener('mouseleave', () => setValue(parseStarValue(input.value) ?? 5));

    widget.addEventListener('keydown', (e) => {
        const key = e.key;
        if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') return;
        e.preventDefault();

        const current = parseStarValue(input.value) ?? 5;
        let next = current;
        if (key === 'ArrowLeft') next = current - 1;
        if (key === 'ArrowRight') next = current + 1;
        if (key === 'Home') next = 1;
        if (key === 'End') next = 5;
        setValue(next);
        const focusBtn = btns.find(b => clamp(parseInt(String(b.dataset.value), 10) || 0) === next);
        if (focusBtn) focusBtn.focus();
    });
}

function optimizeImageUrl(rawUrl, { width, quality } = {}) {
    const u = String(rawUrl || '').trim();
    if (!u) return u;

    try {
        // Supabase image transformations (render/image/*) may be disabled. Convert older URLs back to object/*.
        if (u.includes('/storage/v1/render/image/public/')) {
            const url = new URL(u);
            url.pathname = url.pathname.replace('/storage/v1/render/image/public/', '/storage/v1/object/public/');
            url.searchParams.delete('width');
            url.searchParams.delete('quality');
            return url.toString();
        }
        if (u.includes('/storage/v1/render/image/sign/')) {
            const url = new URL(u);
            url.pathname = url.pathname.replace('/storage/v1/render/image/sign/', '/storage/v1/object/sign/');
            return url.toString();
        }
    } catch (_) {
        // ignore and fall back to raw URL
    }

    return u;
}

async function loadProductDetails(id) {
    try {
        const netFetch = (window.VendoscityNet && typeof window.VendoscityNet.fetch === 'function')
            ? window.VendoscityNet.fetch
            : async (u, o) => fetch(u, o);
        const res = await netFetch(`${API_BASE_URL}/api/products/${id}`, {}, 15000);
        if (!res.ok) {
            const text = await res.text();
            let msg = 'Produit non trouvé';
            if (text) {
                try {
                    const parsed = JSON.parse(text);
                    if (parsed?.error) msg = String(parsed.error);
                } catch (_) {
                    // keep default message
                }
            }
            throw new Error(msg);
        }
        
        const product = await res.json();
        window.__vendoscityCurrentProduct = product;
        const defaultProductImage = '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png';
        const imagesRaw = Array.isArray(product.images) && product.images.length > 0
            ? product.images
            : [product.image_url || product.image || defaultProductImage].filter(Boolean);
        const images = imagesRaw.filter(Boolean).slice(0, 6);
        
        // Titre et Description
        document.getElementById('product-title').textContent = product.title;
        
        const formatText = (window.formatVendoscityText) ? window.formatVendoscityText : (text) => String(text || '');
        document.getElementById('product-description').innerHTML = formatText(product.description || "Aucune description disponible pour ce produit.");
        if (window.lucide) lucide.createIcons();

        // Specs (dynamiques, fournies par le vendeur)
        renderProductSpecs(product.specs);
        
        // Image
        const mainImage = document.getElementById('product-main-image');
        const imageSrcRaw = images[0] || defaultProductImage;
        // Evite d'appeler des URLs connues pour etre cassées (ex: raw.githubusercontent.com) qui polluent la console.
        const imageSrc = (String(imageSrcRaw || '').includes('raw.githubusercontent.com'))
            ? defaultProductImage
            : imageSrcRaw;
        const mainOptimized = optimizeImageUrl(imageSrc, { width: 1400, quality: 80 });
        mainImage.textContent = '';
        const imgEl = document.createElement('img');
        imgEl.src = String(mainOptimized || defaultProductImage);
        imgEl.alt = String(product?.title || 'Produit');
        imgEl.style.width = '100%';
        imgEl.style.height = '100%';
        imgEl.style.objectFit = 'contain';
        imgEl.style.backgroundColor = '#f8f9fa'; // Optional: subtle background for images that don't fill the box
        imgEl.decoding = 'async';
        imgEl.fetchPriority = 'high';
        mainImage.appendChild(imgEl);
        if (imgEl) {
            imgEl.addEventListener('error', () => {
                const step = parseInt(imgEl.dataset.fallbackStep || '0', 10);
                const helper = window.VendoscityImages && window.VendoscityImages.nextFallback;
                const next = typeof helper === 'function' ? helper(imgEl.src, step) : null;
                if (next && next.src) {
                    imgEl.dataset.fallbackStep = String(next.step || (step + 1));
                    imgEl.src = next.src;
                    return;
                }
                if (imgEl.dataset.fallbackApplied) return;
                imgEl.dataset.fallbackApplied = '1';
                imgEl.src = defaultProductImage;
            });
        }

        // Thumbnails (si plusieurs images)
        const thumbsContainer = document.querySelector('.thumbnail-images');
        if (thumbsContainer) {
            thumbsContainer.innerHTML = images.map((u, idx) => {
                const resolved = (String(u || '').includes('raw.githubusercontent.com')) ? defaultProductImage : u;
                const thumb = optimizeImageUrl(resolved, { width: 240, quality: 70 });
                const full = optimizeImageUrl(resolved, { width: 1400, quality: 80 });
                return `
                <button type="button" class="thumbnail ${idx === 0 ? 'active' : ''}" data-src="${escapeHtml(full)}" aria-label="Voir image ${idx + 1}" style="border:none; background:transparent; padding:0;">
                  <img src="${escapeHtml(thumb)}" alt="" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">
                </button>
                `;
            }).join('');

            if (!thumbsContainer.dataset.bound) {
                thumbsContainer.dataset.bound = '1';
                thumbsContainer.addEventListener('click', (e) => {
                    const btn = e.target.closest?.('button.thumbnail[data-src]');
                    if (!btn) return;
                    const src = btn.dataset.src;
                    if (!src) return;
                    const img = mainImage.querySelector('img');
                    if (img) img.src = src;

                    thumbsContainer.querySelectorAll('.thumbnail').forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            }
        }

        // Prix
        const price = Math.round(product.price);
        document.getElementById('product-price').textContent = `${price.toLocaleString('fr-FR')} FCFA`;
        
        // Prix original et réduction
        const oldPriceEl = document.getElementById('product-old-price');
        const badgeEl = document.getElementById('product-discount-badge');
        
        const oldPrice = product.old_price ? Math.round(product.old_price) : 0;
        
        if (oldPrice > price) {
            oldPriceEl.textContent = `${oldPrice.toLocaleString('fr-FR')} FCFA`;
            oldPriceEl.style.display = 'block';
            
            const diff = oldPrice - price;
            const percent = Math.round((diff / oldPrice) * 100);
            if (badgeEl) {
                badgeEl.textContent = `-${percent}% d'économie`;
                badgeEl.style.display = 'inline-block';
            }
        } else {
            oldPriceEl.style.display = 'none';
            if (badgeEl) badgeEl.style.display = 'none';
        }

        // Vendeur
        if (product.seller) {
            const sellerNameEl = document.getElementById('product-seller-name');
            const displayName = String(product.seller.shop_name || '').trim()
                || `${product.seller.first_name || ''} ${product.seller.last_name || ''}`.trim();
            const sid = product.seller?.id || product.seller_id || '';
            if (sellerNameEl) {
                sellerNameEl.innerHTML = sid
                    ? `<i data-lucide="package"></i> Vendeur: <a class="seller-link" href="./Vendeur.html?id=${encodeURIComponent(sid)}">${escapeHtml(displayName || 'Vendeur')}</a>`
                    : `<i data-lucide="package"></i> Vendeur: ${escapeHtml(displayName || 'Vendeur')}`;
            }
            if (window.lucide) lucide.createIcons();

            const bioEl = document.getElementById('product-seller-bio');
            if (bioEl) bioEl.textContent = product.seller.bio || "Ce vendeur n'a pas encore renseigné sa biographie.";
        }

        // Location label (Cameroon-focused)
        try {
            const locEl = document.getElementById('product-location');
            if (locEl) {
                const icon = locEl.querySelector('i[data-lucide]');
                const label = computeCameroonLocLabel(product);
                if (icon) {
                    const iconClone = icon.cloneNode(true);
                    locEl.replaceChildren(iconClone, document.createTextNode(` ${label}`));
                } else {
                    locEl.textContent = label;
                }
            }
        } catch (_) { /* ignore */ }

        // WhatsApp CTA (primary conversion action)
        (function bindWhatsAppCtas() {
            const waBtn = document.getElementById('btn-whatsapp');
            const sticky = document.getElementById('vc-sticky-cta');
            const stickyPrice = document.getElementById('vc-sticky-price');
            const stickyWa = document.getElementById('vc-sticky-wa');

            const phone = String(product?.seller?.phone || product?.whatsapp || '').trim();
            const hasPhone = !!normalizePhoneForWa(phone);

            const readQty = () => {
                const qtyInput = document.getElementById('quantity');
                const raw = qtyInput ? qtyInput.value : '1';
                return clampInt(raw, { min: 1, max: 10, fallback: 1 });
            };

            const msgForQty = (qty) => {
                const title = String(product?.title || 'Article Vendoscity').trim();
                const p = Math.round(Number(product?.price) || 0).toLocaleString('fr-FR');
                const loc = computeCameroonLocLabel(product);
                const link = String(window.location.href || '').split('#')[0];
                return `Bonjour, je suis interessé par: ${title}\nPrix: ${p} FCFA\nQuantite: ${qty}\nLieu: ${loc}\nLien: ${link}`;
            };

            const sync = (qty) => {
                const q = clampInt(qty, { min: 1, max: 10, fallback: 1 });
                const href = hasPhone ? buildWhatsAppLink({ phone, message: msgForQty(q) }) : '';

                if (waBtn) {
                    if (!href) {
                        waBtn.style.display = 'none';
                        waBtn.setAttribute('aria-hidden', 'true');
                    } else {
                        waBtn.style.display = 'inline-flex';
                        waBtn.removeAttribute('aria-hidden');
                        waBtn.href = href;
                    }
                }

                if (stickyPrice) stickyPrice.textContent = `${price.toLocaleString('fr-FR')} FCFA`;
                if (sticky) sticky.hidden = !href;
                if (stickyWa && href) stickyWa.href = href;
            };

            // Expose for qty changes (same-tab updates)
            window.__vendoscityUpdateWhatsAppLinks = (qty) => sync(qty);
            sync(readQty());
        })();

	    } catch (err) {
	        console.error('Error loading product:', err);
	        // Avoid injecting arbitrary error messages into HTML (XSS).
	        try {
	            const msg = String(err?.message || '');
	            const isBadId = msg.toLowerCase().includes('invalid input syntax for type uuid')
	                || msg.toLowerCase().includes('id produit incorrect')
	                || msg.toLowerCase().includes('lien invalide');

	            document.body.textContent = '';
	            const wrap = document.createElement('div');
	            wrap.style.textAlign = 'center';
	            wrap.style.padding = '50px';

            const h2 = document.createElement('h2');
            h2.textContent = 'Erreur';

	            const p = document.createElement('p');
	            p.textContent = isBadId
	                ? 'Lien invalide: cet article n’existe pas sur cette version du site. Ouvrez la boutique et partagez depuis un article.'
	                : (String(err?.message || 'Une erreur est survenue.'));

            const a = document.createElement('a');
            a.href = 'Boutique.html';
            a.textContent = 'Retour à la boutique';

            wrap.appendChild(h2);
            wrap.appendChild(p);
            wrap.appendChild(a);
            document.body.appendChild(wrap);
        } catch (_) {
            // ignore
        }
    }
}

async function loadProductReviews(id) {
    const container = document.getElementById('reviews-container');
    const headerCount = document.getElementById('reviews-header-count');
    const starsCount = document.getElementById('product-reviews-count');
    const currentUid = (window.VendoscitySession && typeof window.VendoscitySession.getUserId === 'function')
        ? window.VendoscitySession.getUserId()
        : null;

    try {
        const netFetch = (window.VendoscityNet && typeof window.VendoscityNet.fetch === 'function')
            ? window.VendoscityNet.fetch
            : async (u, o) => fetch(u, o);
        const res = await netFetch(`${API_BASE_URL}/api/products/${id}/reviews`, {}, 15000);
        const reviewsRaw = res.ok ? await res.json() : [];
        const reviews = Array.isArray(reviewsRaw) ? reviewsRaw : [];
        
        if (headerCount) headerCount.textContent = String(reviews.length);
        if (starsCount) starsCount.textContent = `(${reviews.length} avis)`;

        if (reviews.length === 0) {
            container.innerHTML = '<p style="color: #999; font-style: italic;">Aucun avis pour le moment. Soyez le premier à donner votre avis !</p>';
            return;
        }

        container.innerHTML = reviews.map(review => `
            <div class="review-item">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong>${review.user ? escapeHtml(review.user.first_name || 'Utilisateur') : 'Utilisateur'}</strong>
                    <span class="stars-container">
                        ${Array(5).fill(0).map((_, i) => `
                            <i data-lucide="star" class="${i < (Number(review.rating) || 0) ? 'fill-star' : 'empty-star'}"></i>
                        `).join('')}
                    </span>
                </div>
                <p style="margin: 0; color: #666;">${escapeHtml(review.comment || '')}</p>
                <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:6px;">
                  <small style="color: #999;">${new Date(review.created_at).toLocaleDateString('fr-FR')}</small>
                  ${currentUid && String(review.user_id || '') === String(currentUid) ? `
                    <button type="button" class="btn-review-delete" data-review-id="${escapeHtml(review.id)}" aria-label="Supprimer mon avis" title="Supprimer" style="border:1px solid #e5e7eb; background:#fff; color:var(--primary-blue); font-weight:800; border-radius:10px; padding:6px 10px; cursor:pointer;">
                      Supprimer
                    </button>
                  ` : ''}
                </div>
            </div>
        `).join('');

        // Mise à jour de la note moyenne
        const sum = reviews.reduce((acc, r) => {
            const n = Number(r?.rating);
            return acc + (Number.isFinite(n) ? n : 0);
        }, 0);
        const avg = sum / Math.max(1, reviews.length);
        const roundedAvg = Math.max(0, Math.min(5, Math.round(avg)));
        const starsEl = document.getElementById('product-stars');
        if (starsEl) {
            starsEl.innerHTML = Array(5).fill(0).map((_, i) => `
                <i data-lucide="star" class="${i < roundedAvg ? 'fill-star' : 'empty-star'}"></i>
            `).join('');
        }

        if (window.lucide) lucide.createIcons();

        // Delete own review (event delegation)
        if (container && !container.dataset.deleteBound) {
            container.dataset.deleteBound = '1';
            container.addEventListener('click', async (e) => {
                const btn = e.target.closest?.('button.btn-review-delete[data-review-id]');
                if (!btn) return;
                e.preventDefault();
                e.stopPropagation();

                const reviewId = btn.dataset.reviewId;
                if (!reviewId) return;
                if (!confirm('Supprimer votre avis ?')) return;

                try {
                    const res = (window.VendoscitySession && typeof window.VendoscitySession.authFetch === 'function')
                        ? await window.VendoscitySession.authFetch(`/api/products/${encodeURIComponent(id)}/reviews/${encodeURIComponent(reviewId)}`, { method: 'DELETE' })
                        : await ((window.VendoscityNet && typeof window.VendoscityNet.fetch === 'function')
                            ? window.VendoscityNet.fetch
                            : async (u, o) => fetch(u, o))(`${API_BASE_URL}/api/products/${id}/reviews/${reviewId}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('sellerToken') || ''}`
                            }
                        }, 15000);

                    if (!res.ok && res.status !== 204) {
                        const text = await res.text();
                        let msg = text || `Erreur ${res.status}`;
                        try { const j = JSON.parse(text); if (j?.error) msg = j.error; } catch (_) {}
                        throw new Error(msg);
                    }

                    await loadProductReviews(id);
                } catch (err) {
                    alert(err.message || 'Impossible de supprimer l’avis.');
                }
            });
        }

    } catch (err) {
        console.error('Error loading reviews:', err);
        container.innerHTML = '<p style="color: var(--color-red);">Impossible de charger les avis.</p>';
    }
}
