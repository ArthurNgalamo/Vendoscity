// client/src/app/legal/cookies/page.js
'use client';

import React from 'react';

export default function CookiesPage() {
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
        .legal-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 0.9rem;
        }
        .legal-content th, .legal-content td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        .legal-content th {
          background-color: var(--primary-blue);
          color: white;
        }
      ` }} />

      <main style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '20px 0 60px' }}>
        <div className="legal-content" style={{ background: 'white', padding: '40px', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <h1>Politique des Cookies</h1>
          
          <div className="updated">
            <strong>Dernière mise à jour :</strong> 23 mars 2026<br />
            <strong>Entrée en vigueur :</strong> 23 mars 2026
          </div>

          <h2>1. Qu'est-ce qu'un Cookie ?</h2>
          <p>Un cookie est un petit fichier texte enregistré par le navigateur sur votre ordinateur ou votre appareil mobile lors de la consultation d'un site internet. Il permet de retenir vos actions et préférences sur une période donnée pour faciliter votre navigation future.</p>

          <h2>2. Comment utilisons-nous les Cookies ?</h2>
          <p>Vendoscity utilise des cookies et technologies similaires de stockage local (tels que le <code>localStorage</code>) principalement pour optimiser les performances de la plateforme et améliorer le confort d'utilisation.</p>
          <p>Nos cookies et stockages locaux se répartissent en trois catégories :</p>
          
          <h3>2.1 Cookies Essentiels</h3>
          <p>Ces éléments sont strictement nécessaires au fonctionnement du site. Sans eux, certaines fonctionnalités de base ne peuvent être exécutées.</p>
          <table>
            <thead>
              <tr>
                <th>Technologie / Clé</th>
                <th>Objectif</th>
                <th>Durée</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>vendoscity_auth_token</code></td>
                <td>Maintient la session vendeur sécurisée active (JWT).</td>
                <td>Session / 7 jours</td>
              </tr>
              <tr>
                <td><code>vendoscity_cart_v1</code></td>
                <td>Stocke la liste des articles ajoutés au panier d'achat.</td>
                <td>Persistant (local)</td>
              </tr>
            </tbody>
          </table>

          <h3>2.2 Cookies de Performance et de Rapidité</h3>
          <p>Pour éviter la consommation abusive de vos données mobiles et accélérer le chargement des pages, nous stockons des données de cache localement.</p>
          <table>
            <thead>
              <tr>
                <th>Technologie / Clé</th>
                <th>Objectif</th>
                <th>Durée</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>vc_home_products_cache_v2</code></td>
                <td>Met en cache les étagères de produits de la page d'accueil pour un chargement instantané en 30 minutes sans appel réseau répétitif.</td>
                <td>30 minutes</td>
              </tr>
              <tr>
                <td><code>vc_boutique_cache_*</code></td>
                <td>Stocke la première page des articles de la marketplace pour éviter de recharger les listes en revenant sur la boutique.</td>
                <td>Temporaire</td>
              </tr>
            </tbody>
          </table>

          <h3>2.3 Cookies de Préférence Utilisateur</h3>
          <table>
            <thead>
              <tr>
                <th>Technologie / Clé</th>
                <th>Objectif</th>
                <th>Durée</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>vendoscity_client_whatsapp</code></td>
                <td>Retient votre numéro de téléphone client saisi dans le panier pour pré-remplir le formulaire lors de vos futurs achats.</td>
                <td>Persistant (local)</td>
              </tr>
            </tbody>
          </table>

          <h2>3. Comment Contrôler les Cookies ?</h2>
          <p>Vous pouvez configurer votre navigateur pour accepter ou refuser les cookies. Vous pouvez également vider le cache de votre navigateur ou supprimer le stockage local à tout moment depuis les options de confidentialité de votre application.</p>
          <p><strong>Note :</strong> La désactivation complète du stockage local empêchera le fonctionnement du panier d'achat et la connexion à votre compte vendeur sur Vendoscity.</p>
        </div>
      </main>
    </>
  );
}
