// client/src/app/top-classement/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProductCard from '../../components/ProductCard';
import { getApiBaseUrl, fetchWithTimeout } from '../../core/api';
import { 
  Award, 
  ArrowLeft, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Star, 
  CheckCircle,
  ExternalLink
} from 'lucide-react';

export default function TopClassementPage() {
  const router = useRouter();
  const [topProducts, setTopProducts] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const base = getApiBaseUrl();
      try {
        // Fetch top recommended products
        const prodRes = await fetchWithTimeout(`${base}/api/products?page=0&limit=6&sort=recommended`, {}, 8000);
        let products = [];
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          products = prodData.products || [];
        }

        // Fetch top sellers
        const sellerRes = await fetchWithTimeout(`${base}/api/sellers`, {}, 8000);
        let sellers = [];
        if (sellerRes.ok) {
          sellers = await sellerRes.json();
        }

        setTopProducts(products);
        // Sort sellers by average response time or product count
        setTopSellers(
          (sellers || [])
            .sort((a, b) => (b.products?.length || 0) - (a.products?.length || 0))
            .slice(0, 5)
        );
      } catch (err) {
        console.error('Error loading leaderboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const renderLeaderboardSkeletons = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[1, 2, 3].map((n) => (
        <div key={n} style={{ height: '70px', background: '#e2e8f0', borderRadius: '8px', animation: 'pulse 1.2s infinite' }}></div>
      ))}
    </div>
  );

  return (
    <div style={{ background: '#f4f7f6', minHeight: '85vh', padding: '30px 10px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Header Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <button 
            onClick={() => router.back()} 
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#334155',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <ArrowLeft width="18" height="18" />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.5px' }}>
              Classement Officiel Vendoscity <Award width="24" height="24" style={{ color: '#f59e0b' }} />
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
              Les meilleures entreprises, boutiques et produits recommandés par nos acheteurs locaux au Cameroun.
            </p>
          </div>
        </div>

        {/* Dashboard KPIs Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* Card 1 */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justify: 'center', color: '#2563eb', flexShrink: 0 }}>
              <Users width="24" height="24" style={{ margin: 'auto' }} />
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Boutiques Recommandées</span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', fontWeight: '800' }}>Active Top 5</h3>
            </div>
          </div>
          {/* Card 2 */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#fff7ed', display: 'flex', alignItems: 'center', justify: 'center', color: '#ea580c', flexShrink: 0 }}>
              <TrendingUp width="24" height="24" style={{ margin: 'auto' }} />
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Mise à jour</span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', fontWeight: '800' }}>En Temps Réel</h3>
            </div>
          </div>
          {/* Card 3 */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justify: 'center', color: '#16a34a', flexShrink: 0 }}>
              <ShoppingBag width="24" height="24" style={{ margin: 'auto' }} />
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Frais de commission</span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', fontWeight: '800' }}>0% Direct</h3>
            </div>
          </div>
        </div>

        {/* Split Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '30px', alignItems: 'start' }} className="leaderboard-split-layout">
          
          {/* Column Left: Top Products Grid */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '850', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Articles Star Recommandés
              </h2>
              <Link href="/boutique" style={{ fontSize: '0.85rem', color: '#ff6a00', fontWeight: '700', textDecoration: 'none' }}>
                Voir tout le catalogue &rarr;
              </Link>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '20px'
            }}>
              {loading ? (
                Array(4).fill(null).map((_, idx) => (
                  <div key={idx} style={{ height: '260px', background: '#e2e8f0', borderRadius: '12px', animation: 'pulse 1.2s infinite' }}></div>
                ))
              ) : topProducts.length > 0 ? (
                topProducts.map((p) => <ProductCard key={p.id} product={p} />)
              ) : (
                <div style={{ gridColumn: '1 / -1', padding: '40px 20px', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b' }}>
                  Aucun article vedette trouvé.
                </div>
              )}
            </div>
          </div>

          {/* Column Right: Top Sellers Leaderboard */}
          <div>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: '850', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🏆 Top Fabricants Certifiés
            </h2>
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)'
            }}>
              {loading ? (
                renderLeaderboardSkeletons()
              ) : topSellers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {topSellers.map((seller, index) => (
                    <div 
                      key={seller.id} 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: index < topSellers.length - 1 ? '14px' : '0',
                        borderBottom: index < topSellers.length - 1 ? '1px solid #f1f5f9' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#e2e8f0',
                          color: index < 3 ? '#ffffff' : '#475569',
                          fontWeight: '800',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {index + 1}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {seller.shop_name}
                          </h4>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <CheckCircle width="10" height="10" style={{ color: '#3b82f6' }} /> Vendeur certifié
                          </span>
                        </div>
                      </div>
                      <Link 
                        href={`/vendeur/${seller.id}`}
                        style={{
                          fontSize: '0.75rem',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          color: '#475569',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontWeight: '750',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        Visiter <ExternalLink width="10" height="10" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Aucun vendeur répertorié.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 900px) {
          .leaderboard-split-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
