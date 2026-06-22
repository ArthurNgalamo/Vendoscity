// client/src/app/commandes/components/OrderDetailsModal.js
import React from 'react';
import { Clock, ShieldCheck, CheckCircle, Printer, Info } from 'lucide-react';

export default function OrderDetailsModal({
  selectedOrder,
  onClose,
  formatCurrency,
  validatingId,
  handleConfirmReceipt,
  handlePrintInvoice
}) {
  return (
    <div className="order-details-modal-overlay" onClick={onClose}>
      <div className="order-details-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
          Suivi Commande #{selectedOrder.id.substring(0, 8)}
        </h3>

        <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '16px', lineHeight: 1.5 }}>
          <div><strong>Opérateur :</strong> {selectedOrder.payment_method.toUpperCase().replace('_', ' ')}</div>
          <div><strong>Téléphone payeur :</strong> {selectedOrder.buyer_phone_payeur || 'Non défini'}</div>
          <div><strong>Montant :</strong> {formatCurrency(selectedOrder.total_amount)}</div>
          <div><strong>Déjà payé :</strong> {formatCurrency(selectedOrder.amount_paid || 0)}</div>
        </div>

        {(selectedOrder.is_group_buy || selectedOrder.is_distribution) && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.8rem', lineHeight: '1.4' }}>
            {selectedOrder.is_group_buy && (
              <div style={{ marginBottom: selectedOrder.is_distribution ? '8px' : '0' }}>
                <strong style={{ color: '#0369a1' }}>👥 Options Achat Groupé :</strong>
                <div style={{ marginLeft: '8px', marginTop: '2px' }}>
                  Statut : <span style={{ fontWeight: 'bold' }}>
                    {selectedOrder.group_buy_status === 'open' ? 'En attente de participants' : selectedOrder.group_buy_status === 'completed' ? 'Groupe Complet / Validé' : 'Annulé'}
                  </span>
                  <div>ID de groupe : <code>{selectedOrder.group_buy_id}</code></div>
                  <div>Participants min requis : {selectedOrder.group_buy_min_participants || 3}</div>
                </div>
              </div>
            )}
            {selectedOrder.is_distribution && (
              <div>
                <strong style={{ color: '#0f172a' }}>📍 Point de Retrait / Hub :</strong>
                <div style={{ marginLeft: '8px', marginTop: '2px' }}>
                  Lieu : <span style={{ fontWeight: 'bold' }}>{selectedOrder.distribution_point_name}</span>
                  <div>Statut logistique : <span className={`order-status-badge ${selectedOrder.distribution_status}`} style={{ fontSize: '0.65rem', padding: '2px 6px', display: 'inline-block', marginTop: '2px' }}>
                    {selectedOrder.distribution_status === 'none' && 'Non défini'}
                    {selectedOrder.distribution_status === 'pending_dispatch' && "En attente d'expédition par le vendeur"}
                    {selectedOrder.distribution_status === 'dispatched' && 'En cours d\'acheminement vers le point de retrait'}
                    {selectedOrder.distribution_status === 'arrived' && 'Arrivé au point de retrait (Prêt pour retrait)'}
                    {selectedOrder.distribution_status === 'collected' && 'Colis récupéré'}
                  </span></div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedOrder.escrow_status === 'pending_payment' && (
          <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '8px', padding: '12px', color: '#856404', fontSize: '0.82rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <Clock width="16" height="16" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <strong>Paiement en attente :</strong> Veuillez composer le code USSD sur votre téléphone pour transférer les fonds et valider le séquestre.
            </div>
          </div>
        )}

        {selectedOrder.escrow_status === 'held' && (
          <>
            <div className="qr-display-box">
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                Scanner de Livraison
              </span>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedOrder.escrow_qr_code}`} 
                alt="Code QR de livraison" 
                className="qr-image"
              />
              <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', letterSpacing: '2px', display: 'block', margin: '10px 0 0 0' }}>
                {selectedOrder.escrow_qr_code}
              </span>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                Présentez ce code QR au vendeur lors de la remise physique pour débloquer automatiquement vos fonds.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', background: '#e0f2fe', padding: '12px', borderRadius: '8px', border: '1px solid #bae6fd', color: '#0369a1', fontSize: '0.78rem' }}>
              <Info width="16" height="16" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Si la livraison est terminée et conforme, vous pouvez également valider la réception manuellement ci-dessous pour libérer les fonds.</span>
            </div>

            <button 
              onClick={() => handleConfirmReceipt(selectedOrder.id)}
              disabled={validatingId === selectedOrder.id}
              className="confirm-btn"
            >
              <CheckCircle width="16" height="16" />
              <span>Confirmer la réception de la commande</span>
            </button>
          </>
        )}

        {selectedOrder.escrow_status === 'released' && (
          <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '16px', color: '#065f46', lineHeight: '1.4', fontSize: '0.82rem', textAlign: 'center', margin: '16px 0' }}>
            <ShieldCheck width="32" height="32" style={{ color: '#10b981', margin: '0 auto 8px auto' }} />
            <strong>Transaction terminée !</strong> Les fonds ont été transférés de façon sécurisée au portefeuille du vendeur. Merci d'avoir utilisé notre tiers de confiance.
          </div>
        )}

        {selectedOrder.escrow_status === 'released' && (
          <button 
            onClick={() => handlePrintInvoice(selectedOrder.id)}
            className="print-btn"
          >
            <Printer width="16" height="16" />
            <span>Télécharger la facture PDF</span>
          </button>
        )}
      </div>
    </div>
  );
}
