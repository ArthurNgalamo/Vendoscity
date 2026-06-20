// client/src/components/Footer.js
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const isMessagerie = pathname === '/messagerie';

  if (isMessagerie) return null;

  return (
    <footer className="site-footer" role="contentinfo" aria-label="Pied de page">
      <div className="footer-inner">

        {/* Colonnes de liens */}
        <div className="footer-content">

          {/* Navigation */}
          <div className="footer-section">
            <h3 className="footer-section-title">Navigation</h3>
            <ul>
              <li><Link href="/boutique">Boutique</Link></li>
              <li><Link href="/categories">Catégories</Link></li>
              <li><Link href="/services">Services</Link></li>
              <li><Link href="/checkout">Comment ça marche</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/blog">Blog</Link></li>
            </ul>
          </div>

          {/* Légal */}
          <div className="footer-section">
            <h3 className="footer-section-title">Légal</h3>
            <ul>
              <li><Link href="/legal/terms">Conditions d'utilisation</Link></li>
              <li><Link href="/legal/privacy">Confidentialité</Link></li>
              <li><Link href="/legal/cookies">Cookies</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer-section">
            <h3 className="footer-section-title">Contact</h3>
            <p><a href="mailto:arthurngalamo7@gmail.com">arthurngalamo7@gmail.com</a></p>
            <p><a href="tel:+237681570075">+237 681 570 075</a></p>
            <p className="footer-tagline">Yaoundé, Cameroun</p>
          </div>

          {/* Réseaux Sociaux */}
          <div className="footer-section">
            <h3 className="footer-section-title">Suivez-nous</h3>
            <ul className="footer-social" aria-label="Liens réseaux sociaux">
              <li>
                <a
                  className="footer-social-link"
                  href="https://www.facebook.com/profile.php?id=61577818894324"
                  title="Vendoscity sur Facebook"
                  target="_blank"
                  rel="external noopener noreferrer"
                  aria-label="Vendoscity sur Facebook"
                >
                  <svg className="brand-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path fill="currentColor" d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.87.24-1.46 1.49-1.46H16.7V5a24.3 24.3 0 0 0-2.5-.13c-2.48 0-4.18 1.51-4.18 4.28V11H7.3v3h2.72v8h3.48z" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  className="footer-social-link"
                  href="https://x.com/@ngalamo2092"
                  title="Vendoscity sur X"
                  target="_blank"
                  rel="external noopener noreferrer"
                  aria-label="Vendoscity sur X"
                >
                  <svg className="brand-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path fill="currentColor" d="M18.9 2H22l-6.8 7.77L23 22h-6.3l-4.9-6.53L6.1 22H3l7.3-8.37L1 2h6.5l4.4 5.86L18.9 2Zm-1.1 18h1.7L7.1 3.9H5.3L17.8 20Z" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  className="footer-social-link"
                  href="https://www.instagram.com/vendoscity?igsh=MXhmeGg4MmJyY2xkeg=="
                  title="Vendoscity sur Instagram"
                  target="_blank"
                  rel="external noopener noreferrer"
                  aria-label="Vendoscity sur Instagram"
                >
                  <svg className="brand-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z" />
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                    <path fill="currentColor" d="M17.7 6.3a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="footer-copyright">
          <p>
            &copy; {new Date().getFullYear()} <strong>Vendoscity</strong>. Tous droits réservés.
            {' · '}
            <Link href="/sitemap.xml">Sitemap</Link>
            {' · '}
            <Link href="/robots.txt">Robots.txt</Link>
          </p>
          <p className="footer-made-in">
            🇨🇲 Fait avec ❤️ au Cameroun
          </p>
        </div>
      </div>
    </footer>
  );
}
