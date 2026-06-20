// dashboard.js - Gestion dynamique des onglets du tableau de bord (Acheteur/Vendeur)

const API = `${API_BASE_URL}/api`;

document.addEventListener('DOMContentLoaded', () => {
    // Exécuté au chargement du Dashboard
    initDashboard();

    // Sidebar navigation (framework-friendly, no inline onclick)
    const menu = document.querySelector('.dashboard-menu');
    if (menu) {
        menu.addEventListener('click', (e) => {
            const item = e.target.closest?.('.dashboard-menu-item[data-section]');
            if (!item) return;
            showSection(item.dataset.section, item);
        });

        menu.addEventListener('keydown', (e) => {
            const item = e.target.closest?.('.dashboard-menu-item[data-section]');
            if (!item) return;
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            showSection(item.dataset.section, item);
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => logout());
        logoutBtn.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            logout();
        });
    }

    checkLogoutButton();

    // Page-level actions that previously relied on inline onclick
    document.addEventListener('click', (e) => {
        const btn = e.target.closest?.('button[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        if (action === 'seller-logout') {
            if (typeof window.sellerLogout === 'function') window.sellerLogout();
            checkLogoutButton();
        } else if (action === 'share-shop') {
            shareShop();
        }
    });

    // Listeners pour les formulaires du Dashboard
    // Listeners pour les boutons Modifier/Annuler du Profil
    const editBtn = document.getElementById('edit-profile-btn');
    const cancelBtn = document.getElementById('cancel-profile-btn');
    const saveBtn = document.getElementById('save-profile-btn');
    const profileFormEl = document.querySelector('#profile form');

    if (editBtn) {
        editBtn.addEventListener('click', () => toggleProfileEdit(true));
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('sellerToken');
            if (token) await loadProfile(token); // Recharger les données originales
            toggleProfileEdit(false);
        });
    }

    if (profileFormEl) {
        profileFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            const success = await updateProfile();
            if (success) toggleProfileEdit(false);
        });
    }
});

function checkLogoutButton() {
    const token = localStorage.getItem('sellerToken');
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;
    logoutBtn.style.display = token ? 'flex' : 'none';
}

function showSection(sectionId, activeMenuItem) {
    const id = String(sectionId || '').trim();
    if (!id) return;

    // Masquer toutes les sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });

    // Mettre à jour les boutons du menu
    document.querySelectorAll('.dashboard-menu-item').forEach(item => {
        item.classList.remove('active');
    });
    if (activeMenuItem) activeMenuItem.classList.add('active');

    // Afficher la section sélectionnée
    const section = document.getElementById(id);
    if (section) section.classList.add('active');
}

function logout() {
    if (!confirm('Êtes-vous sûr de vouloir vous déconnecter?')) return;
    try {
        localStorage.removeItem('sellerToken');
    } catch (_) {
        // ignore
    }
    window.location.href = '/';
}

async function shareShop() {
    try {
        const token = localStorage.getItem('sellerToken');
        if (!token) return alert('Session expirée');
        const payloadStr = atob(token.split('.')[1]);
        const payload = JSON.parse(payloadStr);
        const sellerId = payload.sub || payload.id;
        
        if (!sellerId) return alert('Impossible de récupérer l\\'ID vendeur');
        
        const url = new URL(`/pages/Vendeur.html?id=${encodeURIComponent(sellerId)}`, window.location.origin).toString();
        
        const sellerData = JSON.parse(localStorage.getItem('sellerData') || '{}');
        const shopName = sellerData.shop_name || sellerData.name || 'ma boutique';
        
        const title = `Boutique Vendoscity - ${shopName}`;
        const text = `Découvrez tous les articles de ${shopName} sur Vendoscity !`;
        
        if (window.VendoscityShare && typeof window.VendoscityShare.share === 'function') {
            await window.VendoscityShare.share({ title, text, url });
        } else if (navigator.share) {
            await navigator.share({ title, text, url });
        } else {
            await navigator.clipboard.writeText(url);
            alert('Lien de votre boutique copié : ' + url);
        }
    } catch(err) {
        console.error('Erreur partage', err);
        alert('Lien de votre boutique copié !'); // Fallback in case of AbortError
    }
}

// Back-compat (if some HTML still calls them)
window.showSection = showSection;
window.logout = logout;
window.checkLogoutButton = checkLogoutButton;

/**
 * Bascule l'état d'édition du profil
 */
function toggleProfileEdit(editable) {
    const form = document.querySelector('#profile form');
    if (!form) return;
    const inputs = form.querySelectorAll('input, textarea');
    const editBtn = document.getElementById('edit-profile-btn');
    const cancelBtn = document.getElementById('cancel-profile-btn');
    const saveBtn = document.getElementById('save-profile-btn');

    inputs.forEach(input => {
        // Supprimer la restriction sur l'email si on veut permettre sa modification
        input.disabled = !editable;
        
        // Style visuel pour indiquer l'état
        if (!editable) {
            input.style.backgroundColor = '#f8f9fa';
            input.style.cursor = 'not-allowed';
        } else {
            input.style.backgroundColor = '#fff';
            input.style.cursor = 'text';
        }
    });

    if (editBtn) editBtn.style.display = editable ? 'none' : 'block';
    if (cancelBtn) cancelBtn.style.display = editable ? 'block' : 'none';
    if (saveBtn) saveBtn.style.display = editable ? 'block' : 'none';
    
    // Si on active l'édition, focus sur le premier champ (Prénom par défaut)
    if (editable) {
        const firstInput = document.getElementById('firstName');
        if (firstInput) firstInput.focus();
    }
}

/**
 * Initialise le tableau de bord
 * Expose à window pour être appelé depuis seller.js après login
 */
window.initDashboard = async function() {
    // 1. Récupérer le token (on utilise le token vendeur car c'est le seul login actuel)
    const token = localStorage.getItem('sellerToken');
    
    // Si pas de token, on laisse l'affichage par défaut (vide) ou on redirige
    if (!token) return;

    // 2. Charger les données utiles (profil uniquement).
    await loadProfile(token);
}

/**
 * Charge & Affiche le Profil
 */
async function loadProfile(tokenFromCaller) {
    try {
        const dashboardSession = window.VendoscitySession;
        const token = dashboardSession ? await dashboardSession.getValidAccessToken() : (tokenFromCaller || localStorage.getItem('sellerToken'));
        
        if (!token) return;

        const res = (dashboardSession && typeof dashboardSession.authFetch === 'function')
            ? await dashboardSession.authFetch('/api/user/profile')
            : await fetch(`${API}/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

        if (res.status === 401) {
            console.warn('Session expirée détectée dans loadProfile');
            return;
        }
        if (!res.ok) throw new Error(`Erreur chargement profil (${res.status})`);
        
        const profile = await res.json();
        
        // Mettre à jour les champs du formulaire Profil
        if (profile && typeof profile === 'object') {
            if (document.getElementById('email')) document.getElementById('email').value = profile.email || '';
            if (document.getElementById('firstName')) document.getElementById('firstName').value = profile.first_name || '';
            if (document.getElementById('lastName')) document.getElementById('lastName').value = profile.last_name || '';
            if (document.getElementById('shopName')) document.getElementById('shopName').value = profile.shop_name || '';
            if (document.getElementById('phone')) document.getElementById('phone').value = profile.phone || '';
            if (document.getElementById('bio')) document.getElementById('bio').value = profile.bio || '';
            
            // Verrouiller les champs par défaut après chargement
            toggleProfileEdit(false);
        }
    } catch (err) {
        console.error('loadProfile:', err);
    }
}

/**
 * Met à jour le profil de l'utilisateur
 * @returns {Promise<boolean>} true si succès
 */
async function updateProfile() {
    const dashboardSession = window.VendoscitySession;
    const oldEmail = document.getElementById('email').value;
    
    // S'assurer qu'on a un token valide avant la tentative
    const token = dashboardSession ? await dashboardSession.getValidAccessToken() : localStorage.getItem('sellerToken');
    
    if (!token) {
        alert('Session expirée ou invalide. Veuillez vous reconnecter.');
        window.location.href = '/pages/Connexion.html';
        return false;
    }

    const btn = document.getElementById('save-profile-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader"></i> Enregistrement...';
    btn.disabled = true;

    const data = {
        email: String(document.getElementById('email').value).trim(),
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        shop_name: document.getElementById('shopName').value,
        phone: document.getElementById('phone').value,
        bio: document.getElementById('bio').value
    };

    const newPassword = document.getElementById('newPassword').value;
    if (newPassword && newPassword.length >= 6) {
        data.password = newPassword;
    }

    const emailChanged = data.email && oldEmail && (data.email.toLowerCase() !== oldEmail.toLowerCase());

    try {
        const res = (dashboardSession && typeof dashboardSession.authFetch === 'function')
            ? await dashboardSession.authFetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            : await fetch(`${API}/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

        if (res.status === 401) throw new Error('Session expirée. Reconnectez-vous.');
        if (!res.ok) {
            let errMsg = `Erreur ${res.status}`;
            try {
                const errData = await res.json();
                if (errData && errData.error) errMsg = errData.error;
            } catch (_) { /* ignore */ }
            throw new Error(errMsg);
        }

        const updated = await res.json();
        
        let msg = 'Profil sauvegardé avec succès !';
        if (emailChanged) {
            msg += '\n\nIMPORTANT: Votre adresse email a été modifiée. Vous devrez peut-être confirmer votre nouvel email pour rester connecté.';
        }
        alert(msg);
        
        // Re-remplir pour être sûr d'avoir les données formatées serveur (ex: phone)
        if (updated && (updated.first_name !== undefined || updated.email !== undefined)) {
             if (document.getElementById('email') && updated.email) document.getElementById('email').value = updated.email;
             if (document.getElementById('firstName')) document.getElementById('firstName').value = updated.first_name || '';
             if (document.getElementById('lastName')) document.getElementById('lastName').value = updated.last_name || '';
             if (document.getElementById('shopName')) document.getElementById('shopName').value = updated.shop_name || '';
             if (document.getElementById('phone')) document.getElementById('phone').value = updated.phone || '';
             if (document.getElementById('bio')) document.getElementById('bio').value = updated.bio || '';
             if (document.getElementById('newPassword')) document.getElementById('newPassword').value = ''; // Reset password field
             
             // Mettre à jour les métadonnées vendeur si présentes
             if (typeof localStorage !== 'undefined') {
                 try {
                     const sellerData = JSON.parse(localStorage.getItem('sellerData') || '{}');
                     if (updated.shop_name) sellerData.shop_name = updated.shop_name;
                     if (updated.phone) sellerData.whatsapp = updated.phone;
                     localStorage.setItem('sellerData', JSON.stringify(sellerData));
                 } catch(_) {}
             }
        }

        if (window.lucide) lucide.createIcons();
        return true;
    } catch (err) {
        alert('Erreur: ' + err.message);
        return false;
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
