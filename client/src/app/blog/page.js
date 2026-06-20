// client/src/app/blog/page.js
'use client';

import React, { useState } from 'react';
import BlogCard from '../../components/BlogCard';
import { Newspaper, BarChart2, Lightbulb, User, ShoppingBag, CreditCard, TrendingUp, Lock, Bot, Truck, Star, Flame, Mail } from 'lucide-react';
import Link from 'next/link';

const BLOG_ARTICLES = [
  {
    categoryKey: 'conseils',
    categoryLabel: 'Conseils',
    title: '10 Astuces pour Augmenter vos Ventes en Ligne',
    date: '15 Mar 2026',
    author: 'Arthur Ngalamo',
    excerpt: "Découvrez les 10 stratégies éprouvées pour augmenter votre chiffre d'affaires en ligne. Des techniques simples mais efficaces pour convertir vos visiteurs.",
    icon: CreditCard
  },
  {
    categoryKey: 'vendeurs',
    categoryLabel: 'Pour Vendeurs',
    title: 'Comment Optimiser vos Fiches Produits',
    date: '12 Mar 2026',
    author: 'Arthur Ngalamo',
    excerpt: 'Les fiches produits mal rédigées ou incomplètes font perdre des ventes. Apprenez à concevoir des descriptions claires et persuasives qui rassurent.',
    icon: TrendingUp
  },
  {
    categoryKey: 'acheteurs',
    categoryLabel: 'Pour Acheteurs',
    title: 'Guide Complet de la Sécurité en Ligne',
    date: '10 Mar 2026',
    author: 'Arthur Ngalamo',
    excerpt: 'Protégez vos transactions directes et vos données personnelles. Découvrez les bonnes pratiques pour acheter sereinement hors plateforme.',
    icon: Lock
  },
  {
    categoryKey: 'tendances',
    categoryLabel: 'Tendances',
    title: "L'IA Révolutionne l'Expérience Utilisateur",
    date: '08 Mar 2026',
    author: 'Arthur Ngalamo',
    excerpt: "L'intelligence artificielle personnalise déjà le shopping. Découvrez comment les petits marchands peuvent exploiter ces innovations à moindre coût.",
    icon: Bot
  },
  {
    categoryKey: 'vendeurs',
    categoryLabel: 'Pour Vendeurs',
    title: 'Logistique : Réduire vos Coûts de Livraison',
    date: '05 Mar 2026',
    author: 'Arthur Ngalamo',
    excerpt: 'La livraison rapide et peu coûteuse est un défi majeur. Découvrez nos astuces pour négocier avec les livreurs et optimiser vos tournées.',
    icon: Truck
  },
  {
    categoryKey: 'conseils',
    categoryLabel: 'Conseils',
    title: 'Gérer les Avis Clients : Stratégie Gagnante',
    date: '02 Mar 2026',
    author: 'Arthur Ngalamo',
    excerpt: "Les avis clients influencent 92% des décisions d'achat en ligne. Mettez en place une démarche proactive pour collecter des évaluations positives.",
    icon: Star
  }
];

const CATEGORIES = [
  { key: 'all', label: 'Tous', icon: Newspaper },
  { key: 'tendances', label: 'Tendances', icon: BarChart2 },
  { key: 'conseils', label: 'Conseils', icon: Lightbulb },
  { key: 'vendeurs', label: 'Pour Vendeurs', icon: User },
  { key: 'acheteurs', label: 'Pour Acheteurs', icon: ShoppingBag }
];

export default function BlogPage() {
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredArticles = activeFilter === 'all'
    ? BLOG_ARTICLES
    : BLOG_ARTICLES.filter(a => a.categoryKey === activeFilter);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .blog-hero {
          background: linear-gradient(135deg, var(--color-yellow) 0%, #ffaa00 100%);
          color: var(--primary-blue);
          padding: 60px 20px;
          text-align: center;
        }
        .blog-hero h1 {
          font-size: 2.5rem;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .blog-hero p {
          font-size: 1.1rem;
          max-width: 600px;
          margin: 0 auto;
          color: var(--primary-blue-2);
        }
        .blog-container {
          max-width: 1000px;
          margin: 40px auto;
          padding: 0 20px;
        }
        .blog-featured {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          background: white;
          border: 2px solid var(--color-yellow);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 30px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.03);
        }
        .blog-featured-image {
          background: linear-gradient(135deg, var(--color-yellow) 0%, var(--primary-blue));
          height: 100%;
          min-height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .blog-featured-content {
          padding: 30px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .blog-featured-content h2 {
          color: var(--primary-blue);
          font-size: 1.8rem;
          margin: 10px 0 15px;
        }
        .blog-featured-content p {
          color: #555;
          line-height: 1.7;
          margin-bottom: 20px;
        }
        .blog-featured-content .blog-read-more {
          color: var(--primary-blue);
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .blog-filters {
          display: flex;
          gap: 10px;
          margin-bottom: 40px;
          flex-wrap: wrap;
        }
        .blog-filter-btn {
          background: white;
          border: 1px solid #ddd;
          padding: 10px 20px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
          font-family: inherit;
          font-size: 0.9rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          color: #555;
        }
        .blog-filter-btn.active {
          background: var(--primary-blue);
          color: white;
          border-color: var(--primary-blue);
        }
        .blog-filter-btn:hover:not(.active) {
          border-color: var(--primary-blue);
          background: #f8fafc;
        }
        .blog-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 30px;
          margin-bottom: 50px;
        }
        .blog-card {
          background: white;
          border: 1px solid #eee;
          border-radius: 8px;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .blog-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 24px rgba(18, 18, 147, 0.1);
        }
        .blog-image {
          width: 100%;
          height: 180px;
          background: linear-gradient(135deg, var(--primary-blue), var(--color-yellow));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .blog-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .blog-category {
          display: inline-block;
          background: #fdf5d6;
          color: var(--primary-blue);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 10px;
          align-self: flex-start;
        }
        .blog-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--primary-blue);
          margin-bottom: 10px;
          line-height: 1.4;
        }
        .blog-meta {
          display: flex;
          gap: 15px;
          font-size: 0.8rem;
          color: #777;
          margin-bottom: 12px;
        }
        .blog-excerpt {
          color: #555;
          line-height: 1.5;
          font-size: 0.9rem;
          margin-bottom: 15px;
          flex-grow: 1;
        }
        .blog-read-more {
          color: var(--primary-blue);
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .blog-sidebar {
          background: white;
          padding: 25px;
          border-radius: 8px;
          border: 1px solid #eee;
          margin-bottom: 40px;
        }
        .blog-sidebar h3 {
          color: var(--primary-blue);
          margin-bottom: 20px;
          font-size: 1.15rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .blog-sidebar-item {
          padding: 12px 0;
          border-bottom: 1px solid #eee;
          font-size: 0.95rem;
        }
        .blog-sidebar-item:last-child {
          border-bottom: none;
        }
        .blog-sidebar-item a {
          color: var(--primary-blue);
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }
        .blog-sidebar-item a:hover {
          color: var(--color-yellow);
        }
        .blog-newsletter {
          background: linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-blue-2) 100%);
          color: white;
          padding: 30px;
          border-radius: 8px;
          text-align: center;
        }
        .blog-newsletter h3 {
          font-size: 1.3rem;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .blog-newsletter p {
          font-size: 0.9rem;
          margin-bottom: 20px;
          opacity: 0.9;
        }
        .blog-newsletter-form {
          display: flex;
          max-width: 500px;
          margin: 0 auto;
          gap: 10px;
        }
        .blog-newsletter-form input {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 6px;
          font-size: 0.95rem;
          font-family: inherit;
        }
        .blog-newsletter-form button {
          background: var(--color-yellow);
          color: var(--primary-blue);
          border: none;
          padding: 12px 20px;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.2s;
        }
        .blog-newsletter-form button:hover {
          background: #ffaa00;
        }
        @media (max-width: 768px) {
          .blog-hero h1 {
            font-size: 1.8rem;
          }
          .blog-featured {
            grid-template-columns: 1fr;
          }
          .blog-featured-image {
            min-height: 180px;
          }
          .blog-newsletter-form {
            flex-direction: column;
          }
        }
      ` }} />

      <main style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', paddingBottom: '60px' }}>
        <div className="blog-hero">
          <h1>
            <Newspaper width="30" height="30" /> Actualités & Blog
          </h1>
          <p>Découvrez les tendances e-commerce, conseils vendeurs et actualités Vendoscity</p>
        </div>

        <div className="blog-container">
          {/* Article en Vedette */}
          {activeFilter === 'all' && (
            <div className="blog-featured">
              <div className="blog-featured-image">
                <BarChart2 style={{ width: '80px', height: '80px' }} />
              </div>
              <div className="blog-featured-content">
                <span className="blog-category">Tendances</span>
                <h2>L'avenir du commerce en ligne en 2026</h2>
                <p>Découvrez les grandes tendances technologiques et d'usages qui transforment la vente en ligne en Afrique : marketplaces de proximité, messagerie instantanée en direct et personnalisation simplifiée.</p>
                <Link href="#" className="blog-read-more" onClick={(e) => e.preventDefault()}>
                  Lire l'article complet →
                </Link>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="blog-filters">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.key}
                  className={`blog-filter-btn ${activeFilter === cat.key ? 'active' : ''}`}
                  onClick={() => setActiveFilter(cat.key)}
                >
                  <Icon width="16" height="16" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Blog Cards Grid */}
          <div className="blog-grid">
            {filteredArticles.map((article, idx) => (
              <BlogCard
                key={idx}
                title={article.title}
                category={article.categoryLabel}
                date={article.date}
                author={article.author}
                excerpt={article.excerpt}
                icon={article.icon}
              />
            ))}
          </div>

          {/* Sidebar Area */}
          <div className="blog-sidebar">
            <h3>
              <Flame width="18" height="18" fill="currentColor" /> Articles Populaires
            </h3>
            <div className="blog-sidebar-item">
              <Link href="#" onClick={(e) => e.preventDefault()}>L'avenir du commerce en ligne en 2026</Link>
            </div>
            <div className="blog-sidebar-item">
              <Link href="#" onClick={(e) => e.preventDefault()}>10 Astuces pour Augmenter vos Ventes</Link>
            </div>
            <div className="blog-sidebar-item">
              <Link href="#" onClick={(e) => e.preventDefault()}>Comment Optimiser vos Fiches Produits</Link>
            </div>
            <div className="blog-sidebar-item">
              <Link href="#" onClick={(e) => e.preventDefault()}>Guide Complet de la Sécurité en Ligne</Link>
            </div>
          </div>

          {/* Newsletter Box */}
          <div className="blog-newsletter">
            <h3>
              <Mail width="20" height="20" /> Abonnez-vous à notre Newsletter
            </h3>
            <p>Recevez les dernières actualités et conseils directement dans votre boîte mail</p>
            <div className="blog-newsletter-form">
              <input type="email" placeholder="Votre email..." required />
              <button type="button" onClick={() => alert('Merci pour votre inscription !')}>S'abonner</button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
