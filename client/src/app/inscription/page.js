// client/src/app/inscription/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserPlus, User, Mail, Key, MessageCircle, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const { register, user } = useAuth();
  const showToast = useToast();
  const router = useRouter();

  const [name, setName] = useState('');
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
    if (!name.trim() || !email.trim() || !password.trim()) {
      showToast('Veuillez remplir tous les champs.');
      return;
    }

    if (password.length < 6) {
      showToast('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setSubmitting(true);
    try {
      await register(name, email, password, '');
      router.push('/connexion');
    } catch (err) {
      showToast(err?.message || "Une erreur s'est produite.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '50px auto', padding: '0 20px' }}>
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
            <UserPlus width="24" height="24" style={{ color: 'var(--primary-blue)' }} /> Inscription
          </h1>
          <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
            Rejoignez Vendoscity pour commander et suivre vos achats
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Nom complet */}
          <div>
            <label htmlFor="reg-name" style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
              Nom complet
            </label>
            <div style={{ position: 'relative' }}>
              <User
                width="16"
                height="16"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}
              />
              <input
                id="reg-name"
                type="text"
                placeholder="Ex: NGALAMO ARTHUR"
                value={name}
                onChange={(e) => setName(e.target.value)}
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

          {/* Email */}
          <div>
            <label htmlFor="reg-email" style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
              Adresse email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                width="16"
                height="16"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}
              />
              <input
                id="reg-email"
                type="email"
                placeholder="votre@email.com"
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
            <label htmlFor="reg-password" style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
              Mot de passe (6 caractères min.)
            </label>
            <div style={{ position: 'relative' }}>
              <Key
                width="16"
                height="16"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}
              />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="6"
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
            Créer mon compte
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '15px', fontSize: '0.9rem', color: '#555' }}>
          Vous avez déjà un compte ?{' '}
          <Link href="/connexion" style={{ color: 'var(--primary-blue)', fontWeight: '700', textDecoration: 'none' }}>
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
