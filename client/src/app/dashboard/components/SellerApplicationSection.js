// client/src/app/dashboard/components/SellerApplicationSection.js
import React, { useState, useEffect } from 'react';
import { 
  Store, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  Award, 
  Zap, 
  BarChart3, 
  Link2, 
  AlertCircle, 
  Building2, 
  Briefcase, 
  UploadCloud, 
  Check, 
  FileText 
} from 'lucide-react';
import { getApiBaseUrl } from '../../../core/api';

export default function SellerApplicationSection({ profile, onApprovalSuccess, showToast, authFetch }) {
  const [shopName, setShopName] = useState('');
  const [whatsapp, setWhatsapp] = useState(profile?.phone || '');
  const [bio, setBio] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);

  // Enterprise details
  const [structureType, setStructureType] = useState('Artisan / Créateur');
  const [sector, setSector] = useState('Artisanat');

  // Real files states
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [docName, setDocName] = useState('');
  const [managerPhotoFile, setManagerPhotoFile] = useState(null);
  const [managerPhotoPreview, setManagerPhotoPreview] = useState(null);

  // Verification progress animation state
  const [verificationStage, setVerificationStage] = useState(null);

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
      alert("Veuillez remplir le nom de l'entreprise et le numéro WhatsApp.");
      return;
    }

    // Si un document CNI est fourni mais pas la photo du responsable, on alerte l'utilisateur
    if (documentFile && !managerPhotoFile) {
      alert("Veuillez charger votre photo de responsable/vendeur afin de comparer vos visages pour obtenir le badge de vérification.");
      return;
    }

    setLoading(true);
    setVerificationStage('uploading');

    // Démarrer la progression visuelle premium
    const timer1 = setTimeout(() => setVerificationStage('ocr'), 600);
    const timer2 = setTimeout(() => setVerificationStage('face_match'), 1200);
    const timer3 = setTimeout(() => setVerificationStage('completing'), 1800);

    const formattedDescription = `[Structure: ${structureType}]\n[Secteur: ${sector}]\n[Logo: ${logoFile ? 'Fourni' : 'Non fourni'}]\n[Document d'enregistrement: ${docName || 'Non fourni'}]\n\nDescription d'activité:\n${description.trim()}`;

    const formData = new FormData();
    formData.append('shop_name', shopName.trim());
    formData.append('phone', whatsapp.trim());
    formData.append('bio', bio.trim());
    formData.append('description', formattedDescription);
    if (logoFile) formData.append('logo', logoFile);
    if (documentFile) formData.append('document', documentFile);
    if (managerPhotoFile) formData.append('manager_photo', managerPhotoFile);

    try {
      const res = await authFetch('/api/user/apply-seller', {
        method: 'POST',
        body: formData
      });

      // Laisser le temps à la simulation d'être visible si la requête réseau est trop rapide
      await new Promise(r => setTimeout(r, 400));

      if (res.ok) {
        const data = await res.json();
        if (data.is_verified) {
          showToast("Félicitations ! Votre compte vendeur est validé et certifié avec le badge vérifié.");
        } else {
          showToast("Félicitations ! Votre compte vendeur est désormais validé.");
        }
        onApprovalSuccess(); // Re-fetch profile
      } else {
        const err = await res.json();
        alert(err.error || "Une erreur est survenue.");
      }
    } catch (e) {
      console.error(e);
      alert("Impossible de joindre le serveur.");
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setVerificationStage(null);
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
        showToast("Félicitations ! Votre compte entreprise est désormais validé.");
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

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
      setDocName(file.name);
    }
  };

  const handleManagerPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setManagerPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setManagerPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
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
          Votre demande de statut vendeur pour l'entreprise <strong style={{ color: '#ff6a00' }}>{profile?.seller_application_data?.shop_name}</strong> a été enregistrée avec succès. Nos équipes examinent les informations sous 24h ouvrées pour valider l'authenticité de vos fabrications.
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

  if (loading && verificationStage) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '50px 30px', 
        textAlign: 'center',
        background: '#ffffff', 
        borderRadius: '16px', 
        border: '1px solid #e2e8f0', 
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.02)',
        minHeight: '420px'
      }}>
        {/* Animated radar/verification scanner */}
        <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '30px' }}>
          <div className="radar-pulse" style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '3px solid #3b82f6',
            opacity: 0.75
          }}></div>
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #3b82f6'
          }}>
            <RefreshCw className="animate-spin" width="36" height="36" style={{ color: '#3b82f6' }} />
          </div>
        </div>

        <h3 style={{ fontSize: '1.4rem', fontWeight: 850, color: '#0f172a', margin: '0 0 12px 0' }}>
          Analyse et Vérification Sécurisée
        </h3>
        
        {/* Stages steps UI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '400px', margin: '20px auto 0 auto', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#1e293b' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3b82f6', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>1</div>
            <span style={{ fontWeight: verificationStage === 'uploading' ? '800' : 'normal', color: verificationStage === 'uploading' ? '#3b82f6' : '#64748b' }}>
              Envoi des fichiers et logo vers le stockage sécurisé...
            </span>
          </div>
          {documentFile && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#1e293b' }}>
                <div style={{ 
                  width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  background: (verificationStage === 'ocr' || verificationStage === 'face_match' || verificationStage === 'completing') ? '#3b82f6' : '#cbd5e1', 
                  color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' 
                }}>2</div>
                <span style={{ 
                  fontWeight: verificationStage === 'ocr' ? '800' : 'normal', 
                  color: verificationStage === 'ocr' ? '#3b82f6' : (['face_match', 'completing'].includes(verificationStage) ? '#1e293b' : '#64748b') 
                }}>
                  Algorithme OCR : Lecture de la pièce d'identité...
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#1e293b' }}>
                <div style={{ 
                  width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  background: (verificationStage === 'face_match' || verificationStage === 'completing') ? '#3b82f6' : '#cbd5e1', 
                  color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' 
                }}>3</div>
                <span style={{ 
                  fontWeight: verificationStage === 'face_match' ? '800' : 'normal', 
                  color: verificationStage === 'face_match' ? '#3b82f6' : (verificationStage === 'completing' ? '#1e293b' : '#64748b') 
                }}>
                  Comparaison biométrique faciale (Anti-spoofing)...
                </span>
              </div>
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#1e293b' }}>
            <div style={{ 
              width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              background: verificationStage === 'completing' ? '#3b82f6' : '#cbd5e1', 
              color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' 
            }}>
              {documentFile ? '4' : '2'}
            </div>
            <span style={{ fontWeight: verificationStage === 'completing' ? '800' : 'normal', color: verificationStage === 'completing' ? '#3b82f6' : '#64748b' }}>
              Finalisation et enregistrement du dossier...
            </span>
          </div>
        </div>
      </div>
    );
  }

  const structureTypes = [
    { name: 'Artisan / Créateur', desc: 'Fabrication manuelle & locale' },
    { name: 'PME / SARL', desc: 'Entreprise formelle enregistrée' },
    { name: 'Grossiste', desc: 'Distribution en volume' },
    { name: 'Auto-entrepreneur', desc: 'Activité individuelle commerciale' }
  ];

  const sectors = [
    { value: 'Artisanat', label: 'Artisanat & Décoration' },
    { value: 'Mode', label: 'Mode, Vêtements & Chaussures' },
    { value: 'Alimentaire', label: 'Alimentaire & Épicerie' },
    { value: 'Cosmetique', label: 'Cosmétiques & Beauté naturelle' },
    { value: 'Electronique', label: 'Électronique & Technologie' },
    { value: 'Autre', label: 'Autre secteur' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Premium Hero Banner Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '16px',
        padding: '40px 30px',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 10px 30px -10 rgba(15, 23, 42, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '6px 12px', borderRadius: '20px', width: 'fit-content', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <Award width="14" height="14" /> Portail Onboarding Entreprise
        </div>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 850, letterSpacing: '-0.5px' }}>
          Enregistrez votre structure professionnelle
        </h1>
        <p style={{ margin: 0, fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.5, maxWidth: '700px' }}>
          Rejoignez le réseau Vendoscity Pro. Bénéficiez d'une visibilité nationale pour vos produits, sécurisez vos paiements via notre système de séquestre automatisé et gérez votre trésorerie d'entreprise en toute confiance.
        </p>

        {/* Abstract design shape */}
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(0,0,0,0) 70%)',
          top: '-100px',
          right: '-100px',
          pointerEvents: 'none'
        }}></div>
      </div>

      {/* Main layout container */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '35px 30px' }}>
        
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
          <Building2 width="22" height="22" style={{ color: 'var(--primary-blue)' }} />
          Formulaire de demande de partenariat commercial
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Section 1: Structure Type Selection */}
          <div>
            <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '12px' }}>
              1. Type de structure commerciale *
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px'
            }}>
              {structureTypes.map((type) => {
                const isSelected = structureType === type.name;
                return (
                  <div
                    key={type.name}
                    onClick={() => setStructureType(type.name)}
                    style={{
                      border: isSelected ? '2px solid var(--primary-blue)' : '1px solid #cbd5e1',
                      background: isSelected ? 'rgba(18, 18, 147, 0.02)' : '#fff',
                      padding: '16px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 4px 12px rgba(18,18,147,0.05)' : 'none',
                      position: 'relative'
                    }}
                  >
                    {isSelected && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--primary-blue)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check width="10" height="10" />
                      </div>
                    )}
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 750, color: isSelected ? 'var(--primary-blue)' : '#1e293b' }}>{type.name}</h4>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.3 }}>{type.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Contact & Identity Info */}
          <div>
            <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '12px' }}>
              2. Informations légales et contacts
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              
              {/* Nom de l'entreprise */}
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Nom commercial / Raison sociale *</label>
                <div style={{ position: 'relative' }}>
                  <Building2 width="16" height="16" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type="text" 
                    placeholder="Ex: Arthur Créations SARL"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 38px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      background: '#f8fafc'
                    }}
                  />
                </div>
              </div>

              {/* WhatsApp */}
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>WhatsApp professionnel *</label>
                <div style={{ position: 'relative' }}>
                  <Store width="16" height="16" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type="tel" 
                    placeholder="Ex: +23769XXXXXXX"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 38px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      background: '#f8fafc'
                    }}
                  />
                </div>
              </div>

              {/* Secteur d'activité */}
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Secteur d'activité principal *</label>
                <div style={{ position: 'relative' }}>
                  <Briefcase width="16" height="16" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 38px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      background: '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    {sectors.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>
          </div>

          {/* Section 3: Professional Files Upload Mockup */}
          <div>
            <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '12px' }}>
              3. Pièces justificatives (Recommandé pour accélérer la validation et obtenir le badge vérifié)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              
              {/* Logo Upload area */}
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Logo de la structure</label>
                <div 
                  onClick={() => document.getElementById('logo-file-input').click()}
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '10px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: '#f8fafc',
                    transition: 'all 0.2s',
                    minHeight: '110px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  className="upload-hover"
                >
                  <input 
                    type="file" 
                    id="logo-file-input" 
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                    style={{ display: 'none' }} 
                  />
                  {logoPreview ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={logoPreview} alt="Logo preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Logo importé</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud width="24" height="24" style={{ color: '#94a3b8', marginBottom: '6px' }} />
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Logo boutique</span>
                    </>
                  )}
                </div>
              </div>

              {/* Legal Doc Upload Area */}
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Registre du Commerce / CNI</label>
                <div 
                  onClick={() => document.getElementById('doc-file-input').click()}
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '10px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: '#f8fafc',
                    transition: 'all 0.2s',
                    minHeight: '110px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  className="upload-hover"
                >
                  <input 
                    type="file" 
                    id="doc-file-input" 
                    accept=".pdf,.png,.jpg,.jpeg" 
                    onChange={handleDocUpload} 
                    style={{ display: 'none' }} 
                  />
                  {docName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px' }}>
                      <FileText width="24" height="24" style={{ color: '#3b82f6', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {docName}
                      </span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud width="24" height="24" style={{ color: '#94a3b8', marginBottom: '6px' }} />
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>CNI ou Registre</span>
                    </>
                  )}
                </div>
              </div>

              {/* Photo du Vendeur / Responsable - Conditionally rendered */}
              {docName && (
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Photo du Responsable *</label>
                  <div 
                    onClick={() => document.getElementById('manager-photo-file-input').click()}
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '10px',
                      padding: '20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: '#f8fafc',
                      transition: 'all 0.2s',
                      minHeight: '110px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    className="upload-hover"
                  >
                    <input 
                      type="file" 
                      id="manager-photo-file-input" 
                      accept="image/*" 
                      onChange={handleManagerPhotoUpload} 
                      style={{ display: 'none' }} 
                      required
                    />
                    {managerPhotoPreview ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={managerPhotoPreview} alt="Manager preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Photo importée</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud width="24" height="24" style={{ color: '#94a3b8', marginBottom: '6px' }} />
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Photo du visage</span>
                      </>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Section 4: Bio and Details */}
          <div>
            <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '12px' }}>
              4. Profil d'activité
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>
                  Slogan ou courte biographie *
                </label>
                <input 
                  type="text"
                  placeholder="Ex: Fabricant de chaussures en cuir sur mesure à Yaoundé."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    background: '#f8fafc'
                  }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>
                  Description de votre catalogue de produits
                </label>
                <textarea 
                  placeholder="Quels types d'articles fabriquez ou vendez-vous ? Précisez l'origine des matériaux."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    background: '#f8fafc',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                />
              </div>

            </div>
          </div>

          {/* Guidelines Info */}
          <div style={{ display: 'flex', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <AlertCircle width="20" height="20" style={{ color: '#3b82f6', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569', lineHeight: 1.4 }}>
              <strong>Engagement de qualité Vendoscity :</strong> En soumettant ce formulaire, vous certifiez l'exactitude des informations professionnelles. Nos modérateurs analysent vos pièces sous 24h. L'enregistrement est gratuit, aucune commission de dossier n'est perçue.
            </p>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="checkout-btn"
            style={{ 
              marginTop: '10px', 
              cursor: 'pointer', 
              background: '#0f172a', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px',
              padding: '14px', 
              fontWeight: 800,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
            }}
          >
            {loading ? <RefreshCw className="animate-spin" width="18" height="18" /> : <ShieldCheck width="20" height="20" />}
            <span>Soumettre mon dossier d'entreprise</span>
          </button>
        </form>

        <style dangerouslySetInnerHTML={{ __html: `
          .upload-hover:hover {
            border-color: var(--primary-blue) !important;
            background: #f1f5f9 !important;
          }
          .upload-hover:active {
            background: #e2e8f0 !important;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          @keyframes radarPulse {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 0.4; }
            100% { transform: scale(1.25); opacity: 0; }
          }
          .radar-pulse {
            animation: radarPulse 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          }
        ` }} />

      </div>
    </div>
  );
}
