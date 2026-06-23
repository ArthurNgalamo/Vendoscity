// client/src/app/legal/privacy/page.js
'use client';

import React from 'react';

export default function PrivacyPage() {
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
          <h1>Politique de Confidentialité</h1>
          
          <div className="updated">
            <strong>Dernière mise à jour :</strong> 23 mars 2026<br />
            <strong>Entrée en vigueur :</strong> 23 mars 2026
          </div>

          <h2>1. Introduction</h2>
          <p>Vendoscity s'engage à protéger la vie privée de ses utilisateurs. Cette Politique de Confidentialité décrit la manière dont nous traitons vos données personnelles lorsque vous naviguez sur notre plateforme.</p>

          <h2>2. Données Collectées</h2>
          <h3>2.1 Données fournies volontairement</h3>
          <p>Dans le cadre de l'utilisation du Site, vous pouvez être amené à nous transmettre directement certaines données personnelles, notamment :</p>
          <ul>
            <li>Lors de l'inscription vendeur : Nom de boutique, prénom, nom, adresse email, mot de passe, téléphone professionnel et quartier.</li>
            <li>Lors du passage d'une commande par un client : coordonnées de contact, articles commandés, informations de livraison et moyen de paiement choisi.</li>
            <li>Lors de la publication d'avis ou de messages de contact : Contenu de l'avis, nom d'utilisateur, email.</li>
          </ul>

          <h3>2.2 Données collectées automatiquement</h3>
          <p>Nous pouvons recueillir des informations de navigation de manière automatique (adresse IP, type de navigateur, système d'exploitation, pages consultées) à des fins de statistiques et de sécurité.</p>

          <h2>3. Utilisation des Données</h2>
          <p>Nous utilisons vos données personnelles uniquement pour :</p>
          <ul>
            <li>Assurer le fonctionnement technique et la sécurité de la plateforme.</li>
            <li>Permettre aux vendeurs de gérer leur profil et leurs catalogues de produits.</li>
            <li>Créer, suivre et sécuriser les commandes passées sur la plateforme.</li>
            <li>Préparer l'import de catalogues, images et vidéos depuis des fournisseurs partenaires lorsque cette fonctionnalité sera activée.</li>
            <li>Améliorer l'expérience utilisateur et réaliser des analyses de trafic anonymes.</li>
          </ul>

          <h2>4. Partage des Données</h2>
          <p>Vendoscity ne vend pas, ne loue pas et ne cède pas vos données personnelles à des tiers. Les données de commande sont partagées uniquement avec les vendeurs, prestataires de paiement, livraison ou fournisseurs techniques nécessaires au traitement de la commande.</p>

          <h2>5. Stockage et Sécurité</h2>
          <p>Vos données de session vendeur (jeton d'authentification) et vos paniers sont stockés localement sur votre appareil (via le stockage local du navigateur) pour optimiser les performances et limiter les requêtes réseau superflues. Les données serveurs sont stockées sur des serveurs sécurisés équipés de protocoles de chiffrement standard.</p>

          <h2>6. Vos Droits</h2>
          <p>Conformément aux réglementations sur la protection des données personnelles, vous disposez d'un droit d'accès, de rectification, de portabilité et de suppression de vos données personnelles. Pour exercer ces droits, vous pouvez nous écrire à : <a href="mailto:arthurngalamo7@gmail.com">arthurngalamo7@gmail.com</a>.</p>
        </div>
      </main>
    </>
  );
}
