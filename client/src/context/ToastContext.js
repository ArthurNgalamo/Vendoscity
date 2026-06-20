// client/src/context/ToastContext.js
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      // Wait for exit transition before clearing text
      const clearTimer = setTimeout(() => {
        setMessage('');
      }, 160);
      return () => clearTimeout(clearTimer);
    }, 2600);

    return () => clearTimeout(timer);
  }, [message]);

  const showToast = useCallback((msg) => {
    const text = String(msg || '').trim();
    if (!text) return;
    setMessage(text);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {message && (
        <div
          id="vc-toast"
          role="status"
          aria-live="polite"
          className={`vc-toast ${visible ? 'is-on' : ''}`}
          style={{
            position: 'fixed',
            left: '50%',
            bottom: '18px',
            transform: `translateX(-50%) ${visible ? 'translateY(0)' : 'translateY(16px)'}`,
            opacity: visible ? 1 : 0,
            pointerEvents: 'none',
            background: 'rgba(15, 23, 42, 0.92)',
            color: '#fff',
            padding: '10px 12px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.95rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            transition: 'opacity 160ms ease, transform 160ms ease',
            zIndex: 9999,
            maxWidth: 'min(520px, calc(100vw - 24px))',
            textAlign: 'center'
          }}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
