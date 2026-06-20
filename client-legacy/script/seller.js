// seller.js - Gestion de l'espace vendeur (Auth et Upload)

const API_BASE = `${API_BASE_URL}/api`;

// Warm-up: Render peut être en veille, et Vercel renvoie alors souvent 502/504 au premier appel.
// Un petit GET public au chargement réduit fortement les erreurs lors du premier POST d'upload.
(function warmUpBackendOnce() {
    try {
        window.setTimeout(() => {
            try {
                fetch('/api/keepalive', { method: 'GET', cache: 'no-store' }).catch(() => {});
            } catch (_) { /* ignore */ }
        }, 50);
    } catch (_) { /* ignore */ }
})();

function normalizeWhatsApp(raw) {
    if (!raw) return '';
    const trimmed = String(raw).trim();
    const hasPlus = trimmed.startsWith('+');
    const digits = trimmed.replace(/[^\d]/g, '');
    if (!digits) return '';
    return hasPlus ? `+${digits}` : digits;
}

function isValidWhatsAppNumber(normalized) {
    const digits = String(normalized || '').replace(/[^\d]/g, '');
    return digits.length >= 6;
}

function parseSpecsTextarea(raw) {
    const text = String(raw || '').replace(/\r/g, '').trim();
    if (!text) return [];

    const items = [];
    const lines = text.split('\n');
    for (const lineRaw of lines) {
        const line = String(lineRaw || '').trim();
        if (!line) continue;

        // Preferred format: "Key: Value" (also accept "=").
        let label = '';
        let value = '';
        const colonIdx = line.indexOf(':');
        const eqIdx = line.indexOf('=');
        const sepIdx = (colonIdx >= 0) ? colonIdx : eqIdx;

        if (sepIdx >= 0) {
            label = line.slice(0, sepIdx).trim();
            value = line.slice(sepIdx + 1).trim();
        } else {
            label = line;
            value = '';
        }

        if (!label) continue;
        items.push({ label, value });
        if (items.length >= 30) break;
    }

    return items;
}

async function ensureSellerWhatsApp({ token, sellerMeta }) {
    const meta = sellerMeta && typeof sellerMeta === 'object' ? sellerMeta : {};
    const normalizedExisting = normalizeWhatsApp(meta.whatsapp);
    if (isValidWhatsAppNumber(normalizedExisting)) {
        meta.whatsapp = normalizedExisting;
        return meta;
    }

    // 1) Try to recover from profile phone (if metadata is missing)
    try {
        const res = await fetch(`${API_BASE}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const profile = await res.json();
            const recovered = normalizeWhatsApp(profile?.phone);
            if (isValidWhatsAppNumber(recovered)) {
                meta.whatsapp = recovered;
                return meta;
            }
        }
    } catch (_) {
        // ignore, we'll fallback to prompt
    }

    // 2) Ask the seller to provide WhatsApp now
    const input = normalizeWhatsApp(prompt('Entrez votre numero WhatsApp (ex: +237681570075). Les commandes arriveront sur ce numero.'));
    if (!isValidWhatsAppNumber(input)) {
        throw new Error('Numero WhatsApp invalide. Veuillez le renseigner pour recevoir les commandes.');
    }

    meta.whatsapp = input;

    // Best-effort: persist into profile phone so we can recover later as well.
    try {
        const currentRes = await fetch(`${API_BASE}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (currentRes.ok) {
            const current = await currentRes.json();
            await fetch(`${API_BASE}/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    first_name: current?.first_name || '',
                    last_name: current?.last_name || '',
                    phone: meta.whatsapp,
                    bio: current?.bio || ''
                })
            });
        }
    } catch (_) {
        // ignore
    }

    return meta;
}

// On vérifie au chargement si le vendeur est déjà connecté
document.addEventListener('DOMContentLoaded', () => {
    checkSellerSession();

    // WhatsApp-like images picker for the product upload form.
    (function initWhatsAppLikeImageUpload() {
        const input = document.getElementById('prod-image');
        const addBtn = document.getElementById('vc-prod-image-add');
        const thumbs = document.getElementById('vc-prod-image-thumbs');
        const countEl = document.getElementById('vc-prod-image-count');
        const form = document.getElementById('product-upload-form');
        if (!input || !addBtn || !thumbs || !countEl) return;

        const canSync = (() => {
            try { return typeof DataTransfer !== 'undefined'; } catch (_) { return false; }
        })();

        let files = [];
        const urlByFile = new Map(); // File -> objectURL

        const getUrlForFile = (file) => {
            if (!file) return '';
            if (urlByFile.has(file)) return urlByFile.get(file);
            const u = URL.createObjectURL(file);
            urlByFile.set(file, u);
            return u;
        };

        const revokeFileUrl = (file) => {
            const u = urlByFile.get(file);
            if (!u) return;
            try { URL.revokeObjectURL(u); } catch (_) { /* ignore */ }
            urlByFile.delete(file);
        };

        const revokeAll = () => {
            for (const f of Array.from(urlByFile.keys())) revokeFileUrl(f);
        };

        const syncToInput = () => {
            if (!canSync) return;
            try {
                const dt = new DataTransfer();
                files.forEach((f) => dt.items.add(f));
                input.files = dt.files;
            } catch (_) {
                // If DataTransfer is not supported, we still keep previews; submission will use last selection only.
            }
        };

        const openPreview = (startIdx) => {
            const existing = document.getElementById('vc-wa-preview-overlay');
            if (existing) existing.remove();

            const max = 6;
            const list = files.slice(0, max);
            if (!list.length) return;

            let idx = Math.max(0, Math.min(list.length - 1, Number(startIdx) || 0));

            const overlay = document.createElement('div');
            overlay.id = 'vc-wa-preview-overlay';
            overlay.className = 'vc-wa-preview-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Apercu image');

            const sheet = document.createElement('div');
            sheet.className = 'vc-wa-preview-sheet';

            const head = document.createElement('div');
            head.className = 'vc-wa-preview-head';

            const title = document.createElement('div');
            title.className = 'vc-wa-preview-title';
            title.textContent = 'Apercu';

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'vc-wa-preview-close pressable';
            closeBtn.setAttribute('aria-label', 'Fermer');
            closeBtn.textContent = '×';

            head.appendChild(title);
            head.appendChild(closeBtn);

            const body = document.createElement('div');
            body.className = 'vc-wa-preview-body';

            const img = document.createElement('img');
            img.className = 'vc-wa-preview-img';
            img.alt = 'Apercu image';

            const foot = document.createElement('div');
            foot.className = 'vc-wa-preview-foot';

            const actions = document.createElement('div');
            actions.className = 'vc-wa-preview-actions';

            const cropBtn = document.createElement('button');
            cropBtn.type = 'button';
            cropBtn.className = 'vc-wa-preview-btn pressable';
            cropBtn.textContent = 'Recadrer';
            cropBtn.disabled = !canSync;
            cropBtn.title = canSync ? 'Recadrer cette image' : 'Recadrage indisponible sur ce navigateur';

            const applyBtn = document.createElement('button');
            applyBtn.type = 'button';
            applyBtn.className = 'vc-wa-preview-btn pressable';
            applyBtn.textContent = 'Appliquer';
            applyBtn.style.display = 'none';

            const cancelCropBtn = document.createElement('button');
            cancelCropBtn.type = 'button';
            cancelCropBtn.className = 'vc-wa-preview-btn pressable';
            cancelCropBtn.textContent = 'Annuler';
            cancelCropBtn.style.display = 'none';

            actions.appendChild(cropBtn);
            actions.appendChild(applyBtn);
            actions.appendChild(cancelCropBtn);

            const zoomWrap = document.createElement('div');
            zoomWrap.className = 'vc-wa-preview-zoom';
            zoomWrap.style.display = 'none';

            const zoomLabel = document.createElement('span');
            zoomLabel.textContent = 'Zoom';

            const zoom = document.createElement('input');
            zoom.type = 'range';
            zoom.min = '1';
            zoom.max = '3';
            zoom.step = '0.01';
            zoom.value = '1';
            zoom.setAttribute('aria-label', 'Zoom recadrage');

            zoomWrap.appendChild(zoomLabel);
            zoomWrap.appendChild(zoom);

            foot.appendChild(actions);
            foot.appendChild(zoomWrap);

            const prev = document.createElement('button');
            prev.type = 'button';
            prev.className = 'vc-wa-preview-nav prev pressable';
            prev.setAttribute('aria-label', 'Image precedente');
            prev.textContent = '‹';

            const next = document.createElement('button');
            next.type = 'button';
            next.className = 'vc-wa-preview-nav next pressable';
            next.setAttribute('aria-label', 'Image suivante');
            next.textContent = '›';

            const renderPreview = () => {
                const total = list.length;
                title.textContent = `Apercu (${idx + 1}/${total})`;
                img.src = getUrlForFile(list[idx]);
                prev.disabled = idx <= 0;
                next.disabled = idx >= total - 1;
            };

            // Crop state (square crop)
            let mode = 'preview'; // 'preview' | 'crop'
            let cropViewport = null;
            let cropImg = null;
            let naturalW = 0;
            let naturalH = 0;
            let coverScale = 1; // viewport px per image px
            let containScale = 1; // viewport px per image px (fit inside)
            let userZoom = 1;   // multiplier >= 1
            let offsetX = 0;    // px in viewport coords (center-based)
            let offsetY = 0;
            let onResize = null;

            const clampCrop = () => {
                if (!cropViewport || !naturalW || !naturalH) return;
                const rect = cropViewport.getBoundingClientRect();
                const vw = rect.width;
                const vh = rect.height;
                const s = coverScale * userZoom;
                const maxX = Math.max(0, (naturalW * s - vw) / 2);
                const maxY = Math.max(0, (naturalH * s - vh) / 2);
                offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
                offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
            };

            const applyCropTransform = () => {
                if (!cropImg) return;
                clampCrop();
                const s = coverScale * userZoom;
                cropImg.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${s})`;
            };

            const enterCropMode = async () => {
                if (!canSync) return;
                mode = 'crop';

                // Replace body content
                body.textContent = '';
                cropViewport = document.createElement('div');
                cropViewport.className = 'vc-wa-crop-viewport';
                cropViewport.setAttribute('aria-label', 'Zone de recadrage');

                cropImg = document.createElement('img');
                cropImg.className = 'vc-wa-crop-img';
                cropImg.alt = 'Recadrage image';
                cropImg.src = getUrlForFile(list[idx]);
                cropImg.draggable = false;

                cropViewport.appendChild(cropImg);
                body.appendChild(cropViewport);

                // Responsive sizing: fit the square viewport inside the available body area.
                const sizeViewport = () => {
                    try {
                        const br = body.getBoundingClientRect();
                        const w = Math.max(200, br.width - 20);
                        const h = Math.max(200, br.height - 20);
                        const size = Math.max(200, Math.min(420, w, h));
                        cropViewport.style.width = `${Math.round(size)}px`;
                        cropViewport.style.height = `${Math.round(size)}px`;
                    } catch (_) { /* ignore */ }
                };

                sizeViewport();

                // Load natural size
                await new Promise((resolve) => {
                    if (cropImg.complete && cropImg.naturalWidth) return resolve();
                    cropImg.addEventListener('load', () => resolve(), { once: true });
                    cropImg.addEventListener('error', () => resolve(), { once: true });
                });
                naturalW = cropImg.naturalWidth || 0;
                naturalH = cropImg.naturalHeight || 0;

                // Compute cover scale so the image always covers the square viewport
                const rect = cropViewport.getBoundingClientRect();
                const vw = rect.width;
                const vh = rect.height;
                coverScale = (!naturalW || !naturalH) ? 1 : Math.max(vw / naturalW, vh / naturalH);
                containScale = (!naturalW || !naturalH) ? 1 : Math.min(vw / naturalW, vh / naturalH);

                // Allow zoom-out to see the full image (contain), not only cover.
                // userZoom is a multiplier over coverScale.
                const minZoom = Math.max(0.35, Math.min(1, containScale / coverScale));
                zoom.min = String(minZoom);
                if (Number(zoom.value) < minZoom) zoom.value = String(minZoom);
                userZoom = Math.max(minZoom, Number(zoom.value) || 1);
                offsetX = 0;
                offsetY = 0;
                applyCropTransform();

                // Update sizing on orientation change / resize while cropping.
                onResize = () => {
                    if (mode !== 'crop') return;
                    sizeViewport();
                    try {
                        const r2 = cropViewport.getBoundingClientRect();
                        const vw2 = r2.width;
                        const vh2 = r2.height;
                        coverScale = (!naturalW || !naturalH) ? 1 : Math.max(vw2 / naturalW, vh2 / naturalH);
                        containScale = (!naturalW || !naturalH) ? 1 : Math.min(vw2 / naturalW, vh2 / naturalH);
                        const minZoom2 = Math.max(0.35, Math.min(1, containScale / coverScale));
                        zoom.min = String(minZoom2);
                        if (Number(zoom.value) < minZoom2) zoom.value = String(minZoom2);
                        userZoom = Math.max(minZoom2, Number(zoom.value) || 1);
                        applyCropTransform();
                    } catch (_) { /* ignore */ }
                };
                window.addEventListener('resize', onResize, { passive: true });

                // UI toggles
                cropBtn.style.display = 'none';
                applyBtn.style.display = 'inline-flex';
                cancelCropBtn.style.display = 'inline-flex';
                zoomWrap.style.display = 'inline-flex';
                prev.style.display = 'none';
                next.style.display = 'none';

                // Drag to pan
                let dragging = false;
                let startX = 0;
                let startY = 0;
                let baseX = 0;
                let baseY = 0;

                const onDown = (e) => {
                    dragging = true;
                    const pt = (e.touches && e.touches[0]) ? e.touches[0] : e;
                    startX = pt.clientX;
                    startY = pt.clientY;
                    baseX = offsetX;
                    baseY = offsetY;
                    try { cropViewport.setPointerCapture?.(e.pointerId); } catch (_) { /* ignore */ }
                };
                const onMove = (e) => {
                    if (!dragging) return;
                    const pt = (e.touches && e.touches[0]) ? e.touches[0] : e;
                    offsetX = baseX + (pt.clientX - startX);
                    offsetY = baseY + (pt.clientY - startY);
                    applyCropTransform();
                };
                const onUp = () => {
                    dragging = false;
                };

                cropViewport.addEventListener('pointerdown', onDown);
                cropViewport.addEventListener('pointermove', onMove);
                cropViewport.addEventListener('pointerup', onUp);
                cropViewport.addEventListener('pointercancel', onUp);
            };

            const exitCropMode = () => {
                mode = 'preview';
                if (onResize) {
                    try { window.removeEventListener('resize', onResize); } catch (_) { /* ignore */ }
                    onResize = null;
                }
                body.textContent = '';
                body.appendChild(img);
                body.appendChild(prev);
                body.appendChild(next);
                renderPreview();

                cropBtn.style.display = 'inline-flex';
                applyBtn.style.display = 'none';
                cancelCropBtn.style.display = 'none';
                zoomWrap.style.display = 'none';
                prev.style.display = '';
                next.style.display = '';
            };

            const applyCropToFile = async () => {
                if (!canSync || mode !== 'crop' || !cropViewport || !naturalW || !naturalH) return;
                clampCrop();

                const rect = cropViewport.getBoundingClientRect();
                const vw = rect.width;
                const vh = rect.height;
                const s = coverScale * userZoom;

                // Map the viewport square to a square region in the source image (avoid any stretching).
                // Compute source-space center corresponding to the viewport center, then take a square around it.
                const centerX = (-offsetX) / s + (naturalW / 2);
                const centerY = (-offsetY) / s + (naturalH / 2);

                let side = Math.min(vw, vh) / s; // px in source image
                side = Math.max(1, Math.min(side, naturalW, naturalH));

                let sx = centerX - (side / 2);
                let sy = centerY - (side / 2);
                sx = Math.max(0, Math.min(naturalW - side, sx));
                sy = Math.max(0, Math.min(naturalH - side, sy));

                const sw = side;
                const sh = side;

                const out = 1024;
                const canvas = document.createElement('canvas');
                canvas.width = out;
                canvas.height = out;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                // Decode the source image into an ImageBitmap if possible for better quality
                let sourceImg = null;
                try {
                    const blob = await fetch(getUrlForFile(list[idx])).then(r => r.blob());
                    // createImageBitmap exists on modern browsers
                    sourceImg = (typeof createImageBitmap === 'function') ? await createImageBitmap(blob) : null;
                } catch (_) {
                    sourceImg = null;
                }

                if (sourceImg) {
                    ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, out, out);
                    try { sourceImg.close?.(); } catch (_) { /* ignore */ }
                } else {
                    ctx.drawImage(cropImg, sx, sy, sw, sh, 0, 0, out, out);
                }

                const original = list[idx];
                const type = (original && original.type) ? original.type : 'image/jpeg';
                const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.92));
                if (!blob) return;

                const newName = String(original?.name || `image-${idx + 1}`).replace(/\.[a-z0-9]+$/i, '');
                const nextFile = new File([blob], `${newName}-crop.${type.includes('png') ? 'png' : 'jpg'}`, { type });

                // Replace in the master files array (need the index in files, not list)
                const targetFile = list[idx];
                const masterIdx = files.findIndex((f) => f === targetFile);
                if (masterIdx >= 0) {
                    revokeFileUrl(targetFile);
                    files[masterIdx] = nextFile;
                    syncToInput();
                    render();
                }

                exitCropMode();
            };

            const close = () => {
                try { document.body.style.overflow = ''; } catch (_) { /* ignore */ }
                if (onResize) {
                    try { window.removeEventListener('resize', onResize); } catch (_) { /* ignore */ }
                    onResize = null;
                }
                overlay.remove();
            };

            prev.addEventListener('click', (e) => {
                e.preventDefault();
                if (idx > 0) { idx -= 1; renderPreview(); }
            });
            next.addEventListener('click', (e) => {
                e.preventDefault();
                if (idx < list.length - 1) { idx += 1; renderPreview(); }
            });
            closeBtn.addEventListener('click', (e) => { e.preventDefault(); close(); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') { e.preventDefault(); close(); return; }
                if (mode !== 'crop' && e.key === 'ArrowLeft') { e.preventDefault(); if (idx > 0) { idx -= 1; renderPreview(); } return; }
                if (mode !== 'crop' && e.key === 'ArrowRight') { e.preventDefault(); if (idx < list.length - 1) { idx += 1; renderPreview(); } return; }
            });

            cropBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await enterCropMode();
            });
            cancelCropBtn.addEventListener('click', (e) => {
                e.preventDefault();
                exitCropMode();
            });
            applyBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                applyBtn.disabled = true;
                try { await applyCropToFile(); } finally { applyBtn.disabled = false; }
            });
            zoom.addEventListener('input', () => {
                userZoom = Math.max(Number(zoom.min) || 0.35, Number(zoom.value) || 1);
                applyCropTransform();
            });

            body.appendChild(img);
            body.appendChild(prev);
            body.appendChild(next);

            sheet.appendChild(head);
            sheet.appendChild(body);
            sheet.appendChild(foot);
            overlay.appendChild(sheet);

            document.body.appendChild(overlay);
            try { document.body.style.overflow = 'hidden'; } catch (_) { /* ignore */ }
            renderPreview();
            try { closeBtn.focus(); } catch (_) { /* ignore */ }
        };

        const render = () => {
            thumbs.textContent = '';

            const max = 6;
            const count = Math.min(files.length, max);
            countEl.textContent = `${count}/${max}`;
            addBtn.disabled = count >= max;

            files.slice(0, max).forEach((file, idx) => {
                const u = getUrlForFile(file);

                const item = document.createElement('div');
                item.className = 'vc-wa-thumb';
                item.setAttribute('role', 'button');
                item.setAttribute('tabindex', '0');
                item.setAttribute('aria-label', `Image ${idx + 1}`);

                const img = document.createElement('img');
                img.alt = `Image ${idx + 1}`;
                img.src = u;

                const rm = document.createElement('button');
                rm.type = 'button';
                rm.className = 'vc-wa-thumb-remove pressable';
                rm.setAttribute('aria-label', `Retirer image ${idx + 1}`);
                rm.textContent = '×';
                rm.disabled = !canSync;

                rm.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    revokeFileUrl(file);
                    files.splice(idx, 1);
                    syncToInput();
                    render();
                });

                item.addEventListener('click', () => openPreview(idx));
                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openPreview(idx);
                    }
                });

                item.appendChild(img);
                item.appendChild(rm);
                thumbs.appendChild(item);
            });
        };

        const addFiles = (picked) => {
            const max = 6;
            const list = Array.from(picked || []).filter(Boolean);
            if (!list.length) return;

            if (!canSync) {
                // Fallback: browsers that can't programmatically set input.files.
                files = list.slice(0, max);
                render();
                return;
            }

            const remaining = Math.max(0, max - files.length);
            if (remaining <= 0) {
                alert('Vous pouvez ajouter au maximum 6 images.');
                return;
            }

            files = files.concat(list.slice(0, remaining));
            syncToInput();
            render();
        };

        addBtn.addEventListener('click', () => {
            try { input.click(); } catch (_) { /* ignore */ }
        });

        input.addEventListener('change', () => {
            addFiles(input.files);
        });

        form?.addEventListener('reset', () => {
            revokeAll();
            files = [];
            syncToInput();
            render();
        });

        // Initial render
        render();
    })();

    // Specs editor: key/value rows + add button + multiline paste support.
    (function initSpecsEditor() {
        const rowsEl = document.getElementById('vc-prod-specs-rows');
        const addBtn = document.getElementById('vc-prod-specs-add');
        const form = document.getElementById('product-upload-form');
        if (!rowsEl || !addBtn) return;

        const maxRows = 30;

        const parseClipboardSpecs = (raw) => {
            const text = String(raw || '').replace(/\r/g, '').trim();
            if (!text) return [];
            const lines = text.split('\n').map(l => String(l || '').trim()).filter(Boolean);
            const out = [];
            for (const line of lines) {
                if (out.length >= maxRows) break;

                // Support tab-separated copy (e.g., from Excel/Sheets): "Key<TAB>Value"
                if (line.includes('\t')) {
                    const parts = line.split('\t');
                    const label = String(parts[0] || '').trim();
                    const value = String(parts.slice(1).join('\t') || '').trim();
                    if (label) out.push({ label, value });
                    continue;
                }

                // Reuse textarea parser format: "Key: Value" or "Key=Value" or "Key"
                const parsed = parseSpecsTextarea(line);
                if (parsed && parsed.length) {
                    out.push(parsed[0]);
                    continue;
                }

                out.push({ label: line, value: '' });
            }
            return out;
        };

        const updateRemoveState = () => {
            const rows = Array.from(rowsEl.querySelectorAll('.vc-spec-row'));
            const disableRemove = rows.length <= 1;
            rows.forEach((r) => {
                const rm = r.querySelector('button.vc-spec-remove');
                if (rm) rm.disabled = disableRemove;
            });
        };

        const makeRow = ({ label = '', value = '' } = {}) => {
            const row = document.createElement('div');
            row.className = 'vc-spec-row';

            const key = document.createElement('input');
            key.type = 'text';
            key.className = 'vc-spec-input vc-spec-key';
            key.placeholder = 'Caractéristique (ex: RAM)';
            key.value = String(label || '');

            const val = document.createElement('input');
            val.type = 'text';
            val.className = 'vc-spec-input vc-spec-val';
            val.placeholder = 'Propriété (ex: 8GB)';
            val.value = String(value || '');

            const rm = document.createElement('button');
            rm.type = 'button';
            rm.className = 'vc-spec-remove pressable';
            rm.setAttribute('aria-label', 'Supprimer cette spécificité');
            rm.textContent = '×';

            rm.addEventListener('click', () => {
                const rows = Array.from(rowsEl.querySelectorAll('.vc-spec-row'));
                if (rows.length <= 1) return;
                row.remove();
                updateRemoveState();
                try { rowsEl.querySelector('.vc-spec-key')?.focus(); } catch (_) { /* ignore */ }
            });

            const onPaste = (e) => {
                const clip = e.clipboardData?.getData?.('text') || '';
                if (!clip || !clip.includes('\n')) return;

                const items = parseClipboardSpecs(clip);
                if (!items.length) return;

                e.preventDefault();

                const rows = Array.from(rowsEl.querySelectorAll('.vc-spec-row'));
                const startIdx = Math.max(0, rows.findIndex(r => r === row));

                items.forEach((it, i) => {
                    if ((startIdx + i) >= maxRows) return;
                    let target = rowsEl.querySelectorAll('.vc-spec-row')[startIdx + i];
                    if (!target) {
                        target = makeRow({ label: '', value: '' });
                        rowsEl.appendChild(target);
                    }
                    const k = target.querySelector('.vc-spec-key');
                    const v = target.querySelector('.vc-spec-val');
                    if (k) k.value = String(it.label || '');
                    if (v) v.value = String(it.value || '');
                });

                updateRemoveState();
                // Focus the next row key if possible
                try {
                    const next = rowsEl.querySelectorAll('.vc-spec-row')[Math.min(startIdx + items.length, rowsEl.querySelectorAll('.vc-spec-row').length - 1)];
                    next?.querySelector('.vc-spec-key')?.focus();
                } catch (_) { /* ignore */ }
            };

            // Paste multi-lines into the FIRST field (or any field) -> auto-fill rows.
            key.addEventListener('paste', onPaste);
            val.addEventListener('paste', onPaste);

            row.appendChild(key);
            row.appendChild(val);
            row.appendChild(rm);
            return row;
        };

        const ensureOneRow = () => {
            const rows = Array.from(rowsEl.querySelectorAll('.vc-spec-row'));
            if (rows.length === 0) rowsEl.appendChild(makeRow());
            updateRemoveState();
        };

        const getSpecs = () => {
            const rows = Array.from(rowsEl.querySelectorAll('.vc-spec-row'));
            const out = [];
            rows.forEach((r) => {
                if (out.length >= maxRows) return;
                const k = r.querySelector('.vc-spec-key');
                const v = r.querySelector('.vc-spec-val');
                const label = String(k?.value || '').trim();
                const value = String(v?.value || '').trim();
                if (!label) return;
                out.push({ label, value });
            });
            return out;
        };

        const setSpecs = (specs) => {
            rowsEl.textContent = '';

            const normalized = [];
            if (Array.isArray(specs)) {
                specs.forEach((it) => {
                    if (!it) return;
                    if (typeof it === 'string') {
                        normalized.push(...parseSpecsTextarea(it));
                        return;
                    }
                    const label = String(it.label ?? it.key ?? '').trim();
                    const value = String(it.value ?? '').trim();
                    if (!label) return;
                    normalized.push({ label, value });
                });
            } else if (typeof specs === 'string') {
                normalized.push(...parseSpecsTextarea(specs));
            }

            if (normalized.length === 0) {
                rowsEl.appendChild(makeRow());
            } else {
                normalized.slice(0, maxRows).forEach((it) => rowsEl.appendChild(makeRow(it)));
            }

            updateRemoveState();
        };

        const reset = () => setSpecs([]);

        addBtn.addEventListener('click', () => {
            const rows = Array.from(rowsEl.querySelectorAll('.vc-spec-row'));
            if (rows.length >= maxRows) return;
            const r = makeRow();
            rowsEl.appendChild(r);
            updateRemoveState();
            try { r.querySelector('.vc-spec-key')?.focus(); } catch (_) { /* ignore */ }
        });

        ensureOneRow();

        // When the upload form resets, also reset the dynamic rows.
        form?.addEventListener('reset', () => reset());

        // Expose for edit mode and submit.
        window.VendoscitySpecsEditor = { getSpecs, setSpecs, reset, maxRows };
    })();

    function normalizePathname(p) {
        const s = String(p || '').trim();
        if (!s) return '/';
        // Remove trailing slash for stable comparisons (except root).
        if (s.length > 1 && s.endsWith('/')) return s.slice(0, -1);
        return s;
    }

    function isAuthPage(pathname) {
        const path = normalizePathname(pathname).toLowerCase();
        const isLogin = path.endsWith('/pages/connexion') || path.endsWith('/connexion') || path.endsWith('/pages/connexion.html') || path.endsWith('/connexion.html');
        const isRegister = path.endsWith('/pages/inscription') || path.endsWith('/inscription') || path.endsWith('/pages/inscription.html') || path.endsWith('/inscription.html');
        return { isLogin, isRegister, isAuth: isLogin || isRegister };
    }

    // Dedicated auth pages: if already logged in, don't keep showing the form.
    try {
        const path = String(window.location.pathname || '');
        const flags = isAuthPage(path);
        if (flags.isAuth) {
            const token = localStorage.getItem('sellerToken');
            const refresh = localStorage.getItem('sellerRefreshToken');
            if (token || refresh) {
                window.location.replace('/pages/Dashboard.html');
                return;
            }
        }
    } catch (_) {
        // ignore
    }

    // Listeners Auth
    const loginForm = document.getElementById('seller-login-form');
    const registerForm = document.getElementById('seller-register-form');
    const uploadForm = document.getElementById('product-upload-form');

    // Specs are now handled via the key/value editor in Dashboard.html (no textarea).

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            if (!email || !password) {
                alert('Erreur: Email et mot de passe obligatoires.');
                return;
            }
            
            const btn = loginForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader" class="lucide-spin"></i> Connexion...';
            if (typeof lucide !== 'undefined') lucide.createIcons();

            try {
                console.log('Tentative de connexion...');
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                console.log('Réponse reçue:', res.status);
                
                const textRes = await res.text();
                let data = {};
                if (textRes) {
                    try { data = JSON.parse(textRes); } 
                    catch(e) { 
                        console.error('Parse error:', textRes);
                        throw new Error('Réponse API invalide: ' + textRes); 
                    }
                }
                
                if (!res.ok) {
                    console.error('Erreur API:', data);
                    throw new Error(data.error || `Erreur ${res.status}`);
                }
                
                // Sauvegarde session Supabase
                if (data?.session?.access_token) {
                    localStorage.setItem('sellerToken', data.session.access_token);
                }
                if (data?.session?.refresh_token) {
                    localStorage.setItem('sellerRefreshToken', data.session.refresh_token);
                }
                if (data?.session?.expires_at) {
                    localStorage.setItem('sellerTokenExpiresAt', String(data.session.expires_at));
                }

                const token = (window.VendoscitySession && typeof window.VendoscitySession.getValidAccessToken === 'function')
                    ? await window.VendoscitySession.getValidAccessToken()
                    : data.session.access_token;
                const sellerMeta = await ensureSellerWhatsApp({ token, sellerMeta: data.user.user_metadata });
                localStorage.setItem('sellerData', JSON.stringify(sellerMeta));
                
                console.log('Connexion réussie.');
                alert('Connexion réussie.');
                checkSellerSession();
                // Synchroniser le reste du dashboard (Profil, etc.)
                if (window.initDashboard) window.initDashboard();
                loginForm.reset();

                // If login happens on the dedicated login page, redirect to Dashboard seller area.
                try {
                    const path = String(window.location.pathname || '');
                    if (isAuthPage(path).isLogin) {
                        window.location.replace('/pages/Dashboard.html');
                    }
                } catch (_) {
                    // ignore
                }
            } catch (err) {
                console.error('Erreur complète:', err);
                let errorMsg = err.message;
                
                if (errorMsg.includes('Failed to fetch')) {
                    const direct = (typeof window.VENDOSCITY_API_DIRECT_URL === 'string') ? window.VENDOSCITY_API_DIRECT_URL : 'https://vendoscity.onrender.com';
                    errorMsg = 'Impossible de contacter le serveur.\n\n' +
                        '- Si vous etes sur Vercel: verifiez que /api fonctionne (proxy Vercel).\n' +
                        `- Sinon, verifiez que le backend repond sur ${direct}`;
                } else if (errorMsg.includes('Invalid') || errorMsg.includes('400')) {
                    errorMsg = 'Email ou mot de passe incorrect ! (Ou email non confirmé)';
                }
                
                alert('Erreur de connexion :\n\n' + errorMsg);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const whatsapp = document.getElementById('reg-whatsapp').value;
            
            // Validation basique
            if (!name || !email || !password || !whatsapp) {
                alert('Erreur: Tous les champs sont obligatoires.');
                return;
            }
            
            if (password.length < 6) {
                alert('Erreur: Le mot de passe doit contenir au moins 6 caractères.');
                return;
            }
            
            const btn = registerForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader" class="lucide-spin"></i> Inscription...';
            if (typeof lucide !== 'undefined') lucide.createIcons();

            try {
                console.log('Envoi de l\'inscription...');
                const res = await fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, name, whatsapp })
                });
                
                console.log('Réponse reçue:', res.status);
                
                const textRes = await res.text();
                let data = {};
                
                if (textRes) {
                    try { 
                        data = JSON.parse(textRes); 
                    } catch(e) { 
                        console.error('Parse error:', textRes);
                        throw new Error('Réponse API invalide: ' + textRes); 
                    }
                }
                
                if (!res.ok) {
                    console.error('Erreur API:', data);
                    const errorMsg = data.error || `Erreur ${res.status}`;
                    throw new Error(errorMsg);
                }
                
                console.log('Inscription réussie.');
                // Synchroniser le dashboard si nécessaire (même si l'email n'est pas encore confirmé, en mode "confirm=off")
                if (window.initDashboard) window.initDashboard();
                alert('Inscription réussie.\n\nIMPORTANT : Un email de confirmation a été envoyé à ' + email + '. Vous devez cliquer sur le lien dans cet email pour activer votre compte avant de pouvoir vous connecter.');
                registerForm.reset();

                // If registration happens on the dedicated register page, redirect to login.
                try {
                    const path = String(window.location.pathname || '');
                    if (path.includes('/pages/Inscription.html') || path.endsWith('/Inscription.html') || path.includes('Inscription.html')) {
                        window.location.replace('/pages/Connexion.html');
                    }
                } catch (_) {
                    // ignore
                }
            } catch (err) {
                console.error('Erreur complète:', err);
                let errorMsg = err.message;
                
                if (errorMsg.includes('Failed to fetch')) {
                    const direct = (typeof window.VENDOSCITY_API_DIRECT_URL === 'string') ? window.VENDOSCITY_API_DIRECT_URL : 'https://vendoscity.onrender.com';
                    errorMsg = 'Impossible de contacter le serveur. Verifiez votre connexion.\n' +
                        `Si le probleme persiste: essayez en reseau different ou verifiez ${direct}`;
                }
                
                alert('Erreur d\'inscription :\n\n' + errorMsg);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }

	        if (uploadForm) {
	        uploadForm.addEventListener('submit', async (e) => {
	            e.preventDefault();
            
            const btn = document.getElementById('product-submit-btn') || uploadForm.querySelector('button[type="submit"]');
            const cancelBtn = document.getElementById('product-cancel-edit-btn');
            const editingId = window.__vendoscityEditingProductId ? String(window.__vendoscityEditingProductId) : '';
            const isEdit = Boolean(editingId);
            btn.disabled = true;
            btn.textContent = isEdit ? 'Enregistrement...' : 'Envoi en cours...';

            const formData = new FormData();
            const priceVal = parseFloat(document.getElementById('prod-price').value) || 0;
            const discountVal = parseFloat(document.getElementById('prod-discount')?.value || '0') || 0;
            const oldPriceVal = priceVal + discountVal;

            formData.append('title', document.getElementById('prod-title').value);
            formData.append('price', priceVal);
            formData.append('discount_amount', discountVal);
            if (discountVal > 0) {
                formData.append('old_price', oldPriceVal);
            }
            formData.append('category', document.getElementById('prod-category').value);
            formData.append('description', document.getElementById('prod-desc').value);
            formData.append('quartier', (document.getElementById('prod-quartier')?.value || '').trim());

	            const specs = (window.VendoscitySpecsEditor && typeof window.VendoscitySpecsEditor.getSpecs === 'function')
	                ? window.VendoscitySpecsEditor.getSpecs()
	                : parseSpecsTextarea(document.getElementById('prod-specs')?.value || '');
	            if (specs.length > 0) {
	                formData.append('specs', JSON.stringify(specs));
	            }
            
            const fileInput = document.getElementById('prod-image');
            const files = Array.from(fileInput?.files || []);
            if (!isEdit && files.length === 0) {
                alert('Ajoutez au moins une image.');
                btn.disabled = false;
                btn.textContent = 'Publier le Produit';
                return;
            }
            if (files.length > 6) {
                alert('Vous pouvez ajouter au maximum 6 images.');
                btn.disabled = false;
                btn.textContent = 'Publier le Produit';
                return;
            }
            const compressImage = async (file, maxWidth = 1200, quality = 0.8) => {
                if (!file.type.startsWith('image/')) return file;
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            let w = img.width;
                            let h = img.height;
                            if (w > maxWidth || h > maxWidth) {
                                if (w > h) { h = Math.round(h * (maxWidth / w)); w = maxWidth; }
                                else { w = Math.round(w * (maxWidth / h)); h = maxWidth; }
                            }
                            const canvas = document.createElement('canvas');
                            canvas.width = w; canvas.height = h;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, w, h);
                            canvas.toBlob((blob) => {
                                if (!blob) resolve(file);
                                else resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
                            }, 'image/jpeg', quality);
                        };
                        img.onerror = () => resolve(file);
                        img.src = e.target.result;
                    };
                    reader.onerror = () => resolve(file);
                    reader.readAsDataURL(file);
                });
            };

            for (const f of files) {
                try {
                    const compressed = await compressImage(f);
                    formData.append('images', compressed);
                } catch (err) {
                    formData.append('images', f); // Fallback to raw file if compression fails
                }
            }

            // Récupérer le whatsapp du vendeur depuis le localStorage
            const sellerData = JSON.parse(localStorage.getItem('sellerData') || '{}');
            if (sellerData.whatsapp) {
                formData.append('whatsapp', sellerData.whatsapp);
            } else {
                alert('Votre numero WhatsApp est manquant. Allez dans "Mon Profil" et renseignez votre WhatsApp (commandes), puis reessayez.');
                btn.disabled = false;
                btn.textContent = 'Publier le Produit';
                return;
            }

            const token = (window.VendoscitySession && typeof window.VendoscitySession.getValidAccessToken === 'function')
                ? await window.VendoscitySession.getValidAccessToken()
                : localStorage.getItem('sellerToken');

            if (!token) {
                alert('Session expirée. Reconnectez-vous puis réessayez.');
                btn.disabled = false;
                btn.textContent = isEdit ? 'Enregistrer' : 'Publier le Produit';
                return;
            }

            const controller = new AbortController();
            const timeoutMs = 90000; // 1m30 max: on évite “plusieurs minutes sans réponse”
            const t = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const endpoint = isEdit ? `/api/products/${encodeURIComponent(editingId)}` : '/api/products';
                const method = isEdit ? 'PUT' : 'POST';
                // Important (mobile/prod): use authFetch to auto-refresh on 401 then retry once.
                const res = (window.VendoscitySession && typeof window.VendoscitySession.authFetch === 'function')
                    ? await window.VendoscitySession.authFetch(endpoint, { method, body: formData, signal: controller.signal })
                    : await fetch(`${API_BASE}${endpoint.replace('/api', '')}`, {
                        method,
                        headers: {
                            'Authorization': `Bearer ${token}`
                    },
                    body: formData,
                    signal: controller.signal
                    });

                const status = Number(res?.status) || 0;
                const statusText = String(res?.statusText || '').trim();
                const contentType = (typeof res?.headers?.get === 'function')
                    ? String(res.headers.get('content-type') || '').toLowerCase()
                    : '';

                const textRes = await res.text();
                let data = null;
                let parsedJson = false;
                if (textRes) {
                    // L'API devrait renvoyer du JSON, mais Vercel/Render peuvent renvoyer de l'HTML en 502/504.
                    try {
                        data = JSON.parse(textRes);
                        parsedJson = true;
                    } catch (_) {
                        data = null;
                    }
                }

                if (!res.ok) {
                    // Debug minimal: ne pas logguer le FormData, uniquement la réponse.
                    try {
                        const proxyHdr = (typeof res?.headers?.get === 'function') ? res.headers.get('x-vendoscity-proxy') : null;
                        console.warn('[Vendoscity] API error', {
                            endpoint,
                            method,
                            status,
                            statusText,
                            contentType,
                            proxy: proxyHdr,
                            bodyPreview: (textRes || '').slice(0, 600)
                        });
                    } catch (_) { /* ignore */ }

                    const apiError =
                        (data && typeof data === 'object' && (data.error || data.message)) ? String(data.error || data.message) : '';

                    let msg = apiError;
                    if (!msg) {
                        if (status === 502 || status === 504) {
                            msg = `Serveur indisponible (${status}). Le backend est probablement en veille ou en timeout. Attendez 20-60s puis réessayez.`;
                        } else if (status === 413) {
                            msg = 'Fichiers trop lourds (413). Réduisez la taille des images (compression) puis réessayez.';
                        } else if (status) {
                            msg = `Erreur API (${status}${statusText ? ' ' + statusText : ''}).`;
                        } else {
                            msg = 'Erreur réseau (aucune réponse du serveur).';
                        }

                        // Si on a un corps non-JSON (souvent HTML), l'afficher partiellement pour diagnostic.
                        if (textRes && !parsedJson && (contentType.includes('text/html') || /^</.test(textRes.trim()))) {
                            msg += ` Détails (extrait): ${textRes.trim().slice(0, 200)}...`;
                        }
                    }

                    throw new Error(msg);
                }

                const warning = data && typeof data === 'object' ? data.warning : null;
                if (warning) {
                    alert((isEdit ? 'Produit modifié, mais attention:\n\n' : 'Produit publié, mais attention:\n\n') + warning);
                } else {
                    alert(isEdit ? 'Produit modifié avec succès !' : 'Produit publié avec succès !');
                }
                uploadForm.reset();
                window.__vendoscityEditingProductId = null;
                if (cancelBtn) cancelBtn.style.display = 'none';
                if (btn) btn.textContent = 'Publier le Produit';
                try {
                    if (fileInput) fileInput.required = true;
                    const hint = document.getElementById('prod-image-hint');
                    if (hint) hint.textContent = 'La premiere image sera utilisee comme image principale.';
                } catch (_) { /* ignore */ }
                if (typeof loadSellerProducts === 'function') {
                    await loadSellerProducts();
                }
            } catch (err) {
                const msg = (err && err.name === 'AbortError')
                    ? 'Upload trop long (timeout). Réessayez avec des images plus légères (1 image d’abord) ou une meilleure connexion.'
                    : (err?.message ? err.message : String(err));
                alert('Erreur lors de ' + (isEdit ? 'la modification' : 'la publication') + ': ' + msg);
            } finally {
                clearTimeout(t);
                btn.disabled = false;
                btn.textContent = window.__vendoscityEditingProductId ? 'Enregistrer' : 'Publier le Produit';
            }
        });
    }

    // Event delegation: avoid inline onclick handlers (framework-friendly).
    const productsTbody = document.getElementById('seller-products-body');
    if (productsTbody) {
        productsTbody.addEventListener('click', async (e) => {
            const delBtn = e.target.closest?.('button[data-action="delete-seller-product"]');
            if (delBtn) {
                const id = delBtn.dataset.id;
                if (!id) return;
                await deleteSellerProduct(id);
                return;
            }

            const editBtn = e.target.closest?.('button[data-action="edit-seller-product"]');
            if (editBtn) {
                const id = editBtn.dataset.id;
                if (!id) return;
                startEditSellerProduct(id);
            }
        });
    }

    const cancelBtn = document.getElementById('product-cancel-edit-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => stopEditSellerProduct());
    }

    // Prévisualisation des icônes et de la description
    initProductDescriptionPreview();
});

function initProductDescriptionPreview() {
    const descInput = document.getElementById('prod-desc');
    if (!descInput) return;

    // Créer le conteneur de prévisualisation s'il n'existe pas
    let previewContainer = document.getElementById('desc-preview');
    if (!previewContainer) {
        const wrapper = document.createElement('div');
        wrapper.className = 'desc-preview-wrapper';
        wrapper.innerHTML = `
            <div class="desc-preview-label">Aperçu du texte :</div>
            <div id="desc-preview" class="desc-preview-container"></div>
        `;
        descInput.parentNode.insertBefore(wrapper, descInput.nextSibling);
        previewContainer = document.getElementById('desc-preview');
    }

    function updatePreview() {
        const text = descInput.value;
        const formatter = window.formatVendoscityText || ((t) => t);
        previewContainer.innerHTML = formatter(text) || '<span style="color:#ccc">Votre description apparaîtra ici...</span>';
        if (window.lucide) window.lucide.createIcons({ props: { class: 'desc-icon' }, root: previewContainer });
    }

    descInput.addEventListener('input', updatePreview);
    
    // Initialiser au chargement (pour l'édition)
    setTimeout(updatePreview, 100);

    // Patch startEditSellerProduct for update
    const _oldStartEdit = window.startEditSellerProduct;
    window.startEditSellerProduct = function(id) {
        if (typeof _oldStartEdit === 'function') _oldStartEdit(id);
        updatePreview();
    };
}

function checkSellerSession() {
    const token = localStorage.getItem('sellerToken');
    const refresh = localStorage.getItem('sellerRefreshToken');
    const sellerData = JSON.parse(localStorage.getItem('sellerData') || 'null');
    
    const authContainer = document.getElementById('seller-auth-container');
    const dashContainer = document.getElementById('seller-dashboard-container');
    const nameDisplay = document.getElementById('seller-logged-name');

    // If refresh token exists, we consider the session recoverable even if access token is expired.
    // Do NOT require sellerData: on some browsers (mobile/private mode) localStorage may be partially cleared.
    if ((token || refresh) && authContainer && dashContainer) {
        authContainer.style.display = 'none';
        dashContainer.style.display = 'block';
        if (nameDisplay) {
            nameDisplay.textContent = (sellerData && (sellerData.name || sellerData.shop_name)) ? (sellerData.name || sellerData.shop_name) : 'Vendeur';
        }
        if (typeof loadSellerProducts === 'function') loadSellerProducts();
    } else if (authContainer && dashContainer) {
        authContainer.style.display = 'block';
        dashContainer.style.display = 'none';
    }
}

window.sellerLogout = function() {
    localStorage.removeItem('sellerToken');
    localStorage.removeItem('sellerRefreshToken');
    localStorage.removeItem('sellerTokenExpiresAt');
    localStorage.removeItem('sellerData');
    checkSellerSession();
};

function specsToTextarea(specs) {
    if (!Array.isArray(specs)) return '';
    return specs
        .filter(Boolean)
        .map((it) => {
            const label = String(it.label ?? it.key ?? '').trim();
            const value = String(it.value ?? '').trim();
            if (!label) return null;
            return `${label}: ${value}`;
        })
        .filter(Boolean)
        .join('\n');
}

function normalizeCategoryKey(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return '';
    try {
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

function startEditSellerProduct(id) {
    const products = Array.isArray(window.__vendoscitySellerProducts) ? window.__vendoscitySellerProducts : [];
    const p = products.find(x => String(x?.id) === String(id));
    if (!p) return alert('Produit introuvable.');

    window.__vendoscityEditingProductId = String(id);

    const title = document.getElementById('prod-title');
    const price = document.getElementById('prod-price');
    const discount = document.getElementById('prod-discount');
    const category = document.getElementById('prod-category');
    const desc = document.getElementById('prod-desc');
    const specs = document.getElementById('prod-specs');
    const quartier = document.getElementById('prod-quartier');
    const file = document.getElementById('prod-image');
    const hint = document.getElementById('prod-image-hint');

    if (title) title.value = p.title || '';
    if (price) price.value = p.price ?? '';
    if (discount) discount.value = p.discount_amount ?? '';
    if (category) {
        const raw = String(p.category || '');
        const v = normalizeCategoryKey(raw) || raw;
        const has = Array.from(category.options || []).some(o => o.value === v);
        if (has) category.value = v;
    }
    if (desc) desc.value = p.description || '';
    if (window.VendoscitySpecsEditor && typeof window.VendoscitySpecsEditor.setSpecs === 'function') {
        window.VendoscitySpecsEditor.setSpecs(p.specs);
    } else if (specs) {
        specs.value = specsToTextarea(p.specs);
    }
    if (quartier) quartier.value = p.quartier || p.district || p.location || '';

    try { if (file) file.required = false; } catch (_) { /* ignore */ }
    if (hint) hint.textContent = 'Optionnel: ajoutez de nouvelles images pour remplacer les anciennes (sinon, laissez vide).';

    const btn = document.getElementById('product-submit-btn');
    if (btn) btn.textContent = 'Enregistrer';
    const cancelBtn = document.getElementById('product-cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';

    try { document.getElementById('product-upload-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {}
}

function stopEditSellerProduct() {
    window.__vendoscityEditingProductId = null;
    const uploadForm = document.getElementById('product-upload-form');
    if (uploadForm) uploadForm.reset();

    if (window.VendoscitySpecsEditor && typeof window.VendoscitySpecsEditor.reset === 'function') {
        window.VendoscitySpecsEditor.reset();
    }

    const file = document.getElementById('prod-image');
    try { if (file) file.required = true; } catch (_) { /* ignore */ }
    const hint = document.getElementById('prod-image-hint');
    if (hint) hint.textContent = 'La premiere image sera utilisee comme image principale.';

    const btn = document.getElementById('product-submit-btn');
    if (btn) btn.textContent = 'Publier le Produit';
    const cancelBtn = document.getElementById('product-cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';
}

async function loadSellerProducts() {
    try {
        const res = (window.VendoscitySession && typeof window.VendoscitySession.authFetch === 'function')
            ? await window.VendoscitySession.authFetch('/api/products/me')
            : await fetch(`${API_BASE}/products/me`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('sellerToken') || ''}` }
            });
        const textRes = await res.text();
        if (!res.ok) {
            // If session is truly invalid, show disconnected state.
            if (res.status === 401) {
                alert('Session expirée. Reconnectez-vous.');
                if (window.VendoscitySession?.clearSession) window.VendoscitySession.clearSession();
                localStorage.removeItem('sellerData');
                checkSellerSession();
                return;
            }
            throw new Error(textRes || `Erreur ${res.status}`);
        }

        const products = textRes ? JSON.parse(textRes) : [];
        window.__vendoscitySellerProducts = products;

        const tbody = document.getElementById('seller-products-body');
        if (!tbody) return;

        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                  <td colspan="5">
                    <div class="empty-state">
                      <i data-lucide="package-open" width="48" height="48"></i>
                      <p>Vous n'avez aucun produit en ligne.</p>
                    </div>
                  </td>
                </tr>
            `;
        } else {
            tbody.textContent = '';
            const fallbackImg = '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png';

            products.forEach((p) => {
                const tr = document.createElement('tr');

                const tdImg = document.createElement('td');
                const img = document.createElement('img');
                const primary = (Array.isArray(p?.images) && p.images[0]) ? p.images[0] : (p?.image_url || p?.image || fallbackImg);
                img.src = String(primary || fallbackImg);
                img.alt = String(p?.title || 'Produit');
                img.style.width = '50px';
                img.style.height = '50px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '5px';
                img.addEventListener('error', () => { img.src = fallbackImg; });
                tdImg.appendChild(img);

                const tdTitle = document.createElement('td');
                const strong = document.createElement('strong');
                strong.textContent = String(p?.title || '');
                tdTitle.appendChild(strong);

                const tdCat = document.createElement('td');
                const badge = document.createElement('span');
                badge.className = 'status-badge';
                badge.style.background = '#e3f2fd';
                badge.style.color = 'var(--primary-blue)';
                badge.textContent = String(p?.category || '');
                tdCat.appendChild(badge);

                const tdPrice = document.createElement('td');
                const price = Math.round(Number(p?.price) || 0).toLocaleString('fr-FR');
                tdPrice.textContent = `${price} FCFA`;

                const tdActions = document.createElement('td');
                const editBtn = document.createElement('button');
                editBtn.className = 'btn-primary';
                editBtn.style.background = 'var(--color-yellow)';
                editBtn.style.color = 'var(--primary-blue-2)';
                editBtn.style.padding = '8px 12px';
                editBtn.style.fontSize = '0.85rem';
                editBtn.style.marginRight = '8px';
                editBtn.dataset.action = 'edit-seller-product';
                editBtn.dataset.id = String(p?.id ?? '');
                editBtn.type = 'button';
                editBtn.innerHTML = '<i data-lucide="pencil" width="16" height="16"></i> Modifier';

                const delBtn = document.createElement('button');
                delBtn.className = 'btn-primary';
                delBtn.style.background = 'var(--color-red)';
                delBtn.style.padding = '8px 12px';
                delBtn.style.fontSize = '0.85rem';
                delBtn.dataset.action = 'delete-seller-product';
                delBtn.dataset.id = String(p?.id ?? '');
                delBtn.type = 'button';
                delBtn.innerHTML = '<i data-lucide="trash-2" width="16" height="16"></i> Retirer';

                tdActions.appendChild(editBtn);
                tdActions.appendChild(delBtn);

                tr.appendChild(tdImg);
                tr.appendChild(tdTitle);
                tr.appendChild(tdCat);
                tr.appendChild(tdPrice);
                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            });
        }
        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('loadSellerProducts Error:', err);
    }
}

async function deleteSellerProduct(id) {
    if (!confirm('Voulez-vous vraiment retirer ce produit de la vente ?')) return;
    
    try {
        const res = (window.VendoscitySession && typeof window.VendoscitySession.authFetch === 'function')
            ? await window.VendoscitySession.authFetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
            : await fetch(`${API_BASE}/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('sellerToken') || ''}` }
            });
        if (!res.ok) {
            const textRes = await res.text();
            throw new Error(textRes);
        }
        await loadSellerProducts();
    } catch(err) {
        alert('Erreur: ' + err.message);
    }
}

// Back-compat: keep the global for any legacy markup that might still call it.
window.deleteSellerProduct = deleteSellerProduct;

/**
 * VENDOSCITY SMART ICON PICKER (::)
 * Allows sellers to insert icons via ::trigger with French search.
 */
(function initVendoscityIconPicker() {
    const ICONS_MAP = [
        { id: 'truck', label: 'Camion', tags: ['livraison', 'transport', 'logistique'] },
        { id: 'package', label: 'Colis', tags: ['paquet', 'article', 'produit', 'boite'] },
        { id: 'shield', label: 'Sécurité', tags: ['garanti', 'protection', 'fiable', 'assurance'] },
        { id: 'shield-check', label: 'Vérifié', tags: ['authentique', 'sur', 'confiance'] },
        { id: 'zap', label: 'Rapide', tags: ['eclair', 'flash', 'vitesse', 'urgent'] },
        { id: 'heart', label: 'Coeur', tags: ['favori', 'like', 'amour', 'passion'] },
        { id: 'star', label: 'Étoile', tags: ['note', 'avis', 'qualite', 'prestige'] },
        { id: 'phone', label: 'Téléphone', tags: ['appel', 'whatsapp', 'contact', 'mobile'] },
        { id: 'smartphone', label: 'Smartphone', tags: ['mobile', 'android', 'iphone', 'ecran'] },
        { id: 'credit-card', label: 'Carte Bancaire', tags: ['paiement', 'cb', 'banque', 'argent'] },
        { id: 'banknote', label: 'Espèces', tags: ['billets', 'cash', 'argent', 'liquide'] },
        { id: 'wallet', label: 'Portefeuille', tags: ['budget', 'paiement'] },
        { id: 'shopping-cart', label: 'Panier', tags: ['achat', 'shopping', 'panier'] },
        { id: 'shopping-bag', label: 'Sac', tags: ['achat', 'course', 'boutique'] },
        { id: 'gift', label: 'Cadeau', tags: ['surprise', 'offert', 'anniversaire'] },
        { id: 'tag', label: 'Promotion', tags: ['prix', 'etiquette', 'solde', 'reduit'] },
        { id: 'clock', label: 'Temps', tags: ['heure', 'duree', 'chrono', 'livraison'] },
        { id: 'calendar', label: 'Date', tags: ['calendrier', 'rdv', 'planning'] },
        { id: 'map-pin', label: 'Localisation', tags: ['ville', 'adresse', 'map', 'lieu'] },
        { id: 'check-circle', label: 'Succès', tags: ['valider', 'ok', 'reussi', 'fait'] },
        { id: 'alert-circle', label: 'Attention', tags: ['alerte', 'important', 'danger'] },
        { id: 'info', label: 'Info', tags: ['details', 'aide', 'explication'] },
        { id: 'help-circle', label: 'Aide', tags: ['question', 'support', 'faq'] },
        { id: 'user', label: 'Utilisateur', tags: ['profil', 'compte', 'client'] },
        { id: 'users', label: 'Communauté', tags: ['groupe', 'equipe', 'monde'] },
        { id: 'store', label: 'Boutique', tags: ['magasin', 'vendeur', 'commerce'] },
        { id: 'home', label: 'Accueil', tags: ['maison', 'principal'] },
        { id: 'search', label: 'Recherche', tags: ['loupe', 'trouver'] },
        { id: 'settings', label: 'Paramètres', tags: ['reglages', 'options', 'config'] },
        { id: 'trash', label: 'Supprimer', tags: ['corbeille', 'enlever'] },
        { id: 'edit', label: 'Modifier', tags: ['editer', 'stylo'] },
        { id: 'plus', label: 'Ajouter', tags: ['plus', 'nouveau'] },
        { id: 'camera', label: 'Appareil Photo', tags: ['photo', 'image', 'capture'] },
        { id: 'image', label: 'Image', tags: ['galerie', 'photo', 'visuel'] },
        { id: 'video', label: 'Vidéo', tags: ['film', 'camera', 'lecture'] },
        { id: 'music', label: 'Musique', tags: ['son', 'audio', 'note'] },
        { id: 'mic', label: 'Micro', tags: ['voix', 'audio', 'enregistrer'] },
        { id: 'speaker', label: 'Haut-parleur', tags: ['son', 'bruit', 'volume'] },
        { id: 'wifi', label: 'Wifi', tags: ['connexion', 'reseau', 'internet'] },
        { id: 'battery', label: 'Batterie', tags: ['energie', 'charge', 'puissance'] },
        { id: 'lock', label: 'Verrouillé', tags: ['cadenas', 'prive', 'ferme'] },
        { id: 'eye', label: 'Aperçu', tags: ['voir', 'regarder', 'vue', 'oeil'] },
        { id: 'mail', label: 'Email', tags: ['courriel', 'lettre', 'message'] },
        { id: 'share-2', label: 'Partager', tags: ['reseaux', 'lien', 'envoyer'] },
        { id: 'send', label: 'Envoyer', tags: ['message', 'avion', 'bouton'] },
        { id: 'thumbs-up', label: 'Top', tags: ['bien', 'pouce', 'recommande'] },
        { id: 'award', label: 'Récompense', tags: ['prix', 'medaille', 'trophee', 'expert'] },
        { id: 'briefcase', label: 'Professionnel', tags: ['travail', 'emploi', 'mallette'] },
        { id: 'leaf', label: 'Bio', tags: ['nature', 'vert', 'ecolo', 'sante'] },
        { id: 'box', label: 'Boîte', tags: ['cube', 'conteneur'] },
        { id: 'coffee', label: 'Pause', tags: ['cafe', 'boisson', 'detente'] },
        { id: 'utensils', label: 'Cuisine', tags: ['manger', 'restaurant', 'repas'] },
        { id: 'shirt', label: 'Vêtement', tags: ['habits', 'mode', 't-shirt'] },
        { id: 'car', label: 'Véhicule', tags: ['voiture', 'transport', 'auto'] },
        { id: 'headphones', label: 'Casque', tags: ['musique', 'audio', 'ecoute'] },
        { id: 'monitor', label: 'Ordinateur', tags: ['ecran', 'pc', 'bureau'] },
        { id: 'laptop', label: 'Portable', tags: ['pc', 'ordinateur', 'clavier'] },
        { id: 'hard-drive', label: 'Stockage', tags: ['disque', 'memoire', 'ssd'] },
        { id: 'key', label: 'Clé', tags: ['acces', 'clef', 'securite'] },
        { id: 'map', label: 'Carte', tags: ['plan', 'voyage', 'itineraire'] },
        { id: 'navigation', label: 'Navigation', tags: ['gps', 'fleche', 'direction'] }
    ];

    let activePicker = null;
    let currentInput = null;
    let filteredIcons = [];
    let selectedIndex = 0;

    function createPicker() {
        const picker = document.createElement('div');
        picker.className = 'vc-icon-picker';
        picker.innerHTML = `
            <div class="vc-picker-search-container">
                <input type="text" class="vc-picker-search" placeholder="Rechercher une icône (ex: camion)..." spellcheck="false" autocomplete="off">
            </div>
            <div class="vc-picker-list"></div>
        `;
        document.body.appendChild(picker);
        return picker;
    }

    function renderIcons(picker, list, filter = '') {
        const listContainer = picker.querySelector('.vc-picker-list');
        listContainer.innerHTML = '';
        
        const term = filter.toLowerCase().trim();
        filteredIcons = term 
            ? ICONS_MAP.filter(i => 
                i.label.toLowerCase().includes(term) || 
                i.tags.some(tag => tag.toLowerCase().includes(term))
              )
            : [...ICONS_MAP];

        if (filteredIcons.length === 0) {
            listContainer.innerHTML = '<div class="vc-picker-empty">Aucune icône trouvée</div>';
            return;
        }

        selectedIndex = Math.min(selectedIndex, filteredIcons.length - 1);

        filteredIcons.forEach((icon, idx) => {
            const item = document.createElement('div');
            item.className = `vc-picker-item ${idx === selectedIndex ? 'is-active' : ''}`;
            item.innerHTML = `
                <div class="icon-preview"><i data-lucide="${icon.id}"></i></div>
                <div class="icon-label">${icon.label}</div>
                <div class="icon-tags">${icon.tags[0] || ''}</div>
            `;
            item.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectIcon(icon);
            };
            listContainer.appendChild(item);
        });

        if (window.lucide) window.lucide.createIcons({ attrs: { class: 'desc-icon' }, nameAttr: 'data-lucide', root: listContainer });
    }

    function selectIcon(icon) {
        if (!currentInput) return;
        const val = currentInput.value;
        const pos = currentInput.selectionStart;
        const textToTrigger = val.substring(0, pos);
        const triggerMatch = textToTrigger.match(/::([a-zA-ZÀ-ÿ0-9-]*)$/);
        
        if (triggerMatch) {
            const start = triggerMatch.index;
            const end = pos;
            const before = val.substring(0, start);
            const after = val.substring(end);
            const insertText = ` :${icon.id}: `;
            
            currentInput.value = before + insertText + after;
            const newPos = start + insertText.length;
            currentInput.setSelectionRange(newPos, newPos);
            
            // Trigger input event to update preview
            currentInput.dispatchEvent(new Event('input'));
        }
        hidePicker();
    }

    function hidePicker() {
        if (activePicker) {
            activePicker.remove();
            activePicker = null;
        }
        currentInput = null;
        selectedIndex = 0;
    }

    function getCaretCoordinates(element, position) {
        const div = document.createElement('div');
        const style = window.getComputedStyle(element);
        
        div.style.position = 'absolute';
        div.style.visibility = 'hidden';
        div.style.whiteSpace = 'pre-wrap';
        div.style.wordWrap = 'break-word';
        div.style.width = style.width;
        div.style.font = style.font;
        div.style.padding = style.padding;
        div.style.border = style.border;
        div.style.boxSizing = style.boxSizing;
        
        div.textContent = element.value.substring(0, position);
        const span = document.createElement('span');
        span.textContent = element.value.substring(position) || '.';
        div.appendChild(span);
        document.body.appendChild(div);
        
        const { offsetTop: top, offsetLeft: left } = span;
        const rect = element.getBoundingClientRect();
        document.body.removeChild(div);
        
        return {
            top: rect.top + top + window.scrollY - element.scrollTop,
            left: rect.left + left + window.scrollX - element.scrollLeft
        };
    }

    function handleInput(e) {
        const input = e.target;
        const val = input.value;
        const pos = input.selectionStart;
        const textToCursor = val.substring(0, pos);
        const match = textToCursor.match(/::([a-zA-ZÀ-ÿ0-9-]*)$/);

        if (match) {
            currentInput = input;
            if (!activePicker) {
                activePicker = createPicker();
                const coords = getCaretCoordinates(input, match.index);
                activePicker.style.top = `${coords.top + 25}px`;
                activePicker.style.left = `${Math.min(coords.left, window.innerWidth - 270)}px`;
                
                const searchInput = activePicker.querySelector('.vc-picker-search');
                searchInput.addEventListener('input', (ie) => {
                    selectedIndex = 0;
                    renderIcons(activePicker, ICONS_MAP, ie.target.value);
                });
                
                searchInput.addEventListener('keydown', (ke) => {
                    if (ke.key === 'ArrowDown') {
                        ke.preventDefault();
                        selectedIndex = (selectedIndex + 1) % filteredIcons.length;
                        renderIcons(activePicker, ICONS_MAP, ke.target.value);
                    } else if (ke.key === 'ArrowUp') {
                        ke.preventDefault();
                        selectedIndex = (selectedIndex - 1 + filteredIcons.length) % filteredIcons.length;
                        renderIcons(activePicker, ICONS_MAP, ke.target.value);
                    } else if (ke.key === 'Enter') {
                        ke.preventDefault();
                        if (filteredIcons[selectedIndex]) selectIcon(filteredIcons[selectedIndex]);
                    } else if (ke.key === 'Escape') {
                        ke.preventDefault();
                        hidePicker();
                        input.focus();
                    }
                });

                searchInput.focus();
            }
            const searchTerm = match[1];
            renderIcons(activePicker, ICONS_MAP, searchTerm);
        } else if (activePicker) {
            // Keep picker if we are typing inside the search box, but handle cleanup
            // In this version, the search box takes focus, so this part won't trigger easily
        }
    }

    // Global click listener to close picker
    document.addEventListener('mousedown', (e) => {
        if (activePicker && !activePicker.contains(e.target) && currentInput !== e.target) {
            hidePicker();
        }
    });

    /**
     * AUTO-CONVERSION DES EMOJIS AU COLLAGE (PASTE)
     */
    function handlePaste(e) {
        const input = e.target;
        const clipboardData = e.clipboardData || window.clipboardData;
        const pastedText = clipboardData.getData('text');
        
        if (!pastedText) return;

        // Check if there's any emoji to convert
        let hasEmoji = false;
        const emojis = Object.keys(ICONS_MAP.reduce((acc, i) => {
            // We'll use a simpler map for paste to keep it fast
            return acc;
        }, {}));
        
        // Re-using the same list logic as script.js but in seller context
        const PASTE_EMOJI_MAP = {
            '🚚': 'truck', '📦': 'package', '🛡️': 'shield', '🛡': 'shield', '⚡': 'zap',
            '❤️': 'heart', '❤': 'heart', '⭐': 'star', '📞': 'phone', '📱': 'smartphone',
            '💳': 'credit-card', '🎁': 'gift', '🏷️': 'tag', '🏷': 'tag', '⏰': 'clock',
            '📍': 'map-pin', '✅': 'check-circle', '⚠️': 'alert-circle', '🛒': 'shopping-cart',
            '🛍️': 'shopping-bag', '🛍': 'shopping-bag', '🏠': 'home', '🔍': 'search',
            '⚙️': 'settings', '⚙': 'settings', '🗑️': 'trash', '🗑': 'trash', '✏️': 'edit',
            '➕': 'plus', '📷': 'camera', '🖼️': 'image', '🖼': 'image', '🎥': 'video', 
            '🎵': 'music', '🎤': 'mic', '📢': 'speaker', '📶': 'wifi', '🔋': 'battery',
            '🔒': 'lock', '👁️': 'eye', '👁': 'eye', '✉️': 'mail', '📤': 'share-2',
            '🚀': 'send', '👍': 'thumbs-up', '🏆': 'award', '💼': 'briefcase', '🌿': 'leaf',
            '☕': 'coffee', '🍴': 'utensils', '👕': 'shirt', '🚗': 'car', '🎧': 'headphones',
            '💻': 'monitor', '💾': 'hard-drive', '🔑': 'key', '🗺️': 'map', '🗺': 'map'
        };

        let newText = pastedText;
        let converted = false;
        for (const [emoji, id] of Object.entries(PASTE_EMOJI_MAP)) {
            if (newText.includes(emoji)) {
                newText = newText.split(emoji).join(` :${id}: `);
                converted = true;
            }
        }

        if (converted) {
            e.preventDefault();
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const val = input.value;
            input.value = val.substring(0, start) + newText + val.substring(end);
            
            // Reposition cursor
            const newPos = start + newText.length;
            input.setSelectionRange(newPos, newPos);
            
            // Trigger input event
            input.dispatchEvent(new Event('input'));
        }
    }

    // Attach to specific elements periodically or on demand
    function attachToElements() {
        const targets = document.querySelectorAll('#prod-desc, .vc-specs-row-value');
        targets.forEach(t => {
            if (!t.dataset.pickerInit) {
                t.dataset.pickerInit = '1';
                t.addEventListener('input', handleInput);
                t.addEventListener('paste', handlePaste); // Auto-convert emojis on paste
            }
        });
    }

    // Initial attach
    window.setInterval(attachToElements, 1000);
})();
