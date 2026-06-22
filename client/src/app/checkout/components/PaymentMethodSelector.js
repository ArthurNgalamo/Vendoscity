// client/src/app/checkout/components/PaymentMethodSelector.js
import React from 'react';
import { DollarSign, Send } from 'lucide-react';

export default function PaymentMethodSelector({ paymentMethod, setPaymentMethod, handleProceedWhatsApp }) {
  return (
    <div className="check-card">
      <h3 className="check-card-title">
        <DollarSign width="18" height="18" style={{ color: 'var(--brand-accent)' }} /> 
        Choix de la méthode de transaction
      </h3>

      <div 
        className={`method-option ${paymentMethod === 'whatsapp' ? 'selected' : ''}`}
        onClick={() => setPaymentMethod('whatsapp')}
      >
        <input 
          type="radio" 
          name="payment" 
          checked={paymentMethod === 'whatsapp'} 
          onChange={() => setPaymentMethod('whatsapp')} 
          className="method-radio"
        />
        <div className="method-desc">
          <h4>Négociation & Paiement direct sur WhatsApp (De gré à gré)</h4>
          <p>Idéal pour les remises locales immédiates. Vous convenez du prix et du lieu avec le vendeur directement sans intermédiaire.</p>
        </div>
      </div>

      <div 
        className={`method-option ${paymentMethod === 'escrow' ? 'selected' : ''}`}
        onClick={() => setPaymentMethod('escrow')}
      >
        <input 
          type="radio" 
          name="payment" 
          checked={paymentMethod === 'escrow'} 
          onChange={() => setPaymentMethod('escrow')} 
          className="method-radio"
        />
        <div className="method-desc">
          <h4>Séquestre Sécurisé Vendoscity (Mobile Money)</h4>
          <p>Recommandé si vous devez envoyer de l'argent. L'argent est bloqué par la plateforme et libéré uniquement lors du scan du QR de livraison.</p>
        </div>
      </div>

      {paymentMethod === 'whatsapp' && (
        <div style={{ marginTop: '20px' }}>
          <button onClick={handleProceedWhatsApp} className="checkout-btn" style={{ background: 'var(--color-green)' }}>
            <Send width="16" height="16" /> Valider et ouvrir sur WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}
