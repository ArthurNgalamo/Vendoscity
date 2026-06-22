// client/src/app/layout.js
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CartSidebar from '../components/CartSidebar';
import CartFab from '../components/CartFab';
import TranslationHandler from '../components/TranslationHandler';
import PwaInstallPrompt from '../components/PwaInstallPrompt';


// Load our stylesheets
import './style.css';
import './boutique.css';

export const metadata = {
  title: 'Vendoscity - Services & Boutique en Ligne | Découvrez',
  description:
    'Bienvenue sur Vendoscity, votre portail de services et boutique en ligne. Découvrez nos produits et services de qualité. Commandez en direct sans commission, paiement et livraison hors plateforme.',
  manifest: '/manifest.json',
  keywords: 'vendoscity, boutique en ligne, services, plateforme, e-commerce, achats en ligne, Yaoundé, Cameroun',
  metadataBase: new URL('https://vendoscity.vercel.app'),
  openGraph: {
    type: 'website',
    url: 'https://vendoscity.vercel.app',
    title: 'Vendoscity - Vos Services & Boutique en Ligne',
    description:
      'Découvrez Vendoscity : votre plateforme complète de services et shopping en direct. Paiement et livraison hors plateforme.',
    images: [
      {
        url: '/assets/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Vendoscity banner'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vendoscity - Services & Boutique en Ligne',
    description:
      'Vendoscity : marketplace de mise en relation directe acheteur-vendeur, basée à Yaoundé. Paiement et livraison se discutent entre les parties.',
    images: ['/assets/images/twitter-image.jpg']
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f4f7f6',
          fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif'
        }}
      >
        <TranslationHandler />
        <PwaInstallPrompt />
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <FavoritesProvider>
                <Header />
                <CartSidebar />
                <CartFab />
                <main style={{ flexGrow: 1 }}>{children}</main>
                <Footer />
              </FavoritesProvider>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
