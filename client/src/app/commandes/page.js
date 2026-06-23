// client/src/app/commandes/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowLeft, Truck } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '../../context/ToastContext';
import { getApiBaseUrl, formatCurrency } from '../../core/api';
import { useAuth } from '../../context/AuthContext';

import OrderRowCard from './components/OrderRowCard';
import OrderDetailsModal from './components/OrderDetailsModal';
import './commandes.css';

export default function CommandesPage() {
  const showToast = useToast();
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [validatingId, setValidatingId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleConfirmReceipt = async (orderId) => {
    if (!confirm("Voulez-vous vraiment confirmer la réception de cet article ? Cela débloquera immédiatement les fonds vers le portefeuille du vendeur.")) {
      return;
    }

    setValidatingId(orderId);

    try {
      const res = await authFetch(`/api/orders/${orderId}/validate-escrow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'receive' })
      });

      if (res.ok) {
        showToast("Fonds libérés avec succès !");
        fetchOrders();
        setSelectedOrder(null);
      } else {
        const err = await res.json();
        alert(err.error || "Une erreur est survenue.");
      }
    } catch (e) {
      console.error(e);
      alert("Impossible de joindre le serveur.");
    } finally {
      setValidatingId(null);
    }
  };

  // Printable Invoice function (self-contained popup print)
  const handlePrintInvoice = async (orderId) => {
    try {
      const res = await authFetch(`/api/orders/${orderId}/invoice`);

      if (!res.ok) throw new Error("Facture introuvable.");
      const data = await res.json();
      
      const { order, buyer, seller } = data;
      const printWindow = window.open('', '_blank', 'width=800,height=900');

      const itemsHtml = order.order_items.map(it => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${it.products?.title || 'Article'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${it.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${it.price.toLocaleString('fr-FR')} FCFA</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${(it.price * it.quantity).toLocaleString('fr-FR')} FCFA</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <html>
          <head>
            <title>Facture #${order.id.substring(0,8)} - Vendoscity</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 20px; line-height: 1.5; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #ff6a00; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #ff6a00; }
              .title { text-align: right; }
              .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .details-block { background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 14px; }
              .totals { float: right; width: 300px; margin-top: 10px; }
              .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
              .footer { clear: both; text-align: center; font-size: 12px; color: #64748b; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
              @media print {
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="no-print" style="margin-bottom: 20px; text-align: right;">
              <button onclick="window.print()" style="background:#ff6a00; color:white; border:none; padding:10px 20px; border-radius:5px; font-weight:bold; cursor:pointer;">
                🖨️ Imprimer / Enregistrer en PDF
              </button>
            </div>
            <div class="header">
              <div>
                <div class="logo">VENDOSCITY</div>
                <div style="font-size: 12px; color: #64748b;">Commande suivie & paiement sécurisé</div>
              </div>
              <div class="title">
                <h2 style="margin: 0; color: #0f172a;">FACTURE</h2>
                <div style="font-size: 13px;">Ref : #${order.id.substring(0,8)}</div>
                <div style="font-size: 13px;">Date : ${new Date(order.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>

            <div class="details">
              <div class="details-block">
                <strong>Vendeur :</strong>
                <div>${seller?.shop_name || 'Boutique Partenaire'}</div>
                <div>Propriétaire : ${seller?.first_name || ''} ${seller?.last_name || ''}</div>
                <div>Téléphone : ${seller?.phone || ''}</div>
              </div>
              <div class="details-block">
                <strong>Acheteur :</strong>
                <div>Nom : ${buyer?.first_name || ''} ${buyer?.last_name || ''}</div>
                <div>Tél : ${buyer?.phone || ''}</div>
                <div>Mode de paiement : ${order.payment_method.toUpperCase().replace('_', ' ')}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 50%;">Désignation</th>
                  <th style="text-align: center; width: 10%;">Qté</th>
                  <th style="text-align: right; width: 20%;">Prix unitaire</th>
                  <th style="text-align: right; width: 20%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-row">
                <span>Sous-total :</span>
                <span>${parseFloat(order.total_amount).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div class="totals-row" style="font-weight: bold; border-top: 1px solid #ccc; padding-top: 10px; font-size: 16px; color: #ff6a00;">
                <span>Total Payé :</span>
                <span>${parseFloat(order.total_amount).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div class="totals-row" style="font-size: 12px; color: #10b981; font-weight: bold;">
                <span>Statut : Séquestre libéré</span>
              </div>
            </div>

            <div class="footer">
              <p>Vendoscity - Service de paiement sécurisé</p>
              <p>Ce document atteste de la libération conforme des fonds en séquestre après livraison physique de l'article.</p>
            </div>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e) {
      alert("Erreur de génération de facture : " + e.message);
    }
  };

  return (
    <main style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '24px 0' }}>
      <div className="order-page-wrap">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Link href="/mon-espace" style={{ color: '#0f172a' }}>
            <ArrowLeft width="20" height="20" />
          </Link>
          <h1 className="order-title">
            <Truck width="24" height="24" style={{ color: 'var(--brand-accent)' }} />
            Suivi de mes Commandes Séquestres
          </h1>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            Chargement de vos commandes...
          </div>
        ) : orders.length === 0 ? (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <AlertCircle width="40" height="40" style={{ color: '#94a3b8', margin: '0 auto 16px auto' }} />
            <h3>Aucune commande en séquestre</h3>
            <p style={{ fontSize: '0.85rem', margin: '8px 0 20px 0' }}>
              Vous n'avez pas encore passé de commande en utilisant le paiement sécurisé par séquestre MoMo/Orange.
            </p>
            <Link href="/boutique" className="checkout-btn" style={{ display: 'inline-flex', width: 'auto', textDecoration: 'none', padding: '10px 24px' }}>
              Explorer les articles
            </Link>
          </div>
        ) : (
          <div className="order-list">
            {orders.filter(o => o.payment_method !== 'direct_whatsapp').map(order => (
              <OrderRowCard
                key={order.id}
                order={order}
                onClick={() => setSelectedOrder(order)}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Détails Commande */}
      {selectedOrder && (
        <OrderDetailsModal
          selectedOrder={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          formatCurrency={formatCurrency}
          validatingId={validatingId}
          handleConfirmReceipt={handleConfirmReceipt}
          handlePrintInvoice={handlePrintInvoice}
        />
      )}
    </main>
  );
}
