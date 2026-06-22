// client/src/app/checkout/components/PaymentSuccessBox.js
import React from 'react';
import { CheckCircle, FileText } from 'lucide-react';
import Link from 'next/link';

export default function PaymentSuccessBox({ totalAmount, createdOrder, apiBaseUrl }) {
  return (
    <div className="check-card success-box">
      <div className="success-badge">
        <CheckCircle width="36" height="36" />
      </div>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', margin: '0 0 10px 0' }}>
        Paiement Sécurisé Validé !
      </h2>
      <p style={{ fontSize: '0.9rem', color: '#475569', maxWidth: '500px', margin: '0 auto 24px auto', lineHeight: 1.5 }}>
        Félicitations ! Votre paiement de <strong>{totalAmount.toLocaleString('fr-FR')} FCFA</strong> a été placé en séquestre sous la référence de transaction. Le vendeur a été notifié pour lancer la livraison.
      </p>
      
      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'inline-block', textAlign: 'left', marginBottom: '30px' }}>
        <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
          Code unique de livraison :
        </span>
        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '1px' }}>
          {createdOrder?.escrow_qr_code}
        </span>
        <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
          Présentez ce code (ou son QR Code) au vendeur à la livraison pour débloquer le paiement.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/commandes" className="checkout-btn" style={{ textDecoration: 'none', width: 'auto', padding: '10px 24px' }}>
          <FileText width="16" height="16" /> Suivi de mes commandes
        </Link>
        <a 
          href={`${apiBaseUrl}/api/orders/${createdOrder?.id}/invoice`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="operator-btn" 
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
        >
          <FileText width="16" height="16" /> Télécharger ma facture PDF
        </a>
      </div>
    </div>
  );
}
