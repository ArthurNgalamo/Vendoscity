/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // unoptimized retiré → Next.js compresse en WebP automatiquement
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      }
    ],
  },

  async rewrites() {
    return [
      {
        source: '/p/:path*',
        destination: 'https://vendoscity.onrender.com/p/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'https://vendoscity.onrender.com/api/:path*',
      },
    ];
  },

  // Cache HTTP longue durée pour les assets statiques
  async headers() {
    return [
      {
        source: '/assets/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        source: '/:path*.jpg',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        source: '/:path*.webp',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ];
  },

  async redirects() {
    return [
      { source: '/pages/Boutique.html', destination: '/boutique', permanent: true },
      { source: '/pages/Vendeur.html', destination: '/vendeur', permanent: true },
      { source: '/pages/Product-Detail.html', destination: '/product', permanent: true },
      { source: '/pages/FAQ.html', destination: '/faq', permanent: true },
      { source: '/pages/Blog.html', destination: '/blog', permanent: true },
      { source: '/pages/Apropos.html', destination: '/apropos', permanent: true },
      { source: '/pages/Checkout.html', destination: '/checkout', permanent: true },
      { source: '/pages/Services.html', destination: '/services', permanent: true },
      { source: '/pages/Contacts.html', destination: '/contacts', permanent: true },
      { source: '/pages/Connexion.html', destination: '/connexion', permanent: true },
      { source: '/pages/Inscription.html', destination: '/inscription', permanent: true },
      { source: '/legal/terms.html', destination: '/legal/terms', permanent: true },
      { source: '/legal/privacy.html', destination: '/legal/privacy', permanent: true },
      { source: '/legal/cookies.html', destination: '/legal/cookies', permanent: true },
    ];
  }
};

export default nextConfig;


