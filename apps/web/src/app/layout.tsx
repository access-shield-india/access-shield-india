import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
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
    default: 'AccessShield India — Digital Accessibility Compliance',
    template: '%s | AccessShield India',
  },
  description:
    'AI-powered digital accessibility platform for Indian organisations — make websites and apps usable by people with disabilities, with WCAG 2.2 AA, IS 17802, and SEBI compliance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const htmlLang = locale === 'hi' ? 'hi' : 'en';

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AccessShield India',
    url: 'https://accessshield.in',
    description:
      'Digital accessibility platform for Indian organisations — websites and apps usable by people with disabilities, with WCAG 2.2 AA, IS 17802, and SEBI compliance.',
    logo: 'https://accessshield.in/logo.png',
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
        <UiProviders>{children}</UiProviders>
      </body>
    </html>
  );
}
