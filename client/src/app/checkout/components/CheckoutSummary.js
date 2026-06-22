// client/src/app/checkout/components/CheckoutSummary.js
import React from 'react';
import { ShoppingCart, ShieldAlert } from 'lucide-react';

export default function CheckoutSummary({ items, subtotal, shippingCost, discount, totalAmount }) {
  return (
    <div>
      <div className="check-card">
        <h3 className="check-card-title" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <ShoppingCart width="16" height="16" style={{ color: 'var(--brand-accent)' }} /> 
          Récapitulatif
        </h3>
        
        <div style={{ margin: '16px 0' }}>
          <ul className="buyer-items-list">
            {items.map((item, idx) => (
              <li key={idx} className="buyer-item-row">
                <div>
                  <span className="item-info-text">{item.title}</span>
                  <div className="item-info-sub">Quantité: {item.quantity} • Prix: {item.price.toLocaleString('fr-FR')} FCFA</div>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  {(item.price * item.quantity).toLocaleString('fr-FR')} F
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="summary-item">
          <span>Sous-total</span>
          <span>{subtotal.toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="summary-item">
          <span>Livraison</span>
          <span>{shippingCost === 0 ? 'Gratuit' : `${shippingCost.toLocaleString('fr-FR')} FCFA`}</span>
        </div>
        {discount > 0 && (
          <div className="summary-item" style={{ color: 'var(--color-green)' }}>
            <span>Remise</span>
            <span>-${discount.toLocaleString('fr-FR')} FCFA</span>
          </div>
        )}
        
        <div className="summary-total">
          <span>Total à payer</span>
          <span style={{ color: 'var(--brand-accent)' }}>{totalAmount.toLocaleString('fr-FR')} FCFA</span>
        </div>
      </div>

      <div className="check-card" style={{ background: '#f8fafc' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 750, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldAlert width="15" height="15" style={{ color: 'var(--brand-accent)' }} /> Garanti par séquestre
        </h4>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
          Avec le paiement séquestre sécurisé, votre argent est protégé. Si le vendeur ne livre pas l'article ou s'il n'est pas conforme, vous pouvez demander le remboursement complet.
        </p>
      </div>
    </div>
  );
}
