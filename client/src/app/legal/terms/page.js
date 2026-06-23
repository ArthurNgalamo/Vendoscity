// client/src/app/legal/terms/page.js
'use client';

import React from 'react';

export default function TermsPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .legal-content {
          max-width: 900px;
          margin: 40px auto;
          padding: 0 20px;
          line-height: 1.8;
          color: #444;
        }
        .legal-content h1 {
          color: var(--primary-blue);
          margin-bottom: 20px;
          font-size: 2.2rem;
          font-weight: 800;
        }
        .legal-content h2 {
          color: var(--primary-blue);
          margin-top: 35px;
          margin-bottom: 15px;
          border-bottom: 2px solid var(--color-yellow);
          padding-bottom: 10px;
          font-size: 1.4rem;
          font-weight: 700;
        }
        .legal-content h3 {
          color: #333;
          margin-top: 25px;
          margin-bottom: 10px;
          font-size: 1.15rem;
          font-weight: 600;
        }
        .legal-content p {
          margin-bottom: 15px;
          text-align: justify;
        }
        .legal-content ul, .legal-content ol {
          margin-left: 25px;
          margin-bottom: 15px;
        }
        .legal-content li {
          margin-bottom: 8px;
        }
        .legal-content .updated {
          background-color: #f1f5f9;
          padding: 15px 20px;
          border-radius: 6px;
          margin-bottom: 30px;
          font-size: 0.9rem;
          color: #666;
        }
      ` }} />

      <main style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '20px 0 60px' }}>
        <div className="legal-content" style={{ background: 'white', padding: '40px', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <h1>Conditions Générales d'Utilisation</h1>
          
          <div className="updated">
            <strong>Dernière mise à jour :</strong> 23 mars 2026<br />
            <strong>Entrée en vigueur :</strong> 23 mars 2026
          </div>

          <h2>1. Informations Générales</h2>
          <p>Les présentes conditions générales d'utilisation (ci-après "CGU") régissent l'accès et l'utilisation du site internet <strong>www.vendoscity.com</strong> (ci-après le "Site"). En accédant et en utilisant ce Site, vous acceptez d'être lié par les conditions énoncées ci-dessous.</p>

          <h2>2. Définitions</h2>
          <ul>
            <li><strong>Vendoscity :</strong> La plateforme de shopping en ligne, de services, de messagerie, de commandes et de paiement sécurisé.</li>
            <li><strong>Utilisateur :</strong> Toute personne accédant au Site.</li>
            <li><strong>Vendeur :</strong> Utilisateur créant un compte pour proposer ses produits ou services.</li>
            <li><strong>Acheteur / Client :</strong> Utilisateur achetant ou soumettant une demande de commande.</li>
          </ul>

          <h2>3. Acceptation des Conditions</h2>
          <p>L'utilisation du Site implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas ces termes, vous devez cesser immédiatement d'utiliser la plateforme.</p>

          <h2>4. Rôle de Vendoscity</h2>
          <p>Vendoscity agit comme <strong>plateforme technique de commerce en ligne</strong>. Selon les fonctionnalités disponibles, la plateforme peut faciliter la mise en relation, la commande, la messagerie, le paiement sécurisé et le suivi de livraison.</p>
          <p>Par conséquent, Vendoscity ne peut être tenu responsable :</p>
          <ul>
            <li>De la qualité, de la conformité, ou de la sécurité des produits vendus.</li>
            <li>Des litiges de livraison ou de paiement lorsque les utilisateurs choisissent un arrangement hors plateforme.</li>
            <li>De la véracité des informations publiées par les vendeurs.</li>
          </ul>

          <h2>5. Obligations des Vendeurs</h2>
          <p>En publiant des produits ou des services sur Vendoscity, le Vendeur s'engage à :</p>
          <ul>
            <li>Fournir des informations exactes et conformes à la réalité.</li>
            <li>Ne pas publier de contrefaçons, d'articles interdits par la loi, ou de contenus trompeurs.</li>
            <li>Respecter les accords conclus avec les acheteurs dans la messagerie, le suivi de commande ou tout canal de contact accepté pendant la transition.</li>
          </ul>

          <h2>6. Obligations des Acheteurs</h2>
          <p>L'Acheteur s'engage à faire preuve de prudence lors de ses transactions et à ne pas harceler les vendeurs ou soumettre de fausses commandes répétées.</p>

          <h2>7. Propriété Intellectuelle</h2>
          <p>Tous les éléments du Site (textes, logos, charte graphique, codes sources) sont la propriété de Vendoscity ou de ses concédants. Toute reproduction non autorisée est strictement interdite.</p>

          <h2>8. Loi Applicable et Juridiction</h2>
          <p>Les présentes CGU sont régies par le droit camerounais. En cas de litige relatif à l'interprétation ou à l'exécution des présentes, et à défaut de résolution amiable, les tribunaux de Yaoundé seront seuls compétents.</p>
        </div>
      </main>
    </>
  );
}
