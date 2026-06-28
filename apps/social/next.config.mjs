import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Paquetes internos del monorepo (TypeScript fuente): Next debe transpilarlos. apps/social, como
  // el Vestíbulo, NO incluye @osia/atmosphere ni Three (docs/08 §code-split): el engine 3D vive solo
  // en world-client; La Red Social es liviana (shell ≤250 KB gzip, backlog S3.1-H1).
  transpilePackages: ['@osia/ui', '@osia/shared', '@osia/i18n', '@osia/identity'],
  eslint: { ignoreDuringBuilds: true },
  // §8 Security headers base. La Red Social no usa micrófono/cámara/geo → se deniegan. HSTS como
  // defensa en profundidad. CSP estricta se endurece en el borde (Cloudflare) en S3.6.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'microphone=(), camera=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
