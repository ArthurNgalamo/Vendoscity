// client/src/app/checkout/components/UssdPaymentCard.js
import React, { useState, useEffect } from 'react';
import { Smartphone, Check, Copy } from 'lucide-react';

export default function UssdPaymentCard({
  operator,
  getUssdCode,
  handleCopyCode,
  copied,
  paymentStatus,
  simulatedAmount,
  totalAmount,
  buyerPhone,
  handleSimulateWebhook
}) {
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hn = window.location.hostname;
      setIsLocalhost(
        hn === 'localhost' || 
        hn === '127.0.0.1' || 
        hn.startsWith('192.168.') || 
        hn.startsWith('10.') || 
        hn === '::1'
      );
    }
  }, []);

  return (
    <div className="check-card">
      <h3 className="check-card-title">
        <Smartphone width="18" height="18" style={{ color: 'var(--brand-accent)' }} /> 
        Paiement en attente
      </h3>
      <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
        Composez le code USSD ci-dessous sur votre téléphone. Vendoscity attend la confirmation de transfert pour valider votre commande.
      </p>

      <div className="ussd-card">
        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
          GÉNÉRATEUR USSD ({operator.toUpperCase()}) :
        </span>
        <div className="ussd-code">
          <span>{getUssdCode()}</span>
        </div>
        <button onClick={handleCopyCode} className="ussd-copy-btn">
          {copied ? <Check width="12" height="12" /> : <Copy width="12" height="12" />}
          <span>{copied ? 'Copié' : 'Copier le code'}</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', margin: '20px 0' }}>
        <div className="pulse-loader">
          <span className="pulse-circle"></span>
          <span>En attente de réception du transfert...</span>
        </div>
      </div>

      {paymentStatus === 'partial' && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '8px', padding: '12px', color: '#856404', fontSize: '0.82rem', marginBottom: '16px' }}>
          ⚠️ <strong>Paiement partiel reçu :</strong> Vous avez envoyé <strong>{simulatedAmount.toLocaleString('fr-FR')} FCFA</strong>. Veuillez compléter la différence de <strong>{(totalAmount - simulatedAmount).toLocaleString('fr-FR')} FCFA</strong> en composant à nouveau le code USSD pour valider.
        </div>
      )}

      {/* Developer Mock SMS Gateway Simulator - Visible ONLY on localhost for security */}
      {isLocalhost && (
        <div className="simulator-panel">
          <div className="simulator-title">🛠️ Simulateur de confirmation paiement (tests locaux)</div>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4 }}>
            Simulez le SMS Mobile Money reçu sur le téléphone de la plateforme pour valider automatiquement la commande.
          </p>
          <div className="sim-btn-grid">
            <button onClick={() => handleSimulateWebhook(1)} className="sim-action-btn">
              Simuler Paiement Exact ({totalAmount.toLocaleString('fr-FR')} FCFA)
            </button>
            <button onClick={() => handleSimulateWebhook(0.5)} className="sim-action-btn">
              Simuler Sous-paiement 50% (Reste en attente)
            </button>
            <button onClick={() => handleSimulateWebhook(1.2)} className="sim-action-btn">
              Simuler Sur-paiement +20% (Crédite le surplus)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
