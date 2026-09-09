import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile the workspace db package so Next.js can bundle it
  transpilePackages: ['@dental/db'],

  // Server external packages that shouldn't be bundled
  serverExternalPackages: ['postgres', 'bcryptjs'],

  // Production performance & security
  compress: true,
  poweredByHeader: false,



  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, must-revalidate',
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/refund',
        destination: '/refund-policy',
        permanent: false,
      },
      {
        source: '/shipping',
        destination: '/shipping-policy',
        permanent: false,
      },
      {
        source: '/service-policy',
        destination: '/shipping-policy',
        permanent: false,
      },
      {
        source: '/terms-and-conditions',
        destination: '/terms',
        permanent: false,
      },
      {
        source: '/terms-of-service',
        destination: '/terms',
        permanent: false,
      },
      {
        source: '/privacy-policy',
        destination: '/privacy',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
