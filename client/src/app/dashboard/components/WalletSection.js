// client/src/app/dashboard/components/WalletSection.js
import React, { useState, useEffect, useRef } from 'react';
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
  DollarSign, 
  ShieldCheck, 
  TrendingUp,
  CreditCard,
  Activity,
  Info,
  Settings,
  AlertCircle,
  Calendar,
  ChevronRight,
  Filter,
  Wallet,
  Percent,
  Award
} from 'lucide-react';
import { getApiBaseUrl, formatCurrency } from '../../../core/api';

export default function WalletSection({ authFetch, showToast, isUnlocked, setIsUnlocked }) {
  const [walletInfo, setWalletInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [passcodePin, setPasscodePin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Lockout states
  const [lockedUntil, setLockedUntil] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);

  // Passcode reset states
  const [resetStep, setResetStep] = useState('none'); // 'none', 'request', 'verify'
  const [resetOtp, setResetOtp] = useState('');
  const [newResetPasscode, setNewResetPasscode] = useState('');
  const [simulatedOtpDisplay, setSimulatedOtpDisplay] = useState('');

  // Unlocked Dashboard Navigation Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'transactions', 'security'

  // Transactions Tab search / filter states
  const [searchFilter, setSearchFilter] = useState('all'); // 'all', 'payout', 'withdrawal', 'deposit', 'refund'
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [actionTab, setActionTab] = useState('withdraw'); // 'withdraw' or 'deposit'
  const [amount, setAmount] = useState('');
  const [operator, setOperator] = useState('mtn');
  const [phone, setPhone] = useState('');
  const [pinForTx, setPinForTx] = useState('');
  const [submittingTx, setSubmittingTx] = useState(false);

  // Focus input refs for tactile PIN code entries
  const setupPinInputRef = useRef(null);
  const setupConfirmInputRef = useRef(null);
  const unlockInputRef = useRef(null);

  const fetchWalletDetails = async () => {
    try {
      const res = await authFetch('/api/wallet/balance');
      if (res.ok) {
        const data = await res.json();
        setWalletInfo(data);
        if (data.walletPhone && !phone) {
          setPhone(data.walletPhone);
        }
        // Update lockout states
        setFailedAttempts(data.walletFailedAttempts || 0);
        if (data.walletLockedUntil) {
          setLockedUntil(data.walletLockedUntil);
        } else {
          setLockedUntil(null);
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

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockedUntil) {
      setLockoutCountdown(0);
      return;
    }

    const checkLockout = () => {
      const remainingMs = new Date(lockedUntil) - new Date();
      if (remainingMs > 0) {
        setLockoutCountdown(Math.ceil(remainingMs / 1000));
      } else {
        setLockoutCountdown(0);
        setLockedUntil(null);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const autoVerifyPin = async (pinToVerify) => {
    if (verifying) return;
    setVerifying(true);
    try {
      const res = await authFetch('/api/wallet/verify-passcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ passcode: pinToVerify })
      });

      const data = await res.json();

      if (res.ok) {
        setIsUnlocked(true);
        setPasscodePin('');
        setFailedAttempts(0);
        setLockedUntil(null);
        showToast("Portefeuille déverrouillé !");
      } else {
        if (res.status === 423 || data.lockedUntil) {
          setLockedUntil(data.lockedUntil);
          setFailedAttempts(data.attempts || 0);
          showToast(data.error || "Portefeuille verrouillé.");
        } else {
          setFailedAttempts(data.attempts || 0);
          setLockedUntil(data.lockedUntil || null);
          alert(data.error || "Code PIN de sécurité incorrect.");
        }
        setPasscodePin(''); // Reset input on failure
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la vérification.");
    } finally {
      setVerifying(false);
    }
  };

  // Auto-verify when 6 digits are typed
  useEffect(() => {
    if (
      passcodePin.length === 6 && 
      !verifying && 
      lockoutCountdown === 0 && 
      walletInfo?.hasPasscode && 
      !isUnlocked && 
      resetStep === 'none'
    ) {
      autoVerifyPin(passcodePin);
    }
  }, [passcodePin, verifying, lockoutCountdown, walletInfo, isUnlocked, resetStep]);

  // Focus helpers
  const handleFocusSetupPin = () => setupPinInputRef.current?.focus();
  const handleFocusSetupConfirm = () => setupConfirmInputRef.current?.focus();
  const handleFocusUnlockPin = () => unlockInputRef.current?.focus();

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
      const res = await authFetch('/api/wallet/setup-passcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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

  // Passcode unlock handler (for manual submit fallback)
  const handleUnlockWallet = async (e) => {
    if (e) e.preventDefault();
    if (verifying) return;
    if (lockoutCountdown > 0) {
      alert("Votre portefeuille est temporairement verrouillé.");
      return;
    }
    if (passcodePin.length !== 6) {
      alert("Saisissez votre code PIN à 6 chiffres.");
      return;
    }
    await autoVerifyPin(passcodePin);
  };

  const handleForgotPasscode = async () => {
    setVerifying(true);
    try {
      const res = await authFetch('/api/wallet/forgot-passcode', {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        setSimulatedOtpDisplay(data.otp || '');
        setResetStep('verify');
        showToast("Code OTP généré (simulé) !");
      } else {
        const data = await res.json();
        alert(data.error || "Impossible de générer le code de réinitialisation.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResetPasscodeSubmit = async (e) => {
    e.preventDefault();
    if (!resetOtp || newResetPasscode.length !== 6 || isNaN(newResetPasscode)) {
      alert("Veuillez saisir le code OTP et un nouveau code PIN à 6 chiffres.");
      return;
    }

    setVerifying(true);
    try {
      const res = await authFetch('/api/wallet/reset-passcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          otp: resetOtp,
          newPasscode: newResetPasscode
        })
      });

      if (res.ok) {
        showToast("Votre code PIN a été réinitialisé avec succès !");
        setResetStep('none');
        setResetOtp('');
        setNewResetPasscode('');
        setSimulatedOtpDisplay('');
        setPasscodePin('');
        setFailedAttempts(0);
        setLockedUntil(null);
      } else {
        const data = await res.json();
        alert(data.error || "La réinitialisation a échoué.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau.");
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
      const res = await authFetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
      const res = await authFetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
      <div style={{ textAlign: 'center', padding: '100px 0', color: '#64748b' }}>
        <RefreshCw className="animate-spin" width="32" height="32" style={{ margin: '0 auto 16px auto', color: 'var(--primary-blue)' }} />
        <p style={{ fontWeight: 600 }}>Chargement de votre portefeuille d'entreprise...</p>
      </div>
    );
  }

  // SCREEN A: Setup PIN passcode
  if (walletInfo && !walletInfo.hasPasscode) {
    return (
      <div style={{ 
        maxWidth: '440px', 
        margin: '40px auto', 
        padding: '36px 30px', 
        textAlign: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '24px',
        color: '#fff',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px rgba(255, 106, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        fontFamily: '"Inter", sans-serif'
      }}>
        <div style={{ 
          width: '64px', 
          height: '64px', 
          borderRadius: '20px', 
          background: 'rgba(255, 106, 0, 0.12)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 20px auto',
          border: '1px solid rgba(255, 106, 0, 0.25)',
          boxShadow: '0 0 20px rgba(255, 106, 0, 0.1)'
        }}>
          <Lock width="28" height="28" style={{ color: '#ff6a00' }} />
        </div>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
          Code de Sécurité
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '28px', padding: '0 10px' }}>
          Configurez un code secret PIN à 6 chiffres pour sécuriser vos retraits et dépôts d'argent.
        </p>

        <form onSubmit={handleSetupPasscode}>
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
                Nouveau Code PIN
              </label>
              <button 
                type="button" 
                onClick={() => setShowPin(!showPin)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                {showPin ? <EyeOff width="14" height="14" /> : <Eye width="14" height="14" />}
              </button>
            </div>
            <div 
              onClick={handleFocusSetupPin}
              style={{ position: 'relative', width: '100%', height: '48px', cursor: 'pointer' }}
            >
              {/* Visual circles */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', width: '100%' }}>
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const isFilled = passcodePin.length > index;
                  return (
                    <div
                      key={index}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        border: isFilled 
                          ? '2px solid #ff6a00' 
                          : '1px solid rgba(255, 255, 255, 0.15)',
                        background: isFilled 
                          ? 'rgba(255, 106, 0, 0.1)' 
                          : 'rgba(255, 255, 255, 0.03)',
                        boxShadow: isFilled 
                          ? '0 0 10px rgba(255, 106, 0, 0.2)' 
                          : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: '800',
                        color: '#fff',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isFilled ? (showPin ? passcodePin[index] : '•') : ''}
                    </div>
                  );
                })}
              </div>
              {/* Transparent input */}
              <input 
                ref={setupPinInputRef}
                type="text"
                pattern="\d*"
                inputMode="numeric"
                value={passcodePin}
                onChange={(e) => setPasscodePin(e.target.value.replace(/\D/g, '').slice(0,6))}
                maxLength={6}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: '100%',
                  height: '100%',
                  left: 0,
                  top: 0,
                  cursor: 'pointer',
                  zIndex: 2
                }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '28px', textAlign: 'left' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Confirmer le Code PIN
            </label>
            <div 
              onClick={handleFocusSetupConfirm}
              style={{ position: 'relative', width: '100%', height: '48px', cursor: 'pointer' }}
            >
              {/* Visual circles */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', width: '100%' }}>
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const isFilled = confirmPin.length > index;
                  return (
                    <div
                      key={index}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        border: isFilled 
                          ? '2px solid #ff6a00' 
                          : '1px solid rgba(255, 255, 255, 0.15)',
                        background: isFilled 
                          ? 'rgba(255, 106, 0, 0.1)' 
                          : 'rgba(255, 255, 255, 0.03)',
                        boxShadow: isFilled 
                          ? '0 0 10px rgba(255, 106, 0, 0.2)' 
                          : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: '800',
                        color: '#fff',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isFilled ? (showPin ? confirmPin[index] : '•') : ''}
                    </div>
                  );
                })}
              </div>
              {/* Transparent input */}
              <input 
                ref={setupConfirmInputRef}
                type="text"
                pattern="\d*"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0,6))}
                maxLength={6}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: '100%',
                  height: '100%',
                  left: 0,
                  top: 0,
                  cursor: 'pointer',
                  zIndex: 2
                }}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={verifying} 
            style={{ 
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #ff6a00 0%, #ee5a00 100%)',
              color: '#fff',
              fontWeight: '700',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 8px 16px -4px rgba(255, 106, 0, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            {verifying ? <RefreshCw className="animate-spin" width="16" height="16" /> : <Unlock width="16" height="16" />}
            <span>Enregistrer mon code PIN</span>
          </button>
        </form>
      </div>
    );
  }

  // SCREEN B: Verify PIN or reset passcode to unlock
  if (!isUnlocked) {
    const cardStyle = { 
      maxWidth: '400px', 
      margin: '40px auto', 
      padding: '36px 30px', 
      textAlign: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: '24px',
      color: '#fff',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px rgba(59, 130, 246, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      fontFamily: '"Inter", sans-serif'
    };

    const iconWrapperStyle = { 
      width: '64px', 
      height: '64px', 
      borderRadius: '20px', 
      background: 'rgba(59, 130, 246, 0.12)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      margin: '0 auto 20px auto',
      border: '1px solid rgba(59, 130, 246, 0.25)',
      boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)'
    };

    if (resetStep === 'request') {
      return (
        <div style={cardStyle}>
          <div style={iconWrapperStyle}>
            <Lock width="28" height="28" style={{ color: '#ff6a00' }} />
          </div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
            Code secret oublié ?
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '28px', padding: '0 10px' }}>
            Vous pouvez réinitialiser votre code PIN en générant un code de validation OTP à 6 chiffres (simulé).
          </p>

          <button 
            type="button" 
            onClick={handleForgotPasscode}
            disabled={verifying}
            style={{ 
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #ff6a00 0%, #ee5a00 100%)',
              color: '#fff',
              fontWeight: '700',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              marginBottom: '20px',
              boxShadow: '0 8px 16px -4px rgba(255, 106, 0, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            {verifying ? <RefreshCw className="animate-spin" width="16" height="16" /> : <Clock width="16" height="16" />}
            <span>Générer le code de réinitialisation</span>
          </button>

          <button 
            type="button" 
            onClick={() => setResetStep('none')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'underline' }}
          >
            Retour au déverrouillage
          </button>
        </div>
      );
    }

    if (resetStep === 'verify') {
      return (
        <div style={cardStyle}>
          <div style={iconWrapperStyle}>
            <Unlock width="28" height="28" style={{ color: '#10b981' }} />
          </div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
            Réinitialiser le code PIN
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '20px', padding: '0 10px' }}>
            Saisissez le code OTP reçu et configurez votre nouveau code secret à 6 chiffres.
          </p>

          {simulatedOtpDisplay && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed #10b981', padding: '12px', borderRadius: '10px', fontSize: '0.8rem', color: '#10b981', marginBottom: '20px', fontWeight: 'bold' }}>
              🔑 Code OTP de test simulé : {simulatedOtpDisplay}
            </div>
          )}

          <form onSubmit={handleResetPasscodeSubmit}>
            <div style={{ marginBottom: '16px', textAlign: 'left' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                Code OTP de validation
              </label>
              <input 
                type="text" 
                maxLength={6}
                value={resetOtp}
                onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 582910"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  textAlign: 'center',
                  letterSpacing: '4px'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                Nouveau Code PIN (6 chiffres)
              </label>
              <input 
                type="password" 
                maxLength={6}
                value={newResetPasscode}
                onChange={(e) => setNewResetPasscode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  textAlign: 'center',
                  letterSpacing: '4px'
                }}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={verifying}
              style={{ 
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                fontWeight: '700',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginBottom: '20px',
                boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              {verifying ? <RefreshCw className="animate-spin" width="16" height="16" /> : <Unlock width="16" height="16" />}
              <span>Réinitialiser mon code secret</span>
            </button>
          </form>

          <button 
            type="button" 
            onClick={() => { setResetStep('none'); setSimulatedOtpDisplay(''); setResetOtp(''); setNewResetPasscode(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'underline' }}
          >
            Annuler
          </button>
        </div>
      );
    }

    return (
      <div style={cardStyle}>
        <div style={iconWrapperStyle}>
          <Lock width="28" height="28" style={{ color: lockoutCountdown > 0 ? '#ef4444' : '#3b82f6' }} />
        </div>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
          Portefeuille Sécurisé
        </h3>
        
        {lockoutCountdown > 0 ? (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.12)', 
            border: '1px solid rgba(239, 68, 68, 0.25)', 
            borderRadius: '12px', 
            padding: '12px 15px', 
            color: '#fca5a5', 
            fontSize: '0.8rem', 
            lineHeight: 1.5,
            marginBottom: '24px'
          }}>
            Trop de tentatives erronées. Portefeuille verrouillé pour des raisons de sécurité.<br/>
            <strong>Veuillez patienter : {Math.floor(lockoutCountdown / 60)}m {lockoutCountdown % 60}s</strong>
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '28px', padding: '0 10px' }}>
            Entrez votre code secret PIN à 6 chiffres pour accéder à votre portefeuille d'entreprise.
          </p>
        )}

        <form onSubmit={handleUnlockWallet}>
          <div style={{ marginBottom: '28px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
                Code PIN
              </label>
              <button 
                type="button" 
                disabled={lockoutCountdown > 0}
                onClick={() => setShowPin(!showPin)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0, opacity: lockoutCountdown > 0 ? 0.5 : 1 }}
              >
                {showPin ? <EyeOff width="14" height="14" /> : <Eye width="14" height="14" />}
              </button>
            </div>
            <div 
              onClick={handleFocusUnlockPin}
              style={{ position: 'relative', width: '100%', height: '48px', cursor: 'pointer' }}
            >
              {/* Visual circles */}
              <div 
                className={verifying ? "verifying-circles" : ""}
                style={{ display: 'flex', gap: '10px', justifyContent: 'center', width: '100%', opacity: lockoutCountdown > 0 ? 0.35 : 1 }}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const isFilled = passcodePin.length > index;
                  return (
                    <div
                      key={index}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        border: isFilled 
                          ? '2px solid #3b82f6' 
                          : '1px solid rgba(255, 255, 255, 0.15)',
                        background: isFilled 
                          ? 'rgba(59, 130, 246, 0.1)' 
                          : 'rgba(255, 255, 255, 0.03)',
                        boxShadow: isFilled 
                          ? '0 0 10px rgba(59, 130, 246, 0.2)' 
                          : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: '800',
                        color: '#fff',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isFilled ? (showPin ? passcodePin[index] : '•') : ''}
                    </div>
                  );
                })}
              </div>
              {/* Transparent input */}
              {lockoutCountdown === 0 && (
                <input 
                  ref={unlockInputRef}
                  type="text"
                  pattern="\d*"
                  inputMode="numeric"
                  value={passcodePin}
                  onChange={(e) => setPasscodePin(e.target.value.replace(/\D/g, '').slice(0,6))}
                  maxLength={6}
                  autoFocus
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    left: 0,
                    top: 0,
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                  required
                />
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={verifying || lockoutCountdown > 0} 
            style={{ 
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: lockoutCountdown > 0 
                ? 'rgba(255,255,255,0.08)' 
                : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: lockoutCountdown > 0 ? '#64748b' : '#fff',
              fontWeight: '700',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: lockoutCountdown > 0 ? 'not-allowed' : 'pointer',
              marginBottom: '20px',
              boxShadow: lockoutCountdown > 0 ? 'none' : '0 8px 16px -4px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            {verifying ? <RefreshCw className="animate-spin" width="16" height="16" /> : <Unlock width="16" height="16" />}
            <span>{verifying ? "Vérification en cours..." : "Déverrouiller le portefeuille"}</span>
          </button>
        </form>

        <button 
          type="button" 
          onClick={() => setResetStep('request')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'underline' }}
        >
          Code PIN secret oublié ?
        </button>
      </div>
    );
  }

  // SCREEN C: Wallet Dashboard (Unlocked) - ENTERPRISE STYLE
  // Dynamically calculate metrics based on transactions list
  const completedWithdrawals = transactions
    .filter(tx => tx.type === 'withdrawal' && (tx.status === 'completed' || tx.status === 'approved'))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const pendingWithdrawals = transactions
    .filter(tx => tx.type === 'withdrawal' && tx.status === 'pending')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalPayouts = transactions
    .filter(tx => tx.type === 'payout' && (tx.status === 'completed' || tx.status === 'approved'))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const refundRate = transactions.filter(tx => tx.type === 'refund').length > 0
    ? ((transactions.filter(tx => tx.type === 'refund').length / transactions.length) * 100).toFixed(1)
    : '0.0';

  // Construct chart data points from chronological transactions
  const chronologicalTxs = [...transactions].reverse();
  let chartData = [];
  if (transactions.length >= 2) {
    let runningVal = 0;
    chartData = chronologicalTxs.map((tx, idx) => {
      if (tx.type === 'withdrawal') {
        runningVal -= tx.amount;
      } else {
        runningVal += tx.amount;
      }
      return {
        label: new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        value: runningVal,
        rawTx: tx
      };
    });
    // Adjust so the final value matches current balance
    const diff = walletInfo.balance - runningVal;
    chartData = chartData.map(d => ({ ...d, value: Math.max(0, d.value + diff) }));
    
    // Add baseline to make graph prettier
    if (chartData.length < 5) {
      chartData = [{ label: 'Init', value: Math.max(0, chartData[0].value - 10000) }, ...chartData];
    }
  } else {
    // Elegant demo projection chart if no transactions
    chartData = [
      { label: 'Début', value: 0 },
      { label: 'Semaine 1', value: Math.max(0, (walletInfo.balance || 45000) * 0.25) },
      { label: 'Semaine 2', value: Math.max(0, (walletInfo.balance || 45000) * 0.4) },
      { label: 'Semaine 3', value: Math.max(0, (walletInfo.balance || 45000) * 0.65) },
      { label: 'Aujourd\'hui', value: walletInfo.balance || 45000 }
    ];
  }

  // Calculate coordinates for SVG Cash Flow Chart
  const svgWidth = 600;
  const svgHeight = 180;
  const svgPadding = 30;
  const chartWidth = svgWidth - svgPadding * 2;
  const chartHeight = svgHeight - svgPadding * 2;

  const chartValues = chartData.map(d => d.value);
  const minChartVal = Math.min(...chartValues, 0);
  const maxChartVal = Math.max(...chartValues, 10000) * 1.15;
  const chartValRange = maxChartVal - minChartVal;

  const points = chartData.map((d, idx) => {
    const x = svgPadding + (idx / (chartData.length - 1)) * chartWidth;
    const y = svgPadding + chartHeight - ((d.value - minChartVal) / chartValRange) * chartHeight;
    return { x, y, ...d };
  });

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${svgHeight - svgPadding} L ${points[0].x} ${svgHeight - svgPadding} Z`
    : '';

  const gridCount = 4;
  const gridLines = [];
  for (let i = 0; i <= gridCount; i++) {
    const y = svgPadding + (i / gridCount) * chartHeight;
    const val = maxChartVal - (i / gridCount) * chartValRange;
    gridLines.push({ y, val });
  }

  // Filtering Logic for Registry Table
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.details ? tx.details.toLowerCase().includes(searchQuery.toLowerCase()) : true;
    const matchesType = searchFilter === 'all' ? true : tx.type === searchFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{ 
      fontFamily: '"Inter", "Segoe UI", sans-serif', 
      animation: 'walletFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)', 
      color: '#1e293b',
      background: '#f8fafc',
      padding: '24px',
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)'
    }}>
      
      {/* 1. Dashboard Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '28px', 
        borderBottom: '1px solid #e2e8f0', 
        paddingBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary-blue) 0%, #1e3a8a 100%)',
            color: '#fff',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(29, 78, 216, 0.15)'
          }}>
            <Wallet width="26" height="26" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Portefeuille d'Entreprise
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
              ID Compte : <span style={{ fontFamily: 'monospace', color: '#3b82f6', fontWeight: 'bold' }}>VC-{walletInfo.walletPhone ? walletInfo.walletPhone.slice(-6) : 'SYS'}</span> • Statut : <span style={{ color: '#059669', fontWeight: 700 }}>Actif</span>
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: '#ecfdf5', 
            border: '1px solid #10b981', 
            color: '#047857', 
            padding: '8px 14px', 
            borderRadius: '20px', 
            fontSize: '0.78rem', 
            fontWeight: '700',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.05)'
          }}>
            <ShieldCheck width="14" height="14" style={{ color: '#10b981' }} />
            <span>Sécurité Active (SHA-256)</span>
          </div>

          <button 
            type="button" 
            onClick={() => {
              setIsUnlocked(false);
              showToast("Portefeuille verrouillé.");
            }}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: '#ffffff', 
              border: '1px solid #cbd5e1', 
              color: '#475569', 
              padding: '9px 16px', 
              borderRadius: '10px', 
              fontSize: '0.82rem', 
              fontWeight: '700', 
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#ffffff'; }}
          >
            <Lock width="14" height="14" />
            <span>Verrouiller</span>
          </button>
        </div>
      </div>

      {/* 2. Professional Tab Switcher */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '26px',
        gap: '24px',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 4px',
            fontSize: '0.9rem',
            fontWeight: 700,
            color: activeTab === 'overview' ? 'var(--primary-blue)' : '#64748b',
            borderBottom: activeTab === 'overview' ? '3px solid var(--primary-blue)' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease'
          }}
        >
          <Activity width="16" height="16" />
          <span>Vue d'ensemble</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 4px',
            fontSize: '0.9rem',
            fontWeight: 700,
            color: activeTab === 'transactions' ? 'var(--primary-blue)' : '#64748b',
            borderBottom: activeTab === 'transactions' ? '3px solid var(--primary-blue)' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease'
          }}
        >
          <CreditCard width="16" height="16" />
          <span>Transferts & Retraits</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 4px',
            fontSize: '0.9rem',
            fontWeight: 700,
            color: activeTab === 'security' ? 'var(--primary-blue)' : '#64748b',
            borderBottom: activeTab === 'security' ? '3px solid var(--primary-blue)' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease'
          }}
        >
          <Settings width="16" height="16" />
          <span>Sécurité & PIN</span>
        </button>
      </div>

      {/* 3. Tab Contents */}

      {/* TAB A: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ animation: 'walletFadeIn 0.3s ease' }}>
          {/* Metrics Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '20px', 
            marginBottom: '26px' 
          }}>
            {/* Card 1: Solde Retirable */}
            <div style={{ 
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', 
              color: 'white', 
              borderRadius: '16px', 
              padding: '24px', 
              boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.15 }}>
                <Wallet width="120" height="120" />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85, display: 'block', letterSpacing: '0.5px' }}>
                Solde disponible (Retirable)
              </span>
              <span style={{ fontSize: '1.9rem', fontWeight: 900, display: 'block', margin: '10px 0 6px 0', letterSpacing: '-0.03em' }}>
                {walletInfo.balance.toLocaleString('fr-FR')} FCFA
              </span>
              <span style={{ fontSize: '0.72rem', opacity: 0.88, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle width="12" height="12" style={{ color: '#10b981' }} /> Prêt pour virement MoMo / Orange
              </span>
            </div>

            {/* Card 2: Fonds en séquestre */}
            <div style={{ 
              background: '#ffffff', 
              color: '#1e293b', 
              borderRadius: '16px', 
              padding: '24px', 
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05, color: '#f59e0b' }}>
                <Lock width="120" height="120" />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', letterSpacing: '0.5px' }}>
                Fonds bloqués (En Séquestre)
              </span>
              <span style={{ fontSize: '1.9rem', fontWeight: 900, display: 'block', margin: '10px 0 6px 0', color: '#0f172a', letterSpacing: '-0.03em' }}>
                {walletInfo.pendingBalance.toLocaleString('fr-FR')} FCFA
              </span>
              <span style={{ fontSize: '0.72rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <Clock width="12" height="12" /> Libéré dès livraison confirmée
              </span>
            </div>

            {/* Card 3: Chiffre d'affaires brut */}
            <div style={{ 
              background: '#ffffff', 
              color: '#1e293b', 
              borderRadius: '16px', 
              padding: '24px', 
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05, color: '#10b981' }}>
                <TrendingUp width="120" height="120" />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block', letterSpacing: '0.5px' }}>
                Chiffre d'affaires cumulé
              </span>
              <span style={{ fontSize: '1.9rem', fontWeight: 900, display: 'block', margin: '10px 0 6px 0', color: '#0f172a', letterSpacing: '-0.03em' }}>
                {walletInfo.totalSales.toLocaleString('fr-FR')} FCFA
              </span>
              <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <TrendingUp width="12" height="12" /> Volume d'activité global
              </span>
            </div>
          </div>

          {/* Graphical section and key ratios */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1.8fr 1.2fr', 
            gap: '24px',
            marginBottom: '26px'
          }} className="wallet-corporate-cols">
            
            {/* SVG line chart */}
            <div style={{ 
              background: '#ffffff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '16px', 
              padding: '20px 24px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    Évolution de la Trésorerie (Solde Net)
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                    Variations récentes du solde disponible en caisse
                  </p>
                </div>
                {transactions.length < 2 && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '3px 8px', borderRadius: '12px' }}>
                    💡 Mode Démo (Visualisation)
                  </span>
                )}
              </div>

              {/* Responsive SVG Chart Wrapper */}
              <div style={{ width: '100%', overflow: 'hidden' }}>
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  {gridLines.map((line, idx) => (
                    <g key={idx}>
                      <line 
                        x1={svgPadding} 
                        y1={line.y} 
                        x2={svgWidth - svgPadding} 
                        y2={line.y} 
                        stroke="#f1f5f9" 
                        strokeWidth="1.5" 
                      />
                      <text 
                        x={svgPadding - 6} 
                        y={line.y + 4} 
                        textAnchor="end" 
                        fill="#94a3b8" 
                        fontSize="9" 
                        fontWeight="600"
                        fontFamily="inherit"
                      >
                        {Math.round(line.val).toLocaleString('fr-FR')}
                      </text>
                    </g>
                  ))}

                  {/* Area path */}
                  {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}

                  {/* Line path */}
                  {linePath && (
                    <path 
                      d={linePath} 
                      fill="none" 
                      stroke="#3b82f6" 
                      strokeWidth="2.5" 
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Scatter Dots */}
                  {points.map((p, idx) => (
                    <g key={idx} className="chart-dot-group">
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="4.5" 
                        fill="#ffffff" 
                        stroke="#3b82f6" 
                        strokeWidth="2.5" 
                      />
                      <text
                        x={p.x}
                        y={svgHeight - svgPadding + 14}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="9"
                        fontWeight="700"
                        fontFamily="inherit"
                      >
                        {p.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Advanced Corporate Metrics */}
            <div style={{ 
              background: '#ffffff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '16px', 
              padding: '24px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  Indicateurs Financiers Clés
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Row 1: Total retraits */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Total Retiré MoMo :</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444' }}>{completedWithdrawals.toLocaleString('fr-FR')} FCFA</span>
                  </div>

                  {/* Row 2: Retraits en attente */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Demandes en cours :</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>{pendingWithdrawals.toLocaleString('fr-FR')} FCFA</span>
                  </div>

                  {/* Row 3: Taux de retour/remboursement */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Taux de remboursement :</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>{refundRate}% (Très bas)</span>
                  </div>

                  {/* Row 4: Délai de libération séquestre */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Délai Moyen Libération :</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>~ 24h</span>
                  </div>
                </div>
              </div>

              {/* Financial Health Badge */}
              <div style={{ 
                background: '#f0fdf4', 
                border: '1px solid #bbf7d0', 
                borderRadius: '12px', 
                padding: '12px 14px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                marginTop: '16px'
              }}>
                <div style={{
                  background: '#10b981',
                  color: 'white',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.95rem'
                }}>
                  A+
                </div>
                <div>
                  <h5 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, color: '#14532d' }}>
                    Santé du Portefeuille Excellent
                  </h5>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#15803d', fontWeight: 500 }}>
                    Compte sécurisé • Aucun litige ouvert
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Recent Transactions list */}
          <div style={{ 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '16px', 
            padding: '24px',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                Opérations Récentes
              </h4>
              <button 
                onClick={() => setActiveTab('transactions')}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--primary-blue)', 
                  fontWeight: 700, 
                  fontSize: '0.78rem', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>Voir tout le registre</span>
                <ChevronRight width="12" height="12" />
              </button>
            </div>

            {transactions.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                Aucune opération de crédit ou débit enregistrée.
              </div>
            ) : (
              <>
                <div className="desktop-tx-table" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontWeight: '700' }}>
                        <th style={{ padding: '10px 8px' }}>Date & Heure</th>
                        <th style={{ padding: '10px 8px' }}>Opération</th>
                        <th style={{ padding: '10px 8px' }}>Détails</th>
                        <th style={{ padding: '10px 8px' }}>Montant</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 5).map((tx, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f8fafc', color: '#1e293b' }} className="tx-row">
                          <td style={{ padding: '12px 8px', color: '#64748b', fontSize: '0.72rem' }}>
                            {new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>
                            {tx.type === 'deposit' && <span style={{ color: '#047857', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Crédit / Dépôt</span>}
                            {tx.type === 'payout' && <span style={{ color: '#1d4ed8', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Revenu Vente</span>}
                            {tx.type === 'withdrawal' && <span style={{ color: '#b91c1c', background: '#fef2f2', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Débit / Retrait</span>}
                            {tx.type === 'refund' && <span style={{ color: '#d97706', background: '#fffbeb', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Remboursement</span>}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '0.75rem', color: '#475569' }}>
                            {tx.details || (tx.order_id ? `Vente commande #${tx.order_id.substring(0,8)}` : 'Ajustement portefeuille')}
                          </td>
                          <td style={{ padding: '12px 8px', fontWeight: '800' }}>
                            {tx.type === 'withdrawal' ? (
                              <span style={{ color: '#ef4444' }}>-{tx.amount.toLocaleString('fr-FR')} F</span>
                            ) : (
                              <span style={{ color: '#10b981' }}>+{tx.amount.toLocaleString('fr-FR')} F</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                            {tx.status === 'completed' || tx.status === 'approved' ? (
                              <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', fontSize: '0.7rem' }}>
                                <CheckCircle width="11" height="11" /> Validé
                              </span>
                            ) : tx.status === 'pending' ? (
                              <span style={{ color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', fontSize: '0.7rem' }}>
                                <Clock width="11" height="11" /> En cours
                              </span>
                            ) : (
                              <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', fontSize: '0.7rem' }}>
                                <XCircle width="11" height="11" /> Échoué
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mobile-tx-list" style={{ display: 'none' }}>
                  {transactions.slice(0, 5).map((tx, idx) => (
                    <div key={idx} style={{ 
                      background: '#f8fafc', 
                      borderRadius: '12px', 
                      padding: '14px', 
                      border: '1px solid #e2e8f0', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                          {new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {tx.status === 'completed' || tx.status === 'approved' ? (
                          <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', fontSize: '0.68rem' }}>
                            <CheckCircle width="10" height="10" /> Validé
                          </span>
                        ) : tx.status === 'pending' ? (
                          <span style={{ color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', fontSize: '0.68rem' }}>
                            <Clock width="10" height="10" /> En cours
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', fontSize: '0.68rem' }}>
                            <XCircle width="10" height="10" /> Échoué
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: '#1e293b', fontWeight: 700 }}>
                          {tx.details || (tx.order_id ? `Vente #${tx.order_id.substring(0,8)}` : 'Ajustement')}
                        </span>
                        <span style={{ fontWeight: '900', fontSize: '0.85rem', color: tx.type === 'withdrawal' ? '#ef4444' : '#10b981' }}>
                          {tx.type === 'withdrawal' ? '-' : '+'}{tx.amount.toLocaleString('fr-FR')} F
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {tx.type === 'deposit' && <span style={{ color: '#047857', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>Dépôt</span>}
                        {tx.type === 'payout' && <span style={{ color: '#1d4ed8', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>Vente</span>}
                        {tx.type === 'withdrawal' && <span style={{ color: '#b91c1c', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>Retrait</span>}
                        {tx.type === 'refund' && <span style={{ color: '#d97706', background: '#fffbeb', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>Remboursement</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB B: TRANSACTIONS & TRANSFERS */}
      {activeTab === 'transactions' && (
        <div style={{ animation: 'walletFadeIn 0.3s ease' }}>
          
          {/* Split row for Transfer Forms */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '24px',
            marginBottom: '26px'
          }} className="wallet-corporate-cols">
            
            {/* Withdrawal form */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)'
            }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowUpRight width="18" height="18" style={{ color: '#ff6a00' }} />
                <span>Demander un Retrait Mobile Money</span>
              </h4>

              <form onSubmit={handleWithdraw}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Operator Selection */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Opérateur de Réception
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <button 
                        type="button" 
                        onClick={() => setOperator('mtn')}
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          border: operator === 'mtn' ? '2.5px solid #eab308' : '1px solid #cbd5e1',
                          background: operator === 'mtn' ? '#fef9c3' : '#ffffff',
                          fontWeight: '800',
                          color: '#1e293b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }}></span>
                        MTN MoMo
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setOperator('orange')}
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          border: operator === 'orange' ? '2.5px solid #ff6600' : '1px solid #cbd5e1',
                          background: operator === 'orange' ? '#fff7f2' : '#ffffff',
                          fontWeight: '800',
                          color: '#1e293b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff6600' }}></span>
                        Orange Money
                      </button>
                    </div>
                  </div>

                  {/* Phone number */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Numéro de Téléphone Récepteur (9 chiffres)
                    </label>
                    <input 
                      type="tel" 
                      placeholder="Ex: 677XXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      maxLength={9}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit',
                        background: '#f8fafc',
                        outline: 'none',
                        color: '#0f172a'
                      }}
                      required
                    />
                  </div>

                  {/* Split row for Amount and PIN */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                        Montant à retirer (FCFA)
                      </label>
                      <input 
                        type="number" 
                        placeholder="Montant"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.9rem',
                          fontFamily: 'inherit',
                          background: '#f8fafc',
                          outline: 'none',
                          color: '#0f172a'
                        }}
                        max={walletInfo.balance}
                        required
                      />
                    </div>
                    
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                        Code PIN
                      </label>
                      <input 
                        type="password" 
                        placeholder="••••••"
                        value={pinForTx}
                        onChange={(e) => setPinForTx(e.target.value.replace(/\D/g, '').slice(0,6))}
                        maxLength={6}
                        style={{
                          width: '100%',
                          padding: '11px 8px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.9rem',
                          fontFamily: 'inherit',
                          background: '#f8fafc',
                          outline: 'none',
                          textAlign: 'center',
                          letterSpacing: '4px',
                          color: '#0f172a'
                        }}
                        required
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={submittingTx || !amount} 
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ff6a00 0%, #ee5a00 100%)',
                    color: '#fff',
                    fontWeight: '800',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    marginTop: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 15px rgba(255, 106, 0, 0.2)',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {submittingTx ? <RefreshCw className="animate-spin" width="16" height="16" /> : <ArrowUpRight width="16" height="16" />}
                  <span>Déclencher le Retrait Direct</span>
                </button>
              </form>
            </div>

            {/* Simulated Deposit Tool */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ArrowDownLeft width="18" height="18" style={{ color: '#10b981' }} />
                  <span>Simulateur d'Encaissement</span>
                </h4>
                <p style={{ margin: '0 0 18px 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.45 }}>
                  Créditez votre portefeuille (environnement de test) pour simuler une vente ou un approvisionnement Mobile Money.
                </p>

                <form onSubmit={handleDeposit}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                        Montant à créditer (FCFA)
                      </label>
                      <input 
                        type="number" 
                        placeholder="Ex: 50000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          fontFamily: 'inherit',
                          background: '#f8fafc',
                          outline: 'none',
                          color: '#0f172a'
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                        Numéro payeur
                      </label>
                      <input 
                        type="tel" 
                        placeholder="6XXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        maxLength={9}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          fontFamily: 'inherit',
                          background: '#f8fafc',
                          outline: 'none',
                          color: '#0f172a'
                        }}
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={submittingTx || !amount} 
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      fontWeight: '800',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      marginTop: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 10px rgba(16, 185, 129, 0.15)',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {submittingTx ? <RefreshCw className="animate-spin" width="14" height="14" /> : <ArrowDownLeft width="14" height="14" />}
                    <span>Injecter les Fonds</span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Full Transaction Table Registry with search and filters */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Grand Livre & Registre Complet
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                  Auditez l'intégralité des flux créditeurs et débiteurs
                </p>
              </div>

              {/* Filtering Controls */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.78rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    minWidth: '150px'
                  }}
                />

                <select
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{
                    padding: '8px 24px 8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.78rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    backgroundPosition: 'right 8px center',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">Tous les types</option>
                  <option value="payout">Ventes</option>
                  <option value="withdrawal">Retraits</option>
                  <option value="deposit">Dépôts</option>
                  <option value="refund">Remboursements</option>
                </select>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                Aucune transaction ne correspond à vos critères de recherche.
              </div>
            ) : (
              <>
                <div className="desktop-tx-table" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontWeight: '700' }}>
                        <th style={{ padding: '12px 8px' }}>Horodatage complet</th>
                        <th style={{ padding: '12px 8px' }}>Type d'opération</th>
                        <th style={{ padding: '12px 8px' }}>Détails / Réf</th>
                        <th style={{ padding: '12px 8px' }}>Flux financier</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right' }}>Statut final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f8fafc', color: '#1e293b' }} className="tx-row">
                          <td style={{ padding: '12px 8px', color: '#64748b', fontSize: '0.75rem' }}>
                            {new Date(tx.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>
                            {tx.type === 'deposit' && <span style={{ color: '#047857', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Crédit / Dépôt</span>}
                            {tx.type === 'payout' && <span style={{ color: '#1d4ed8', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Revenu Vente</span>}
                            {tx.type === 'withdrawal' && <span style={{ color: '#b91c1c', background: '#fef2f2', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Débit / Retrait</span>}
                            {tx.type === 'refund' && <span style={{ color: '#d97706', background: '#fffbeb', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Remboursement</span>}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '0.78rem', color: '#475569' }}>
                            {tx.details || (tx.order_id ? `Vente commande #${tx.order_id.substring(0,8)}` : 'Ajustement de caisse')}
                          </td>
                          <td style={{ padding: '12px 8px', fontWeight: '800' }}>
                            {tx.type === 'withdrawal' ? (
                              <span style={{ color: '#ef4444' }}>-{tx.amount.toLocaleString('fr-FR')} F</span>
                            ) : (
                              <span style={{ color: '#10b981' }}>+{tx.amount.toLocaleString('fr-FR')} F</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                            {tx.status === 'completed' || tx.status === 'approved' ? (
                              <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', fontSize: '0.7rem' }}>
                                <CheckCircle width="11" height="11" /> Validé
                              </span>
                            ) : tx.status === 'pending' ? (
                              <span style={{ color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', fontSize: '0.7rem' }}>
                                <Clock width="11" height="11" /> En cours
                              </span>
                            ) : (
                              <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', fontSize: '0.7rem' }}>
                                <XCircle width="11" height="11" /> Échoué
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mobile-tx-list" style={{ display: 'none' }}>
                  {filteredTransactions.map((tx, idx) => (
                    <div key={idx} style={{ 
                      background: '#f8fafc', 
                      borderRadius: '12px', 
                      padding: '14px', 
                      border: '1px solid #e2e8f0', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                          {new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {tx.status === 'completed' || tx.status === 'approved' ? (
                          <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', fontSize: '0.68rem' }}>
                            <CheckCircle width="10" height="10" /> Validé
                          </span>
                        ) : tx.status === 'pending' ? (
                          <span style={{ color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', fontSize: '0.68rem' }}>
                            <Clock width="10" height="10" /> En cours
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', fontSize: '0.68rem' }}>
                            <XCircle width="10" height="10" /> Échoué
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: '#1e293b', fontWeight: 700 }}>
                          {tx.details || (tx.order_id ? `Vente #${tx.order_id.substring(0,8)}` : 'Ajustement')}
                        </span>
                        <span style={{ fontWeight: '900', fontSize: '0.85rem', color: tx.type === 'withdrawal' ? '#ef4444' : '#10b981' }}>
                          {tx.type === 'withdrawal' ? '-' : '+'}{tx.amount.toLocaleString('fr-FR')} F
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {tx.type === 'deposit' && <span style={{ color: '#047857', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>Dépôt</span>}
                        {tx.type === 'payout' && <span style={{ color: '#1d4ed8', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>Vente</span>}
                        {tx.type === 'withdrawal' && <span style={{ color: '#b91c1c', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>Retrait</span>}
                        {tx.type === 'refund' && <span style={{ color: '#d97706', background: '#fffbeb', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>Remboursement</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB C: SECURITY & SETTINGS */}
      {activeTab === 'security' && (
        <div style={{ animation: 'walletFadeIn 0.3s ease' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '24px'
          }} className="wallet-corporate-cols">
            
            {/* Explanatory security policy */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck width="20" height="20" style={{ color: '#10b981' }} />
                <span>Politique Globale de Sécurité Financière</span>
              </h4>
              
              <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                Pour garantir la sécurité de vos fonds et éviter les fraudes, nous appliquons un protocole d'authentification robuste :
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ color: '#3b82f6', marginTop: '2px' }}><CheckCircle width="16" height="16" /></div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>Code PIN Chiffré en SHA-256</h5>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4 }}>
                      Votre code secret de 6 chiffres est stocké de manière irréversible dans la base de données. Personne d'autre ne peut le décrypter.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ color: '#ef4444', marginTop: '2px' }}><AlertCircle width="16" height="16" /></div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>Protection Anti-BruteForce</h5>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4 }}>
                      Après <strong>5 tentatives infructueuses</strong>, le portefeuille est automatiquement verrouillé pendant <strong>5 minutes</strong>. Après <strong>7 tentatives</strong>, il est bloqué pendant <strong>15 minutes</strong>.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ color: '#f59e0b', marginTop: '2px' }}><Clock width="16" height="16" /></div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>Fonds Bloqués Temporairement (Séquestre)</h5>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4 }}>
                      Les gains des ventes restent sous séquestre jusqu'à ce que le client valide la réception de la commande, assurant une confiance bilatérale.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  Gestion de l'Accès
                </h4>
                
                <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4, marginBottom: '20px' }}>
                  Besoin de modifier ou de réinitialiser le code de sécurité ? Utilisez le module de secours.
                </p>

                <button
                  onClick={handleForgotPasscode}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #3b82f6',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#eff6ff'}
                >
                  Réinitialiser mon Code PIN
                </button>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center' }}>
                Toutes les opérations sont conformes aux régulations CEMAC sur la monnaie électronique.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Embedded Dynamic Animations & Mobile Layout Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes verifyingPulse {
          0% { opacity: 0.6; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 0.6; transform: scale(0.98); }
        }
        .verifying-circles {
          animation: verifyingPulse 1.2s ease-in-out infinite;
        }

        @keyframes walletFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tx-row {
          transition: background-color 0.2s ease;
        }
        .tx-row:hover {
          background-color: #f8fafc !important;
        }
        .chart-dot-group:hover circle {
          r: 6px;
          fill: #3b82f6;
          stroke: #ffffff;
        }
        
        .desktop-tx-table {
          display: block;
        }
        .mobile-tx-list {
          display: none;
        }

        @media (max-width: 768px) {
          .wallet-corporate-cols {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .desktop-tx-table {
            display: none !important;
          }
          .mobile-tx-list {
            display: flex !important;
            flex-direction: column;
            gap: 12px;
          }
        }

        @media (max-width: 480px) {
          /* target metrics cards */
          div[style*="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))"] > div {
            padding: 16px !important;
            border-radius: 12px !important;
          }
          /* target card values */
          div[style*="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))"] span[style*="font-size: 1.9rem"] {
            font-size: 1.45rem !important;
            margin: 8px 0 4px 0 !important;
          }
        }

        @media (max-width: 360px) {
          /* scale down PIN circles */
          div[style*="gap: 10px"][style*="justify-content: center"] {
            gap: 6px !important;
          }
          div[style*="gap: 10px"][style*="justify-content: center"] > div {
            width: 32px !important;
            height: 32px !important;
            font-size: 1rem !important;
          }
        }
      ` }} />

    </div>
  );
}
