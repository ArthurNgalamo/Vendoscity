// client/src/app/vendeur/[id]/page.js
'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import ProductCard from '../../../components/ProductCard';
import { useToast } from '../../../context/ToastContext';
import { getApiBaseUrl, fetchWithTimeout, logAnalyticsEvent } from '../../../core/api';
import { shareLink } from '../../../core/share';
import { Store, Share2, ArrowLeft } from 'lucide-react';

export default function SellerPublicPage({ params }) {
  const resolvedParams = use(params);
  const sellerId = resolvedParams.id;

  const showToast = useToast();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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
  const bio = seller.bio || 'Ce vendeur n&apos;a pas encore rédigé de biographie.';

  return (
    <div style={{ paddingBottom: '60px' }}>
      
      {/* Seller Hero Banner */}
      <section className="seller-hero" aria-label="Profil vendeur">
        <div className="seller-hero-inner">
          <div>
            <h1 className="seller-title" id="seller-name">{shopName}</h1>
            <p className="seller-subtitle">Consultez les articles publiés par ce vendeur. Paiement et livraison se discutent directement avec le vendeur.</p>
          </div>
          <div className="seller-actions">
            <button
              type="button"
              id="btn-share-shop-header"
              onClick={handleShareShop}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.25)',
                color: 'white',
                padding: '10px 14px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              aria-label="Partager la boutique"
            >
              <Share2 width="18" height="18" /> Partager
            </button>
            <Link href="/boutique" aria-label="Retour à la boutique">
              <Store width="16" height="16" style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Boutique
            </Link>
          </div>
        </div>
      </section>

      {/* Seller Bio & Products */}
      <div className="seller-body">
        <div className="seller-card" id="seller-bio-card" style={{ display: bio ? 'block' : 'none' }}>
          <p className="seller-bio" id="seller-bio">{bio}</p>
        </div>

        <h2 className="seller-products-title">
          <Store width="22" height="22" style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Articles publiés
        </h2>

        {products.length > 0 ? (
          <div className="products-grid" style={{ marginTop: '20px' }}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div
            id="seller-products-empty"
            style={{
              padding: '40px',
              textAlign: 'center',
              background: '#fff',
              border: '1px dashed #ccc',
              borderRadius: '8px',
              color: '#666',
              marginTop: '15px'
            }}
          >
            Aucun produit publié pour le moment par ce vendeur.
          </div>
        )}
      </div>
    </div>
  );
}
