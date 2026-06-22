// client/src/app/ai-mode/page.js
'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getApiBaseUrl } from '../../core/api';
import { 
  Bot, 
  Send, 
  Sparkles, 
  User, 
  ArrowLeft, 
  FileText, 
  Search, 
  ShieldCheck 
} from 'lucide-react';

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
      text: "Bonjour ! Je suis Vendy AI, l'assistant intelligent de Vendoscity. Je suis là pour vous aider à trouver des produits, contacter des fournisseurs ou demander un devis. Que puis-je faire pour vous aujourd'hui ?",
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
      return "Absolument ! Pour demander un devis personnalisé, veuillez préciser :\n1. Le type de produit/service souhaité\n2. La quantité requise\n3. Votre budget approximatif\n4. Le lieu de livraison au Cameroun.\n\nUne fois ces informations fournies, je transmettrai directement votre demande aux meilleurs fabricants certifiés de notre réseau.";
    }
    if (inputLower.includes('recherch') || inputLower.includes('trouver') || inputLower.includes('acheter')) {
      return "Je peux chercher pour vous ! Nous avons des catégories variées : Électronique, Informatique, Mode, Maison, Véhicules, etc. Pouvez-vous me dire précisément quel article vous recherchez et dans quel quartier (Bastos, Mendong, Akwa...) ?";
    }
    if (inputLower.includes('vendeur') || inputLower.includes('fournisseur') || inputLower.includes('boutique')) {
      return "Vous pouvez voir tous nos vendeurs certifiés sur la page 'Vendeurs'. Ils possèdent des profils entreprises vérifiés avec contacts WhatsApp directs et évaluations clients. Souhaitez-vous que je vous recommande les plus populaires ?";
    }
    
    return "Je prends bien en compte votre message. Vendy AI est actuellement en cours de développement. Dans la prochaine version, je serai connecté en direct à notre API d'intelligence artificielle pour traiter instantanément vos demandes de devis et faire de la recherche sémantique intelligente !";
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
    
    // Future API Hook (prepared for connecting backend service):
    /*
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, userId: user?.id })
      });
      if (res.ok) {
        const data = await res.json();
        // use data.reply
      }
    } catch(e) {}
    */

    setTimeout(() => {
      const aiReply = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: getSimulatedAiResponse(text),
        time: new Date()
      };
      setMessages((prev) => [...prev, aiReply]);
      setTyping(false);
    }, 1200);
  };

  const QUICK_PROMPTS = [
    { text: "Demander un devis pour du matériel informatique", icon: <FileText width="16" height="16" /> },
    { text: "Trouver les meilleures offres d'habillement à Bastos", icon: <Search width="16" height="16" /> },
    { text: "Comment contacter un vendeur vérifié ?", icon: <ShieldCheck width="16" height="16" /> }
  ];

  return (
    <div style={{ background: '#f4f7f6', minHeight: '85vh', padding: '20px 10px' }}>
      <div style={{
        maxWidth: '850px',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        border: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        height: '75vh',
        overflow: 'hidden'
      }}>
        {/* Header Enterprise Style */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button 
              onClick={() => router.back()} 
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#ffffff',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft width="18" height="18" />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Vendy AI Assistant <Sparkles width="16" height="16" style={{ color: '#f59e0b' }} />
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
                Conseiller Virtuel & Recherche Sémantique
              </p>
            </div>
          </div>
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            color: '#f59e0b',
            borderRadius: '999px',
            padding: '4px 12px',
            fontSize: '0.72rem',
            fontWeight: '750'
          }}>
            Mode Entreprise
          </div>
        </div>

        {/* Chat Area */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {messages.map((msg) => (
            <div 
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: '10px'
              }}
            >
              {msg.sender === 'ai' && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0
                }}>
                  <Bot width="16" height="16" />
                </div>
              )}
              <div style={{
                maxWidth: '75%',
                background: msg.sender === 'user' ? '#ff6a00' : '#ffffff',
                color: msg.sender === 'user' ? '#ffffff' : '#1e293b',
                padding: '12px 16px',
                borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                fontSize: '0.92rem',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.text}
                <div style={{
                  fontSize: '0.68rem',
                  color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : '#64748b',
                  textAlign: 'right',
                  marginTop: '6px'
                }}>
                  {new Date(msg.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {msg.sender === 'user' && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#e2e8f0',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                  flexShrink: 0
                }}>
                  <User width="16" height="16" />
                </div>
              )}
            </div>
          ))}
          
          {typing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <Bot width="16" height="16" />
              </div>
              <div style={{
                background: '#ffffff',
                padding: '12px 20px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                gap: '4px',
                alignItems: 'center'
              }}>
                <span className="dot" style={{ width: '6px', height: '6px', background: '#3b82f6', borderRadius: '50%', animation: 'bounce 1.2s infinite' }}></span>
                <span className="dot" style={{ width: '6px', height: '6px', background: '#3b82f6', borderRadius: '50%', animation: 'bounce 1.2s infinite 0.2s' }}></span>
                <span className="dot" style={{ width: '6px', height: '6px', background: '#3b82f6', borderRadius: '50%', animation: 'bounce 1.2s infinite 0.4s' }}></span>
              </div>
              <style>{`
                @keyframes bounce {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-4px); }
                }
              `}</style>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length === 1 && !typing && (
          <div style={{ padding: '14px 20px', background: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Suggestions rapides
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(null, p.text)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  {p.icon}
                  <span>{p.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} style={{
          padding: '16px 20px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: '10px'
        }}>
          <input
            type="text"
            placeholder="Posez votre question à Vendy AI..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={typing}
            style={{
              flex: 1,
              border: '1px solid #cbd5e1',
              borderRadius: '24px',
              padding: '12px 18px',
              fontSize: '0.92rem',
              outline: 'none',
              transition: 'border-color 0.2s',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => e.target.style.borderColor = '#ff6a00'}
            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            style={{
              background: '#ff6a00',
              border: 'none',
              color: '#ffffff',
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (!input.trim() || typing) ? 'not-allowed' : 'pointer',
              opacity: (!input.trim() || typing) ? 0.6 : 1,
              transition: 'background-color 0.2s'
            }}
          >
            <Send width="18" height="18" />
          </button>
        </form>
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
