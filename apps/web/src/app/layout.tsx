import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ChunkLoadRecovery } from '@/components/ChunkLoadRecovery';
import { UiProviders } from '@/providers/UiProviders';
import { getLocale } from '@/lib/i18n/server';
import './globals.css';
import '@/styles/button-theme.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'AccessibleNow — Digital Accessibility Compliance',
    template: '%s | AccessibleNow',
  },
  description:
    'AI-powered digital accessibility platform for Indian organisations — make websites and apps usable by people with disabilities, with WCAG 2.2 AA, IS 17802, and SEBI compliance.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const htmlLang = locale === 'hi' ? 'hi' : 'en';

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AccessibleNow',
    url: 'https://accessshield.in',
    description:
      'Digital accessibility platform for Indian organisations — websites and apps usable by people with disabilities, with WCAG 2.2 AA, IS 17802, and SEBI compliance.',
    logo: 'https://accessshield.in/brand/logo.png',
    foundingDate: '2024',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Pune',
      addressRegion: 'Maharashtra',
      addressCountry: 'IN',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@accessshield.in',
    },
  };

  return (
    <html lang={htmlLang} className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="min-h-screen bg-white font-sans text-gray-900 antialiased">
        <ChunkLoadRecovery />
        <UiProviders>{children}</UiProviders>
      </body>
    </html>
  );
}
