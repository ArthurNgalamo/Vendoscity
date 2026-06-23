// client/src/app/checkout/components/PaymentMethodSelector.js
import React from 'react';
import { DollarSign, Send } from 'lucide-react';

export default function PaymentMethodSelector({ paymentMethod, setPaymentMethod, handleProceedDirectOrder }) {
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
          <h4>Commande directe assistée</h4>
          <p>Mode de transition pour les vendeurs locaux. La commande est créée sur Vendoscity, puis l&apos;échange peut encore être finalisé avec le vendeur.</p>
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
          <h4>Paiement sécurisé Vendoscity (Mobile Money)</h4>
          <p>Recommandé pour gérer la transaction sur la plateforme. L&apos;argent est bloqué et libéré uniquement après validation de la livraison.</p>
        </div>
      </div>

      {paymentMethod === 'whatsapp' && (
        <div style={{ marginTop: '20px' }}>
          <button onClick={handleProceedDirectOrder} className="checkout-btn" style={{ background: 'var(--color-green)' }}>
            <Send width="16" height="16" /> Valider la commande
          </button>
        </div>
      )}
    </div>
  );
}
