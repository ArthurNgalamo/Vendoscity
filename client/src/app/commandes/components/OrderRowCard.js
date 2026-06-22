// client/src/app/commandes/components/OrderRowCard.js
import React from 'react';
import { Clock, ShieldCheck } from 'lucide-react';

export default function OrderRowCard({ order, onClick, formatCurrency }) {
  return (
    <div className="order-row-card" onClick={onClick}>
      <div className="order-row-header">
        <span className="order-id-badge">CMD #{order.id.substring(0, 8)}</span>
        <span className={`order-status-badge ${order.escrow_status}`}>
          {order.escrow_status === 'pending_payment' && <Clock width="12" height="12" />}
          {order.escrow_status === 'held' && <Clock width="12" height="12" />}
          {order.escrow_status === 'released' && <ShieldCheck width="12" height="12" />}
          {order.escrow_status === 'pending_payment' 
            ? 'Attente Paiement' 
            : order.escrow_status === 'held' 
              ? 'Séquestre Actif' 
              : 'Paiement Libéré'}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        {order.is_group_buy && (
          <div style={{ margin: '4px 0' }}>
            <span style={{ display: 'inline-block', fontSize: '0.65rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
              👥 Achat Groupé ({order.group_buy_status === 'open' ? 'En attente de participants' : order.group_buy_status === 'completed' ? 'Validé / Complet' : 'Annulé'})
            </span>
          </div>
        )}
        {order.is_distribution && (
          <div style={{ fontSize: '0.72rem', color: '#475569', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <span>📍 Retrait : <strong>{order.distribution_point_name}</strong></span>
            <span className={`order-status-badge ${order.distribution_status}`} style={{ fontSize: '0.65rem', padding: '1px 4px' }}>
              {order.distribution_status === 'pending_dispatch' ? 'En attente d\'envoi' : 
               order.distribution_status === 'dispatched' ? 'En cours d\'expédition' : 
               order.distribution_status === 'arrived' ? 'Prêt pour retrait' : 
               order.distribution_status === 'collected' ? 'Récupéré' : 'En attente'}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
            {order.order_items?.length} article(s) commandé(s)
          </div>
          <span className="order-date-text">
            Date : {new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <span className="order-price-txt">{formatCurrency(order.total_amount)}</span>
      </div>
    </div>
  );
}
