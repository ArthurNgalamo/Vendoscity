// client/src/app/contacts/page.js
'use client';

import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';

export default function ContactsPage() {
  const showToast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    showToast('Merci ! Votre message a été envoyé. Nous vous recontacterons dans les plus brefs délais.');
    setName('');
    setEmail('');
    setPhone('');
    setSubject('');
    setMessage('');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto 60px', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--primary-blue)', fontWeight: '800', margin: '0 0 10px 0' }}>
          Contactez-nous
        </h1>
        <p style={{ color: '#666', fontSize: '1rem', margin: 0 }}>
          Une question ? Un problème ? Notre équipe est là pour vous aider.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', marginBottom: '50px' }}>
        
        {/* Contact Info column */}
        <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#111', fontWeight: '800', marginBottom: '25px', paddingBottom: '10px', borderBottom: '2px solid #eee' }}>
            Nos Coordonnées
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--brand-warm-tint)', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail width="18" height="18" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: '800' }}>Email</h4>
                <a href="mailto:arthurngalamo7@gmail.com" style={{ color: '#444', textDecoration: 'none', fontSize: '0.9rem' }}>
                  arthurngalamo7@gmail.com
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--brand-warm-tint)', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone width="18" height="18" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: '800' }}>Téléphone</h4>
                <a href="tel:+237681570075" style={{ color: '#444', textDecoration: 'none', fontSize: '0.9rem' }}>
                  +237 681 570 075
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--brand-warm-tint)', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin width="18" height="18" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: '800' }}>Siège social</h4>
                <p style={{ margin: 0, color: '#555', fontSize: '0.9rem', lineHeight: '1.4' }}>
                  ESSESALAKOK NGOUSSO,<br />YAOUNDE, Cameroun
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--brand-warm-tint)', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock width="18" height="18" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: '800' }}>Temps de Réponse</h4>
                <p style={{ margin: 0, color: '#555', fontSize: '0.9rem', lineHeight: '1.4' }}>
                  <strong>Email :</strong> sous 24h (jours ouvrables)<br />
                  <strong>Téléphone :</strong> 08:00 - 20:00
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form column */}
        <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#111', fontWeight: '800', marginBottom: '25px', paddingBottom: '10px', borderBottom: '2px solid #eee', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mail width="20" height="20" /> Envoyez-nous un Message
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="form-group">
              <label htmlFor="cont-name" style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Nom Complet *</label>
              <input id="cont-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label htmlFor="cont-email" style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Email *</label>
              <input id="cont-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="form-group">
              <label htmlFor="cont-phone" style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Téléphone</label>
              <input id="cont-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="form-group">
              <label htmlFor="cont-subject" style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Sujet *</label>
              <select
                id="cont-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff' }}
              >
                <option value="">-- Sélectionnez un sujet --</option>
                <option value="account">Problème de compte</option>
                <option value="order">Question sur une commande</option>
                <option value="payment">Paiement sécurisé</option>
                <option value="product">Question sur un produit</option>
                <option value="seller">Question vendeur</option>
                <option value="general">Autre</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="cont-msg" style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Message *</label>
              <textarea
                id="cont-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                placeholder="Décrivez votre question ou problème en détail..."
                rows="4"
                style={{ fontFamily: 'inherit' }}
              />
            </div>

            <button
              type="submit"
              className="pressable"
              style={{
                background: 'var(--primary-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                width: 'fit-content'
              }}
            >
              <Send width="16" height="16" /> Envoyer le Message
            </button>
          </form>
        </div>
      </div>

      {/* Mini FAQ */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '40px 30px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 30px 0', fontSize: '1.4rem', fontWeight: '800' }}>Questions Fréquemment Posées</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
          <div>
            <h4 style={{ color: 'var(--primary-blue)', margin: '0 0 8px 0', fontWeight: '800' }}>Quel est le délai de livraison ?</h4>
            <p style={{ margin: 0, color: '#555', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Les délais varient selon le vendeur. Après commande, utilisez la messagerie et le suivi Vendoscity pour convenir de la remise en main propre ou d&apos;une livraison.
            </p>
          </div>

          <div>
            <h4 style={{ color: 'var(--primary-blue)', margin: '0 0 8px 0', fontWeight: '800' }}>Puis-je retourner un article ?</h4>
            <p style={{ margin: 0, color: '#555', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Les retours se discutent avec le vendeur depuis l'historique de commande. Les commandes avec paiement sécurisé peuvent bénéficier d'un suivi plus clair en cas de problème.
            </p>
          </div>

          <div>
            <h4 style={{ color: 'var(--primary-blue)', margin: '0 0 8px 0', fontWeight: '800' }}>Quelles sont les méthodes de paiement ?</h4>
            <p style={{ margin: 0, color: '#555', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Vendoscity évolue vers le paiement sécurisé sur la plateforme. Certains vendeurs peuvent encore proposer un règlement local pendant la transition.
            </p>
          </div>

          <div>
            <h4 style={{ color: 'var(--primary-blue)', margin: '0 0 8px 0', fontWeight: '800' }}>Comment créer un compte vendeur ?</h4>
            <p style={{ margin: 0, color: '#555', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Rendez-vous sur la page d&apos;inscription vendeur. Créez un compte avec vos informations professionnelles, puis publiez vos produits depuis votre tableau de bord.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
