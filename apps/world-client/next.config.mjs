import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Los paquetes internos del monorepo se distribuyen como TypeScript fuente:
  // Next debe transpilarlos.
  transpilePackages: ['@osia/ui', '@osia/shared', '@osia/atmosphere', '@osia/i18n', '@osia/identity'],
  // El lint corre por separado en el monorepo (Turborepo + ESLint flat),
  // no durante `next build`.
  eslint: { ignoreDuringBuilds: true },
  // Permite getUserMedia (voz S0.6) sólo a este origen. (meta http-equiv NO sirve
  // para Permissions-Policy; tiene que ser header.) Si algún día se embebe en iframe,
  // el host debe poner allow="microphone".
  // §8 Security headers. microphone=(self) habilita getUserMedia (voz S0.6) SOLO a este origen;
  // el resto es la base de marca (CSP estricta + HSTS se endurecen en el borde/Cloudflare en S1.9).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
