// client/src/app/dashboard/components/WalletSection.js
import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  Smartphone, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
  DollarSign
} from 'lucide-react';
import { getApiBaseUrl, formatCurrency } from '../../../core/api';

export default function WalletSection({ authFetch, showToast }) {
  const [walletInfo, setWalletInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Security states
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcodePin, setPasscodePin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Form states
  const [actionTab, setActionTab] = useState('withdraw'); // 'withdraw' or 'deposit'
  const [amount, setAmount] = useState('');
  const [operator, setOperator] = useState('mtn');
  const [phone, setPhone] = useState('');
  const [pinForTx, setPinForTx] = useState('');
  const [submittingTx, setSubmittingTx] = useState(false);

  const fetchWalletDetails = async () => {
    try {
      const res = await authFetch('/api/wallet/balance');
      if (res.ok) {
        const data = await res.json();
        setWalletInfo(data);
        if (data.walletPhone && !phone) {
          setPhone(data.walletPhone);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await authFetch('/api/wallet/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchWalletDetails(), fetchTransactions()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Passcode setup handler
  const handleSetupPasscode = async (e) => {
    e.preventDefault();
    if (passcodePin.length !== 6 || isNaN(passcodePin)) {
      alert("Le code secret doit contenir exactement 6 chiffres.");
      return;
    }
    if (passcodePin !== confirmPin) {
      alert("Les codes secrets ne correspondent pas.");
      return;
    }

    setVerifying(true);
    try {
      const apiBase = getApiBaseUrl();
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/wallet/setup-passcode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ passcode: passcodePin })
      });

      if (res.ok) {
        showToast("Code de sécurité configuré ! Portefeuille déverrouillé.");
        setIsUnlocked(true);
        setPasscodePin('');
        setConfirmPin('');
        await fetchWalletDetails();
      } else {
        const err = await res.json();
        alert(err.error || "La configuration a échoué.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau.");
    } finally {
      setVerifying(false);
    }
  };

  // Passcode unlock handler
  const handleUnlockWallet = async (e) => {
    e.preventDefault();
    if (passcodePin.length !== 6) {
      alert("Saisissez votre code PIN à 6 chiffres.");
      return;
    }

    setVerifying(true);
    try {
      const apiBase = getApiBaseUrl();
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/wallet/verify-passcode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ passcode: passcodePin })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsUnlocked(true);
          setPasscodePin('');
          showToast("Portefeuille déverrouillé !");
        } else {
          alert("Code PIN de sécurité incorrect.");
        }
      } else {
        alert("Erreur lors de la vérification.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };

  // Action Withdrawal handler
  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || !phone || pinForTx.length !== 6) {
      alert("Remplissez tous les champs requis et saisissez votre code PIN.");
      return;
    }

    setSubmittingTx(true);
    try {
      const apiBase = getApiBaseUrl();
      const token = localStorage.getItem('token');

      const res = await fetch(`${apiBase}/api/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          payment_method: operator,
          phone_number: phone,
          passcode: pinForTx
        })
      });

      if (res.ok) {
        showToast("Demande de retrait MoMo envoyée !");
        setAmount('');
        setPinForTx('');
        // Rafraîchir
        await loadAll();
      } else {
        const err = await res.json();
        alert(err.error || "Le retrait a échoué.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur serveur.");
    } finally {
      setSubmittingTx(false);
    }
  };

  // Action Mock Deposit handler
  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || !phone) {
      alert("Veuillez saisir un montant et un numéro.");
      return;
    }

    setSubmittingTx(true);
    try {
      const apiBase = getApiBaseUrl();
      const token = localStorage.getItem('token');

      const res = await fetch(`${apiBase}/api/wallet/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          payment_method: operator,
          phone_number: phone
        })
      });

      if (res.ok) {
        showToast("Dépôt fictif crédité avec succès !");
        setAmount('');
        await loadAll();
      } else {
        const err = await res.json();
        alert(err.error || "Le dépôt a échoué.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur de connexion.");
    } finally {
      setSubmittingTx(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
        Chargement de votre portefeuille...
      </div>
    );
  }

  // SCREEN A: Setup PIN passcode
  if (walletInfo && !walletInfo.hasPasscode) {
    return (
      <div className="check-card" style={{ maxWidth: '420px', margin: '40px auto', padding: '30px', textAlign: 'center' }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
          <Lock width="24" height="24" style={{ color: 'var(--brand-accent)' }} />
        </div>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: 800 }}>Configurer votre Code de Sécurité</h3>
        <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, marginBottom: '24px' }}>
          Pour sécuriser vos transactions (retraits et dépôts), configurez un code secret PIN à 6 chiffres. Ce code vous sera demandé à chaque opération.
        </p>

        <form onSubmit={handleSetupPasscode}>
          <div style={{ position: 'relative' }}>
            <input 
              type={showPin ? 'text' : 'password'}
              placeholder="Saisir 6 chiffres"
              value={passcodePin}
              onChange={(e) => setPasscodePin(e.target.value.replace(/\D/g, '').slice(0,6))}
              maxLength={6}
              style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', width: '100%', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '8px', outline: 'none', marginBottom: '12px' }}
              required
            />
            <button 
              type="button" 
              onClick={() => setShowPin(!showPin)}
              style={{ position: 'absolute', right: '12px', top: '15px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              {showPin ? <EyeOff width="18" height="18" /> : <Eye width="18" height="18" />}
            </button>
          </div>

          <input 
            type="password"
            placeholder="Confirmer les 6 chiffres"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0,6))}
            maxLength={6}
            style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', width: '100%', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '8px', outline: 'none', marginBottom: '20px' }}
            required
          />

          <button type="submit" disabled={verifying} className="checkout-btn">
            {verifying ? <RefreshCw className="animate-spin" width="16" height="16" /> : <Unlock width="16" height="16" />}
            <span>Enregistrer mon code PIN</span>
          </button>
        </form>
      </div>
    );
  }

  // SCREEN B: Verify PIN to unlock
  if (!isUnlocked) {
    return (
      <div className="check-card" style={{ maxWidth: '420px', margin: '40px auto', padding: '30px', textAlign: 'center' }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
          <Lock width="24" height="24" style={{ color: '#2563eb' }} />
        </div>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: 800 }}>Portefeuille Sécurisé</h3>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '24px' }}>
          Entrez votre code secret PIN à 6 chiffres pour accéder à votre portefeuille d'entreprise.
        </p>

        <form onSubmit={handleUnlockWallet}>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <input 
              type={showPin ? 'text' : 'password'}
              placeholder="******"
              value={passcodePin}
              onChange={(e) => setPasscodePin(e.target.value.replace(/\D/g, '').slice(0,6))}
              maxLength={6}
              style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', width: '100%', fontSize: '1.4rem', textAlign: 'center', letterSpacing: '8px', outline: 'none' }}
              required
            />
            <button 
              type="button" 
              onClick={() => setShowPin(!showPin)}
              style={{ position: 'absolute', right: '12px', top: '15px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              {showPin ? <EyeOff width="18" height="18" /> : <Eye width="18" height="18" />}
            </button>
          </div>

          <button type="submit" disabled={verifying} className="checkout-btn" style={{ background: '#2563eb' }}>
            {verifying ? <RefreshCw className="animate-spin" width="16" height="16" /> : <Unlock width="16" height="16" />}
            <span>Déverrouiller mon portefeuille</span>
          </button>
        </form>
      </div>
    );
  }

  // SCREEN C: Wallet Dashboard (Unlocked)
  return (
    <div>
      {/* 1. Large Wallet Metrics Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(135deg, #ff6a00 0%, #ff9500 100%)', color: 'white', borderRadius: '12px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.85, display: 'block', letterSpacing: '0.5px' }}>
            Solde Disponible (Retirable)
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 900, display: 'block', margin: '8px 0' }}>
            {walletInfo.balance.toLocaleString('fr-FR')} FCFA
          </span>
          <div style={{ display: 'flex', gap: '20px', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '16px', fontSize: '0.8rem', opacity: 0.9 }}>
            <div>
              <strong>En séquestre (bloqué) :</strong> {walletInfo.pendingBalance.toLocaleString('fr-FR')} FCFA
            </div>
            <div>
              <strong>Revenus Totaux :</strong> {walletInfo.totalSales.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
        </div>
      </div>

      {/* 2. Wallet Actions & Forms */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <div className="stats-graphics-card">
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <button 
              className={`search-tab-item ${actionTab === 'withdraw' ? 'active' : ''}`}
              onClick={() => setActionTab('withdraw')}
              style={{ padding: '10px 16px', fontSize: '0.9rem' }}
            >
              Demande de retrait MoMo
            </button>
            <button 
              className={`search-tab-item ${actionTab === 'deposit' ? 'active' : ''}`}
              onClick={() => setActionTab('deposit')}
              style={{ padding: '10px 16px', fontSize: '0.9rem' }}
            >
              Simuler un dépôt (Momo/Orange)
            </button>
          </div>

          {actionTab === 'withdraw' ? (
            <form onSubmit={handleWithdraw}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Mode de retrait :</label>
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
                </div>

                <div>
                  <label className="form-label">Numéro de téléphone de réception MoMo/Orange :</label>
                  <input 
                    type="tel" 
                    placeholder="Ex: 6XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    maxLength={9}
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Montant à retirer (FCFA) :</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 10000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="form-input"
                    max={walletInfo.balance}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Confirmer par votre code secret PIN (6 chiffres) :</label>
                  <input 
                    type="password" 
                    placeholder="Saisir code PIN"
                    value={pinForTx}
                    onChange={(e) => setPinForTx(e.target.value.replace(/\D/g, '').slice(0,6))}
                    maxLength={6}
                    className="form-input"
                    style={{ letterSpacing: '4px', textAlign: 'center' }}
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={submittingTx || !amount} className="checkout-btn" style={{ marginTop: '10px' }}>
                {submittingTx ? <RefreshCw className="animate-spin" width="16" height="16" /> : <ArrowUpRight width="16" height="16" />}
                <span>Soumettre ma demande de retrait MoMo</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleDeposit}>
              <p style={{ margin: '0 0 15px 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                Simulez un versement fictif depuis votre Mobile Money pour alimenter votre solde disponible afin de tester les demandes de retrait immédiatement.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Opérateur de dépôt :</label>
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
                </div>

                <div>
                  <label className="form-label">Numéro payeur :</label>
                  <input 
                    type="tel" 
                    placeholder="6XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    maxLength={9}
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Montant du dépôt (FCFA) :</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 25000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={submittingTx || !amount} className="checkout-btn" style={{ marginTop: '10px', background: '#10b981' }}>
                {submittingTx ? <RefreshCw className="animate-spin" width="16" height="16" /> : <ArrowDownLeft width="16" height="16" />}
                <span>Simuler le dépôt immédiat</span>
              </button>
            </form>
          )}
        </div>

        {/* 3. Transaction History */}
        <div className="stats-graphics-card">
          <h3 className="graphics-card-title">Historique des Transactions Wallet</h3>
          
          {transactions.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              Aucune transaction enregistrée.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 8px' }}>Date</th>
                    <th style={{ padding: '10px 8px' }}>Type</th>
                    <th style={{ padding: '10px 8px' }}>Détails</th>
                    <th style={{ padding: '10px 8px' }}>Montant</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                      <td style={{ padding: '12px 8px', color: '#64748b', fontSize: '0.75rem' }}>
                        {new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>
                        {tx.type === 'deposit' && <span style={{ color: '#10b981' }}>Dépôt</span>}
                        {tx.type === 'payout' && <span style={{ color: '#ff6a00' }}>Vente (Séquestre)</span>}
                        {tx.type === 'withdrawal' && <span style={{ color: '#ef4444' }}>Retrait MoMo</span>}
                        {tx.type === 'refund' && <span style={{ color: '#3b82f6' }}>Remboursement</span>}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '0.8rem', color: '#475569' }}>
                        {tx.details || (tx.order_id ? `Cmd #${tx.order_id.substring(0,8)}` : 'Transaction système')}
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>
                        {tx.type === 'withdrawal' ? '-' : '+'}{tx.amount.toLocaleString('fr-FR')} F
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        {tx.status === 'completed' || tx.status === 'approved' ? (
                          <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', fontSize: '0.72rem' }}>
                            <CheckCircle width="12" height="12" /> Validé
                          </span>
                        ) : tx.status === 'pending' ? (
                          <span style={{ color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', fontSize: '0.72rem' }}>
                            <Clock width="12" height="12" /> En attente
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', fontSize: '0.72rem' }}>
                            <XCircle width="12" height="12" /> Échoué
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
