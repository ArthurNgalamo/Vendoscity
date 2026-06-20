// client/src/app/vendeur/[id]/page.js
'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import ProductCard from '../../../components/ProductCard';
import { useToast } from '../../../context/ToastContext';
import { getApiBaseUrl, fetchWithTimeout, logAnalyticsEvent, getUserAvatarUrl, compressImage } from '../../../core/api';
import { shareLink } from '../../../core/share';
import { Store, Share2, ArrowLeft, QrCode, Phone, MessageSquare, ShieldCheck, ShoppingBag, Star, Truck, Pencil } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function SellerPublicPage({ params }) {
  const resolvedParams = use(params);
  const sellerId = resolvedParams.id;

  const showToast = useToast();
  const { user, profile, setProfile, authFetch } = useAuth();
  const isOwner = !!(user && (user.sub === sellerId || user.user_id === sellerId || user.uid === sellerId));

  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit form states
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editShopName, setEditShopName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  useEffect(() => {
    if (!sellerId) return;

    const loadSellerData = async () => {
      const base = getApiBaseUrl();
      setLoading(true);
      try {
        const urlSeller = `${base}/api/sellers/${encodeURIComponent(sellerId)}`;
        const urlProducts = `${base}/api/products?seller_id=${encodeURIComponent(sellerId)}&page=0&limit=100`;

        const [resSeller, resProducts] = await Promise.all([
          fetchWithTimeout(urlSeller, {}, 15000),
          fetchWithTimeout(urlProducts, {}, 15000)
        ]);

        if (resSeller.ok) {
          const sellerData = await resSeller.json();
          const s = sellerData?.seller || sellerData;
          setSeller(s);
          if (s && s.id) {
            logAnalyticsEvent('page_view', s.id);
          }
        } else {
          showToast('Impossible de charger le profil de ce vendeur.');
        }

        if (resProducts.ok) {
          const productsData = await resProducts.json();
          setProducts(productsData.products || []);
        }
      } catch (e) {
        console.error('Error loading public seller profile:', e);
      } finally {
        setLoading(false);
      }
    };

    loadSellerData();
  }, [sellerId, showToast]);

  const handleShareShop = async () => {
    if (!seller) return;
    const shopName = seller.shop_name || seller.first_name || 'Boutique';
    const res = await shareLink({
      title: shopName,
      text: `Visitez la boutique de ${shopName} sur Vendoscity ! Ses articles en vente directe.`,
      url: window.location.href
    });

    if (res.ok) {
      if (res.mode === 'copy') {
        showToast('Lien de la boutique copié !');
      } else {
        showToast('Partage initié !');
      }
    }
  };

  const openEditModal = () => {
    if (!profile) return;
    setEditFirstName(profile.first_name || '');
    setEditLastName(profile.last_name || '');
    setEditShopName(profile.shop_name || '');
    setEditPhone(profile.phone || '');
    setEditBio(profile.bio || '');
    setEditPassword('');
    setShowEditModal(true);
  };

  const handleEditProfileSave = async (e) => {
    e.preventDefault();
    setSubmittingEdit(true);

    let finalPhone = editPhone.trim().replace(/\s+/g, '');
    if (finalPhone && !finalPhone.startsWith('+') && !finalPhone.startsWith('00')) {
      if (finalPhone.length === 9) {
        finalPhone = '+237' + finalPhone;
      }
    }

    const payload = {
      email: profile?.email || '',
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      shop_name: editShopName.trim(),
      phone: finalPhone,
      bio: editBio.trim()
    };

    if (editPassword && editPassword.length >= 6) {
      payload.password = editPassword;
    }

    try {
      const res = await authFetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        showToast('Profil mis à jour avec succès !');
        setShowEditModal(false);
        setProfile(updated);
        
        setSeller(prev => ({
          ...prev,
          first_name: updated.first_name,
          last_name: updated.last_name,
          shop_name: updated.shop_name,
          phone: updated.phone,
          bio: updated.bio,
          avatar_url: updated.avatar_url
        }));

        if (typeof window !== 'undefined') {
          const sellerMeta = {
            whatsapp: updated.phone || payload.phone,
            shop_name: updated.shop_name || payload.shop_name,
            name: `${updated.first_name || payload.first_name} ${updated.last_name || payload.last_name}`.trim()
          };
          localStorage.setItem('sellerData', JSON.stringify(sellerMeta));
        }
      } else {
        const err = await res.json();
        showToast(err?.error || 'Erreur lors de la mise à jour du profil.');
      }
    } catch (err) {
      console.error(err);
      showToast('Impossible de sauvegarder le profil.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleAvatarUpload = async (file) => {
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
        setSeller(prev => ({
          ...prev,
          avatar_url: updated.avatar_url
        }));
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

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div className="loading">Chargement de la boutique...</div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div style={{ maxWidth: '1200px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <h2>Boutique introuvable</h2>
        <p>Le profil de ce vendeur n&apos;existe pas ou a été désactivé.</p>
        <Link href="/boutique" className="cta-button" style={{ display: 'inline-block', marginTop: '15px' }}>
          Retour à la boutique
        </Link>
      </div>
    );
  }

  const shopName = seller.shop_name || seller.first_name || 'Boutique';
  const bio = seller.bio || 'Ce vendeur n\'a pas encore rédigé de biographie.';
  const initialLetter = shopName.charAt(0).toUpperCase();
  const contactPhone = seller.phone || seller.whatsapp || '';

  return (
    <div style={{ paddingBottom: '60px', backgroundColor: '#f8fafc' }}>
      
      {/* 1. Seller Hero Banner (slate gradient) */}
      <section className="seller-hero" aria-label="Bannière boutique">
        <div className="seller-hero-inner">
          <div>
            <div className="seller-title-wrapper">
              <h1 className="seller-title" id="seller-name">{shopName}</h1>
              <span className="seller-badge-verified" title="Vendeur Vérifié">
                <ShieldCheck width="14" height="14" fill="white" color="#007aff" />
              </span>
            </div>
            <p className="seller-subtitle">
              Vitrine professionnelle certifiée. Contact direct sans commission intermédiaire.
            </p>
          </div>
          <div className="seller-actions">
            <button
              type="button"
              id="btn-qr-shop-header"
              onClick={() => setShowQrModal(true)}
              title="Générer le QR Code de la boutique"
            >
              <QrCode width="16" height="16" /> QR Code
            </button>
            <button
              type="button"
              id="btn-share-shop-header"
              onClick={handleShareShop}
              title="Partager la boutique"
            >
              <Share2 width="16" height="16" /> Partager
            </button>
            <Link href="/boutique" aria-label="Retour à la boutique principale">
              <Store width="16" height="16" /> Catalogue
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Split layout (Sidebar left, Products right) */}
      <div className="seller-split-layout">
        
        {/* Left Column: Identité de l'entreprise */}
        <aside className="seller-info-sidebar">
          <div className="seller-profile-card-header">
            <div className="seller-avatar-large" style={{ overflow: 'hidden' }}>
              {seller.avatar_url ? (
                <img 
                  src={getUserAvatarUrl(seller.avatar_url, shopName)} 
                  alt={shopName} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initialLetter
              )}
            </div>
            <div className="seller-profile-header-text">
              <h2 className="seller-sidebar-title">{shopName}</h2>
              <p className="seller-sidebar-subtitle">Boutique Vérifiée</p>
            </div>
          </div>

          <div className="seller-bio-section">
            <h4>À propos</h4>
            <p className="seller-bio-text">{bio}</p>
          </div>

          {contactPhone && (
            <div className="seller-contact-section">
              <h4>Contact Direct</h4>
              <div className="seller-contact-list">
                <a
                  href={`https://wa.me/${contactPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Bonjour ${shopName}, j'ai visité votre boutique en ligne sur Vendoscity et je souhaiterais échanger avec vous.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="seller-contact-link whatsapp"
                  onClick={() => logAnalyticsEvent('whatsapp_click', seller.id)}
                >
                  <MessageSquare width="16" height="16" fill="white" /> WhatsApp direct
                </a>
                <a
                  href={`tel:${contactPhone.replace(/\D/g, '')}`}
                  className="seller-contact-link phone"
                  onClick={() => logAnalyticsEvent('phone_click', seller.id)}
                >
                  <Phone width="16" height="16" /> Appeler le vendeur
                </a>
              </div>
            </div>
          )}

          {isOwner && (
            <div className="seller-contact-section" style={{ marginTop: '5px' }}>
              <h4>Gestion Boutique</h4>
              <button
                type="button"
                className="seller-contact-link"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #ff9e00 0%, #ff6a00 100%)',
                  color: 'white',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(255,106,0,0.15)',
                  cursor: 'pointer'
                }}
                onClick={openEditModal}
              >
                <Pencil width="14" height="14" /> Modifier mon profil
              </button>
            </div>
          )}
        </aside>

        {/* Right Column: KPIs & Product catalog */}
        <main className="seller-catalog-area">
          
          {/* Stats Bar */}
          <div className="seller-stats-summary">
            <div className="seller-stat-widget">
              <span className="seller-stat-val" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ShoppingBag width="18" height="18" style={{ color: 'var(--primary-blue)' }} />
                {products.length}
              </span>
              <span className="seller-stat-lbl">Articles</span>
            </div>
            <div className="seller-stat-widget">
              <span className="seller-stat-val" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Star width="18" height="18" style={{ color: '#ff9e00' }} fill="#ff9e00" />
                4.8
              </span>
              <span className="seller-stat-lbl">Note</span>
            </div>
            <div className="seller-stat-widget">
              <span className="seller-stat-val" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Truck width="18" height="18" style={{ color: '#22c55e' }} />
                Directe
              </span>
              <span className="seller-stat-lbl">Livraison</span>
            </div>
          </div>

          {/* Products List */}
          <h2 className="seller-products-title">
            <Store width="20" height="20" style={{ color: 'var(--primary-blue)' }} /> 
            Articles disponibles ({products.length})
          </h2>

          {products.length > 0 ? (
            <div className="products-grid" style={{ marginTop: '0px' }}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div
              id="seller-products-empty"
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                background: '#fff',
                border: '1px dashed #e2e8f0',
                borderRadius: '12px',
                color: '#64748b',
                marginTop: '10px'
              }}
            >
              Aucun produit publié pour le moment par ce vendeur.
            </div>
          )}
        </main>
      </div>

      {/* QR Code Modal Overlay */}
      {showQrModal && (
        <div
          onClick={() => setShowQrModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 11000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '360px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              position: 'relative',
              animation: 'scaleUpPwa 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontWeight: '800' }}>QR Code de la boutique</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 20px 0' }}>
              Scannez ce code pour visiter la boutique de <strong>{shopName}</strong>.
            </p>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', display: 'inline-block', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                alt={`QR Code ${shopName}`}
                style={{ width: '200px', height: '200px', display: 'block' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowQrModal(false)}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Fermer
              </button>
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                target="_blank"
                rel="noopener noreferrer"
                download={`qrcode-${shopName.toLowerCase().replace(/\s+/g, '-')}.png`}
                style={{
                  flex: 1,
                  background: 'var(--primary-blue)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                Télécharger
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Modal Overlay */}
      {showEditModal && (
        <div
          onClick={() => setShowEditModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 11000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              position: 'relative',
              animation: 'scaleUpPwa 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontWeight: '800', fontSize: '1.3rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              Modifier mon profil
            </h3>

            {/* Avatar Section inside Modal */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
              <div 
                style={{ 
                  position: 'relative', 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%', 
                  overflow: 'hidden', 
                  border: '3px solid var(--primary-blue)',
                  backgroundColor: '#e2e8f0',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('modal-avatar-input').click()}
              >
                <img 
                  src={getUserAvatarUrl(seller?.avatar_url, seller?.shop_name || 'V')} 
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
                    fontSize: '0.6rem', 
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
                id="modal-avatar-input" 
                accept="image/jpeg,image/png,image/webp,image/jpg" 
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await handleAvatarUpload(file);
                  }
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '6px' }}>
                Cliquez pour modifier la photo de la boutique
              </span>
            </div>

            <form onSubmit={handleEditProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px', textAlign: 'left' }}>Prénom</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px', textAlign: 'left' }}>Nom</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px', textAlign: 'left' }}>Nom de la Boutique</label>
                <input
                  type="text"
                  value={editShopName}
                  onChange={(e) => setEditShopName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px', textAlign: 'left' }}>WhatsApp (commandes) <span style={{ fontWeight: 'normal', color: '#94a3b8' }}>(ex: 681570075)</span></label>
                <input
                  type="tel"
                  placeholder="ex: +237681570075 ou 681570075"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px', textAlign: 'left' }}>Biographie / À propos</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows="3"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px', textAlign: 'left' }}>Nouveau mot de passe <span style={{ fontWeight: 'normal', color: '#94a3b8' }}>(vide pour ne pas changer)</span></label>
                <input
                  type="password"
                  placeholder="Minimum 6 caractères"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  minLength="6"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  style={{
                    flex: 1,
                    background: 'var(--primary-blue)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {submittingEdit ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
