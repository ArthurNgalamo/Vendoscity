// client/src/app/services/page.js
'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShoppingBasket,
  Package,
  Truck,
  Handshake,
  Star,
  Shield,
  MessageSquare,
  BarChart2,
  Globe,
  Target,
  Mail,
  Lock
} from 'lucide-react';

const SERVICES = [
  { icon: ShoppingBasket, title: "Marketplace d'Achat", desc: "Explorez des produits locaux et des catalogues enrichis avec images, vidéos et fiches détaillées." },
  { icon: Package, title: "Vente Simplifiée", desc: "Publiez vos annonces, gérez votre catalogue et répondez aux acheteurs depuis un espace vendeur centralisé." },
  { icon: Truck, title: "Livraison Suivie", desc: "Préparez la livraison, le retrait ou l'expédition depuis le parcours de commande, avec une meilleure traçabilité pour l'acheteur." },
  { icon: Handshake, title: "Paiement Sécurisé", desc: "Vendoscity évolue vers des transactions gérées sur la plateforme, avec blocage et libération des fonds après validation." },
  { icon: Star, title: "Système d'Évaluation", desc: "Notes et avis pour aider la communauté à identifier des vendeurs fiables et des annonces de qualité." },
  { icon: Shield, title: "Confiance & Médiation", desc: "Badges de certification, historique des échanges et assistance en cas de problème sur une commande." },
  { icon: MessageSquare, title: "Support Client", desc: "Support par email et téléphone pour les questions sur la plateforme et les annonces." },
  { icon: BarChart2, title: "Tableaux de bord", desc: "Un espace vendeur pour gérer les produits, commandes, performances et demandes clients." },
  { icon: Globe, title: "Import Fournisseurs", desc: "Préparation d'intégrations avec Alibaba, AliExpress et 1688 pour importer articles, images et vidéos." }
];

const ADD_SERVICES = [
  { icon: Target, title: "Publicités Sponsorisées", desc: "Augmentez la visibilité de vos produits. Campagnes ciblées, ROI mesurable, gestion simplifiée." },
  { icon: Mail, title: "Email Marketing", desc: "Outils marketing intégrés. Templates, segmentation, automatisation, rapports détaillés." },
  { icon: Lock, title: "Authentification Premium", desc: "Vérification de produits. Certification d'authenticité, lutte contre la contrefaçon." }
];

export default function ServicesPage() {
  return (
    <div style={{ paddingBottom: '60px' }}>
      
      <div className="services-hero">
        <h1 style={{ margin: 0, fontSize: '2.4rem', fontWeight: '800' }}>Nos Services</h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.95 }}>
          Une marketplace camerounaise qui centralise produits, commandes, messagerie, paiement et catalogues fournisseurs.
        </p>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px' }}>
        
        <h2 style={{ fontSize: '1.4rem', color: '#111', fontWeight: '800', marginBottom: '25px', paddingBottom: '8px', borderBottom: '2px solid #eee' }}>
          Services Principaux
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          {SERVICES.map((srv, idx) => {
            const Icon = srv.icon;
            return (
              <div key={idx} className="service-card pressable" style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                <div style={{ color: 'var(--primary-blue)', display: 'inline-flex', marginBottom: '15px' }}>
                  <Icon width="40" height="40" />
                </div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', color: 'var(--primary-blue)', fontWeight: '800' }}>{srv.title}</h3>
                <p style={{ margin: 0, color: '#666', fontSize: '0.9rem', lineHeight: '1.6' }}>{srv.desc}</p>
              </div>
            );
          })}
        </div>

        <h2 style={{ fontSize: '1.4rem', color: '#111', fontWeight: '800', margin: '50px 0 25px 0', paddingBottom: '8px', borderBottom: '2px solid #eee' }}>
          Services Additionnels
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          {ADD_SERVICES.map((srv, idx) => {
            const Icon = srv.icon;
            return (
              <div key={idx} className="service-card pressable" style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                <div style={{ color: 'var(--primary-blue)', display: 'inline-flex', marginBottom: '15px' }}>
                  <Icon width="40" height="40" />
                </div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', color: 'var(--primary-blue)', fontWeight: '800' }}>{srv.title}</h3>
                <p style={{ margin: 0, color: '#666', fontSize: '0.9rem', lineHeight: '1.6' }}>{srv.desc}</p>
              </div>
            );
          })}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '40px 20px', borderRadius: '12px', marginTop: '50px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: '800' }}>Besoin d&apos;aide ?</h3>
          <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '0.95rem' }}>
            Une question sur une annonce, un vendeur ou le fonctionnement de la mise en relation ?
          </p>
          <Link href="/contacts" className="cta-button" style={{ display: 'inline-block' }}>
            Contactez-nous
          </Link>
        </div>

      </div>
    </div>
  );
}
