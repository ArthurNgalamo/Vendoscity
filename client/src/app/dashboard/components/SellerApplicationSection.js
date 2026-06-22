// client/src/app/dashboard/components/SellerApplicationSection.js
import React, { useState } from 'react';
import { Store, ShieldCheck, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getApiBaseUrl } from '../../../core/api';

export default function SellerApplicationSection({ profile, onApprovalSuccess, showToast }) {
  const [shopName, setShopName] = useState('');
  const [whatsapp, setWhatsapp] = useState(profile?.phone || '');
  const [bio, setBio] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shopName.trim() || !whatsapp.trim()) {
      alert("Veuillez remplir le nom de la boutique et le numéro WhatsApp.");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    const apiBase = getApiBaseUrl();

    try {
      const res = await fetch(`${apiBase}/api/user/apply-seller`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
    const token = localStorage.getItem('token');
    const apiBase = getApiBaseUrl();

    try {
      const res = await fetch(`${apiBase}/api/user/simulate-approve-seller`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      <div className="check-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
          <Clock width="32" height="32" style={{ color: '#d97706' }} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309', margin: '0 0 12px 0' }}>
          Candidature en cours d'examen
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '500px', margin: '0 auto 24px auto', lineHeight: 1.5 }}>
          Votre demande de statut vendeur pour la boutique <strong>{profile?.seller_application_data?.shop_name}</strong> est en cours d'analyse par l'administration de Vendoscity. Nous vous notifierons dès qu'elle sera validée.
        </p>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px', marginTop: '24px' }}>
          <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px' }}>
            Zone de test développeur :
          </span>
          <button 
            onClick={handleSimulateApproval}
            disabled={loading}
            className="checkout-btn"
            style={{ display: 'inline-flex', width: 'auto', background: '#10b981', padding: '10px 24px' }}
          >
            {loading ? <RefreshCw className="animate-spin" width="16" height="16" /> : <CheckCircle2 width="16" height="16" />}
            <span>Simuler l'approbation immédiate par l'admin</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="check-card" style={{ padding: '30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px' }}>
        <Store width="24" height="24" style={{ color: 'var(--brand-accent)' }} />
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 850 }}>Devenir Vendeur Certifié sur Vendoscity</h2>
      </div>

      <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, marginBottom: '24px' }}>
        Rejoignez notre réseau de fabricants et grossistes locaux au Cameroun. L'activation du statut vendeur débloquera votre catalogue de produits, le suivi statistique et votre portefeuille financier sécurisé par séquestre.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          <div>
            <label className="form-label">Nom de votre boutique / entreprise *</label>
            <input 
              type="text" 
              placeholder="Ex: Arthur Créations, Douala Tech..."
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div>
            <label className="form-label">Numéro de téléphone WhatsApp professionnel *</label>
            <input 
              type="tel" 
              placeholder="Ex: +237681570075"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="form-input"
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
              style={{ minHeight: '60px', resize: 'vertical' }}
            />
          </div>

          <div>
            <label className="form-label">Pourquoi souhaitez-vous vendre sur notre plateforme ?</label>
            <textarea 
              placeholder="Décrivez brièvement les produits que vous fabriquez ou vendez."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input"
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="checkout-btn"
          style={{ marginTop: '16px' }}
        >
          {loading ? <RefreshCw className="animate-spin" width="16" height="16" /> : <ShieldCheck width="18" height="18" />}
          <span>Soumettre ma candidature de vendeur</span>
        </button>
      </form>
    </div>
  );
}
