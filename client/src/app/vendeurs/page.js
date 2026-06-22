// client/src/app/vendeurs/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl, fetchWithTimeout, getUserAvatarUrl, formatCurrency } from '../../core/api';
import { 
  Store, 
  ArrowLeft, 
  ShieldCheck, 
  Star, 
  MessageSquare, 
  MapPin, 
  ExternalLink,
  ChevronRight,
  Clock
} from 'lucide-react';

export default function VendeursListPage() {
  const router = useRouter();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    const loadSellers = async () => {
      setLoading(true);
      const base = getApiBaseUrl();
      try {
        const res = await fetchWithTimeout(`${base}/api/sellers`, {}, 12000);
        if (res.ok) {
          const data = await res.json();
          setSellers(data || []);
        }
      } catch (err) {
        console.error('Failed to load sellers list:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSellers();
  }, []);

  const handleOpenReviewModal = (seller) => {
    setSelectedSeller(seller);
    setReviewModalOpen(true);
    setReviewRating(5);
    setReviewText('');
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return;

    setReviewSubmitting(true);
    // Simulate API review submission
    setTimeout(() => {
      setReviewSubmitting(false);
      setReviewModalOpen(false);
      alert(`Merci pour votre avis de ${reviewRating} étoiles laissé à "${selectedSeller.shop_name}" ! Votre commentaire a été enregistré.`);
    }, 1000);
  };

  const renderSkeletons = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {[1, 2, 3].map((n) => (
        <div key={n} style={{ height: '180px', background: '#e2e8f0', borderRadius: '12px', animation: 'pulse 1.2s infinite' }}></div>
      ))}
    </div>
  );

  return (
    <div style={{ background: '#f4f7f6', minHeight: '85vh', padding: '30px 10px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Navigation Header */}
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
              Fabricants & Vendeurs Partenaires <Store width="24" height="24" style={{ color: 'var(--primary-blue)' }} />
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
              Découvrez les entreprises certifiées, visitez leurs catalogues en direct et contactez-les sans intermédiaire.
            </p>
          </div>
        </div>

        {/* Vendors List Section */}
        {loading ? (
          renderSkeletons()
        ) : sellers.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {sellers.map((seller) => (
              <div 
                key={seller.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Upper row: Seller details & Bio */}
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', minWidth: '280px', flex: '1' }}>
                    <img 
                      src={getUserAvatarUrl(seller.avatar_url, seller.shop_name)} 
                      alt="" 
                      style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', background: '#f1f5f9' }}
                    />
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {seller.shop_name}
                        <ShieldCheck width="18" height="18" style={{ color: '#3b82f6' }} title="Vendeur vérifié" />
                      </h2>
                      <p style={{ margin: '4px 0', fontSize: '0.82rem', color: '#475569', lineHeight: '1.4' }}>
                        {seller.bio || "Aucune description de l'entreprise disponible."}
                      </p>
                      
                      {/* Sub-details */}
                      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Star width="12" height="12" style={{ color: '#ffb700', fill: '#ffb700' }} /> 4.8 Éval.
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock width="12" height="12" /> Rép. ~{seller.avg_response_time || 20} min
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px', alignSelf: 'center' }}>
                    <Link 
                      href={`/vendeur/${seller.id}`}
                      style={{
                        background: 'var(--primary-blue)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px 14px',
                        fontSize: '0.82rem',
                        fontWeight: '750',
                        textDecoration: 'none',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(18, 18, 147, 0.1)'
                      }}
                    >
                      Visiter la Boutique <ExternalLink width="12" height="12" />
                    </Link>
                    <button 
                      onClick={() => handleOpenReviewModal(seller)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #d1d5db',
                        color: '#374151',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '0.82rem',
                        fontWeight: '750',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <MessageSquare width="12" height="12" /> Laisser un avis
                    </button>
                  </div>
                </div>

                {/* Lower Row: Popular Articles Preview */}
                <div>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '750', letterSpacing: '0.3px' }}>
                    Articles Populaires
                  </h3>
                  
                  {seller.products && seller.products.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                      {seller.products.map((p) => (
                        <Link 
                          href={`/product/${p.id}`} 
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: '#f8fafc',
                            border: '1px solid #f1f5f9',
                            borderRadius: '8px',
                            padding: '8px',
                            textDecoration: 'none',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        >
                          <img 
                            src={p.image_url || p.image || '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png'} 
                            alt="" 
                            style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', background: '#ffffff' }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <h4 style={{ margin: 0, fontSize: '0.78rem', fontWeight: '800', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.title}
                            </h4>
                            <span style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--color-red)', display: 'block', marginTop: '2px' }}>
                              {formatCurrency(p.price)}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      Aucun produit répertorié pour le moment.
                    </p>
                  )}
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b' }}>
            Aucun fabricant ou vendeur partenaire enregistré.
          </div>
        )}

        {/* Review Modal */}
        {reviewModalOpen && selectedSeller && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '450px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', padding: '16px 20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Évaluer &quot;{selectedSeller.shop_name}&quot;</h3>
              </div>
              <form onSubmit={handleSubmitReview} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '750', color: '#374151' }}>Note (Étoiles)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setReviewRating(num)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        <Star 
                          width="24" 
                          height="24" 
                          style={{
                            color: num <= reviewRating ? '#ffb700' : '#d1d5db',
                            fill: num <= reviewRating ? '#ffb700' : 'none'
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '750', color: '#374151' }}>Votre Commentaire</label>
                  <textarea
                    rows="4"
                    required
                    placeholder="Écrivez votre avis sur la qualité des produits ou de la relation client..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '10px 12px',
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      resize: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    style={{
                      background: '#f3f4f6',
                      border: 'none',
                      color: '#4b5563',
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '0.85rem',
                      fontWeight: '750',
                      cursor: 'pointer'
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={reviewSubmitting || !reviewText.trim()}
                    style={{
                      background: 'var(--primary-blue)',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      fontWeight: '750',
                      cursor: (reviewSubmitting || !reviewText.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (reviewSubmitting || !reviewText.trim()) ? 0.6 : 1
                    }}
                  >
                    {reviewSubmitting ? 'Envoi...' : 'Soumettre l\'avis'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
