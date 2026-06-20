// client/src/components/PwaInstallPrompt.js
'use client';

import React, { useState, useEffect } from 'react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIosPromptVisible, setIsIosPromptVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Enregistrement du Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Service Worker enregistré avec succès pour la PWA.', reg.scope))
        .catch((err) => console.error('Échec de l\'enregistrement du Service Worker PWA:', err));
    }

    // 2. Détection du mode standalone (déjà installé)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true;

    if (isStandalone) {
      return; // Déjà installé, on ne fait rien
    }

    // 3. Gestionnaire pour le prompt natif (Android / Chrome / Windows / macOS)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    // 4. Détection iOS pour afficher les instructions Safari
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIos && !isStandalone) {
      // Pour éviter de harceler l'utilisateur, on peut vérifier s'il a déjà fermé le bandeau
      const hasDismissed = localStorage.getItem('pwa_ios_prompt_dismissed');
      if (!hasDismissed) {
        setIsIosPromptVisible(true);
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Écouter si l'application vient d'être installée
    window.addEventListener('appinstalled', () => {
      console.log('L\'application PWA a été installée avec succès.');
      setIsVisible(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Choix d'installation de l'utilisateur : ${outcome}`);
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const dismissAndroidPrompt = () => {
    setIsVisible(false);
  };

  const dismissIosPrompt = () => {
    setIsIosPromptVisible(false);
    localStorage.setItem('pwa_ios_prompt_dismissed', 'true');
  };

  if (!isVisible && !isIosPromptVisible) return null;

  return (
    <>
      {/* 1. Bandeau d'installation standard (Android, Chrome, Windows) */}
      {isVisible && (
        <div className="pwa-install-banner">
          <div className="pwa-banner-content">
            <div className="pwa-logo-container">
              <img 
                src="/assets/images/logo/vendoscity-logo.svg?v=20260327-logo3" 
                alt="Vendoscity Logo" 
                className="pwa-banner-logo"
              />
            </div>
            <div className="pwa-banner-text">
              <h3>Installez Vendoscity</h3>
              <p>Accédez instantanément à la marketplace directement depuis votre écran d'accueil.</p>
            </div>
          </div>
          <div className="pwa-banner-actions">
            <button className="pwa-btn-dismiss" onClick={dismissAndroidPrompt}>Plus tard</button>
            <button className="pwa-btn-install" onClick={handleInstallClick}>Installer</button>
          </div>
        </div>
      )}

      {/* 2. Bandeau d'installation spécifique iOS (Safari) */}
      {isIosPromptVisible && (
        <div className="pwa-install-banner ios-banner">
          <div className="pwa-banner-content">
            <div className="pwa-logo-container">
              <img 
                src="/assets/images/logo/vendoscity-logo.svg?v=20260327-logo3" 
                alt="Vendoscity Logo" 
                className="pwa-banner-logo"
              />
            </div>
            <div className="pwa-banner-text">
              <h3>Ajouter à l'écran d'accueil</h3>
              <p style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                Appuyez sur le bouton de partage 
                <span className="ios-share-icon" style={{ display: 'inline-block', width: '20px', height: '20px', verticalAlign: 'middle' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', color: '#007aff' }}>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </span>
                puis sélectionnez <strong>Sur l'écran d'accueil</strong>.
              </p>
            </div>
          </div>
          <div className="pwa-banner-actions">
            <button className="pwa-btn-dismiss" onClick={dismissIosPrompt}>Fermer</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .pwa-install-banner {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 16px;
          padding: 16px 20px;
          width: 90%;
          max-width: 480px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          animation: slideUpPwa 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .pwa-banner-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .pwa-logo-container {
          background: linear-gradient(135deg, #ff9e00, #ff6a00);
          border-radius: 10px;
          padding: 6px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(255, 106, 0, 0.2);
        }

        .pwa-banner-logo {
          width: 28px;
          height: 28px;
          filter: brightness(0) invert(1);
        }

        .pwa-banner-text h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 2px 0;
        }

        .pwa-banner-text p {
          font-size: 0.8rem;
          color: #666;
          margin: 0;
          line-height: 1.3;
        }

        .pwa-banner-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pwa-btn-dismiss {
          background: transparent;
          border: none;
          color: #666;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .pwa-btn-dismiss:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .pwa-btn-install {
          background: #ff6a00;
          border: none;
          color: #fff;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 8px 16px;
          cursor: pointer;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(255, 106, 0, 0.25);
          transition: background 0.2s, transform 0.1s;
        }

        .pwa-btn-install:hover {
          background: #e05d00;
        }

        .pwa-btn-install:active {
          transform: scale(0.97);
        }

        @keyframes slideUpPwa {
          from {
            transform: translate(-50%, 100px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }

        @media (max-width: 480px) {
          .pwa-install-banner {
            flex-direction: column;
            align-items: stretch;
            bottom: 12px;
            padding: 12px;
          }
          
          .pwa-banner-actions {
            justify-content: flex-end;
            margin-top: 8px;
          }
        }
      `}</style>
    </>
  );
}
