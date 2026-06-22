// client/src/app/checkout/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '../../context/ToastContext';
import { getApiBaseUrl } from '../../core/api';

import CheckoutSummary from './components/CheckoutSummary';
import PaymentMethodSelector from './components/PaymentMethodSelector';
import EscrowPaymentForm from './components/EscrowPaymentForm';
import UssdPaymentCard from './components/UssdPaymentCard';
import PaymentSuccessBox from './components/PaymentSuccessBox';
import './checkout.css';

export default function CheckoutPage() {
  const showToast = useToast();
  const [checkoutData, setCheckoutData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(''); // 'whatsapp' or 'escrow'
  const [operator, setOperator] = useState('mtn'); // 'mtn' or 'orange'
  const [buyerPhone, setBuyerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // 'idle', 'pending_sms', 'success', 'partial'
  const [simulatedAmount, setSimulatedAmount] = useState(0);
  const [pollingActive, setPollingActive] = useState(false);

  // Recipient details
  const RECIPIENT_MTN = "681570075";
  const RECIPIENT_ORANGE = "641458777";

  useEffect(() => {
    const raw = localStorage.getItem('checkout_data');
    if (raw) {
      try {
        setCheckoutData(JSON.parse(raw));
      } catch (_) {}
    }
  }, []);

  // Shipping cost helper
  const getShippingCost = (loc) => {
    switch (loc) {
      case 'standard-yde': return 1500;
      case 'standard-dla': return 1500;
      case 'express': return 3000;
      default: return 0;
    }
  };

  const getShippingLabel = (loc) => {
    switch (loc) {
      case 'pickup': return 'Retrait sur place (Gratuit)';
      case 'standard-yde': return 'Livraison standard Yaoundé (+1 500 FCFA)';
      case 'standard-dla': return 'Livraison standard Douala (+1 500 FCFA)';
      case 'express': return 'Livraison Express (+3 000 FCFA)';
      default: return 'Non défini';
    }
  };

  if (!checkoutData) {
    return (
      <div style={{ maxWidth: '800px', margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <h2>Votre panier est vide</h2>
        <p>Veuillez d'abord ajouter des articles au panier avant de procéder au paiement.</p>
        <Link href="/panier" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '20px', textDecoration: 'none', color: '#ff6a00', fontWeight: 'bold' }}>
          <ArrowLeft width="16" height="16" /> Retour au panier
        </Link>
      </div>
    );
  }

  const { items, sellerName, sellerWhatsApp, sellerId, deliveryLocation, appliedPromo } = checkoutData;

  // Totals calculations
  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const shippingCost = appliedPromo?.code === 'MARCHE237' ? 0 : getShippingCost(deliveryLocation);
  let discount = 0;
  if (appliedPromo) {
    if (appliedPromo.code === 'VENDOS10') {
      discount = Math.round(subtotal * 0.1);
    } else if (appliedPromo.code === 'WELCOME500') {
      discount = 500;
    } else if (appliedPromo.code === 'MARCHE237') {
      discount = getShippingCost(deliveryLocation);
    }
  }
  const totalAmount = Math.max(0, subtotal + shippingCost - discount);

  // Traditional WhatsApp Checkout
  const handleProceedWhatsApp = () => {
    const orderId = `VC-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const lines = [
      `*📦 COMMANDE VENDOSCITY*`,
      `Référence : *${orderId}*`,
      `Boutique : *${sellerName}*`,
      `=========================`,
    ];
    
    items.forEach(item => {
      lines.push(`• *${item.title}* x${item.quantity} (${item.price.toLocaleString('fr-FR')} FCFA)`);
    });
    
    lines.push(`=========================`);
    lines.push(`Sous-total : ${subtotal.toLocaleString('fr-FR')} FCFA`);
    lines.push(`Livraison : ${getShippingLabel(deliveryLocation)}`);
    if (discount > 0) {
      lines.push(`Remise : -${discount.toLocaleString('fr-FR')} FCFA`);
    }
    lines.push(`*TOTAL À PAYER : ${totalAmount.toLocaleString('fr-FR')} FCFA*`);
    lines.push(`=========================`);
    lines.push(`Méthode de paiement : Négociation en direct WhatsApp`);
    lines.push(`Acheteur sur Vendoscity.com`);
 
    const waUrl = `https://wa.me/${sellerWhatsApp.replace(/\D/g, '')}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(waUrl, '_blank');
  };

  // Secure Escrow Order Creation
  const handleCreateEscrowOrder = async (e) => {
    e.preventDefault();
    if (!buyerPhone || buyerPhone.trim().length < 9) {
      alert("Veuillez saisir un numéro de téléphone valide à 9 chiffres.");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    const apiBase = getApiBaseUrl();

    try {
      const orderItems = items.map(it => ({
        product_id: it.id,
        quantity: it.quantity,
        price: it.price
      }));

      const res = await fetch(`${apiBase}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          seller_id: sellerId,
          total_amount: totalAmount,
          payment_method: `escrow_${operator}`,
          buyer_phone_payeur: buyerPhone.trim(),
          items: orderItems
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Impossible de créer la commande.");
      }

      const order = await res.json();
      setCreatedOrder(order);
      setPaymentStatus('pending_sms');
      setPollingActive(true);
      showToast("Commande en séquestre initiée !");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Poll order status
  useEffect(() => {
    if (!pollingActive || !createdOrder) return;

    const token = localStorage.getItem('token');
    const apiBase = getApiBaseUrl();
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/api/orders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const orders = await res.json();
          const target = orders.find(o => o.id === createdOrder.id);
          if (target) {
            setCreatedOrder(target);
            if (target.escrow_status === 'held') {
              setPaymentStatus('success');
              setPollingActive(false);
              showToast("Paiement séquestre validé !");
              // Clear cart local storage
              localStorage.removeItem('checkout_data');
            } else if (parseFloat(target.amount_paid) > 0) {
              setPaymentStatus('partial');
              setSimulatedAmount(parseFloat(target.amount_paid));
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pollingActive, createdOrder]);

  // Copy USSD code helper
  const getUssdCode = () => {
    const num = operator === 'mtn' ? RECIPIENT_MTN : RECIPIENT_ORANGE;
    if (operator === 'mtn') {
      return `*126*1*1*${num}*${totalAmount}#`;
    } else {
      return `*150*1*1*${num}*${totalAmount}#`;
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getUssdCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Code USSD copié !");
  };

  // Mock SMS Listener Webhook Simulation
  const handleSimulateWebhook = async (factor) => {
    const apiBase = getApiBaseUrl();
    const targetVal = totalAmount * factor;
    const ref = `TX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    try {
      const res = await fetch(`${apiBase}/api/payments/sms-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SMS-Gateway-Token': 'dev_momo_secret_token'
        },
        body: JSON.stringify({
          sender: buyerPhone,
          amount: targetVal,
          transaction_ref: ref,
          raw_sms: `Paiement Mobile Money de ${targetVal} FCFA recu avec succes de ${buyerPhone} pour Arthur Romi Ngalamo Kekenou. Ref: ${ref}.`
        })
      });

      if (res.ok) {
        showToast(`Simulation SMS envoyée (${targetVal} FCFA) !`);
      } else {
        const err = await res.json();
        alert(err.message || "Erreur lors de la simulation.");
      }
    } catch (e) {
      console.error(e);
      alert("Le serveur n'a pas pu être contacté pour la simulation.");
    }
  };

  const apiBaseUrl = getApiBaseUrl();

  return (
    <main style={{ backgroundColor: '#fafafb', minHeight: '100vh', paddingBottom: '60px' }}>
      <div style={{ background: 'linear-gradient(135deg, var(--primary-blue), var(--primary-blue-2))', color: 'white', padding: '40px 16px', textAlign: 'center' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/panier" style={{ color: 'white', display: 'flex', alignItems: 'center' }} title="Panier">
            <ArrowLeft width="22" height="22" />
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Validation de votre commande</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', opacity: 0.85 }}>Boutique : {sellerName}</p>
          </div>
        </div>
      </div>

      <div className="check-container">
        {paymentStatus === 'success' ? (
          <PaymentSuccessBox 
            totalAmount={totalAmount}
            createdOrder={createdOrder}
            apiBaseUrl={apiBaseUrl}
          />
        ) : (
          <div className="check-grid">
            {/* Left Column: Form / Steps */}
            <div>
              {paymentStatus === 'pending_sms' || paymentStatus === 'partial' ? (
                <UssdPaymentCard
                  operator={operator}
                  getUssdCode={getUssdCode}
                  handleCopyCode={handleCopyCode}
                  copied={copied}
                  paymentStatus={paymentStatus}
                  simulatedAmount={simulatedAmount}
                  totalAmount={totalAmount}
                  buyerPhone={buyerPhone}
                  handleSimulateWebhook={handleSimulateWebhook}
                />
              ) : (
                <>
                  <PaymentMethodSelector
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    handleProceedWhatsApp={handleProceedWhatsApp}
                  />

                  {paymentMethod === 'escrow' && (
                    <EscrowPaymentForm
                      operator={operator}
                      setOperator={setOperator}
                      buyerPhone={buyerPhone}
                      setBuyerPhone={setBuyerPhone}
                      loading={loading}
                      handleCreateEscrowOrder={handleCreateEscrowOrder}
                    />
                  )}
                </>
              )}
            </div>

            {/* Right Column: Order Summary Info */}
            <div>
              <CheckoutSummary
                items={items}
                subtotal={subtotal}
                shippingCost={shippingCost}
                discount={discount}
                totalAmount={totalAmount}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
