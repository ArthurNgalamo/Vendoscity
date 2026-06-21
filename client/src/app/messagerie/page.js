// client/src/app/messagerie/page.js
'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getApiBaseUrl, fetchWithTimeout, normalizeSupabaseImageUrl, formatCurrency, getUserAvatarUrl } from '../../core/api';
import { 
  MessageSquare, 
  Send, 
  User, 
  Clock, 
  ChevronLeft, 
  Store,
  RefreshCw,
  ShoppingBag,
  Check,
  CheckCheck,
  MoreVertical,
  Trash2,
  Edit3,
  X
} from 'lucide-react';
import './messagerie.css';

// Helper to format last seen date in WhatsApp style
function formatLastSeen(lastLoginAt) {
  if (!lastLoginAt) return '';
  const lastLogin = new Date(lastLoginAt);
  const now = new Date();
  
  // Check if it was today
  const isToday = lastLogin.toDateString() === now.toDateString();
  
  // Check if it was yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = lastLogin.toDateString() === yesterday.toDateString();
  
  const timeStr = lastLogin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  
  if (isToday) {
    return `vu aujourd'hui à ${timeStr}`;
  } else if (isYesterday) {
    return `vu hier à ${timeStr}`;
  } else {
    const dateStr = lastLogin.toLocaleDateString('fr-FR');
    return `vu le ${dateStr} à ${timeStr}`;
  }
}

// Helper to parse product preview metadata from message content
function parseProductPreview(content) {
  if (!content) return { preview: null, cleanContent: '' };
  const markerStart = '__PRODUCT_PREVIEW__:';
  const markerEnd = '__PRODUCT_PREVIEW__';
  
  const startIndex = content.indexOf(markerStart);
  if (startIndex !== -1) {
    const endIndex = content.indexOf(markerEnd, startIndex + markerStart.length);
    if (endIndex !== -1) {
      try {
        const jsonStr = content.substring(startIndex + markerStart.length, endIndex);
        const product = JSON.parse(jsonStr);
        const before = content.substring(0, startIndex);
        const after = content.substring(endIndex + markerEnd.length);
        const cleanContent = (before + after).trim();
        return { preview: product, cleanContent };
      } catch (e) {
        console.error('Error parsing product preview:', e);
      }
    }
  }
  return { preview: null, cleanContent: content };
}

// Helper to make URLs within text clickable
function renderMessageText(text) {
  if (!text) return '';
  
  // Regex to match URLs starting with http://, https:// or www.
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  
  // Split the text into parts (URLs and non-URLs)
  const parts = text.split(urlRegex);
  if (parts.length === 1) {
    return text;
  }
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.toLowerCase().startsWith('http') ? part : `https://${part}`;
      return (
        <a 
          key={index} 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="chat-message-link"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

function ChatContent() {
  const { user, profile, loading, authFetch } = useAuth();
  const currentUserId = user?.id || user?.sub || user?.uid || user?.user_id;
  const showToast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Query params (when clicking from a product card/page)
  const targetSellerId = searchParams.get('seller');
  const targetProductId = searchParams.get('product');
  const targetProductTitle = searchParams.get('title') || '';
  const targetProductPrice = searchParams.get('price') || '';
  const targetProductImage = searchParams.get('image') || '';

  // States
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState(null);
  const [partnerProfiles, setPartnerProfiles] = useState({}); // { id: { shop_name, first_name } }
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [sessionFirstUnreadId, setSessionFirstUnreadId] = useState(null);
  const prevPartnerIdRef = useRef(null);

  // States and refs for dynamic discussion header scrolling
  const lastScrollTopRef = useRef(0);
  const isAutoScrollingRef = useRef(false);
  const headerContainerRef = useRef(null);
  const currentTranslateYRef = useRef(0);

  const messagesEndRef = useRef(null);

  // URL params product context is synchronized inside the main chat setup effect below

  // Redirect to space/login if not connected
  useEffect(() => {
    if (!loading && !user) {
      showToast('Veuillez vous connecter pour accéder à vos messages.');
      router.push('/mon-espace');
    }
  }, [user, loading, router, showToast]);

  // Load all messages from database
  const loadMessages = async (silent = false) => {
    if (!user) return;
    if (!silent) setRefreshing(true);

    try {
      const res = await authFetch('/api/messages');
      if (res.ok) {
        const data = await res.json();
        const msgList = data || [];
        setMessages(msgList);
      }
      
      // Also refresh active partner profile to update online presence
      if (activePartnerId) {
        refreshActivePartnerProfile(activePartnerId);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  // Derive conversations list and unread counts dynamically from messages array
  useEffect(() => {
    if (!user || !currentUserId) return;

    // Group messages into conversations
    const conversationsMap = {};
    messages.forEach((msg) => {
      const partnerId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
      if (!conversationsMap[partnerId]) {
        conversationsMap[partnerId] = {
          partnerId,
          lastMessage: msg,
          messagesCount: 0,
          unreadCount: 0
        };
      }
      conversationsMap[partnerId].messagesCount += 1;
      if (msg.receiver_id === currentUserId && !msg.read_status) {
        conversationsMap[partnerId].unreadCount += 1;
      }
    });

    // Convert map to sorted array (most recent message first)
    const sortedConversations = Object.values(conversationsMap).sort(
      (a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
    );

    // Keep placeholders that are in the current state but don't have real messages yet
    setConversations(prev => {
      const placeholders = prev.filter(c => c.isPlaceholder);
      let merged = [...sortedConversations];
      placeholders.forEach(placeholder => {
        const exists = merged.some(c => c.partnerId === placeholder.partnerId);
        if (!exists) {
          merged = [placeholder, ...merged];
        }
      });
      return merged;
    });
  }, [messages, currentUserId, user]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadMessages();
    }
  }, [user]);

  // Adaptive polling for real-time messaging updates
  useEffect(() => {
    if (!user) return;
    
    let timerId = null;
    let lastActivityTime = Date.now();

    const getPollingInterval = () => {
      // 1. If tab is completely hidden, poll very slowly (every 30 seconds) to save resources
      if (document.visibilityState === 'hidden') {
        return 30000;
      }
      
      // 2. If tab is visible but window does not have focus (user in another app)
      const isFocused = document.hasFocus();
      if (!isFocused) {
        return 8000; // 8 seconds
      }

      // 3. High activity: If user recently interacted (last 1 minute)
      const timeSinceLastActivity = Date.now() - lastActivityTime;
      if (timeSinceLastActivity < 60000) {
        return 2500; // 2.5 seconds for ultra-responsive live chat!
      }

      return 4000; // 4 seconds default focused interval
    };

    const poll = async () => {
      try {
        await loadMessages(true);
      } catch (err) {
        console.error('Polling error:', err);
      }
      
      // Schedule next poll dynamically based on user state
      const nextInterval = getPollingInterval();
      timerId = setTimeout(poll, nextInterval);
    };

    // Track user activity to trigger high-activity polling
    const handleActivity = () => {
      lastActivityTime = Date.now();
    };

    // Listen to focus, visibility, and activity events
    window.addEventListener('focus', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    document.addEventListener('visibilitychange', handleActivity);

    // Initial delay before starting the adaptive poll loop
    timerId = setTimeout(poll, 2500);

    return () => {
      clearTimeout(timerId);
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      document.removeEventListener('visibilitychange', handleActivity);
    };
  }, [user, activePartnerId]);

  // Handle URL params for initiating a new chat
  useEffect(() => {
    if (!user || !targetSellerId) return;

    // Check if conversation already exists in our list
    const exists = conversations.some(c => c.partnerId === targetSellerId);
    
    // Set active partner to the target seller
    setActivePartnerId(targetSellerId);

    // Pre-fill input text and initialize pending product context atomically
    if (targetProductTitle) {
      if (targetProductId) {
        setPendingProduct({
          id: targetProductId,
          title: targetProductTitle,
          price: targetProductPrice,
          image: targetProductImage,
          sellerId: targetSellerId
        });
      }
      setInputText(`Bonjour, je suis intéressé par votre article : "${targetProductTitle}". Est-il toujours disponible ?`);
    } else if (!exists) {
      setInputText('Bonjour !');
    }

    // If it's a new conversation and doesn't exist yet, insert a placeholder in conversations state
    if (!exists) {
      const initMsg = targetProductTitle 
        ? `Bonjour, je suis intéressé par votre article : "${targetProductTitle}". Est-il toujours disponible ?`
        : 'Bonjour !';

      setConversations(prev => {
        // Double check to prevent duplicates
        if (prev.some(c => c.partnerId === targetSellerId)) return prev;
        return [
          {
            partnerId: targetSellerId,
            lastMessage: {
              content: initMsg,
              created_at: new Date().toISOString(),
              sender_id: currentUserId
            },
            messagesCount: 0,
            isPlaceholder: true
          },
          ...prev
        ];
      });
    }

    // Load target partner profile
    fetchPartnerProfile(targetSellerId);

    // Clean browser URL immediately so it does not re-trigger this effect
    router.replace('/messagerie');
  }, [
    targetSellerId, 
    targetProductTitle, 
    targetProductId, 
    targetProductPrice, 
    targetProductImage, 
    user, 
    conversations.length
  ]);

  // Fetch partner profile information (shop name, first name, etc.)
  const fetchPartnerProfile = async (partnerId) => {
    if (partnerProfiles[partnerId]) return; // Already cached

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/sellers/${partnerId}`);
      if (res.ok) {
        const data = await res.json();
        setPartnerProfiles(prev => ({
          ...prev,
          [partnerId]: data
        }));
      } else {
        // Fallback placeholder profile
        setPartnerProfiles(prev => ({
          ...prev,
          [partnerId]: { shop_name: 'Vendeur Vendoscity', first_name: 'Vendeur' }
        }));
      }
    } catch (_) {
      setPartnerProfiles(prev => ({
        ...prev,
        [partnerId]: { shop_name: 'Vendeur', first_name: 'Vendeur' }
      }));
    }
  };

  // Fetch active partner profile information (bypassing cache to keep last_login_at fresh)
  const refreshActivePartnerProfile = async (partnerId) => {
    if (!partnerId) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/sellers/${partnerId}`);
      if (res.ok) {
        const data = await res.json();
        setPartnerProfiles(prev => ({
          ...prev,
          [partnerId]: data
        }));
      }
    } catch (_) {}
  };

  // Fetch profiles for all active conversation partners
  useEffect(() => {
    conversations.forEach((conv) => {
      fetchPartnerProfile(conv.partnerId);
    });
  }, [conversations]);

  // Refs to track previous partner and last message ID to avoid forced scroll during background polling
  const prevActivePartnerIdRef = useRef(null);
  const prevLastMessageIdRef = useRef(null);

  // Auto scroll to bottom of chat only when active partner changes or a new message is received
  useEffect(() => {
    const activeMessagesList = messages.filter(
      (msg) =>
        (msg.sender_id === currentUserId && msg.receiver_id === activePartnerId) ||
        (msg.sender_id === activePartnerId && msg.receiver_id === currentUserId)
    );
    // Le tableau `messages` brut est trié par ordre décroissant par l'API (le plus récent en premier)
    const lastMessage = activeMessagesList[0];
    const lastMessageId = lastMessage?.id || lastMessage?.created_at || null;

    const hasPartnerChanged = activePartnerId !== prevActivePartnerIdRef.current;
    const hasNewMessage = lastMessageId !== prevLastMessageIdRef.current;

    if (hasPartnerChanged || hasNewMessage) {
      if (messagesEndRef.current) {
        isAutoScrollingRef.current = true;
        if (headerContainerRef.current) {
          headerContainerRef.current.classList.remove('no-transition');
          headerContainerRef.current.style.transform = 'translateY(0px)';
          currentTranslateYRef.current = 0;
        }
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          isAutoScrollingRef.current = false;
        }, 800);
      }
      prevActivePartnerIdRef.current = activePartnerId;
      prevLastMessageIdRef.current = lastMessageId;
    }
  }, [messages, activePartnerId, currentUserId]);

  // Mark messages as read when activePartnerId changes or new messages arrive
  const markMessagesAsRead = async (partnerId) => {
    if (!user || !partnerId) return;
    try {
      await authFetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: partnerId })
      });
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  useEffect(() => {
    if (!user || !activePartnerId) return;

    // Check if there are any unread messages from the active partner
    const hasUnread = messages.some(
      (m) => m.sender_id === activePartnerId && m.receiver_id === currentUserId && !m.read_status
    );

    if (hasUnread) {
      markMessagesAsRead(activePartnerId).then(() => {
        // Local state update for instant feedback
        setMessages(prev => 
          prev.map(m => 
            (m.sender_id === activePartnerId && m.receiver_id === currentUserId) 
              ? { ...m, read_status: true } 
              : m
          )
        );
      });
    }
  }, [activePartnerId, messages, user, currentUserId]);

  // Set the first unread message ID of the session when opening a conversation
  useEffect(() => {
    if (activePartnerId !== prevPartnerIdRef.current) {
      // Partner changed, reset session unread marker
      setSessionFirstUnreadId(null);
      if (headerContainerRef.current) {
        headerContainerRef.current.classList.remove('no-transition');
        headerContainerRef.current.style.transform = 'translateY(0px)';
        currentTranslateYRef.current = 0;
      }
      lastScrollTopRef.current = 0;
      prevPartnerIdRef.current = activePartnerId;
      return;
    }

    if (!activePartnerId || messages.length === 0) return;

    if (sessionFirstUnreadId === null) {
      const activeMsgs = messages.filter(
        (msg) =>
          (msg.sender_id === currentUserId && msg.receiver_id === activePartnerId) ||
          (msg.sender_id === activePartnerId && msg.receiver_id === currentUserId)
      );
      const sortedActive = [...activeMsgs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const firstUnread = sortedActive.find(
        (msg) => msg.sender_id === activePartnerId && !msg.read_status
      );
      if (firstUnread) {
        setSessionFirstUnreadId(firstUnread.id);
      } else {
        // Mark as calculated (using a special token like 'none') to prevent recalculations
        setSessionFirstUnreadId('none');
      }
    }
  }, [activePartnerId, messages, currentUserId, sessionFirstUnreadId]);

  const handleMessagesScroll = (e) => {
    if (isAutoScrollingRef.current) return;

    const scrollTop = e.currentTarget.scrollTop;
    const headerEl = headerContainerRef.current;
    if (!headerEl) return;

    const headerHeight = pendingProduct && activePartnerId === pendingProduct.sellerId ? 137 : 72;

    // Si l'utilisateur est très proche du haut, on affiche l'en-tête de manière fluide
    if (scrollTop < 50) {
      headerEl.classList.remove('no-transition');
      headerEl.style.transform = 'translateY(0px)';
      currentTranslateYRef.current = 0;
      lastScrollTopRef.current = scrollTop;
      return;
    }

    // Désactive les transitions CSS pendant le défilement manuel pour un suivi progressif instantané
    headerEl.classList.add('no-transition');

    const diff = scrollTop - lastScrollTopRef.current;
    
    // Calcule la nouvelle translation progressive
    let nextTranslateY = currentTranslateYRef.current - diff;
    
    // Contraint la translation entre -headerHeight (masqué) et 0 (visible)
    nextTranslateY = Math.max(-headerHeight, Math.min(0, nextTranslateY));

    // Applique directement la transformation sans re-render React (ultra fluide)
    headerEl.style.transform = `translateY(${nextTranslateY}px)`;
    currentTranslateYRef.current = nextTranslateY;
    lastScrollTopRef.current = scrollTop;
  };

  const startEditMessage = (msg, cleanText) => {
    setEditingMessage(msg);
    setInputText(cleanText);
    setActiveMenuId(null);
  };

  const handleDeleteMessage = async (msgId, deleteType) => {
    setActiveMenuId(null);
    try {
      const res = await authFetch(`/api/messages/${msgId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delete_type: deleteType })
      });
      if (res.ok) {
        showToast(deleteType === 'everyone' ? 'Message supprimé pour tout le monde.' : 'Message supprimé.');
        loadMessages(true);
      } else {
        showToast('Impossible de supprimer le message.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la suppression.');
    }
  };

  const handleDeleteConversation = async (partnerId) => {
    if (!window.confirm("Voulez-vous supprimer cette discussion et tout son contenu ? Cette action est irréversible pour votre historique.")) {
      return;
    }

    try {
      const res = await authFetch(`/api/messages/conversation/${partnerId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Discussion supprimée.');
        setActivePartnerId(null);
        loadMessages(true);
      } else {
        showToast('Impossible de supprimer la discussion.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la suppression de la discussion.');
    }
  };

  // Send message submit handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activePartnerId || sending) return;

    setSending(true);
    const textToSend = inputText.trim();
    
    if (editingMessage) {
      try {
        const res = await authFetch(`/api/messages/${editingMessage.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: textToSend })
        });
        if (res.ok) {
          showToast('Message modifié.');
          setEditingMessage(null);
          setInputText('');
          loadMessages(true);
        } else {
          showToast('Impossible de modifier le message.');
        }
      } catch (err) {
        console.error(err);
        showToast('Erreur lors de la modification.');
      } finally {
        setSending(false);
      }
      return;
    }

    // Check if we have a pending product for the active partner
    let payloadContent = textToSend;
    const hasPendingProduct = pendingProduct && pendingProduct.sellerId === activePartnerId;

    // Check if this is the user's first message in this conversation and the seller initiated with a product preview
    let detectedPreview = null;
    const activeMessages = messages.filter(
      (msg) =>
        (msg.sender_id === currentUserId && msg.receiver_id === activePartnerId) ||
        (msg.sender_id === activePartnerId && msg.receiver_id === currentUserId)
    );
    const hasMeMessages = activeMessages.some(m => m.sender_id === currentUserId);
    if (!hasMeMessages && !hasPendingProduct) {
      const previewMsg = activeMessages.find(m => m.content && m.content.includes('__PRODUCT_PREVIEW__:'));
      if (previewMsg) {
        const { preview } = parseProductPreview(previewMsg.content);
        if (preview) {
          detectedPreview = preview;
        }
      }
    }

    if (hasPendingProduct) {
      const previewData = {
        id: pendingProduct.id,
        title: pendingProduct.title,
        price: pendingProduct.price,
        image: pendingProduct.image
      };
      payloadContent = `__PRODUCT_PREVIEW__:${JSON.stringify(previewData)}__PRODUCT_PREVIEW__\n${textToSend}`;
    } else if (detectedPreview) {
      payloadContent = `__PRODUCT_PREVIEW__:${JSON.stringify(detectedPreview)}__PRODUCT_PREVIEW__\n${textToSend}`;
    }

    setInputText('');

    try {
      const res = await authFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: activePartnerId,
          content: payloadContent
        })
      });

      if (res.ok) {
        const newMsg = await res.json();
        // Insert message locally for instant UI update
        setMessages(prev => [...prev, newMsg]);

        // Clear product context on success
        setPendingProduct(null);
        if (searchParams.get('product')) {
          router.replace('/messagerie');
        }

        // Reload all messages to sync
        loadMessages(true);
      } else {
        let errorMsg = 'Impossible d’envoyer le message.';
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errorMsg += ` : ${errData.error}`;
          }
          console.error('Erreur retournée par le serveur lors de l\'envoi du message:', errData);
        } catch (jsonErr) {
          try {
            const txt = await res.text();
            errorMsg += ` : ${txt.substring(0, 100)}`;
            console.error('Erreur texte retournée par le serveur:', txt);
          } catch (_) {
            console.error('Erreur de lecture de la réponse serveur:', jsonErr);
          }
        }
        showToast(errorMsg);
        setInputText(textToSend); // Restore text
      }
    } catch (err) {
      console.error('Exception capturée dans handleSendMessage:', err);
      showToast(`Erreur lors de l’envoi: ${err.message || err}`);
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  // Filter and sort messages for active partner conversation (oldest first)
  const activeMessages = messages
    .filter(
      (msg) =>
        (msg.sender_id === currentUserId && msg.receiver_id === activePartnerId) ||
        (msg.sender_id === activePartnerId && msg.receiver_id === currentUserId)
    )
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const activePartner = partnerProfiles[activePartnerId] || { shop_name: 'Chargement...', first_name: 'Vendeur' };
  const isPartnerOnline = activePartner?.last_login_at && (new Date() - new Date(activePartner.last_login_at) < 30000);

  if (loading || !user) return null;

  return (
    <div className="chat-container">
      {/* Sidebar List */}
      <div className={`chat-sidebar-list ${activePartnerId ? 'has-active' : ''}`}>
        <div className="chat-sidebar-header">
          <button 
            type="button"
            onClick={() => router.push('/boutique')}
            className="chat-sidebar-back-btn" 
            title="Retour à la boutique" 
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#4b5563', marginRight: '10px', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft width="24" height="24" />
          </button>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <MessageSquare width="20" height="20" style={{ color: 'var(--primary-blue)' }} /> Messagerie
          </h2>
          <button 
            onClick={() => loadMessages(false)} 
            disabled={refreshing}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#6b7280' }}
            title="Rafraîchir"
          >
            <RefreshCw width="16" height="16" className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="conversations-scroll-area">
          {conversations.length === 0 ? (
            <div className="empty-conversations">
              <MessageSquare width="32" height="32" style={{ color: '#d1d5db', marginBottom: '10px' }} />
              <p>Aucune conversation en cours.</p>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Consultez un article pour chater avec le vendeur.</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const partner = partnerProfiles[conv.partnerId] || { shop_name: 'Chargement...', first_name: 'Vendeur' };
              const isActive = conv.partnerId === activePartnerId;
              const parsed = parseProductPreview(conv.lastMessage?.content || '');
              const lastMsgText = parsed.cleanContent;
              const lastMsgTime = conv.lastMessage?.created_at 
                ? new Date(conv.lastMessage.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={conv.partnerId}
                  className={`conversation-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActivePartnerId(conv.partnerId);
                    // Clear query params to prevent resetting the state
                    if (searchParams.get('seller')) {
                      router.replace('/messagerie');
                    }
                  }}
                >
                  <div className="conversation-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                    <img 
                      src={getUserAvatarUrl(partner.avatar_url, partner.shop_name || partner.first_name || 'V')} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                  <div className="conversation-details">
                    <div className="conversation-row">
                      <strong className="conversation-name">{partner.shop_name || partner.first_name}</strong>
                      <span className="conversation-time">{lastMsgTime}</span>
                    </div>
                    <div className="conversation-preview-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <p className="conversation-preview" style={{ flex: 1, margin: 0 }}>
                        {conv.isPlaceholder ? (
                          <span style={{ color: 'var(--primary-blue)', fontStyle: 'italic' }}>Nouvelle discussion</span>
                        ) : (
                          <>
                            {parsed.preview && <span style={{ color: 'var(--primary-blue)', fontWeight: '600' }}>[Article] </span>}
                            {lastMsgText}
                          </>
                        )}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="conversation-unread-badge">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main chat window */}
      <div className={`chat-window ${activePartnerId ? 'active' : ''}`}>
        {activePartnerId ? (
          <>
            {/* Conteneur de groupe pour l'en-tête et la bannière (évite le jank de layout en s'animant sur le GPU) */}
            <div ref={headerContainerRef} className="chat-header-group-container">
              {/* Chat header */}
              <div className="chat-window-header">
                <button 
                  className="chat-back-btn" 
                  onClick={() => setActivePartnerId(null)}
                  aria-label="Retour"
                >
                  <ChevronLeft width="24" height="24" />
                </button>
                <div className="chat-partner-info" style={{ flex: 1 }}>
                  <div className="chat-partner-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                    <img 
                      src={getUserAvatarUrl(activePartner.avatar_url, activePartner.shop_name || activePartner.first_name || 'V')} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>
                      {activePartner.shop_name || activePartner.first_name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: isPartnerOnline ? '#10b981' : '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isPartnerOnline && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                      )}
                      {isPartnerOnline ? 'En ligne' : formatLastSeen(activePartner.last_login_at)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteConversation(activePartnerId)}
                  className="delete-conversation-btn"
                  title="Supprimer cette discussion"
                >
                  <Trash2 width="18" height="18" />
                </button>
              </div>

              {/* Pinned product banner (if there is a pending product context for this seller) */}
              {pendingProduct && activePartnerId === pendingProduct.sellerId && (
                <div className="chat-pinned-product-banner">
                  {pendingProduct.image && (
                    <img src={normalizeSupabaseImageUrl(pendingProduct.image)} alt="" className="chat-pinned-product-image" />
                  )}
                  <div className="chat-pinned-product-info">
                    <span className="chat-pinned-product-label">Article d&apos;intérêt</span>
                    <h4 className="chat-pinned-product-title">{pendingProduct.title}</h4>
                    {pendingProduct.price && (
                      <p className="chat-pinned-product-price">{formatCurrency(pendingProduct.price)}</p>
                    )}
                  </div>
                  <div className="chat-pinned-product-actions">
                    <a href={`/product/${pendingProduct.id}`} target="_blank" rel="noopener noreferrer" className="message-product-link">
                      Voir l&apos;article
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Messages scroll area */}
            <div 
              className="chat-messages-area" 
              onScroll={handleMessagesScroll}
              style={{
                paddingTop: pendingProduct && activePartnerId === pendingProduct.sellerId ? '161px' : '96px'
              }}
            >
              {activeMessages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', padding: '20px', textAlign: 'center' }}>
                  <MessageSquare width="36" height="36" style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <p style={{ fontWeight: '700', margin: '0 0 4px 0' }}>Aucun message</p>
                  <p style={{ fontSize: '0.8rem', margin: 0 }}>Envoyez un message pour commencer la discussion.</p>
                </div>
              ) : (
                activeMessages.map((msg, index) => {
                  const isMe = msg.sender_id === currentUserId;
                  const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  const { preview, cleanContent } = parseProductPreview(msg.content);
                  const isMenuOpen = activeMenuId === msg.id;

                  return (
                    <React.Fragment key={msg.id || msg.created_at}>
                      {msg.id === sessionFirstUnreadId && (
                        <div className="chat-unread-separator">
                          <div className="chat-unread-separator-line"></div>
                          <span className="chat-unread-separator-text">Nouveaux messages</span>
                          <div className="chat-unread-separator-line"></div>
                        </div>
                      )}
                      <div 
                        className={`message-bubble-row ${isMe ? 'me' : 'them'}`}
                      >
                      {!isMe && (
                        <div 
                          className="chat-message-avatar" 
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            backgroundColor: '#e2e8f0',
                            flexShrink: 0
                          }}
                        >
                          <img 
                            src={getUserAvatarUrl(activePartner.avatar_url, activePartner.shop_name || activePartner.first_name || 'V')} 
                            alt="" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        </div>
                      )}
                      {/* Options Menu button on the left of the bubble for me messages */}
                      {isMe && (
                        <div className="message-options-container">
                          <button 
                            type="button" 
                            onClick={() => setActiveMenuId(isMenuOpen ? null : msg.id)}
                            className="message-options-btn"
                            aria-label="Options du message"
                          >
                            <MoreVertical width="16" height="16" />
                          </button>
                          {isMenuOpen && (
                            <div className="message-options-menu">
                              {!msg.is_deleted_everyone && (
                                <button 
                                  type="button"
                                  onClick={() => startEditMessage(msg, cleanContent)} 
                                  className="menu-action-item"
                                >
                                  <Edit3 width="14" height="14" /> Modifier
                                </button>
                              )}
                              {!msg.is_deleted_everyone && (
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteMessage(msg.id, 'everyone')} 
                                  className="menu-action-item danger"
                                >
                                  <Trash2 width="14" height="14" /> Supprimer pour tous
                                </button>
                              )}
                              <button 
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id, 'me')} 
                                className="menu-action-item"
                              >
                                <Trash2 width="14" height="14" /> Supprimer pour moi
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="message-bubble-body">
                        {preview && (
                          <a 
                            href={`/product/${preview.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="message-product-card"
                          >
                            {preview.image && (
                              <img 
                                src={normalizeSupabaseImageUrl(preview.image)} 
                                alt={preview.title} 
                                className="message-product-image" 
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            )}
                            <div className="message-product-details">
                              <span className="message-product-label">🛍️ Article</span>
                              <h4 className="message-product-title">{preview.title}</h4>
                              {preview.price && (
                                <p className="message-product-price">{formatCurrency(preview.price)}</p>
                              )}
                              <span className="message-product-link">Voir l&apos;article →</span>
                            </div>
                          </a>
                        )}
                        <p className="message-text">{renderMessageText(cleanContent)}</p>
                        <span className="message-time-meta">
                          {msg.is_edited && <span className="message-edited-label">modifié • </span>}
                          <Clock width="10" height="10" /> {time}
                          {isMe && (
                            <span style={{ marginLeft: '4px', display: 'inline-flex', alignItems: 'center' }}>
                              {msg.read_status ? (
                                <CheckCheck width="14" height="14" style={{ color: '#22d3ee' }} />
                              ) : isPartnerOnline ? (
                                <CheckCheck width="14" height="14" style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                              ) : (
                                <Check width="14" height="14" style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                              )}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Options Menu button on the right of the bubble for them messages */}
                      {!isMe && (
                        <div className="message-options-container">
                          <button 
                            type="button" 
                            onClick={() => setActiveMenuId(isMenuOpen ? null : msg.id)}
                            className="message-options-btn"
                            aria-label="Options du message"
                          >
                            <MoreVertical width="16" height="16" />
                          </button>
                          {isMenuOpen && (
                            <div className="message-options-menu">
                              <button 
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id, 'me')} 
                                className="menu-action-item"
                              >
                                <Trash2 width="14" height="14" /> Supprimer pour moi
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {isMe && (
                        <div 
                          className="chat-message-avatar" 
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            backgroundColor: '#eff6ff',
                            flexShrink: 0
                          }}
                        >
                          <img 
                            src={getUserAvatarUrl(profile?.avatar_url, profile?.shop_name || 'M')} 
                            alt="" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        </div>
                      )}
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Editing banner */}
            {editingMessage && (
              <div className="chat-editing-banner">
                <span>Modification du message...</span>
                <button type="button" onClick={() => { setEditingMessage(null); setInputText(''); }}>
                  <X width="16" height="16" />
                </button>
              </div>
            )}

            {/* Chat input box */}
            <form onSubmit={handleSendMessage} className="chat-input-row">
              <input
                type="text"
                placeholder="Rédigez votre message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onFocus={() => {
                  if (headerContainerRef.current) {
                    headerContainerRef.current.classList.remove('no-transition');
                    headerContainerRef.current.style.transform = 'translateY(0px)';
                    currentTranslateYRef.current = 0;
                  }
                }}
                required
                style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid #d1d5db', fontSize: '0.95rem', outline: 'none', background: '#f9fafb' }}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                style={{
                  background: 'var(--primary-blue)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: !inputText.trim() || sending ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 43, 91, 0.2)',
                  flexShrink: 0
                }}
                aria-label="Envoyer"
              >
                <Send width="18" height="18" fill="white" style={{ marginLeft: '2px' }} />
              </button>
            </form>
          </>
        ) : (
          /* Empty state when no conversation is active (desktop) */
          <div className="chat-window-empty-state">
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
              <MessageSquare width="54" height="54" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <h3 style={{ margin: '0 0 6px 0', color: '#4b5563', fontWeight: '800' }}>Votre Messagerie</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Sélectionnez une discussion à gauche pour commencer à chater.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessageriePage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ fontWeight: '700', color: '#666' }}>Chargement de vos discussions...</p>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
