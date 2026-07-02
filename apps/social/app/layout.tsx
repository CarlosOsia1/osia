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
  // Metadata de MARCA, no de contenido (decisión R2): la red es por invitación y el API exige
  // sesión — un preview público con contenido filtraría una red privada a los crawlers.
  title: {
    default: `La Red Social · ${OSIA.name}`,
    template: `%s · La Red Social · ${OSIA.name}`,
  },
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
