import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Los paquetes internos del monorepo se distribuyen como TypeScript fuente:
  // Next debe transpilarlos.
  transpilePackages: ['@osia/ui', '@osia/shared', '@osia/atmosphere', '@osia/i18n'],
  // El lint corre por separado en el monorepo (Turborepo + ESLint flat),
  // no durante `next build`.
  eslint: { ignoreDuringBuilds: true },
  // Permite getUserMedia (voz S0.6) sólo a este origen. (meta http-equiv NO sirve
  // para Permissions-Policy; tiene que ser header.) Si algún día se embebe en iframe,
  // el host debe poner allow="microphone".
  async headers() {
    return [
      { source: '/:path*', headers: [{ key: 'Permissions-Policy', value: 'microphone=(self)' }] },
    ];
  },
};

export default withNextIntl(nextConfig);
