// client/src/app/dashboard/components/OrdersSection.js
import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  QrCode, 
  Printer, 
  Camera, 
  RefreshCw,
  Search,
  Check,
  X
} from 'lucide-react';
import { getApiBaseUrl, formatCurrency } from '../../../core/api';

export default function OrdersSection({ authFetch, showToast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  
  // Camera Scanner states
  const [showScanner, setShowScanner] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerInstance, setScannerInstance] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/orders/seller');
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

  // Handle manual code validation
  const handleValidateCode = async (codeToSubmit, orderId = null) => {
    const code = (codeToSubmit || manualCode).trim().toUpperCase();
    if (!code || code.length !== 6) {
      alert("Veuillez saisir un code de validation valide à 6 caractères.");
      return;
    }

    setValidating(true);
    const targetId = orderId || activeOrder?.id;
    if (!targetId) {
      // Find order by code if not specified
      const match = orders.find(o => o.escrow_qr_code === code);
      if (!match) {
        alert("Aucune commande correspondante trouvée pour ce code.");
        setValidating(false);
        return;
      }
      handleValidateCode(code, match.id);
      return;
    }

    try {
      const apiBase = getApiBaseUrl();
      const token = localStorage.getItem('token');

      const res = await fetch(`${apiBase}/api/orders/${targetId}/validate-escrow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ qr_code: code })
      });

      if (res.ok) {
        showToast("Livraison validée ! Le paiement a été versé sur votre solde.");
        setManualCode('');
        setActiveOrder(null);
        handleStopScanner();
        fetchOrders();
      } else {
        const err = await res.json();
        alert(err.error || "La validation a échoué.");
      }
    } catch (e) {
      console.error(e);
      alert("Impossible de joindre le serveur.");
    } finally {
      setValidating(false);
    }
  };

  // Direct delivery validation (Vendeur valide de son cote)
  const handleConfirmDelivery = async (orderId) => {
    if (!confirm("Voulez-vous marquer cette commande comme livrée ? Les fonds seront libérés lorsque l'acheteur validera de son côté (ou par scan de son QR code).")) {
      return;
    }

    setValidating(true);
    try {
      const apiBase = getApiBaseUrl();
      const token = localStorage.getItem('token');

      const res = await fetch(`${apiBase}/api/orders/${orderId}/validate-escrow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'deliver' })
      });

      if (res.ok) {
        showToast("Commande marquée comme livrée. En attente de la validation de l'acheteur.");
        fetchOrders();
      } else {
        const err = await res.json();
        alert(err.error || "Une erreur est survenue.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur serveur.");
    } finally {
      setValidating(false);
    }
  };

  // Dynamic html5-qrcode loading from CDN
  const handleStartScanner = () => {
    setShowScanner(true);
    setScannerLoading(true);

    // If script already exists, initialize scanner
    if (window.Html5QrcodeScanner) {
      setTimeout(() => initQrScanner(), 500);
      return;
    }

    // Load CDN script
    const script = document.createElement('script');
    script.src = "https://unpkg.com/html5-qrcode";
    script.type = 'text/javascript';
    script.async = true;
    script.onload = () => {
      initQrScanner();
    };
    script.onerror = () => {
      alert("Échec du chargement du module de scan de caméra.");
      setScannerLoading(false);
      setShowScanner(false);
    };
    document.body.appendChild(script);
  };

  const initQrScanner = () => {
    setScannerLoading(false);
    try {
      const scanner = new window.Html5QrcodeScanner("qr-reader-div", { 
        fps: 10, 
        qrbox: { width: 220, height: 220 } 
      });

      scanner.render((decodedText) => {
        // Success callback
        console.log("Scanned QR Text:", decodedText);
        scanner.clear();
        handleValidateCode(decodedText);
      }, (error) => {
        // Quiet errors during scanning
      });

      setScannerInstance(scanner);
    } catch (e) {
      console.error("Camera init error:", e);
      alert("Impossible d'accéder à la caméra. Veuillez saisir le code secret manuellement.");
      setShowScanner(false);
    }
  };

  const handleStopScanner = () => {
    if (scannerInstance) {
      try {
        scannerInstance.clear();
      } catch (_) {}
      setScannerInstance(null);
    }
    setShowScanner(false);
  };

  // Print Invoice popup
  const handlePrintInvoice = async (orderId) => {
    const token = localStorage.getItem('token');
    const apiBase = getApiBaseUrl();

    try {
      const res = await fetch(`${apiBase}/api/orders/${orderId}/invoice`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

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
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="logo">VENDOSCITY</div>
                <div style="font-size: 12px; color: #64748b;">Mise en relation direct & Séquestre</div>
              </div>
              <div class="title">
                <h2 style="margin: 0; color: #0f172a;">FACTURE VENDEUR</h2>
                <div style="font-size: 13px;">Ref : #${order.id.substring(0,8)}</div>
                <div style="font-size: 13px;">Date : ${new Date(order.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>

            <div class="details">
              <div class="details-block">
                <strong>De (Vendeur) :</strong>
                <div>${seller?.shop_name || 'Ma Boutique'}</div>
                <div>Nom : ${seller?.first_name || ''} ${seller?.last_name || ''}</div>
                <div>WhatsApp : ${seller?.phone || ''}</div>
              </div>
              <div class="details-block">
                <strong>À (Client) :</strong>
                <div>Nom : ${buyer?.first_name || ''} ${buyer?.last_name || ''}</div>
                <div>Téléphone : ${buyer?.phone || ''}</div>
                <div>Mode : Tiers de confiance séquestre</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 50%;">Article</th>
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
                <span>Total brut :</span>
                <span>${parseFloat(order.total_amount).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div class="totals-row" style="font-weight: bold; border-top: 1px solid #ccc; padding-top: 10px; font-size: 16px; color: #ff6a00;">
                <span>Net Versé au portefeuille :</span>
                <span>${parseFloat(order.total_amount).toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>

            <div class="footer">
              <p>Vendoscity Marketplace - Arthur Romi Ngalamo Kekenou</p>
              <p>Facture électronique certifiée conforme après déverrouillage sécurisé par code unique de livraison.</p>
            </div>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e) {
      alert("Facture error: " + e.message);
    }
  };

  const filteredOrders = orders.filter(o => o.payment_method !== 'direct_whatsapp');

  return (
    <div className="stats-graphics-card">
      <h3 className="graphics-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Commandes Reçues (Séquestres)</span>
        <button onClick={fetchOrders} className="ussd-copy-btn" style={{ background: '#fff' }}>
          <RefreshCw width="12" height="12" /> Réactualiser
        </button>
      </h3>

      {/* Manual Validator Panel */}
      <div style={{ background: '#fff8f2', border: '1px solid #ffe8d6', borderRadius: '10px', padding: '18px', marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#ff6a00', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <QrCode width="18" height="18" /> Validation de livraison en direct
        </h4>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
          Lors de la livraison, demandez à l'acheteur de vous présenter son QR Code ou son code secret de livraison à 6 caractères pour débloquer les fonds de la commande.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Saisir le code secret (ex: ABC123)"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', fontSize: '0.9rem', outline: 'none', width: '220px' }}
          />
          <button 
            onClick={() => handleValidateCode()}
            disabled={validating}
            className="checkout-btn"
            style={{ width: 'auto', padding: '10px 20px', fontSize: '0.85rem' }}
          >
            {validating ? <RefreshCw className="animate-spin" width="14" height="14" /> : <Check width="16" height="16" />}
            <span>Débloquer le séquestre</span>
          </button>
          
          <button 
            onClick={handleStartScanner}
            className="print-btn"
            style={{ width: 'auto', margin: 0, padding: '10px 20px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Camera width="16" height="16" />
            <span>Scanner QR Code par Caméra</span>
          </button>
        </div>
      </div>

      {/* QR Code Scanner Overlay */}
      {showScanner && (
        <div className="order-details-modal-overlay">
          <div className="order-details-modal" style={{ maxWidth: '350px', textAlign: 'center' }}>
            <button className="modal-close-btn" onClick={handleStopScanner}>×</button>
            <h4 style={{ margin: '0 0 15px 0' }}>Scan du code de livraison</h4>
            {scannerLoading ? (
              <div style={{ padding: '40px 0', color: '#64748b' }}>
                <RefreshCw className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
                Chargement de la caméra...
              </div>
            ) : (
              <div id="qr-reader-div" style={{ width: '100%' }}></div>
            )}
            <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '12px' }}>
              Cadrez le QR Code de l'acheteur dans la zone. Les fonds seront libérés dès détection.
            </p>
          </div>
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          Chargement de la liste...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ textHeight: '1.5', padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
          Aucune vente sécurisée par séquestre reçue pour le moment.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 8px' }}>Réf. Commande</th>
                <th style={{ padding: '12px 8px' }}>Client (Téléphone)</th>
                <th style={{ padding: '12px 8px' }}>Montant</th>
                <th style={{ padding: '12px 8px' }}>Séquestre</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>
                    #{order.id.substring(0, 8)}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    {order.buyer_phone_payeur || 'WhatsApp Direct'}
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>
                    {parseFloat(order.total_amount).toLocaleString('fr-FR')} F
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span className={`order-status-badge ${order.escrow_status}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                      {order.escrow_status === 'pending_payment' ? 'Attente MoMo' : order.escrow_status === 'held' ? 'Bloqué (held)' : 'Libéré (released)'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      {order.escrow_status === 'held' && !order.seller_validated && (
                        <button 
                          onClick={() => handleConfirmDelivery(order.id)}
                          className="checkout-btn"
                          style={{ width: 'auto', padding: '4px 8px', fontSize: '0.72rem', background: '#3b82f6' }}
                        >
                          Marquer livré
                        </button>
                      )}
                      
                      {order.escrow_status === 'held' && (
                        <button 
                          onClick={() => {
                            setActiveOrder(order);
                            setManualCode(order.escrow_qr_code);
                          }}
                          className="checkout-btn"
                          style={{ width: 'auto', padding: '4px 8px', fontSize: '0.72rem', background: '#ff6a00' }}
                        >
                          Saisir Code
                        </button>
                      )}

                      {order.escrow_status === 'released' && (
                        <button 
                          onClick={() => handlePrintInvoice(order.id)}
                          className="print-btn"
                          style={{ width: 'auto', margin: 0, padding: '4px 8px', fontSize: '0.72rem' }}
                          title="Facture PDF"
                        >
                          <Printer width="12" height="12" /> Facture
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
