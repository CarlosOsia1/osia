import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ThemeProvider, OSIA_COLORS } from '@osia/ui';
import { OSIA } from '@osia/shared';
import { Providers } from './providers';
import { AppFrame } from './_components/AppFrame';
import '@osia/ui/styles.css'; // tokens de marca + fuentes + clases de componentes (fuente única)
import './globals.css';

export const metadata: Metadata = {
  title: `La Red Social · ${OSIA.name}`,
  description: OSIA.tagline,
};

export const viewport: Viewport = {
  themeColor: OSIA_COLORS.onix, // una sola fuente de verdad del ónix de marca
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <ThemeProvider>
              <AppFrame>{children}</AppFrame>
            </ThemeProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
