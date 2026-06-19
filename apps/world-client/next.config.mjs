/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Los paquetes internos del monorepo se distribuyen como TypeScript fuente:
  // Next debe transpilarlos.
  transpilePackages: ['@osia/ui', '@osia/shared'],
  // El lint corre por separado en el monorepo (Turborepo + ESLint flat),
  // no durante `next build`.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
