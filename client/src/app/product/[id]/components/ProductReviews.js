// client/src/app/product/[id]/components/ProductReviews.js
import React from 'react';
import { MessageSquare, Send, Star } from 'lucide-react';

export default function ProductReviews({
  reviews,
  handleAddReview,
  reviewName,
  setReviewName,
  reviewRating,
  setReviewRating,
  reviewComment,
  setReviewComment,
  submittingReview
}) {
  return (
    <section style={{ background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', marginTop: '30px' }}>
      <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-blue)', margin: '0 0 20px 0', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MessageSquare width="20" height="20" /> Avis Clients ({reviews.length})
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
        
        {/* Write a review form */}
        <div style={{ background: '#f9fafb', border: '1px solid #f3f4f6', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1rem', color: '#111', margin: '0 0 15px 0', fontWeight: '800' }}>Écrire un avis</h3>
          <form onSubmit={handleAddReview} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div>
                <label htmlFor="rev-name" style={{ fontSize: '0.85rem', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Votre Nom</label>
                <input
                  id="rev-name"
                  type="text"
                  placeholder="Jean Dupont"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label htmlFor="rev-rating" style={{ fontSize: '0.85rem', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Note</label>
                <select
                  id="rev-rating"
                  value={reviewRating}
                  onChange={(e) => setReviewRating(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff' }}
                >
                  <option value="5">5 Étoiles (Excellent)</option>
                  <option value="4">4 Étoiles (Très bon)</option>
                  <option value="3">3 Étoiles (Moyen)</option>
                  <option value="2">2 Étoiles (Mauvais)</option>
                  <option value="1">1 Étoile (Médiocre)</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="rev-comment" style={{ fontSize: '0.85rem', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Commentaire</label>
              <textarea
                id="rev-comment"
                rows="3"
                placeholder="Votre avis sur le produit..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={submittingReview}
              style={{
                alignSelf: 'flex-start',
                background: 'var(--primary-blue)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Send width="14" height="14" /> {submittingReview ? 'Publication...' : 'Publier l\'avis'}
            </button>
          </form>
        </div>

        {/* Reviews list */}
        <div style={{ display: 'grid', gap: '15px' }}>
          {reviews.length > 0 ? (
            reviews.map((rev) => (
              <div key={rev.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#333' }}>{rev.name}</strong>
                  <div style={{ display: 'flex', gap: '1px', color: 'var(--color-yellow)' }}>
                    {Array(5).fill(null).map((_, starIdx) => (
                      <Star
                        key={starIdx}
                        width="12"
                        height="12"
                        fill={starIdx < Number(rev.rating) ? 'currentColor' : 'none'}
                        color={starIdx < Number(rev.rating) ? 'currentColor' : '#cbd5e1'}
                      />
                    ))}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#555', lineHeight: '1.5' }}>{rev.comment}</p>
              </div>
            ))
          ) : (
            <p style={{ color: '#888', fontStyle: 'italic', margin: '20px 0' }}>Aucun avis pour le moment. Soyez le premier à donner votre avis !</p>
          )}
        </div>
      </div>
    </section>
  );
}
