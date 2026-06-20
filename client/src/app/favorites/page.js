// client/src/app/favorites/page.js
'use client';

import React from 'react';
import { useFavorites } from '../../context/FavoritesContext';
import ProductCard from '../../components/ProductCard';
import { Heart, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function FavoritesPage() {
  const { favorites, loading } = useFavorites();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .favorites-hero {
          background: linear-gradient(135deg, #f43f5e 0%, #be123c 100%);
          color: white;
          padding: 60px 20px;
          text-align: center;
        }
        .favorites-hero h1 {
          font-size: 2.5rem;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .favorites-hero p {
          font-size: 1.1rem;
          max-width: 600px;
          margin: 0 auto;
          opacity: 0.95;
        }
        .favorites-container {
          max-width: 1200px;
          margin: 40px auto;
          padding: 0 20px;
        }
        .favorites-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 30px;
          margin-bottom: 60px;
        }
        .empty-favorites {
          background: white;
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 60px 30px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
          max-width: 600px;
          margin: 0 auto 60px;
        }
        .empty-favorites h3 {
          font-size: 1.4rem;
          color: var(--primary-blue);
          margin-bottom: 10px;
        }
        .empty-favorites p {
          color: #666;
          margin-bottom: 25px;
        }
        .empty-favorites a {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--primary-blue);
          color: white;
          padding: 12px 30px;
          border-radius: 6px;
          font-weight: 700;
          text-decoration: none;
          transition: background 0.2s;
        }
        .empty-favorites a:hover {
          background: var(--primary-blue-2);
        }
      ` }} />

      <main style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', paddingBottom: '60px' }}>
        <div className="favorites-hero">
          <h1>
            <Heart width="30" height="30" fill="white" /> Mes Articles Favoris
          </h1>
          <p>Retrouvez ici tous les articles que vous avez sauvegardés pour les consulter ou les commander plus tard.</p>
        </div>

        <div className="favorites-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ color: '#666' }}>Chargement des favoris...</p>
            </div>
          ) : favorites.length > 0 ? (
            <div className="favorites-grid">
              {favorites.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="empty-favorites">
              <Heart width="48" height="48" color="#f43f5e" style={{ marginBottom: '15px' }} />
              <h3>Votre liste est vide</h3>
              <p>Vous n'avez pas encore d'articles sauvegardés. Explorez notre boutique pour trouver des produits intéressants !</p>
              <Link href="/boutique">
                <ShoppingBag width="18" height="18" /> Découvrir la Boutique
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
