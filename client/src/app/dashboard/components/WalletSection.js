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

  // Lockout states
  const [lockedUntil, setLockedUntil] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);

  // Passcode reset states
  const [resetStep, setResetStep] = useState('none'); // 'none', 'request', 'verify'
  const [resetOtp, setResetOtp] = useState('');
  const [newResetPasscode, setNewResetPasscode] = useState('');
  const [simulatedOtpDisplay, setSimulatedOtpDisplay] = useState('');

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
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
        Chargement de votre portefeuille...
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
            <div style={{ position: 'relative', width: '100%', height: '48px' }}>
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
            <div style={{ position: 'relative', width: '100%', height: '48px' }}>
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
            <div style={{ position: 'relative', width: '100%', height: '48px' }}>
              {/* Visual circles */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', width: '100%', opacity: lockoutCountdown > 0 ? 0.35 : 1 }}>
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
            <span>Déverrouiller le portefeuille</span>
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
