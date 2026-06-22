// client/src/app/mon-espace/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  User, 
  LayoutDashboard, 
  Heart, 
  ShoppingCart, 
  MessageSquare, 
  LogOut, 
  LogIn, 
  Mail, 
  Key, 
  Phone, 
  Eye, 
  EyeOff, 
  Store,
  ArrowRight,
  TrendingUp,
  Truck,
  Wallet,
  QrCode
} from 'lucide-react';
import { getApiBaseUrl, fetchWithTimeout, getUserAvatarUrl, compressImage } from '../../core/api';

export default function MonEspacePage() {
  const { user, profile, setProfile, authFetch, loading, login, register, logout } = useAuth();
  const showToast = useToast();
  const router = useRouter();

  const [myProducts, setMyProducts] = useState([]);

  const loadMyProducts = async () => {
    if (!user) return;
    try {
      const res = await authFetch('/api/products/me');
      if (res.ok) {
        const products = await res.json();
        setMyProducts(products || []);
      }
    } catch (err) {
      console.error('Error loading my products:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadMyProducts();
    }
  }, [user]);

  const isSellerApproved = 
    profile?.seller_status === 'approved' || 
    (profile && (profile.shop_name || profile.phone || myProducts.length > 0));

  const handleAvatarUploadDirect = async (file) => {
    if (!file) return;
    try {
      showToast('Compression de l\'image...');
      const compressed = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.8 });
      const formData = new FormData();
      formData.append('avatar', compressed);
      
      showToast('Mise à jour de la photo de profil...');
      const res = await authFetch('/api/user/profile/avatar', {
        method: 'PUT',
        body: formData
      });

      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        showToast('Photo de profil mise à jour avec succès !');
      } else {
        const err = await res.json();
        showToast(err?.error || "Erreur lors de l'upload de la photo de profil.");
      }
    } catch (err) {
      console.error(err);
      showToast("Impossible d'uploader la photo de profil.");
    }
  };

  // Tabs: 'login' or 'register'
  const [activeTab, setActiveTab] = useState('login');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [submittingLogin, setSubmittingLogin] = useState(false);

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [submittingReg, setSubmittingReg] = useState(false);

  // Google OAuth state
  const [submittingGoogle, setSubmittingGoogle] = useState(false);

  // Direct login submit handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      showToast('Veuillez remplir tous les champs.');
      return;
    }
    setSubmittingLogin(true);
    try {
      await login(loginEmail, loginPassword);
      showToast('Connexion réussie !');
    } catch (err) {
      showToast(err?.message || 'Identifiants incorrects.');
    } finally {
      setSubmittingLogin(false);
    }
  };

  // Direct register submit handler
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      showToast('Veuillez remplir tous les champs.');
      return;
    }
    setSubmittingReg(true);
    try {
      await register(regName, regEmail, regPassword, '');
      // Automatically log them in after registration
      await login(regEmail, regPassword);
      showToast('Inscription et connexion réussies !');
    } catch (err) {
      showToast(err?.message || "Erreur lors de l'inscription.");
    } finally {
      setSubmittingReg(false);
    }
  };

  // Google OAuth simulator
  const handleGoogleLogin = async () => {
    setSubmittingGoogle(true);
    showToast('Connexion avec Google en cours...');

    try {
      const base = getApiBaseUrl();
      const res = await fetchWithTimeout(`${base}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'google.user@gmail.com',
          name: 'Boutique Google',
          whatsapp: '+237690000000'
        })
      }, 15000);

      const data = await res.json();
      if (res.ok && data?.session?.access_token) {
        // Save session locally to AuthContext / LocalStorage
        localStorage.setItem('sellerToken', data.session.access_token);
        if (data.session.refresh_token) localStorage.setItem('sellerRefreshToken', data.session.refresh_token);
        if (data.session.expires_at) localStorage.setItem('sellerTokenExpiresAt', String(data.session.expires_at));
        
        showToast('Connexion Google réussie !');
        // Reload page to re-eval AuthContext session
        window.location.reload();
      } else {
        showToast(data?.error || 'Erreur lors de l’authentification Google.');
      }
    } catch (err) {
      console.error(err);
      showToast('Serveur Google injoignable.');
    } finally {
      setSubmittingGoogle(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ fontWeight: '700', color: '#666' }}>Chargement de votre espace...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '520px', margin: '40px auto 80px', padding: '0 20px', fontFamily: '"Inter", sans-serif' }}>
      {user ? (
        /* CONNECTED USER SPACE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* User Profile Summary Banner (Premium Dark Mode Look) */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: '20px',
            padding: '32px 24px',
            color: '#fff',
            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.25)',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                <div 
                  onClick={() => document.getElementById('espace-avatar-input').click()}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    backgroundColor: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                  className="avatar-container-hover"
                >
                  <img 
                    src={getUserAvatarUrl(profile?.avatar_url, profile?.shop_name || user?.shop_name || 'V')} 
                    alt="Avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div 
                    style={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      left: 0, 
                      right: 0, 
                      background: 'rgba(15, 23, 42, 0.8)', 
                      color: '#fff', 
                      fontSize: '0.58rem', 
                      fontWeight: '700', 
                      textAlign: 'center', 
                      padding: '2px 0'
                    }}
                  >
                    Changer
                  </div>
                </div>
                <input 
                  type="file" 
                  id="espace-avatar-input" 
                  accept="image/jpeg,image/png,image/webp,image/jpg" 
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleAvatarUploadDirect(file);
                    }
                  }}
                />
                <div>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: '700', letterSpacing: '-0.02em' }}>{profile?.shop_name || user?.shop_name || 'Mon Profil'}</h2>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{profile?.email || user?.email}</span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1', fontWeight: '400' }}>Bienvenue dans votre espace personnel</p>
            </div>
            
            {/* Decors bubble */}
            <div style={{
              position: 'absolute',
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)',
              top: '-40px',
              right: '-40px',
              zIndex: 1
            }}></div>
          </div>

          {/* Account Options Navigation List */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.03)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ margin: '24px 24px 12px 24px', fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.05em' }}>
              Menu principal
            </h3>

            {isSellerApproved ? (
              <>
                {/* Espace Vendeur */}
                <Link href="/dashboard?tab=seller-area" onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('vc_dashboard_active_tab', 'seller-area');
                  }
                }} className="premium-link">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fff8f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Store width="18" height="18" style={{ color: '#ff6a00' }} />
                    </div>
                    <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1e293b' }}>Espace Vendeur</span>
                  </div>
                  <ArrowRight width="16" height="16" style={{ color: '#cbd5e1' }} />
                </Link>

                {/* Commandes Reçues */}
                <Link href="/dashboard?tab=orders" onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('vc_dashboard_active_tab', 'orders');
                  }
                }} className="premium-link">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <QrCode width="18" height="18" style={{ color: '#3b82f6' }} />
                    </div>
                    <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1e293b' }}>Commandes Reçues (Ventes)</span>
                  </div>
                  <ArrowRight width="16" height="16" style={{ color: '#cbd5e1' }} />
                </Link>

                {/* Mon Portefeuille */}
                <Link href="/dashboard?tab=wallet" onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('vc_dashboard_active_tab', 'wallet');
                  }
                }} className="premium-link">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Wallet width="18" height="18" style={{ color: '#10b981' }} />
                    </div>
                    <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1e293b' }}>Mon Portefeuille</span>
                  </div>
                  <ArrowRight width="16" height="16" style={{ color: '#cbd5e1' }} />
                </Link>

                {/* Statistiques & Métriques */}
                <Link href="/dashboard?tab=stats" onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('vc_dashboard_active_tab', 'stats');
                  }
                }} className="premium-link">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TrendingUp width="18" height="18" style={{ color: '#a16207' }} />
                    </div>
                    <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1e293b' }}>Statistiques & Métriques</span>
                  </div>
                  <ArrowRight width="16" height="16" style={{ color: '#cbd5e1' }} />
                </Link>
              </>
            ) : (
              /* Devenir Vendeur */
              <Link href="/dashboard?tab=seller-application" onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('vc_dashboard_active_tab', 'seller-application');
                }
              }} className="premium-link">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fff8f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Store width="18" height="18" style={{ color: '#ff6a00' }} />
                  </div>
                  <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1e293b' }}>Devenir Vendeur</span>
                </div>
                <ArrowRight width="16" height="16" style={{ color: '#cbd5e1' }} />
              </Link>
            )}

            {/* Modifier mon profil (Paramètres) */}
            <Link href="/dashboard?tab=profile" onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('vc_dashboard_active_tab', 'profile');
              }
            }} className="premium-link">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User width="18" height="18" style={{ color: '#a855f7' }} />
                </div>
                <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1e293b' }}>Modifier mon profil (Paramètres)</span>
              </div>
              <ArrowRight width="16" height="16" style={{ color: '#cbd5e1' }} />
            </Link>

            {/* Link 2: Mon Profil (Show only if seller approved) */}
            {isSellerApproved && (
              <Link href={`/vendeur/${profile?.id || user?.sub || user?.user_id || user?.uid || ''}`} className="premium-link">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User width="18" height="18" style={{ color: '#ef4444' }} />
                  </div>
                  <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1e293b' }}>Mon Profil / WhatsApp</span>
                </div>
                <ArrowRight width="16" height="16" style={{ color: '#cbd5e1' }} />
              </Link>
            )}

            {/* Link 3: Messagerie */}
            <Link href="/messagerie" className="premium-link">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare width="18" height="18" style={{ color: '#10b981' }} />
                </div>
                <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1e293b' }}>Messagerie (Chat)</span>
              </div>
              <ArrowRight width="16" height="16" style={{ color: '#cbd5e1' }} />
            </Link>

            {/* Link 3.5: Suivi de mes commandes */}
            <Link href="/commandes" className="premium-link">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck width="18" height="18" style={{ color: '#3b82f6' }} />
                </div>
                <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1e293b' }}>Suivi de mes commandes (Séquestre)</span>
              </div>
              <ArrowRight width="16" height="16" style={{ color: '#cbd5e1' }} />
            </Link>

            {/* Link 4: Mes Favoris */}
            <Link href="/favorites" className="premium-link">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart width="18" height="18" style={{ color: '#e11d48' }} />
                </div>
                <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1e293b' }}>Mes Articles Favoris</span>
              </div>
              <ArrowRight width="16" height="16" style={{ color: '#cbd5e1' }} />
            </Link>

            {/* Link 5: Mon Panier */}
            <Link href="/panier" className="premium-link" style={{ borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingCart width="18" height="18" style={{ color: '#8b5cf6' }} />
                </div>
                <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1e293b' }}>Voir mon Panier</span>
              </div>
              <ArrowRight width="16" height="16" style={{ color: '#cbd5e1' }} />
            </Link>
          </div>
          
          {/* Logout Section */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.03)',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => {
                logout();
                showToast('Déconnexion réussie.');
                router.push('/');
              }}
              className="premium-link"
              style={{ width: '100%', borderBottom: 'none', color: '#ef4444' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LogOut width="18" height="18" style={{ color: '#ef4444' }} />
                </div>
                <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Se déconnecter</span>
              </div>
              <ArrowRight width="16" height="16" style={{ color: '#fca5a5' }} />
            </button>
          </div>
        </div>
      ) : (
        /* GUEST / CONNECTION LOGIN FORM */
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '32px 24px',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.08)',
          border: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '50%', background: '#eff6ff', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' 
            }}>
              <User width="32" height="32" style={{ color: '#3b82f6' }} />
            </div>
            <h1 style={{ fontSize: '1.75rem', color: '#0f172a', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.03em' }}>
              Mon Espace
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
              Connectez-vous pour gérer votre boutique ou vos commandes.
            </p>
          </div>

          {/* Form Tabs */}
          <div style={{
            display: 'flex',
            background: '#f8fafc',
            padding: '6px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => setActiveTab('login')}
              style={{
                flex: 1,
                background: activeTab === 'login' ? '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontWeight: '600',
                fontSize: '0.95rem',
                color: activeTab === 'login' ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                boxShadow: activeTab === 'login' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Connexion
            </button>
            <button
              onClick={() => setActiveTab('register')}
              style={{
                flex: 1,
                background: activeTab === 'register' ? '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontWeight: '600',
                fontSize: '0.95rem',
                color: activeTab === 'register' ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                boxShadow: activeTab === 'register' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Inscription
            </button>
          </div>

          {/* TAB 1: LOGIN FORM */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label htmlFor="login-email">Adresse email</label>
                <div className="input-wrapper">
                  <Mail width="18" height="18" className="input-icon" />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="votre.email@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="login-password">Mot de passe</label>
                <div className="input-wrapper">
                  <Key width="18" height="18" className="input-icon" />
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Saisir mot de passe..."
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="toggle-password"
                  >
                    {showLoginPassword ? <EyeOff width="18" height="18" /> : <Eye width="18" height="18" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingLogin}
                className="premium-button primary-btn"
              >
                <LogIn width="18" height="18" /> Se Connecter
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER FORM */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label htmlFor="reg-name">Nom complet / Pseudo *</label>
                <div className="input-wrapper">
                  <User width="18" height="18" className="input-icon" />
                  <input
                    id="reg-name"
                    type="text"
                    placeholder="Ex: NGALAMO ARTHUR"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="reg-email">Adresse email *</label>
                <div className="input-wrapper">
                  <Mail width="18" height="18" className="input-icon" />
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="reg-password">Mot de passe (6+ car.) *</label>
                <div className="input-wrapper">
                  <Key width="18" height="18" className="input-icon" />
                  <input
                    id="reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 caractères..."
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    minLength="6"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="toggle-password"
                  >
                    {showRegPassword ? <EyeOff width="18" height="18" /> : <Eye width="18" height="18" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingReg}
                className="premium-button primary-btn"
              >
                <User width="18" height="18" /> Créer mon compte
              </button>
            </form>
          )}

          {/* Social login divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.05em' }}>OU</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
          </div>

          {/* Premium Google Sign-In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={submittingGoogle}
            className="premium-button secondary-btn"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0 }}>
              <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.277 1.565-1.502 4.095-4.887 4.095-2.93 0-5.32-2.427-5.32-5.42 0-2.993 2.39-5.42 5.32-5.42 1.668 0 2.784.7 3.42 1.309l3.24-3.12C18.816 3.935 15.82 2.62 12.24 2.62 6.6 2.62 2 7.22 2 12.86s4.6 10.24 10.24 10.24c5.89 0 9.805-4.14 9.805-9.98 0-.671-.073-1.184-.16-1.576l-9.645-.259z" />
            </svg>
            <span>Continuer avec Google</span>
          </button>
        </div>
      )}
      
      {/* Visual styling override helper */}
      <style jsx global>{`
        .avatar-container-hover:hover {
          transform: scale(1.05);
          border-color: #ff6a00 !important;
        }
        .premium-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid #f1f5f9;
          text-decoration: none;
          background: transparent;
          border-left: none;
          border-right: none;
          border-top: none;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .premium-link:hover {
          background: #f8fafc;
          padding-left: 28px;
          padding-right: 20px;
        }
        .premium-link:active {
          background: #f1f5f9;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .input-group label {
          font-size: 0.85rem;
          color: #475569;
          font-weight: 600;
        }
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          color: #94a3b8;
          pointer-events: none;
        }
        .input-wrapper input {
          width: 100%;
          padding: 14px 14px 14px 42px;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          font-size: 0.95rem;
          font-family: inherit;
          color: #0f172a;
          background: #ffffff;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .input-wrapper input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
        .input-wrapper input::placeholder {
          color: #94a3b8;
        }
        .toggle-password {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 6px;
          transition: background 0.2s;
        }
        .toggle-password:hover {
          background: #f1f5f9;
          color: #475569;
        }

        .premium-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 12px;
          padding: 14px;
          font-weight: 600;
          font-size: 1rem;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 8px;
        }
        .premium-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .primary-btn {
          background: #0f172a;
          color: #ffffff;
          border: none;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        }
        .primary-btn:hover:not(:disabled) {
          background: #1e293b;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.2);
        }
        .primary-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(15, 23, 42, 0.1);
        }
        .secondary-btn {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #cbd5e1;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .secondary-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
