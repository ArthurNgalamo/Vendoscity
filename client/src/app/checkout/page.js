// client/src/app/checkout/page.js
'use client';

import React from 'react';
import { ShoppingCart, MessageSquare, Send, CheckCircle, ShieldAlert, DollarSign, Truck, Info, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutGuidePage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .checkout-hero {
          background: linear-gradient(135deg, var(--primary-blue), var(--primary-blue-2));
          color: white;
          padding: 60px 20px;
          text-align: center;
        }
        .checkout-hero h1 {
          font-size: 2.5rem;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .checkout-hero p {
          font-size: 1.1rem;
          max-width: 700px;
          margin: 0 auto;
        }
        .checkout-container {
          max-width: 1000px;
          margin: 40px auto;
          padding: 0 20px;
        }
        .checkout-card {
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.03);
          margin-bottom: 30px;
          border: 1px solid #eee;
        }
        .info-box {
          background: #e3f2fd;
          border-left: 5px solid #2196f3;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          color: #0d47a1;
          line-height: 1.6;
        }
        .info-box h3 {
          margin-top: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.15rem;
          color: #0d47a1;
        }
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }
        .step-card {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .step-number {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--color-yellow);
          margin-bottom: 10px;
        }
        .step-card h4 {
          color: var(--primary-blue);
          font-size: 1.05rem;
          margin-bottom: 8px;
          font-weight: 700;
        }
        .step-card p {
          font-size: 0.85rem;
          color: #666;
          line-height: 1.4;
          margin: 0;
        }
        .section-title {
          font-size: 1.4rem;
          color: var(--primary-blue);
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #eee;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
        }
        .guide-list {
          padding-left: 0;
          list-style: none;
          margin: 20px 0;
        }
        .guide-list li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 15px;
          font-size: 0.95rem;
          color: #444;
          line-height: 1.6;
        }
        .guide-list li svg {
          margin-top: 3px;
          color: var(--primary-blue);
          flex-shrink: 0;
        }
        .warning-box {
          background: #fff3cd;
          border-left: 5px solid #ffc107;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
          color: #664d03;
        }
        .warning-box h4 {
          margin-top: 0;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.05rem;
          font-weight: 700;
        }
        .warning-box p {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .checkout-cta-bar {
          display: flex;
          justify-content: center;
          margin-top: 40px;
        }
        .checkout-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--color-green);
          color: white;
          padding: 15px 35px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 1.1rem;
          text-decoration: none;
          transition: background 0.2s, transform 0.2s;
          box-shadow: 0 4px 12px rgba(18, 18, 147, 0.05);
        }
        .checkout-cta-btn:hover {
          background: #00764d;
          transform: translateY(-2px);
        }
      ` }} />

      <main style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', paddingBottom: '60px' }}>
        <div className="checkout-hero">
          <h1>
            <Send width="30" height="30" /> Comment Commander ?
          </h1>
          <p>
            Sur Vendoscity, vous achetez en direct sur WhatsApp. Aucun paiement n'est effectué en ligne, la remise et le paiement se font de gré à gré entre vous et le vendeur.
          </p>
        </div>

        <div className="checkout-container">
          {/* Info intro box */}
          <div className="info-box">
            <h3>
              <Info width="18" height="18" /> Mise en relation 100% Directe
            </h3>
            <p>
              Vendoscity n'intervient pas comme intermédiaire de paiement et ne prélève aucune commission. Vous êtes mis en relation immédiate avec le vendeur pour valider les conditions de vente en toute liberté.
            </p>
          </div>

          {/* Steps */}
          <div className="checkout-card">
            <h2 className="section-title">
              <CheckCircle width="20" height="20" /> Le processus en 4 étapes
            </h2>
            
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-number">1</div>
                <h4>Remplir votre panier</h4>
                <p>Parcourez la boutique et ajoutez les articles souhaités dans votre panier.</p>
              </div>
              <div className="step-card">
                <div className="step-number">2</div>
                <h4>Saisir votre WhatsApp</h4>
                <p>Ouvrez le panier, entrez votre numéro de téléphone et validez la commande.</p>
              </div>
              <div className="step-card">
                <div className="step-number">3</div>
                <h4>Envoyer le récapitulatif</h4>
                <p>Un message pré-rempli s'ouvre sur WhatsApp. Cliquez sur envoyer pour contacter le vendeur.</p>
              </div>
              <div className="step-card">
                <div className="step-number">4</div>
                <h4>Conclure l'achat</h4>
                <p>Convenez avec le vendeur de l'heure, du lieu de remise et du mode de paiement.</p>
              </div>
            </div>
          </div>

          {/* Delivery & Payment details */}
          <div className="checkout-card">
            <h2 className="section-title">
              <Truck width="20" height="20" /> Livraison & Réception
            </h2>
            <p>Le mode de remise est à définir lors de votre échange sur WhatsApp :</p>
            <ul className="guide-list">
              <li>
                <ArrowRight width="16" height="16" />
                <span><strong>Remise en main propre :</strong> Nous vous conseillons de vous retrouver dans un lieu public sécurisé (station, supermarché) pour inspecter l'article avant de payer.</span>
              </li>
              <li>
                <ArrowRight width="16" height="16" />
                <span><strong>Livraison à domicile ou bureau :</strong> Le vendeur peut proposer son propre livreur ou faire appel à un service de livraison externe à vos frais.</span>
              </li>
              <li>
                <ArrowRight width="16" height="16" />
                <span><strong>Aide Vendoscity :</strong> Sur demande du vendeur ou de votre part, Vendoscity peut aider à organiser la livraison dans les principales villes (Yaoundé, Douala).</span>
              </li>
            </ul>
          </div>

          <div className="checkout-card">
            <h2 className="section-title">
              <DollarSign width="20" height="20" /> Modalités de Paiement
            </h2>
            <p>Le paiement s'effectue directement auprès du vendeur, après confirmation de la commande :</p>
            <ul className="guide-list">
              <li>
                <ArrowRight width="16" height="16" />
                <span><strong>Paiement Mobile Money (MOMO / Orange Money) :</strong> Méthode rapide et traçable, idéale si le vendeur expédie le colis par agence.</span>
              </li>
              <li>
                <ArrowRight width="16" height="16" />
                <span><strong>Paiement en espèces (Cash) :</strong> Recommandé pour les remises physiques en main propre, après vérification de la conformité du produit.</span>
              </li>
              <li>
                <ArrowRight width="16" height="16" />
                <span><strong>Virement bancaire :</strong> Adapté aux transactions de montants importants ou aux achats professionnels.</span>
              </li>
            </ul>

            <div className="warning-box">
              <h4>
                <ShieldAlert width="18" height="18" /> Conseils de sécurité essentiels
              </h4>
              <p>
                Ne versez jamais d'acompte important à un vendeur sans garantie. Privilégiez les remises physiques pour tester le matériel (téléphones, ordinateurs) et vérifier la qualité des vêtements ou accessoires avant de finaliser la transaction.
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="checkout-cta-bar">
            <Link href="/boutique" className="checkout-cta-btn">
              <ShoppingCart width="20" height="20" /> Commencer mes achats
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
