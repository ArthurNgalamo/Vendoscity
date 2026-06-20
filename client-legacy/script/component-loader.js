/**
 * ============================================================
 * COMPONENT LOADER
 * ============================================================
 * 
 * Objectif: Charger les composants HTML réutilisables (header, footer)
 *           et initialiser les scripts qui en dépendent.
 */

const loadComponent = async (url, placeholderId) => {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) {
        console.warn(`Placeholder element with id "${placeholderId}" not found.`);
        return;
    }
    try {
        // Avoid stale component caching on Vercel/CDN.
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to fetch component: ${response.statusText}`);
        }
        const html = await response.text();
        placeholder.outerHTML = html; // Replace placeholder with the component
    } catch (error) {
        console.error(`Error loading component from ${url}:`, error);
        throw error;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const isPagesRoute = window.location.pathname.includes('/pages/');
    const build = (typeof window.VENDOSCITY_BUILD_ID === 'string' && window.VENDOSCITY_BUILD_ID.trim())
        ? window.VENDOSCITY_BUILD_ID.trim()
        : '';
    const withV = (u) => build ? `${u}${u.includes('?') ? '&' : '?'}v=${encodeURIComponent(build)}` : u;

    // Make paths resilient across:
    // - Express static on http://localhost:3000 (root = /client)
    // - Live Server started from repo root or /client
    // - Direct file:// opening (relative paths only)
    const headerCandidates = [
        withV(isPagesRoute ? '../components/_header.html' : './components/_header.html'),
        withV('/components/_header.html')
    ];
    const footerCandidates = [
        withV(isPagesRoute ? '../components/_footer.html' : './components/_footer.html'),
        withV('/components/_footer.html')
    ];

    const loadWithFallback = async (candidates, placeholderId) => {
        const placeholder = document.getElementById(placeholderId);
        if (!placeholder) return;

        for (const url of candidates) {
            try {
                await loadComponent(url, placeholderId);
                return;
            } catch (_) {
                // Try next candidate
            }
        }

        placeholder.innerHTML = `
          <p style="color:red;">
            Failed to load component. Tried:
            <code>${candidates.join(', ')}</code>
          </p>
        `;
    };

    Promise.allSettled([
        loadWithFallback(headerCandidates, 'header-placeholder'),
        loadWithFallback(footerCandidates, 'footer-placeholder')
    ]).then(() => {
        // Page tools: allow pages to mount a controls block into the header.
        // Usage: add `data-vc-header-tools` to an element you want to move into the header slot.
        (function mountHeaderTools() {
            try {
                const slot = document.getElementById('header-tools-slot');
                if (!slot) return;

                const tools = document.querySelector('[data-vc-header-tools]');
                if (!tools) return;

                // Hide the original container section to avoid empty spacing.
                const originSection = tools.closest('section');
                if (originSection) originSection.style.display = 'none';

                tools.classList.add('vc-in-header-tools');
                slot.appendChild(tools);
            } catch (_) {
                // ignore
            }
        })();

        // Now that the header and footer are loaded, initialize the scripts
        
        // 1. Initialize the mobile menu (from script.js)
        if (typeof initializeMobileMenu === 'function') {
            initializeMobileMenu();
        } else {
            console.error('initializeMobileMenu function not found. Make sure script.js is loaded.');
        }

        // 1b. Initialize PWA install button (if present in the header)
        if (typeof initializePWAInstall === 'function') {
            initializePWAInstall();
        }

        // 2. Render Lucide icons (the library must be loaded in <head>)
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        } else {
            console.error('Lucide library not found.');
        }
    });
});
