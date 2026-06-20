// client/src/app/faq/page.js
'use client';

import React, { useState } from 'react';
import AccordionItem from '../../components/AccordionItem';
import { HelpCircle, Search, User, Package, CreditCard, Truck, Undo, Mail } from 'lucide-react';
import Link from 'next/link';

const FAQ_ITEMS = [
  {
    category: 'account',
    question: 'Comment créer un compte Vendoscity?',
    answer: `<p>Pour créer un compte, cliquez sur le bouton "S'inscrire" en haut de la page. Vous devrez fournir :</p>
             <ul>
               <li>Votre adresse email</li>
               <li>Un mot de passe sécurisé</li>
               <li>Vos informations personnelles (nom, numéro WhatsApp)</li>
             </ul>
             <p>Après validation, votre compte sera immédiatement actif et vous pourrez commencer à publier ou à commander.</p>`
  },
  {
    category: 'account',
    question: 'Comment modifier mon profil?',
    answer: `<p>Pour modifier votre profil :</p>
             <ol>
               <li>Connectez-vous à votre compte vendeur.</li>
               <li>Accédez à votre "Tableau de Bord".</li>
               <li>Modifiez vos informations (nom de boutique, numéro WhatsApp, quartier, description).</li>
               <li>Cliquez sur "Enregistrer les modifications".</li>
             </ol>`
  },
  {
    category: 'order',
    question: 'Comment suivre ma commande?',
    answer: `<p>Les commandes sur Vendoscity s'effectuent en direct via WhatsApp. Pour suivre votre commande :</p>
             <ol>
               <li>Consultez votre historique de discussion WhatsApp avec le vendeur.</li>
               <li>Écrivez directement au vendeur avec la référence de la commande (ex: VC-XXXX-XXXX) reçue lors de la commande.</li>
             </ol>
             <p><strong>Note :</strong> Vendoscity est une plateforme de mise en relation directe, le suivi s'effectue donc directement entre vous et le vendeur.</p>`
  },
  {
    category: 'order',
    question: 'Puis-je annuler ma commande?',
    answer: `<p>Vous pouvez annuler ou modifier votre demande directement auprès du vendeur sur WhatsApp tant que le produit n'a pas été livré ou expédié.</p>
             <p>Étant donné que le paiement s'effectue hors plateforme, vous n'avez aucun frais d'annulation sur la plateforme.</p>`
  },
  {
    category: 'payment',
    question: 'Quels modes de paiement acceptez-vous?',
    answer: `<p>Vendoscity ne collecte pas votre paiement. Vous payez directement le vendeur selon les modalités convenues d'un commun accord :</p>
             <ul>
               <li>Mobile Money (Orange Money, MTN Mobile Money)</li>
               <li>Paiement en espèces lors de la remise en main propre</li>
               <li>Virement ou versement bancaire</li>
             </ul>
             <p><strong>Conseil :</strong> Clarifiez toujours le prix total et le moyen de paiement sur WhatsApp avant de procéder à la transaction.</p>`
  },
  {
    category: 'payment',
    question: 'Je veux payer. Comment ça se passe?',
    answer: `<p>Le paiement se fait hors plateforme directement entre vous et le vendeur.</p>
             <ul>
               <li>Ajoutez les articles au panier et cliquez sur "Commander via WhatsApp".</li>
               <li>Envoyez le message automatique généré pour initier la discussion avec le vendeur.</li>
               <li>Mettez-vous d'accord sur le mode de paiement (MOMO, cash) et de livraison.</li>
               <li><strong>Pour votre sécurité :</strong> vérifiez le produit et l'identité du vendeur lors de la remise.</li>
             </ul>`
  },
  {
    category: 'shipping',
    question: 'Quel est le délai de livraison?',
    answer: `<p>Les délais et les frais de livraison dépendent du vendeur et de la localisation :</p>
             <ul>
               <li><strong>Remise en main propre :</strong> Souvent le jour même dans la même ville (Yaoundé, Douala, etc.).</li>
               <li><strong>Livraison organisée par le vendeur :</strong> Selon ses tarifs et prestataires habituels.</li>
               <li><strong>Aide à la livraison :</strong> Si le vendeur le souhaite, Vendoscity peut aider à organiser la livraison (tarif discutable).</li>
             </ul>`
  },
  {
    category: 'shipping',
    question: "Livrez-vous à l'international?",
    answer: `<p>Les vendeurs présents sur la plateforme livrent principalement au Cameroun, mais certains peuvent expédier dans la sous-région (Côte d'Ivoire, Sénégal, Mali, Burkina Faso) par agence de transport. Veuillez clarifier ce point directement avec eux sur WhatsApp.</p>`
  },
  {
    category: 'return',
    question: 'Quelle est votre politique de retour?',
    answer: `<p>Les retours et remboursements sont gérés au cas par cas directement avec le vendeur :</p>
             <ul>
               <li>Vérifiez l'état du produit immédiatement à la livraison/remise.</li>
               <li>Entendez-vous sur les conditions de retour (délai, état de l'article) par écrit sur WhatsApp avant de finaliser l'achat.</li>
             </ul>`
  },
  {
    category: 'return',
    question: 'Comment demander un remboursement?',
    answer: `<p>Contactez directement le vendeur sur WhatsApp pour lui expliquer le problème (non-conformité, défaut). Si le vendeur accepte le remboursement, convenez ensemble des modalités de retour de l'article et du transfert des fonds (généralement via Mobile Money).</p>`
  },
  {
    category: 'all',
    question: 'Comment contacter le support Vendoscity?',
    answer: `<p>Vous pouvez joindre notre équipe d'assistance par :</p>
             <ul>
               <li><strong>Email :</strong> <a href="mailto:arthurngalamo7@gmail.com">arthurngalamo7@gmail.com</a></li>
               <li><strong>Téléphone / WhatsApp :</strong> <a href="tel:+237681570075">+237 681 570 075</a></li>
               <li><strong>Formulaire :</strong> <a href="/contacts">Page de contact</a></li>
             </ul>
             <p>Nous répondons généralement sous 24h ouvrées.</p>`
  }
];

const CATEGORIES = [
  { key: 'all', label: 'Tous', icon: HelpCircle },
  { key: 'account', label: 'Compte', icon: User },
  { key: 'order', label: 'Commandes', icon: Package },
  { key: 'payment', label: 'Paiement', icon: CreditCard },
  { key: 'shipping', label: 'Livraison', icon: Truck },
  { key: 'return', label: 'Retours', icon: Undo }
];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = FAQ_ITEMS.filter((item) => {
    // Category Filter
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory || (activeCategory === 'all' && item.category === 'all');
    
    // Search Filter
    const matchesSearch = searchQuery.trim() === '' || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .faq-hero {
          background: linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-blue-2) 100%);
          color: white;
          padding: 60px 20px;
          text-align: center;
        }
        .faq-hero h1 {
          font-size: 2.5rem;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .faq-hero p {
          font-size: 1.1rem;
          max-width: 600px;
          margin: 0 auto;
        }
        .faq-container {
          max-width: 900px;
          margin: 40px auto;
          padding: 0 20px;
        }
        .faq-search {
          display: flex;
          position: relative;
          margin-bottom: 40px;
        }
        .faq-search input {
          width: 100%;
          padding: 15px 15px 15px 45px;
          border: 2px solid var(--primary-blue);
          border-radius: 8px;
          font-size: 1rem;
          font-family: inherit;
        }
        .faq-search .search-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--primary-blue);
        }
        .faq-categories {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 12px;
          margin-bottom: 40px;
        }
        .faq-cat-btn {
          background: white;
          border: 1px solid #ddd;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-family: inherit;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          color: #333;
        }
        .faq-cat-btn.active {
          background: var(--primary-blue);
          color: white;
          border-color: var(--primary-blue);
        }
        .faq-cat-btn:hover:not(.active) {
          border-color: var(--primary-blue);
          background: #f8fafc;
        }
        .faq-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 40px;
          text-align: center;
        }
        .faq-stat {
          background: white;
          border: 1px solid #eee;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .faq-stat-number {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--color-yellow);
          margin-bottom: 5px;
        }
        .faq-stat-label {
          font-size: 0.85rem;
          color: #666;
          font-weight: 500;
        }
        .faq-accordion {
          display: grid;
          gap: 15px;
          margin-bottom: 40px;
        }
        .faq-item {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          background: white;
          transition: box-shadow 0.3s ease;
        }
        .faq-item:hover {
          box-shadow: 0 4px 12px rgba(18, 18, 147, 0.06);
        }
        .faq-question {
          background: #f9f9f9;
          padding: 18px 20px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          color: var(--primary-blue);
          transition: all 0.2s ease;
        }
        .faq-question:hover {
          background: #f0f4f8;
        }
        .faq-question.active {
          background: var(--primary-blue);
          color: white;
        }
        .faq-answer {
          padding: 20px;
          background: white;
          color: #555;
          line-height: 1.6;
          border-top: 1px solid #eee;
        }
        .faq-answer ul, .faq-answer ol {
          margin-left: 20px;
          margin-top: 8px;
          margin-bottom: 8px;
        }
        .faq-answer li {
          margin-bottom: 6px;
        }
        .faq-answer a {
          color: var(--primary-blue);
          text-decoration: underline;
        }
        .faq-helpful {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #eee;
        }
        .faq-contact-cta {
          background: white;
          border: 2px solid var(--color-yellow);
          border-radius: 12px;
          padding: 30px;
          text-align: center;
          margin-top: 50px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
        }
        .faq-contact-cta h3 {
          color: var(--primary-blue);
          margin-bottom: 10px;
          font-size: 1.3rem;
        }
        .faq-contact-cta p {
          color: #666;
          margin-bottom: 20px;
          font-size: 0.95rem;
        }
        .faq-contact-cta a {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--primary-blue);
          color: white;
          padding: 12px 25px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          transition: background 0.2s;
        }
        .faq-contact-cta a:hover {
          background: var(--primary-blue-2);
        }
        @media (max-width: 768px) {
          .faq-hero h1 {
            font-size: 1.8rem;
          }
          .faq-stats {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
      ` }} />

      <main style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', paddingBottom: '60px' }}>
        <div className="faq-hero">
          <h1>
            <HelpCircle width="30" height="30" /> Foire Aux Questions
          </h1>
          <p>Vendoscity met en relation directe acheteurs et vendeurs. Voici les points essentiels.</p>
        </div>

        <div className="faq-container">
          {/* Search Bar */}
          <div className="faq-search">
            <Search className="search-icon" width="20" height="20" />
            <input
              type="text"
              placeholder="Rechercher une question ou un sujet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Categories Grid */}
          <div className="faq-categories">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.key}
                  className={`faq-cat-btn ${activeCategory === cat.key ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.key)}
                >
                  <Icon width="16" height="16" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Stats Boxes */}
          <div className="faq-stats">
            <div className="faq-stat">
              <div className="faq-stat-number">11</div>
              <div className="faq-stat-label">Questions fréquentes</div>
            </div>
            <div className="faq-stat">
              <div className="faq-stat-number">Yaoundé</div>
              <div className="faq-stat-label">Siège Social</div>
            </div>
            <div className="faq-stat">
              <div className="faq-stat-number">&lt; 24h</div>
              <div className="faq-stat-label">Réponse de support</div>
            </div>
          </div>

          {/* FAQ Accordion Grid */}
          <div className="faq-accordion">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, idx) => (
                <AccordionItem
                  key={idx}
                  category={item.category}
                  question={item.question}
                  answer={item.answer}
                />
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: '8px', border: '1px solid #ddd' }}>
                <p style={{ color: '#666', fontStyle: 'italic' }}>Aucune question ne correspond à votre recherche.</p>
              </div>
            )}
          </div>

          {/* CTA support */}
          <div className="faq-contact-cta">
            <h3>Vous n'avez pas trouvé la réponse à votre question ?</h3>
            <p>Notre équipe d'assistance est là pour vous aider à tout moment.</p>
            <Link href="/contacts">
              <Mail width="18" height="18" /> Nous Contacter
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
