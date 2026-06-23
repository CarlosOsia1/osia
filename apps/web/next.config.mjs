import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Los paquetes internos del monorepo se distribuyen como TypeScript fuente:
  // Next debe transpilarlos. apps/web NO incluye @osia/atmosphere ni Three (docs/08 §code-split):
  // el engine 3D vive solo en world-client; el Vestíbulo es liviano (bundle ≤250KB gzip).
  transpilePackages: ['@osia/ui', '@osia/shared', '@osia/i18n'],
  // El lint corre por separado (Turborepo + ESLint flat), no durante `next build`.
  eslint: { ignoreDuringBuilds: true },
  // §8 Security headers base. El Vestíbulo no usa micrófono/cámara/geo → se deniegan.
  // CSP estricta + HSTS se endurecen en el borde (Cloudflare) en S1.9.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'microphone=(), camera=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
