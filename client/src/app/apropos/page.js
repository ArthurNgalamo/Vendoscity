// client/src/app/apropos/page.js
'use client';

import React from 'react';
import { BookOpen, Target, Award, Calendar, User, BarChart2, CheckCircle, Leaf, Shield, Heart } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .about-hero {
          background: linear-gradient(135deg, var(--primary-blue), var(--primary-blue-2));
          color: white;
          padding: 60px 20px;
          text-align: center;
        }
        .about-hero h1 {
          font-size: 2.5rem;
          margin-bottom: 15px;
        }
        .about-hero p {
          font-size: 1.1rem;
          max-width: 600px;
          margin: 0 auto;
        }
        .about-container {
          max-width: 1000px;
          margin: 40px auto;
          padding: 0 20px;
        }
        .about-section {
          margin: 50px 0;
          line-height: 1.8;
        }
        .about-section h2 {
          color: var(--primary-blue);
          font-size: 1.8rem;
          margin-bottom: 20px;
          border-bottom: 3px solid var(--color-yellow);
          padding-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .about-section h3 {
          color: #333;
          font-size: 1.25rem;
          margin-top: 25px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .about-section p {
          color: #555;
          margin-bottom: 15px;
          text-align: justify;
        }
        .about-section ul {
          padding-left: 0;
          list-style: none;
          margin-bottom: 20px;
        }
        .about-section ul li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 10px;
          color: #555;
        }
        .about-section ul li svg {
          margin-top: 4px;
          color: var(--color-green);
          flex-shrink: 0;
        }
        .values-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 25px;
          margin: 30px 0;
        }
        .value-card {
          background: white;
          padding: 25px;
          border-left: 5px solid var(--primary-blue);
          border-radius: 8px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
          transition: transform 0.2s, border-left-color 0.2s;
        }
        .value-card:hover {
          transform: translateY(-3px);
          border-left-color: var(--color-yellow);
        }
        .value-card h4 {
          color: var(--primary-blue);
          font-size: 1.1rem;
          margin-bottom: 10px;
          font-weight: 700;
        }
        .value-card p {
          font-size: 0.9rem;
          color: #666;
          margin: 0;
          text-align: left;
        }
        .team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 30px;
          margin: 30px 0;
        }
        .team-member {
          background: white;
          border: 1px solid #eee;
          border-radius: 10px;
          overflow: hidden;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
          transition: transform 0.3s ease, border-color 0.3s ease;
        }
        .team-member:hover {
          transform: translateY(-5px);
          border-color: var(--primary-blue);
        }
        .member-avatar {
          height: 200px;
          background: linear-gradient(135deg, var(--primary-blue), var(--primary-blue-2));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .member-info {
          padding: 20px;
        }
        .member-info h4 {
          color: var(--primary-blue);
          font-size: 1.15rem;
          margin-bottom: 5px;
          font-weight: 700;
        }
        .member-info .role {
          color: var(--color-yellow);
          font-weight: 600;
          margin-bottom: 12px;
          font-size: 0.9rem;
        }
        .member-info p {
          font-size: 0.9rem;
          color: #666;
          margin: 0;
          text-align: center;
          line-height: 1.5;
        }
        .member-info a {
          color: var(--primary-blue);
          text-decoration: none;
        }
        .timeline {
          margin: 40px 0;
          position: relative;
          padding: 10px 0;
        }
        .timeline-item {
          margin-bottom: 25px;
          padding-left: 35px;
          position: relative;
        }
        .timeline-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 4px;
          width: 16px;
          height: 16px;
          background: var(--primary-blue);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 0 2px var(--primary-blue);
        }
        .timeline-item::after {
          content: '';
          position: absolute;
          left: 7px;
          top: 24px;
          width: 2px;
          height: calc(100% + 5px);
          background: var(--color-yellow);
        }
        .timeline-item:last-child::after {
          display: none;
        }
        .timeline-year {
          font-weight: 800;
          color: var(--primary-blue);
          font-size: 1.05rem;
          margin-bottom: 4px;
        }
        .timeline-text {
          color: #555;
          font-size: 0.95rem;
        }
        .stats-block {
          background: linear-gradient(135deg, var(--primary-blue), var(--primary-blue-2));
          color: white;
          padding: 40px 30px;
          border-radius: 12px;
          margin: 50px 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .stats-block h2 {
          color: white;
          border-bottom-color: rgba(255,255,255,0.2);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 30px;
        }
        .stat-card {
          background: rgba(255, 255, 255, 0.1);
          border-left: 4px solid var(--color-yellow);
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }
        .stat-num {
          font-size: 2rem;
          font-weight: 800;
          color: white;
          margin-bottom: 5px;
        }
        .stat-lbl {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.85);
          font-weight: 500;
        }
        .cta-box {
          background: var(--primary-blue);
          color: white;
          padding: 40px 20px;
          border-radius: 12px;
          text-align: center;
          margin-top: 50px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .cta-box h2 {
          color: white;
          border: none;
          margin-bottom: 15px;
          font-size: 1.8rem;
        }
        .cta-box p {
          font-size: 1.1rem;
          margin-bottom: 25px;
          opacity: 0.95;
        }
        .cta-btn {
          display: inline-block;
          background: var(--color-yellow);
          color: var(--primary-blue);
          padding: 14px 30px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 700;
          transition: background 0.2s, transform 0.2s;
        }
        .cta-btn:hover {
          background: #ffaa00;
          transform: translateY(-2px);
        }
      ` }} />

      <main style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', paddingBottom: '60px' }}>
        <div className="about-hero">
          <h1>À Propos de Vendoscity</h1>
          <p>Marketplace intégrée basée à Yaoundé, pensée pour le commerce local et les catalogues fournisseurs.</p>
        </div>

        <div className="about-container">
          {/* Notre Histoire */}
          <section className="about-section">
            <h2>
              <BookOpen width="24" height="24" /> Notre Histoire
            </h2>
            <p>
              Vendoscity a été fondée le <strong>10 janvier 2026</strong> à Yaoundé, au Cameroun, avec une mission simple : <strong>rendre le commerce en ligne plus accessible, suivi et crédible</strong> pour les vendeurs, acheteurs et fournisseurs.
            </p>
            <p>
              Notre approche est pragmatique : la plateforme facilite déjà la découverte des produits, la messagerie et les commandes. Elle évolue maintenant vers une gestion complète sur Vendoscity : paiement sécurisé, suivi de livraison, import d'articles et vidéos depuis des fournisseurs comme Alibaba, AliExpress et 1688.
            </p>
            <p>
              Notre vision s’articule autour de trois piliers majeurs : <strong>l’accessibilité universelle</strong> pour les petits commerçants, <strong>la rapidité de publication</strong>, et <strong>la confiance</strong> grâce à des parcours suivis et vérifiables.
            </p>
          </section>

          {/* Notre Mission */}
          <section className="about-section">
            <h2>
              <Target width="24" height="24" /> Notre Mission
            </h2>
            <p>
              Démocratiser le commerce électronique en Afrique centrale et de l'ouest en fournissant une plateforme simple, abordable et innovante où commerçants et consommateurs peuvent échanger librement et développer l'économie locale.
            </p>
            <p>Nous nous engageons au quotidien à :</p>
            <ul>
              <li>
                <CheckCircle width="18" height="18" />
                <span><strong>Simplifier :</strong> Permettre de publier un produit en moins d'une minute chrono.</span>
              </li>
              <li>
                <CheckCircle width="18" height="18" />
                <span><strong>Accessibilité :</strong> Offrir aux petits marchands une vitrine professionnelle gratuite sans commission.</span>
              </li>
              <li>
                <CheckCircle width="18" height="18" />
                <span><strong>Soutenir :</strong> Accompagner les micro-entrepreneurs locaux dans leur visibilité sur Internet.</span>
              </li>
              <li>
                <CheckCircle width="18" height="18" />
                <span><strong>Impact :</strong> Utiliser des technologies légères et rapides adaptées aux réseaux mobiles africains.</span>
              </li>
            </ul>
          </section>

          {/* Nos Valeurs */}
          <section className="about-section">
            <h2>
              <Award width="24" height="24" /> Nos Valeurs
            </h2>
            <div className="values-grid">
              <div className="value-card">
                <h4>Confiance</h4>
                <p>La messagerie intégrée garde l'humain au cœur de l'achat tout en conservant un historique utile en cas de suivi ou de litige.</p>
              </div>
              <div className="value-card">
                <h4>Innovation</h4>
                <p>Développement de solutions adaptées aux contraintes techniques locales : PWA, caching, paiement sécurisé et import automatisé de catalogues.</p>
              </div>
              <div className="value-card">
                <h4>Accessibilité</h4>
                <p>Aucun frais d'inscription complexe ou de barrière technique pour les commerçants du secteur informel.</p>
              </div>
              <div className="value-card">
                <h4>Communauté</h4>
                <p>Créer un écosystème dynamique d'entrepreneurs solidaires qui partagent leurs boutiques.</p>
              </div>
            </div>
          </section>

          {/* Notre Parcours */}
          <section className="about-section">
            <h2>
              <Calendar width="24" height="24" /> Notre Parcours
            </h2>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-year">10 Janvier 2026</div>
                <div className="timeline-text"><strong>Fondation de Vendoscity à Yaoundé</strong> - Lancement du prototype initial.</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-year">Février 2026</div>
                <div className="timeline-text">Phase de test Beta fermée avec 50 vendeurs locaux et plus de 500 articles publiés.</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-year">Mars 2026</div>
                <div className="timeline-text">Ouverture publique de la plateforme et premiers flux de commandes directs.</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-year">Avril 2026</div>
                <div className="timeline-text">Intégration du panier par vendeur et des premiers parcours de commande suivie.</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-year">Présent</div>
                <div className="timeline-text">Migration complète du frontend vers Next.js et préparation des imports catalogues Alibaba, AliExpress et 1688.</div>
              </div>
            </div>
          </section>

          {/* Le Fondateur */}
          <section className="about-section">
            <h2>
              <User width="24" height="24" /> Le Fondateur
            </h2>
            <p>Vendoscity est un projet conçu et développé pour simplifier l'accès au e-commerce local.</p>
            <div className="team-grid">
              <div className="team-member">
                <div className="member-avatar">
                  <User style={{ width: '80px', height: '80px' }} />
                </div>
                <div className="member-info">
                  <h4>Arthur Ngalamo</h4>
                  <div className="role">Fondateur & Développeur</div>
                  <p>
                    <strong>Email :</strong> <a href="mailto:arthurngalamo7@gmail.com">arthurngalamo7@gmail.com</a><br />
                    <strong>Téléphone :</strong> <a href="tel:+237681570075">+237 681 570 075</a>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Chiffres Clés */}
          <div className="stats-block">
            <h2>
              <BarChart2 width="24" height="24" /> Nos Chiffres Clés
            </h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-num">2026</div>
                <div className="stat-lbl">Année de création</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">Yaoundé</div>
                <div className="stat-lbl">Siège et origine</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">0%</div>
                <div className="stat-lbl">Commission sur les ventes</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">Direct</div>
                <div className="stat-lbl">Parcours de commande</div>
              </div>
            </div>
          </div>

          {/* Engagement Social */}
          <section className="about-section">
            <h2>
              <Leaf width="24" height="24" /> Notre Engagement Social
            </h2>
            <p>Vendoscity s'inscrit dans une démarche de croissance inclusive et durable :</p>
            
            <h3>
              <Shield width="18" height="18" style={{ color: 'var(--primary-blue)' }} /> Soutien aux micro-entrepreneurs
            </h3>
            <p>Nous fournissons des outils digitaux avancés et gratuits pour aider les marchands du secteur informel à formaliser leur présence en ligne.</p>

            <h3>
              <Heart width="18" height="18" style={{ color: 'red' }} /> Impact environnemental réduit
            </h3>
            <p>En favorisant les remises locales en main propre et les circuits courts, nous réduisons les emballages superflus et le transport logistique longue distance.</p>
          </section>

          {/* Call to action */}
          <div className="cta-box">
            <h2>Rejoignez l'Aventure Vendoscity !</h2>
            <p>Achetez, vendez et suivez vos commandes depuis une plateforme simple et évolutive.</p>
            <Link href="/boutique" className="cta-btn">
              Découvrir la Boutique
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
