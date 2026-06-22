// client/src/app/dashboard/components/SellerApplicationSection.js
import React, { useState, useEffect } from 'react';
import { Store, ShieldCheck, Clock, RefreshCw, CheckCircle2, Award, Zap, BarChart3, Link2, AlertCircle } from 'lucide-react';
import { getApiBaseUrl } from '../../../core/api';

export default function SellerApplicationSection({ profile, onApprovalSuccess, showToast, authFetch }) {
  const [shopName, setShopName] = useState('');
  const [whatsapp, setWhatsapp] = useState(profile?.phone || '');
  const [bio, setBio] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hn = window.location.hostname;
      setIsLocalhost(
        hn === 'localhost' || 
        hn === '127.0.0.1' || 
        hn.startsWith('192.168.') || 
        hn.startsWith('10.')
      );
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shopName.trim() || !whatsapp.trim()) {
      alert("Veuillez remplir le nom de la boutique et le numéro WhatsApp.");
      return;
    }

    setLoading(true);

    try {
      const res = await authFetch('/api/user/apply-seller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shop_name: shopName.trim(),
          phone: whatsapp.trim(),
          bio: bio.trim(),
          description: description.trim()
        })
      });

      if (res.ok) {
        showToast("Votre candidature a été soumise avec succès !");
        onApprovalSuccess(); // Re-fetch profile
      } else {
        const err = await res.json();
        alert(err.error || "Une erreur est survenue.");
      }
    } catch (e) {
      console.error(e);
      alert("Impossible de joindre le serveur.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateApproval = async () => {
    setLoading(true);

    try {
      const res = await authFetch('/api/user/simulate-approve-seller', {
        method: 'POST'
      });

      if (res.ok) {
        showToast("Félicitations ! Votre compte vendeur est désormais activé.");
        onApprovalSuccess(); // Re-fetch profile to trigger full dashboard unlock
      } else {
        const err = await res.json();
        alert(err.error || "La simulation a échoué.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau lors de la simulation.");
    } finally {
      setLoading(false);
    }
  };

  if (profile?.seller_status === 'pending') {
    return (
      <div className="check-card" style={{ padding: '50px 30px', textAlign: 'center', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.02)' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', border: '1px solid #fef3c7' }}>
          <Clock width="40" height="40" style={{ color: '#d97706' }} />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 850, color: '#0f172a', margin: '0 0 12px 0' }}>
          Candidature en cours d'analyse
        </h2>
        <p style={{ fontSize: '0.92rem', color: '#475569', maxWidth: '560px', margin: '0 auto 30px auto', lineHeight: 1.6 }}>
          Votre demande de statut vendeur pour la boutique <strong style={{ color: '#ff6a00' }}>{profile?.seller_application_data?.shop_name}</strong> a été enregistrée avec succès. Nos équipes examinent les informations sous 24h ouvrées pour valider l'authenticité de vos fabrications.
        </p>

        {isLocalhost && (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '30px', marginTop: '30px', background: '#f8fafc', borderRadius: '12px', padding: '24px' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.5px' }}>
              🛠️ Zone de test développeur (Localhost uniquement) :
            </span>
            <button 
              onClick={handleSimulateApproval}
              disabled={loading}
              className="checkout-btn"
              style={{ display: 'inline-flex', width: 'auto', background: '#10b981', padding: '12px 28px', borderRadius: '8px', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', gap: '8px' }}
            >
              {loading ? <RefreshCw className="animate-spin" width="16" height="16" /> : <CheckCircle2 width="16" height="16" />}
              <span>Simuler l'approbation immédiate de l'admin</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Premium Hero Banner Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '40px 30px',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 106, 0, 0.15)', color: '#ff6a00', padding: '6px 12px', borderRadius: '20px', width: 'fit-content', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <Award width="14" height="14" /> Programme Vendeur Certifié
        </div>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 850, letterSpacing: '-0.5px' }}>
          Lancez votre boutique d'entreprise sur Vendoscity
        </h1>
        <p style={{ margin: 0, fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.5, maxWidth: '700px' }}>
          Rejoignez le réseau professionnel de fabricants, grossistes et créateurs au Cameroun. Présentez votre catalogue à des milliers d'acheteurs et sécurisez vos revenus grâce au séquestre automatisé.
        </p>
      </div>

      {/* Main Grid: Left Benefits, Right Form */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '24px'
      }} className="seller-app-grid">
        
        <style dangerouslySetInnerHTML={{ __html: `
          @media (min-width: 950px) {
            .seller-app-grid {
              grid-template-columns: 360px 1fr !important;
            }
          }
        ` }} />

        {/* Left Column: Benefits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="check-card" style={{ padding: '24px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Avantages de la certification
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff8f2', border: '1px solid #ffe8d6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Store width="16" height="16" style={{ color: '#ff6a00' }} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 750, color: '#1e293b' }}>Catalogue Premium</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>Publiez vos créations et gérez vos stocks facilement.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck width="16" height="16" style={{ color: '#2563eb' }} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 750, color: '#1e293b' }}>Séquestre Automatisé</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>Garantissez vos paiements MoMo en évitant les impayés.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BarChart3 width="16" height="16" style={{ color: '#059669' }} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 750, color: '#1e293b' }}>Statistiques & KPIs</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>Suivez vos ventes et visualisez votre croissance en direct.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#faf5ff', border: '1px solid #f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Link2 width="16" height="16" style={{ color: '#7c3aed' }} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 750, color: '#1e293b' }}>Lien Unique</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>Partagez votre profil comme un site web professionnel.</p>
                </div>
              </div>

            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <AlertCircle width="16" height="16" style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569', lineHeight: 1.4 }}>
              <strong>Zéro frais d'inscription.</strong> La validation manuelle prend moins de 24 heures et garantit la qualité du réseau.
            </p>
          </div>

        </div>

        {/* Right Column: The Form Card */}
        <div className="check-card" style={{ padding: '30px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0', margin: 0 }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap width="18" height="18" style={{ color: '#ff6a00' }} /> Formulaire d'inscription vendeur
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="form-label">Nom de votre boutique / entreprise *</label>
              <input 
                type="text" 
                placeholder="Ex: Arthur Créations, Douala Tech..."
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="form-input"
                style={{ marginBottom: 0 }}
                required
              />
            </div>

            <div>
              <label className="form-label">Numéro de téléphone WhatsApp professionnel *</label>
              <input 
                type="tel" 
                placeholder="Ex: +2376XXXXXXXX"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="form-input"
                style={{ marginBottom: 0 }}
                required
              />
            </div>

            <div>
              <label className="form-label">Description courte de votre activité (Bio)</label>
              <textarea 
                placeholder="Ex: Fabricant de chaussures en cuir sur mesure à Yaoundé."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="form-input"
                style={{ minHeight: '60px', resize: 'vertical', marginBottom: 0 }}
              />
            </div>

            <div>
              <label className="form-label">Pourquoi souhaitez-vous vendre sur notre plateforme ?</label>
              <textarea 
                placeholder="Décrivez brièvement les produits que vous fabriquez ou vendez."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input"
                style={{ minHeight: '80px', resize: 'vertical', marginBottom: 0 }}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="checkout-btn"
              style={{ marginTop: '8px', cursor: 'pointer' }}
            >
              {loading ? <RefreshCw className="animate-spin" width="16" height="16" /> : <ShieldCheck width="18" height="18" />}
              <span>Soumettre ma candidature de vendeur</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
