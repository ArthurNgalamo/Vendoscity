// client/src/app/checkout/components/EscrowPaymentForm.js
import React from 'react';
import { Smartphone, CheckCircle, RefreshCw } from 'lucide-react';

export default function EscrowPaymentForm({ 
  operator, 
  setOperator, 
  buyerPhone, 
  setBuyerPhone, 
  loading, 
  handleCreateEscrowOrder 
}) {
  return (
    <div className="check-card">
      <h3 className="check-card-title">
        <Smartphone width="18" height="18" style={{ color: 'var(--brand-accent)' }} /> 
        Paiement Mobile Money
      </h3>
      <form onSubmit={handleCreateEscrowOrder}>
        <label className="form-label">Opérateur de paiement :</label>
        <div className="operator-selector">
          <button 
            type="button" 
            className={`operator-btn ${operator === 'mtn' ? 'active mtn' : ''}`}
            onClick={() => setOperator('mtn')}
          >
            MTN MoMo
          </button>
          <button 
            type="button" 
            className={`operator-btn ${operator === 'orange' ? 'active orange' : ''}`}
            onClick={() => setOperator('orange')}
          >
            Orange Money
          </button>
        </div>

        <label htmlFor="phone_payeur" className="form-label">Numéro de téléphone payeur (Cameroun) :</label>
        <input 
          id="phone_payeur"
          type="tel"
          placeholder="Ex: 6XXXXXXXX"
          value={buyerPhone}
          onChange={(e) => setBuyerPhone(e.target.value.replace(/\D/g, ''))}
          maxLength={9}
          className="form-input"
          required
        />

        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
          📌 Le paiement sécurisé Vendoscity bloque les fonds jusqu'à la validation de la livraison. Les informations de paiement sont affichées uniquement pour finaliser cette commande.
        </div>

        <button 
          type="submit" 
          disabled={loading || buyerPhone.length < 9}
          className="checkout-btn"
        >
          {loading ? <RefreshCw className="animate-spin" width="16" height="16" /> : <CheckCircle width="16" height="16" />}
          <span>Générer le code USSD de paiement</span>
        </button>
      </form>
    </div>
  );
}
