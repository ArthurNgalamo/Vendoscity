// client/src/app/product/[id]/components/ProductReviews.js
'use client';
import React, { useState } from 'react';
import { Star, Send, MessageSquare, LogIn } from 'lucide-react';
import Link from 'next/link';

// Gradient colors for avatar backgrounds
const AVATAR_COLORS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #84fab0, #8fd3f4)',
];

function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function StarRating({ value, onChange, size = 28 }) {
  const [hovered, setHovered] = useState(0);
  const effective = hovered || value;
  return (
    <div style={{ display: 'flex', gap: '4px', cursor: onChange ? 'pointer' : 'default' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          width={size}
          height={size}
          fill={i <= effective ? '#f59e0b' : 'none'}
          color={i <= effective ? '#f59e0b' : '#cbd5e1'}
          style={{ transition: 'all 0.15s' }}
          onMouseEnter={() => onChange && setHovered(i)}
          onMouseLeave={() => onChange && setHovered(0)}
          onClick={() => onChange && onChange(i)}
        />
      ))}
    </div>
  );
}

export default function ProductReviews({
  reviews,
  handleAddReview,
  user,
  reviewRating,
  setReviewRating,
  reviewComment,
  setReviewComment,
  submittingReview
}) {
  const total = reviews.length;
  const avg = total > 0 ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / total) : 0;

  // Distribution of ratings
  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => Number(r.rating) === star).length
  }));

  return (
    <section style={{
      background: '#fff',
      padding: '30px',
      borderRadius: '16px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
      marginTop: '30px'
    }}>
      <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)', margin: '0 0 24px 0', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MessageSquare width="20" height="20" /> Avis Clients ({total})
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '28px' }}>

        {/* Rating Summary Panel */}
        {total > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '24px',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)',
            border: '1px solid #e0e7ff',
            borderRadius: '12px',
            padding: '20px 24px'
          }}>
            {/* Big average score */}
            <div style={{ textAlign: 'center', paddingRight: '24px', borderRight: '1px solid #e0e7ff' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: '900', color: 'var(--primary-blue)', lineHeight: 1 }}>
                {avg.toFixed(1)}
              </div>
              <StarRating value={Math.round(avg)} size={18} />
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                {total} avis
              </div>
            </div>

            {/* Distribution bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {distribution.map(({ star, count }) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                    <span style={{ minWidth: '16px', color: '#555', fontWeight: '700' }}>{star}</span>
                    <Star width={12} height={12} fill="#f59e0b" color="#f59e0b" />
                    <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: '99px', transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ minWidth: '28px', color: '#94a3b8', fontSize: '0.75rem' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Write a review form */}
        <div style={{ background: '#f9fafb', border: '1px solid #f0f0f0', padding: '22px', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1rem', color: '#111', margin: '0 0 16px 0', fontWeight: '800' }}>Écrire un avis</h3>

          {!user ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
              <LogIn width="32" height="32" style={{ margin: '0 auto 10px auto', opacity: 0.4, display: 'block' }} />
              <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>Vous devez être connecté pour publier un avis.</p>
              <Link
                href="/mon-espace"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 20px',
                  background: 'var(--primary-blue)',
                  color: '#fff',
                  borderRadius: '8px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  fontSize: '0.9rem'
                }}
              >
                <LogIn width="15" height="15" /> Se connecter
              </Link>
            </div>
          ) : (
            <form onSubmit={handleAddReview} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Star selector */}
              <div>
                <label style={{ fontSize: '0.85rem', color: '#555', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Votre note
                </label>
                <StarRating value={reviewRating} onChange={setReviewRating} size={30} />
              </div>

              {/* Comment */}
              <div>
                <label htmlFor="rev-comment" style={{ fontSize: '0.85rem', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                  Commentaire
                </label>
                <textarea
                  id="rev-comment"
                  rows="4"
                  placeholder="Partagez votre expérience avec ce produit..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #e2e8f0',
                    resize: 'vertical',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary-blue)'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                style={{
                  alignSelf: 'flex-start',
                  background: submittingReview ? '#94a3b8' : 'linear-gradient(135deg, var(--primary-blue), #4f46e5)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 22px',
                  fontWeight: '700',
                  cursor: submittingReview ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s',
                  boxShadow: submittingReview ? 'none' : '0 4px 12px rgba(18,18,147,0.2)'
                }}
              >
                <Send width="14" height="14" />
                {submittingReview ? 'Publication...' : 'Publier mon avis'}
              </button>
            </form>
          )}
        </div>

        {/* Reviews list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {reviews.length > 0 ? (
            reviews.map((rev, idx) => {
              const name = rev.name || rev.reviewer_name || 'Anonyme';
              const initials = name.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2);
              const date = rev.created_at ? new Date(rev.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

              return (
                <div key={rev.id || idx} style={{
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  transition: 'box-shadow 0.2s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: getAvatarColor(name),
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}>
                      {initials || '?'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{name}</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {Array(5).fill(null).map((_, starIdx) => (
                              <Star
                                key={starIdx}
                                width="13"
                                height="13"
                                fill={starIdx < Number(rev.rating) ? '#f59e0b' : 'none'}
                                color={starIdx < Number(rev.rating) ? '#f59e0b' : '#cbd5e1'}
                              />
                            ))}
                          </div>
                          {date && <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{date}</span>}
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#4b5563', lineHeight: '1.6' }}>
                        {rev.comment}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              <Star width="32" height="32" style={{ opacity: 0.3, margin: '0 auto 10px auto', display: 'block' }} />
              <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>
                Aucun avis pour le moment. Soyez le premier à partager votre expérience !
              </p>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
