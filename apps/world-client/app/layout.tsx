import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import '@osia/ui/styles.css'; // tokens de marca + fuentes + clases de componentes (fuente única)
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      {/* suppressHydrationWarning: extensiones de navegador (p.ej. Berrycast)
          inyectan atributos en <body> antes de la hidratación. Solo afecta a
          este nodo, no oculta mismatches reales del árbol. */}
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
