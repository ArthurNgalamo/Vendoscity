// client/src/app/dashboard/page.js
'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getApiBaseUrl, fetchWithTimeout, normalizeSupabaseImageUrl, formatCurrency, compressImage } from '../../core/api';
import { shareLink } from '../../core/share';
import { LayoutDashboard, Store, User, TrendingUp, QrCode, Wallet, ShieldCheck } from 'lucide-react';

import { POPULAR_NEIGHBORHOODS, parsePhoneNumber } from './constants';
import ProfileSection from './components/ProfileSection';
import ProductsListSection from './components/ProductsListSection';
import ProductFormSection from './components/ProductFormSection';
import StatsSection from './components/StatsSection';
import SellerApplicationSection from './components/SellerApplicationSection';
import OrdersSection from './components/OrdersSection';
import WalletSection from './components/WalletSection';
import './dashboard.css';

function DashboardContent() {
  const { user, profile, setProfile, fetchProfile, loading, logout, authFetch } = useAuth();
  const showToast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams ? searchParams.get('tab') : null;

  const [activeSection, setActiveSection] = useState('seller-area'); // 'seller-area' or 'profile'
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isWalletUnlocked, setIsWalletUnlocked] = useState(false);

  // (Redirection combined below with unified hook)

  // Update localStorage when activeSection changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vc_dashboard_active_tab', activeSection);
    }
  }, [activeSection]);
  
  // Profile form states
  const [profileData, setProfileData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    shopName: '',
    phone: '',
    bio: '',
    avatar_url: ''
  });
  const [selectedCountry, setSelectedCountry] = useState({ code: 'CM', name: 'Cameroun', flag: '🇨🇲', dial: '+237' });
  const [nationalPhone, setNationalPhone] = useState('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [submittingProfile, setSubmittingProfile] = useState(false);

  // Seller Products list
  const [myProducts, setMyProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const isSellerApproved = 
    profile?.seller_status === 'approved' || 
    (profile && !profile.seller_status && (profile.shop_name || profile.phone || myProducts.length > 0));

  // Set and validate tab in a single unified hook to prevent state update race conditions
  useEffect(() => {
    if (loading || !user) return;

    const validTabs = isSellerApproved
      ? ['profile', 'stats', 'seller-area', 'orders', 'wallet', ...(!profile?.is_verified ? ['seller-application'] : [])]
      : ['profile', 'seller-application'];

    let target = tab;
    if (!target || !validTabs.includes(target)) {
      const storedTab = typeof window !== 'undefined' ? localStorage.getItem('vc_dashboard_active_tab') : null;
      if (storedTab && validTabs.includes(storedTab)) {
        target = storedTab;
      } else {
        target = isSellerApproved ? 'seller-area' : 'profile';
      }
    }

    if (activeSection !== target) {
      setActiveSection(target);
    }
  }, [tab, isSellerApproved, loading, user, activeSection]);

  // Add/Edit Product form states
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [prodTitle, setProdTitle] = useState('');
  const [prodCategory, setProdCategory] = useState('electronique');
  const [prodPrice, setProdPrice] = useState('');
  const [prodOldPrice, setProdOldPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodQuartier, setProdQuartier] = useState('');
  const [selectVal, setSelectVal] = useState('');
  const [customQuartier, setCustomQuartier] = useState('');
  const [prodSpecs, setProdSpecs] = useState([{ label: '', value: '' }]);

  const handleSelectQuartierChange = (val) => {
    setSelectVal(val);
    if (val !== 'Autre') {
      setProdQuartier(val);
      setCustomQuartier('');
    } else {
      setProdQuartier(customQuartier);
    }
  };

  const handleCustomQuartierChange = (val) => {
    setCustomQuartier(val);
    setProdQuartier(val);
  };
  const [prodSpecsPaste, setProdSpecsPaste] = useState('');
  const [selectedImages, setSelectedImages] = useState([]); // Array of { file, previewUrl }
  const [existingImages, setExistingImages] = useState([]); // Pre-existing URLs on edit
  const [submittingProduct, setSubmittingProduct] = useState(false);

  // File input ref
  const fileInputRef = useRef(null);

  // Redirect to Connexion if not logged in
  useEffect(() => {
    if (!loading && !user) {
      showToast('Veuillez vous connecter pour accéder au tableau de bord.');
      router.push('/connexion');
    }
  }, [user, loading, router, showToast]);

  // Fetch fresh profile on mount to sync metrics like login streak
  useEffect(() => {
    if (user && fetchProfile) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  // Sync profile details from AuthContext when loaded or updated
  useEffect(() => {
    if (!user) return;
    
    if (profile) {
      setProfileData({
        email: profile.email || '',
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        shopName: profile.shop_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        login_streak: profile.login_streak || 0,
        avg_response_time: profile.avg_response_time || null,
        response_count: profile.response_count || 0,
        last_login_at: profile.last_login_at || null,
        is_verified: profile.is_verified || false
      });
      const parsedPhone = parsePhoneNumber(profile.phone || '');
      setSelectedCountry(parsedPhone.country);
      setNationalPhone(parsedPhone.national);
    }
  }, [user, profile]);

  // Load seller's own products
  const loadMyProducts = async () => {
    if (!user) return;
    setLoadingProducts(true);
    try {
      const res = await authFetch('/api/products/me');
      if (res.ok) {
        const products = await res.json();
        setMyProducts(products || []);
      }
    } catch (err) {
      console.error('Error loading seller products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadMyProducts();
    }
  }, [user]);

  const handleShareShop = async () => {
    if (!user) return;
    const uid = user.sub || user.user_id || user.uid;
    const shopUrl = `${window.location.origin}/vendeur/${uid}`;
    const shopName = profileData.shopName || user.shop_name || 'Ma Boutique';
    
    const res = await shareLink({
      title: shopName,
      text: `Visitez ma boutique ${shopName} sur Vendoscity ! Articles en direct.`,
      url: shopUrl
    });

    if (res.ok && res.mode === 'copy') {
      showToast('Lien de la boutique copié !');
    }
  };

  // Profile Save
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSubmittingProfile(true);

    const finalPhone = selectedCountry.dial + nationalPhone.replace(/\D/g, '');

    const payload = {
      email: profileData.email.trim(),
      first_name: profileData.firstName.trim(),
      last_name: profileData.lastName.trim(),
      shop_name: profileData.shopName.trim(),
      phone: finalPhone,
      bio: profileData.bio.trim()
    };

    if (newPassword && newPassword.length >= 6) {
      payload.password = newPassword;
    }

    try {
      const res = await authFetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        showToast('Profil sauvegardé avec succès !');
        setIsEditingProfile(false);
        setNewPassword('');
        setProfileData(prev => ({ 
          ...prev, 
          phone: finalPhone,
          avatar_url: updated.avatar_url || prev.avatar_url,
          is_verified: updated.is_verified || prev.is_verified
        }));
        setProfile(updated);
        // Update user session metadata if needed
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
      showToast('Impossible de sauvegarder le profil.');
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    
    // Compresse l'image de profil à un maximum de 400x400 pixels
    const compressed = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.8 });
    
    const formData = new FormData();
    formData.append('avatar', compressed);

    try {
      const res = await authFetch('/api/user/profile/avatar', {
        method: 'PUT',
        body: formData
      });

      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setProfileData(prev => ({
          ...prev,
          avatar_url: updated.avatar_url
        }));
        showToast('Photo de profil mise à jour !');
      } else {
        const err = await res.json();
        showToast(err?.error || "Erreur lors de l'upload de l'avatar.");
      }
    } catch (_) {
      showToast("Impossible d'uploader la photo de profil.");
    }
  };

  // Specs Editor helpers
  const handleAddSpecRow = () => {
    setProdSpecs((prev) => [...prev, { label: '', value: '' }]);
  };

  const handleRemoveSpecRow = (idx) => {
    setProdSpecs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSpecChange = (idx, field, value) => {
    setProdSpecs((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  // Paste raw text to parse specs automatically (ex: "RAM: 8GB\nStockage: 128GB")
  const handlePasteSpecs = () => {
    const text = String(prodSpecsPaste || '').trim();
    if (!text) return;
    
    const lines = text.split('\n');
    const parsed = [];
    for (const lineRaw of lines) {
      const line = String(lineRaw || '').trim();
      if (!line) continue;

      let label = '';
      let value = '';
      const colonIdx = line.indexOf(':');
      const eqIdx = line.indexOf('=');
      const sepIdx = colonIdx >= 0 ? colonIdx : eqIdx;

      if (sepIdx >= 0) {
        label = line.slice(0, sepIdx).trim();
        value = line.slice(sepIdx + 1).trim();
      } else {
        label = line;
        value = '';
      }

      if (label) {
        parsed.push({ label, value });
      }
      if (parsed.length >= 30) break;
    }

    if (parsed.length > 0) {
      setProdSpecs((prev) => {
        const active = prev.filter(p => p.label.trim() || p.value.trim());
        return [...active, ...parsed];
      });
      setProdSpecsPaste('');
      showToast(`${parsed.length} lignes de caractéristiques importées !`);
    }
  };

  // Image Upload helpers
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (selectedImages.length + files.length > 6) {
      showToast('Maximum 6 images de produit.');
      return;
    }

    const nextImages = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    setSelectedImages((prev) => [...prev, ...nextImages]);
  };

  const handleRemoveImage = (idx) => {
    URL.revokeObjectURL(selectedImages[idx].previewUrl);
    setSelectedImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveExistingImage = (idx) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // Delete product action
  const handleDeleteProduct = async (id) => {
    if (!confirm('Voulez-vous vraiment retirer ce produit de la vente ?')) return;

    try {
      const res = await authFetch(`/api/products/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showToast('Produit retiré de la vente.');
        loadMyProducts();
      } else {
        showToast('Erreur lors du retrait du produit.');
      }
    } catch (_) {
      showToast('Serveur injoignable.');
    }
  };

  // Edit product setup
  const handleStartEditProduct = (prod) => {
    setIsEditingProduct(true);
    setIsAddingProduct(false);
    setEditingProductId(prod.id);
    setProdTitle(prod.title || '');
    setProdCategory(prod.category || 'electronique');
    setProdPrice(prod.price || '');
    setProdOldPrice(prod.old_price || '');
    setProdDesc(prod.description || '');
    
    const targetQ = prod.quartier || '';
    const isPopular = POPULAR_NEIGHBORHOODS.some(q => q.value === targetQ);
    setProdQuartier(targetQ);
    setSelectVal(isPopular ? targetQ : 'Autre');
    setCustomQuartier(isPopular ? '' : targetQ);

    // Parse specs if available
    let specsArr = [{ label: '', value: '' }];
    if (prod.specs) {
      try {
        const obj = typeof prod.specs === 'string' ? JSON.parse(prod.specs) : prod.specs;
        if (typeof obj === 'object' && obj !== null) {
          specsArr = Object.entries(obj).map(([label, value]) => ({ label, value }));
        }
      } catch (_) {
        if (typeof prod.specs === 'string') {
          specsArr = prod.specs.split('\n').map(line => {
            const index = line.indexOf(':');
            return index > 0 ? { label: line.slice(0, index).trim(), value: line.slice(index + 1).trim() } : { label: line, value: '' };
          });
        }
      }
    }
    setProdSpecs(specsArr);

    const imagesList = Array.isArray(prod.images) ? prod.images : [prod.image_url || prod.image].filter(Boolean);
    setExistingImages(imagesList);
    setSelectedImages([]);
  };

  const handleCancelProductEdit = () => {
    setIsEditingProduct(false);
    setIsAddingProduct(false);
    setEditingProductId(null);
    setProdTitle('');
    setProdCategory('electronique');
    setProdPrice('');
    setProdOldPrice('');
    setProdDesc('');
    setProdQuartier('');
    setSelectVal('');
    setCustomQuartier('');
    setProdSpecs([{ label: '', value: '' }]);
    setSelectedImages([]);
    setExistingImages([]);
  };

  // Product submission
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!prodTitle.trim() || !prodPrice || !prodCategory) {
      showToast('Veuillez remplir le titre, la catégorie et le prix.');
      return;
    }

    setSubmittingProduct(true);

    const formData = new FormData();
    formData.append('title', prodTitle.trim());
    formData.append('category', prodCategory);
    formData.append('price', Number(prodPrice));
    if (prodOldPrice) {
      formData.append('old_price', Number(prodOldPrice));
      formData.append('discount_amount', Math.max(0, Number(prodOldPrice) - Number(prodPrice)));
    }
    formData.append('description', prodDesc.trim());
    formData.append('quartier', prodQuartier.trim());

    const specsObj = {};
    prodSpecs.forEach((row) => {
      const k = row.label.trim();
      const v = row.value.trim();
      if (k) specsObj[k] = v;
    });
    formData.append('specs', JSON.stringify(specsObj));

    // Compression en parallèle de toutes les images de produit à max 1200x1200px
    const compressedFiles = await Promise.all(
      selectedImages.map(img => compressImage(img.file, { maxWidth: 1200, maxHeight: 1200, quality: 0.75 }))
    );

    compressedFiles.forEach((file) => {
      formData.append('images', file);
    });

    if (isEditingProduct) {
      formData.append('existing_images', JSON.stringify(existingImages));
    }

    const wa = profileData.phone || user?.phone || '';
    if (!wa) {
      alert('Veuillez d\'abord renseigner votre numéro WhatsApp dans la section "Mon Profil".');
      setSubmittingProduct(false);
      return;
    }
    formData.append('whatsapp', wa);

    try {
      const endpoint = isEditingProduct ? `/api/products/${encodeURIComponent(editingProductId)}` : '/api/products';
      const method = isEditingProduct ? 'PUT' : 'POST';

      const res = await authFetch(endpoint, {
        method,
        body: formData
      });

      if (res.ok) {
        showToast(isEditingProduct ? 'Produit mis à jour avec succès !' : 'Produit publié avec succès !');
        handleCancelProductEdit();
        loadMyProducts();
      } else {
        const err = await res.json();
        showToast(err?.error || 'Erreur lors de la publication du produit.');
      }
    } catch (_) {
      showToast('Impossible de contacter le serveur.');
    } finally {
      setSubmittingProduct(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div className="loading">Chargement du profil...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ background: '#f4f7f6', minHeight: '80vh', paddingTop: '20px' }}>

      {/* Main dashboard body */}
      <div className="dashboard-container" style={{ gridTemplateColumns: (activeSection === 'wallet' && isWalletUnlocked) ? '1fr' : '250px 1fr' }}>
        
        {/* Sidebar menu */}
        {!(activeSection === 'wallet' && isWalletUnlocked) && (
          <aside className="dashboard-sidebar">
            <h3>Menu</h3>
            <div className="dashboard-menu">
              {isSellerApproved ? (
                <>
                  <button
                    onClick={() => setActiveSection('seller-area')}
                    className={`dashboard-menu-item ${activeSection === 'seller-area' ? 'active' : ''}`}
                    style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', fontFamily: 'inherit' }}
                  >
                    <Store width="18" height="18" /> Espace Vendeur
                  </button>
                  <button
                    onClick={() => setActiveSection('orders')}
                    className={`dashboard-menu-item ${activeSection === 'orders' ? 'active' : ''}`}
                    style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', fontFamily: 'inherit' }}
                  >
                    <QrCode width="18" height="18" /> Commandes Reçues
                  </button>
                  <button
                    onClick={() => setActiveSection('wallet')}
                    className={`dashboard-menu-item ${activeSection === 'wallet' ? 'active' : ''}`}
                    style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', fontFamily: 'inherit' }}
                  >
                    <Wallet width="18" height="18" /> Mon Portefeuille
                  </button>
                  <button
                    onClick={() => setActiveSection('stats')}
                    className={`dashboard-menu-item ${activeSection === 'stats' ? 'active' : ''}`}
                    style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', fontFamily: 'inherit' }}
                  >
                    <TrendingUp width="18" height="18" /> Statistiques & Métriques
                  </button>
                  {isSellerApproved && !profile?.is_verified && (
                    <button
                      onClick={() => setActiveSection('seller-application')}
                      className={`dashboard-menu-item ${activeSection === 'seller-application' ? 'active' : ''}`}
                      style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', fontFamily: 'inherit' }}
                    >
                      <ShieldCheck width="18" height="18" style={{ color: '#3b82f6' }} /> Certifier ma boutique
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setActiveSection('seller-application')}
                  className={`dashboard-menu-item ${activeSection === 'seller-application' ? 'active' : ''}`}
                  style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', fontFamily: 'inherit' }}
                >
                  <Store width="18" height="18" /> Devenir Vendeur
                </button>
              )}
              <button
                onClick={() => setActiveSection('profile')}
                className={`dashboard-menu-item ${activeSection === 'profile' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', fontFamily: 'inherit' }}
              >
                <User width="18" height="18" /> Modifier mon profil
              </button>
              {isSellerApproved && (
                <Link
                  href={`/vendeur/${profile?.id || user?.sub || user?.user_id || user?.uid || ''}`}
                  className="dashboard-menu-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}
                >
                  <User width="18" height="18" /> Ma Boutique (Public)
                </Link>
              )}
            </div>
          </aside>
        )}

        {/* Dynamic section display */}
        <div className="dashboard-content">
          
          {/* Section: Profile */}
          {activeSection === 'profile' && (
            <ProfileSection
              profileData={profileData}
              setProfileData={setProfileData}
              isEditingProfile={isEditingProfile}
              setIsEditingProfile={setIsEditingProfile}
              submittingProfile={submittingProfile}
              selectedCountry={selectedCountry}
              setSelectedCountry={setSelectedCountry}
              nationalPhone={nationalPhone}
              setNationalPhone={setNationalPhone}
              countryDropdownOpen={countryDropdownOpen}
              setCountryDropdownOpen={setCountryDropdownOpen}
              countrySearchQuery={countrySearchQuery}
              setCountrySearchQuery={setCountrySearchQuery}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              handleProfileSave={handleProfileSave}
              handleAvatarUpload={handleAvatarUpload}
              isSellerApproved={isSellerApproved}
            />
          )}

          {/* Section: Seller Application */}
          {((!isSellerApproved && activeSection === 'seller-application') || (isSellerApproved && !profile?.is_verified && activeSection === 'seller-application')) && (
            <SellerApplicationSection 
              profile={profile}
              onApprovalSuccess={fetchProfile}
              showToast={showToast}
              authFetch={authFetch}
            />
          )}

          {isSellerApproved && (
            <>
              {/* Section: Stats & Metrics */}
              {activeSection === 'stats' && (
                <StatsSection
                  myProducts={myProducts}
                  profileData={profileData}
                  formatCurrency={formatCurrency}
                  authFetch={authFetch}
                />
              )}

              {/* Section: Orders */}
              {activeSection === 'orders' && (
                <OrdersSection 
                  authFetch={authFetch}
                  showToast={showToast}
                />
              )}

              {/* Section: Wallet */}
              {activeSection === 'wallet' && (
                <WalletSection 
                  authFetch={authFetch}
                  showToast={showToast}
                  isUnlocked={isWalletUnlocked}
                  setIsUnlocked={setIsWalletUnlocked}
                />
              )}

              {/* Section: Seller Area */}
              {activeSection === 'seller-area' && (
                <>
                  {!(isEditingProduct || isAddingProduct) ? (
                    <ProductsListSection
                      profileData={profileData}
                      user={user}
                      handleShareShop={handleShareShop}
                      logout={logout}
                      loadingProducts={loadingProducts}
                      myProducts={myProducts}
                      handleStartEditProduct={handleStartEditProduct}
                      handleDeleteProduct={handleDeleteProduct}
                      normalizeSupabaseImageUrl={normalizeSupabaseImageUrl}
                      formatCurrency={formatCurrency}
                      onAddNewProduct={() => setIsAddingProduct(true)}
                    />
                  ) : (
                    <ProductFormSection
                      isEditingProduct={isEditingProduct}
                      handleProductSubmit={handleProductSubmit}
                      prodTitle={prodTitle}
                      setProdTitle={setProdTitle}
                      prodCategory={prodCategory}
                      setProdCategory={setProdCategory}
                      selectVal={selectVal}
                      handleSelectQuartierChange={handleSelectQuartierChange}
                      customQuartier={customQuartier}
                      handleCustomQuartierChange={handleCustomQuartierChange}
                      prodPrice={prodPrice}
                      setProdPrice={setProdPrice}
                      prodOldPrice={prodOldPrice}
                      setProdOldPrice={setProdOldPrice}
                      prodDesc={prodDesc}
                      setProdDesc={setProdDesc}
                      prodSpecsPaste={prodSpecsPaste}
                      setProdSpecsPaste={setProdSpecsPaste}
                      handlePasteSpecs={handlePasteSpecs}
                      prodSpecs={prodSpecs}
                      handleSpecChange={handleSpecChange}
                      handleRemoveSpecRow={handleRemoveSpecRow}
                      handleAddSpecRow={handleAddSpecRow}
                      fileInputRef={fileInputRef}
                      handleImageChange={handleImageChange}
                      selectedImages={selectedImages}
                      handleRemoveImage={handleRemoveImage}
                      existingImages={existingImages}
                      handleRemoveExistingImage={handleRemoveExistingImage}
                      submittingProduct={submittingProduct}
                      handleCancelProductEdit={handleCancelProductEdit}
                      normalizeSupabaseImageUrl={normalizeSupabaseImageUrl}
                    />
                  )}
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ maxWidth: '1200px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div className="loading">Chargement...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
