// client/src/core/api.js

export function getApiBaseUrl() {
  if (typeof window === 'undefined') {
    // Côté serveur (SSR)
    return process.env.RENDER_BACKEND_BASE_URL || 'https://vendoscity.onrender.com';
  }

  // Côté client (Navigateur)
  const host = String(window.location.hostname || '').trim();
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  const isPrivateIp =
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host);

  if (isLocalhost) return 'http://localhost:3000';
  if (isPrivateIp) return `http://${host}:3000`;
  return ''; // same-origin proxy (Next.js rewrites)
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  if (!timeoutMs || timeoutMs <= 0) {
    return fetch(url, options);
  }

  const controller = new AbortController();
  const { signal } = controller;
  const config = { ...options, signal };

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(url, config);
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export function normalizeSupabaseImageUrl(raw) {
  const defaultImg = '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png';
  const s = String(raw || '').trim();
  if (!s) return defaultImg;
  if (s.includes('raw.githubusercontent.com')) return defaultImg;
  if (s.toLowerCase().startsWith('blob:')) return defaultImg;
  if (s.toLowerCase().startsWith('file:')) return defaultImg;
  if (s.includes('fakepath')) return defaultImg;
  if (/^[a-zA-Z]:\\/.test(s)) return defaultImg;

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
  } catch (_) {
    // ignore URL parse errors
  }
  return s;
}

export function formatCurrency(amount) {
  const val = Math.round(Number(amount) || 0);
  return val.toLocaleString('fr-FR') + ' FCFA';
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (_) {
    return dateStr;
  }
}

export async function logAnalyticsEvent(eventType, sellerId, productId = null, metadata = {}) {
  if (!sellerId) return;
  try {
    const baseUrl = getApiBaseUrl();
    await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        seller_id: sellerId,
        product_id: productId,
        event_type: eventType,
        metadata
      })
    });
  } catch (err) {
    console.warn('Analytics logging failed:', err);
  }
}

export function getUserAvatarUrl(avatarUrl, seedName = 'V') {
  const s = String(avatarUrl || '').trim();
  if (s && !s.includes('default-avatar.png') && !s.includes('default-product.png')) {
    return normalizeSupabaseImageUrl(s);
  }
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(String(seedName).trim() || 'V')}`;
}

export function compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.75 } = {}) {
  if (typeof window === 'undefined') return Promise.resolve(file);
  
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

