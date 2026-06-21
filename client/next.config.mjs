/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Optimization enabled: Next.js will serve WebP/AVIF automatically
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 24h cache on optimized images
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
  async headers() {
    return [
      {
        // Cache static assets for 1 year
        source: '/assets/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
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

