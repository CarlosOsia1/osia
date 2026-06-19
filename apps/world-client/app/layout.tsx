import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OSIA · El Mundo',
  description: 'El arte de lo esencial.',
};

export const viewport: Viewport = {
  themeColor: '#0d0d0d',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      {/* suppressHydrationWarning: extensiones de navegador (p.ej. Berrycast)
          inyectan atributos en <body> antes de la hidratación. Solo afecta a
          este nodo, no oculta mismatches reales del árbol. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
