// client/src/app/connexion/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LogIn, Key, Mail, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login, user } = useAuth();
  const showToast = useToast();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('Veuillez remplir tous les champs.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      showToast(err?.message || 'Identifiants incorrects.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '60px auto', padding: '0 20px' }}>
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: '1px solid #e5e7eb'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h1 style={{ fontSize: '1.6rem', color: '#111', fontWeight: '800', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <LogIn width="24" height="24" style={{ color: 'var(--primary-blue)' }} /> Espace Vendeur
          </h1>
          <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
            Connectez-vous pour publier et gérer vos articles
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Email */}
          <div>
            <label htmlFor="login-email" style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
              Adresse email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                width="16"
                height="16"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}
              />
              <input
                id="login-email"
                type="email"
                placeholder="vendeur@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 38px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="login-password" style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <Key
                width="16"
                height="16"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}
              />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 38px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff width="18" height="18" /> : <Eye width="18" height="18" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="pressable"
            style={{
              background: 'var(--primary-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px',
              fontWeight: '800',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            Se connecter
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '15px', fontSize: '0.9rem', color: '#555' }}>
          Vous n&apos;avez pas de compte ?{' '}
          <Link href="/inscription" style={{ color: 'var(--primary-blue)', fontWeight: '700', textDecoration: 'none' }}>
            Créer un compte
          </Link>
        </div>
      </div>
    </div>
  );
}
