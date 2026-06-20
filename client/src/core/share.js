// client/src/core/share.js

export async function copyToClipboard(text) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback old browsers
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(input);
    return ok;
  } catch (_) {
    return false;
  }
}

export async function shareLink({ title, text, url }) {
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title || 'Vendoscity';
  const shareText = text || `${shareTitle}\n\nCommande directe via WhatsApp. Plateforme au Cameroun.`;

  const shareData = {
    title: shareTitle,
    text: shareText,
    url: shareUrl
  };

  try {
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return { ok: true, mode: 'native' };
    }
  } catch (_) {
    // User cancelled or browser blocked
  }

  // Copy fallback
  const copied = await copyToClipboard(shareUrl);
  return { ok: copied, mode: 'copy' };
}
