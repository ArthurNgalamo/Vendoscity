import React from 'react';
import { Store, Share2, LogOut, Archive, Loader, Pencil, Trash2, AlertCircle, Plus, ShieldCheck } from 'lucide-react';

export default function ProductsListSection({
  profileData,
  user,
  handleShareShop,
  logout,
  loadingProducts,
  myProducts,
  handleStartEditProduct,
  handleDeleteProduct,
  normalizeSupabaseImageUrl,
  formatCurrency,
  onAddNewProduct
}) {
  return (
    <div className="dashboard-section active">
      {/* Premium SaaS Seller Profile Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap',
        marginBottom: '4px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative glow */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-30px', left: '60px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(99,102,241,0.08)', pointerEvents: 'none' }} />

        {/* Store avatar */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 16px rgba(102,126,234,0.4)'
        }}>
          <Store width="26" height="26" color="#fff" />
        </div>

        {/* Store info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
              {profileData.shopName || user?.shop_name || 'Ma Boutique'}
            </span>
            {profileData.is_verified && (
              <span title="Boutique Vérifiée" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(59,130,246,0.2)',
                border: '1px solid rgba(59,130,246,0.4)',
                color: '#93c5fd',
                padding: '2px 8px',
                borderRadius: '99px',
                fontSize: '0.72rem',
                fontWeight: '700'
              }}>
                <ShieldCheck width="11" height="11" /> Vérifiée
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.02em' }}>
            Espace Vendeur Vendoscity
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleShareShop}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              fontWeight: '700',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            <Share2 width="14" height="14" /> Partager
          </button>
          <button
            type="button"
            onClick={logout}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              borderRadius: '8px',
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.1)',
              fontWeight: '700',
              color: '#fca5a5',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
          >
            <LogOut width="14" height="14" /> Déconnexion
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginTop: '20px', marginBottom: '30px' }}>
        {/* Card 1: Total Products */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ background: 'rgba(18, 18, 147, 0.1)', color: 'var(--primary-blue)', borderRadius: '10px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
             <Archive width="22" height="22" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: '600' }}>Articles en ligne</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111', marginTop: '2px' }}>{myProducts.length}</div>
          </div>
        </div>

        {/* Card 2: Shop Status */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ background: profileData.is_verified ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: profileData.is_verified ? '#3b82f6' : '#10b981', borderRadius: '10px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
             <Store width="22" height="22" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: '600' }}>Statut Boutique</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: profileData.is_verified ? '#3b82f6' : '#10b981', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
               <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: profileData.is_verified ? '#3b82f6' : '#10b981', display: 'inline-block' }}></span> 
               {profileData.is_verified ? 'Active & Vérifiée' : 'Active (Standard)'}
            </div>
          </div>
        </div>

        {/* Card 3: Share/Copy Link */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ background: 'rgba(234, 179, 8, 0.1)', color: 'var(--color-yellow)', borderRadius: '10px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
             <Share2 width="22" height="22" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: '600' }}>Lien Boutique</div>
            <button 
              type="button" 
              onClick={handleShareShop} 
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--primary-blue)', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}
            >
              Partager / Copier
            </button>
          </div>
        </div>
      </div>

      {/* Mes articles table */}
      <div style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>
            <Archive width="20" height="20" /> Mes Produits en Ligne
          </h3>
          <button
            type="button"
            onClick={onAddNewProduct}
            className="pressable"
            style={{
              padding: '10px 20px',
              background: 'var(--primary-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(18, 18, 147, 0.2)',
              fontSize: '0.9rem'
            }}
          >
            <Plus width="16" height="16" /> Publier un Article
          </button>
        </div>

        {/* Desktop View: Table */}
        <table className="dashboard-table" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '12px' }}>Image</th>
              <th style={{ padding: '12px' }}>Titre</th>
              <th style={{ padding: '12px' }}>Catégorie</th>
              <th style={{ padding: '12px' }}>Prix</th>
              <th style={{ padding: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingProducts ? (
              <tr>
                <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#666' }}>
                  <Loader className="animate-spin" style={{ margin: '0 auto 10px auto' }} /> Chargement de vos produits...
                </td>
              </tr>
            ) : myProducts.length > 0 ? (
              myProducts.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    <img
                      src={normalizeSupabaseImageUrl(p.images?.[0] || p.image_url || p.image)}
                      alt={p.title}
                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '5px' }}
                      onError={(e) => { e.target.src = '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png'; }}
                    />
                  </td>
                  <td style={{ padding: '12px', fontWeight: '700' }}>{p.title}</td>
                  <td style={{ padding: '12px' }}>
                    <span className="status-badge" style={{ background: '#e3f2fd', color: 'var(--primary-blue)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                      {p.category}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: '700' }}>{formatCurrency(p.price)}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleStartEditProduct(p)}
                        style={{
                          background: 'var(--color-yellow)',
                          color: 'var(--primary-blue)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Pencil width="12" height="12" /> Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        style={{
                          background: 'var(--color-red)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Trash2 width="12" height="12" /> Retirer
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}>
                  <div className="empty-state">
                    <AlertCircle width="32" height="32" style={{ color: '#aaa', marginBottom: '8px' }} />
                    <p style={{ margin: 0, color: '#666' }}>Vous n&apos;avez aucun produit en ligne.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mobile View: Product Cards Grid */}
        <div className="mobile-products-grid">
          {loadingProducts ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>
              <Loader className="animate-spin" style={{ margin: '0 auto 10px auto' }} /> Chargement de vos produits...
            </div>
          ) : myProducts.length > 0 ? (
            myProducts.map((p) => (
              <div key={p.id} className="mobile-product-card" style={{ background: '#fff', border: '1px solid #eee', borderRadius: '10px', padding: '12px', display: 'flex', gap: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                <img
                  src={normalizeSupabaseImageUrl(p.images?.[0] || p.image_url || p.image)}
                  alt={p.title}
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                  onError={(e) => { e.target.src = '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png'; }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: '800', color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</h4>
                    <span style={{ background: '#e3f2fd', color: 'var(--primary-blue)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', marginBottom: '8px' }}>
                      {p.category}
                    </span>
                    <div style={{ fontWeight: '800', color: 'var(--primary-blue)', fontSize: '1rem' }}>{formatCurrency(p.price)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button
                      onClick={() => handleStartEditProduct(p)}
                      style={{
                        flex: 1,
                        background: 'var(--color-yellow)',
                        color: 'var(--primary-blue)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <Pencil width="12" height="12" /> Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      style={{
                        flex: 1,
                        background: 'var(--color-red)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <Trash2 width="12" height="12" /> Retirer
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', background: '#fff', border: '1px solid #eee', borderRadius: '8px' }}>
              <AlertCircle width="32" height="32" style={{ color: '#aaa', marginBottom: '8px' }} />
              <p style={{ margin: 0, color: '#666' }}>Vous n&apos;avez aucun produit en ligne.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
