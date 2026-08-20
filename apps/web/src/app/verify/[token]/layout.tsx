import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';

export default function VerifyLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <header className="border-b border-primary-100 bg-white px-4 py-4">
          <div className="mx-auto max-w-4xl">
            <Link
              href="/"
              className="inline-block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              aria-label="AccessibleNow"
            >
              <BrandLogo variant="full" height={56} priority decorative />
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
