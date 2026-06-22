// client/src/app/ai-mode/page.js
'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getApiBaseUrl, formatCurrency } from '../../core/api';
import { 
  Bot, 
  Send, 
  User, 
  ArrowLeft, 
  FileText, 
  Search, 
  ShieldCheck,
  CheckCircle,
  Building,
  HelpCircle
} from 'lucide-react';
import Sparkles from '../../components/Sparkles';

function AiChatContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const showToast = useToast();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Bonjour ! Je suis l'assistant d'approvisionnement intelligent de Vendoscity.\n\nJe peux vous aider à :\n• Rechercher des produits spécifiques ou des fabricants locaux au Cameroun\n• Rédiger ou structurer une demande de devis professionnel pour les grossistes\n• Estimer les coûts de livraison et de logistique\n\nQue recherchez-vous aujourd'hui ?",
      time: new Date()
    }
  ]);
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Handle prefilled message query param
  useEffect(() => {
    const prefilled = searchParams.get('message');
    if (prefilled) {
      handleSend(null, prefilled);
      // Clean query params so it does not trigger again on reload
      router.replace('/ai-mode');
    }
  }, [searchParams]);

  // Handle simulated AI responses
  const getSimulatedAiResponse = (userInput) => {
    const inputLower = userInput.toLowerCase();
    
    if (inputLower.includes('devis')) {
      return "Parfait. Pour soumettre une demande de devis officielle aux fabricants de Vendoscity, veuillez préciser :\n\n1. **Désignation du produit** (ex: Ordinateurs portables, sacs en cuir...)\n2. **Quantité souhaitée** (ex: 15 unités)\n3. **Lieu de livraison** (ex: Yaoundé, Douala...)\n\nUne fois ces informations saisies, je générerai un devis type et le transmettrai aux vendeurs certifiés correspondants.";
    }
    if (inputLower.includes('recherch') || inputLower.includes('trouver') || inputLower.includes('acheter')) {
      return "Je recherche pour vous dans notre catalogue. Nous répertorions de nombreux articles :\n• **Électronique & Téléphonie** (Yaoundé / Douala)\n• **Mode & Créations sur mesure**\n• **Services de Proximité**\n\nIndiquez-moi le produit et le quartier ciblé pour affiner la recherche.";
    }
    if (inputLower.includes('vendeur') || inputLower.includes('fournisseur') || inputLower.includes('boutique')) {
      return "Vous pouvez consulter la liste de nos partenaires sur la page dédiée aux **Vendeurs**. Tous disposent de profils vérifiés avec un lien direct WhatsApp pour faciliter vos échanges professionnels et la négociation des tarifs.";
    }
    
    return "J'ai bien noté votre demande. Le service de devis automatique par IA est en cours d'intégration. Vos retours nous aident à améliorer cet outil d'approvisionnement B2B pour le marché camerounais.";
  };

  const handleSend = async (e, textOverride = '') => {
    if (e) e.preventDefault();
    const text = (textOverride || input).trim();
    if (!text) return;

    if (!textOverride) setInput('');

    // Add user message
    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      time: new Date()
    };
    setMessages((prev) => [...prev, userMsg]);

    // Simulate AI thinking and typing
    setTyping(true);

    setTimeout(() => {
      const aiReply = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: getSimulatedAiResponse(text),
        time: new Date()
      };
      setMessages((prev) => [...prev, aiReply]);
      setTyping(false);
    }, 1000);
  };

  const QUICK_PROMPTS = [
    { text: "Demander un devis pour du matériel informatique", icon: <FileText width="15" height="15" /> },
    { text: "Trouver des fabricants de vêtements sur mesure", icon: <Search width="15" height="15" /> },
    { text: "Comment fonctionne la garantie de livraison ?", icon: <ShieldCheck width="15" height="15" /> }
  ];

  return (
    <div className="ai-mode-container">
      {/* Dynamic responsive styles */}
      <style>{`
        .ai-mode-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 16px;
          font-family: var(--font-inter), system-ui, -apple-system, sans-serif;
        }
        .ai-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .ai-btn-back {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #334155;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .ai-btn-back:hover {
          background: #f8fafc;
        }
        .ai-title-section h1 {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ai-title-section p {
          margin: 2px 0 0 0;
          font-size: 0.85rem;
          color: #64748b;
        }
        .ai-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (min-width: 900px) {
          .ai-grid {
            grid-template-columns: 320px 1fr;
          }
        }
        .ai-sidebar {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
        }
        .ai-sidebar h3 {
          margin: 0 0 16px 0;
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ai-guide-item {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          font-size: 0.82rem;
          line-height: 1.4;
          color: #475569;
        }
        .ai-guide-item:last-child {
          margin-bottom: 0;
        }
        .ai-guide-icon {
          color: var(--brand-accent);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .ai-chat-pane {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          height: 62vh;
          min-height: 480px;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .ai-chat-pane {
            height: 52vh;
            min-height: 380px;
          }
        }
        .ai-chat-header {
          padding: 14px 20px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ai-chat-header-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ai-chat-header-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--brand-accent) 0%, var(--brand-accent-2) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        }
        .ai-chat-header-name {
          font-size: 0.9rem;
          font-weight: 800;
          color: #1e293b;
        }
        .ai-chat-header-status {
          font-size: 0.72rem;
          color: #10b981;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ai-chat-messages {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          background: #fafafb;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .ai-msg-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          max-width: 85%;
        }
        .ai-msg-row.ai {
          align-self: flex-start;
        }
        .ai-msg-row.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        .ai-msg-bubble {
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 0.88rem;
          line-height: 1.5;
          white-space: pre-wrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .ai-msg-row.ai .ai-msg-bubble {
          background: #ffffff;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-top-left-radius: 2px;
        }
        .ai-msg-row.user .ai-msg-bubble {
          background: var(--brand-accent);
          color: #ffffff;
          border-top-right-radius: 2px;
        }
        .ai-msg-time {
          font-size: 0.68rem;
          margin-top: 4px;
          text-align: right;
        }
        .ai-msg-row.ai .ai-msg-time {
          color: #94a3b8;
        }
        .ai-msg-row.user .ai-msg-time {
          color: rgba(255,255,255,0.78);
        }
        .ai-suggestions {
          padding: 14px 20px;
          border-top: 1px solid #f1f5f9;
          background: #ffffff;
        }
        .ai-suggestions-title {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 750;
          text-transform: uppercase;
          margin-bottom: 8px;
          letter-spacing: 0.3px;
        }
        .ai-suggestions-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ai-suggestion-btn {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 0.8rem;
          text-align: left;
          color: #334155;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          font-family: inherit;
          font-weight: 600;
        }
        .ai-suggestion-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .ai-input-form {
          padding: 12px 16px;
          border-top: 1px solid #e2e8f0;
          background: #ffffff;
          display: flex;
          gap: 10px;
        }
        .ai-input-field {
          flex: 1;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 0.88rem;
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .ai-input-field:focus {
          border-color: var(--brand-accent);
        }
        .ai-btn-send {
          background: var(--brand-accent);
          border: none;
          color: #ffffff;
          border-radius: 8px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.2s;
          font-family: inherit;
          font-weight: 700;
        }
        .ai-btn-send:hover {
          background: var(--brand-accent-2);
        }
        .ai-btn-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .ai-typing-loader {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 10px 14px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          border-top-left-radius: 2px;
          align-self: flex-start;
        }
        .ai-dot {
          width: 5px;
          height: 5px;
          background: var(--brand-accent);
          border-radius: 50%;
          animation: bounce 1.2s infinite ease-in-out;
        }
        .ai-dot:nth-child(2) { animation-delay: 0.2s; }
        .ai-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>

      {/* Title block */}
      <div className="ai-header">
        <button onClick={() => router.back()} className="ai-btn-back" title="Retour">
          <ArrowLeft width="18" height="18" />
        </button>
        <div className="ai-title-section">
          <h1>
            Assistant d&apos;Approvisionnement Vendoscity
            <Sparkles width="16" height="16" style={{ color: 'var(--brand-accent)' }} />
          </h1>
          <p>Recherche intelligente de produits, devis professionnels et mise en relation directe.</p>
        </div>
      </div>

      {/* Main layout */}
      <div className="ai-grid">
        {/* Sidebar Info */}
        <aside className="ai-sidebar">
          <h3>
            <Building width="16" height="16" style={{ color: 'var(--brand-accent)' }} />
            Guide Acheteur
          </h3>
          <div className="ai-guide-item">
            <CheckCircle width="16" height="16" className="ai-guide-icon" />
            <div>
              <strong>Sourcing direct 0% commission</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Trouvez des grossistes locaux sans intermédiaires ni frais cachés.</p>
            </div>
          </div>
          <div className="ai-guide-item">
            <CheckCircle width="16" height="16" className="ai-guide-icon" />
            <div>
              <strong>Demandes de devis assistées</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>L&apos;IA structure vos besoins pour qu&apos;ils soient immédiatement traitables.</p>
            </div>
          </div>
          <div className="ai-guide-item">
            <CheckCircle width="16" height="16" className="ai-guide-icon" />
            <div>
              <strong>Relation directe WhatsApp</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Finalisez les prix et organisez la livraison en direct avec le vendeur.</p>
            </div>
          </div>
        </aside>

        {/* Chat Pane */}
        <main className="ai-chat-pane">
          {/* Top chat status bar */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-user">
              <div className="ai-chat-header-avatar">
                <Bot width="16" height="16" />
              </div>
              <div>
                <span className="ai-chat-header-name">Vendy AI</span>
                <div className="ai-chat-header-status">
                  <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
                  En ligne
                </div>
              </div>
            </div>
            <HelpCircle width="18" height="18" style={{ color: '#64748b', cursor: 'pointer' }} />
          </div>

          {/* Messages lists */}
          <div className="ai-chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-msg-row ${msg.sender}`}>
                <div className="ai-msg-bubble">
                  {msg.text}
                  <div className="ai-msg-time">
                    {new Date(msg.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {typing && (
              <div className="ai-typing-loader">
                <span className="ai-dot"></span>
                <span className="ai-dot"></span>
                <span className="ai-dot"></span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick suggestions block */}
          {messages.length === 1 && !typing && (
            <div className="ai-suggestions">
              <div className="ai-suggestions-title">Suggestions de demandes</div>
              <div className="ai-suggestions-list">
                {QUICK_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(null, p.text)}
                    className="ai-suggestion-btn"
                  >
                    {p.icon}
                    <span>{p.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input text form */}
          <form onSubmit={handleSend} className="ai-input-form">
            <input
              type="text"
              placeholder="Saisissez votre demande (ex: devis matériel informatique...)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={typing}
              className="ai-input-field"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="ai-btn-send"
            >
              <Send width="15" height="15" style={{ marginRight: '6px' }} />
              <span>Envoyer</span>
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}

export default function AiChatPage() {
  return (
    <Suspense fallback={<div className="loading" style={{ padding: '60px 20px', textAlign: 'center' }}>Chargement de Vendy AI...</div>}>
      <AiChatContent />
    </Suspense>
  );
}
