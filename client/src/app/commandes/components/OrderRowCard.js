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
