import type { Metadata } from 'next';
import { BadgeSvgDisplay } from '@/components/marketing/verify/BadgeSvgDisplay';

export const metadata: Metadata = {
  title: 'Accessibility Certificate Verification',
  robots: {
    index: false,
    follow: false,
  },
};

interface CertificateVerifyResponse {
  valid: boolean;
  status?: 'active' | 'expired' | 'revoked' | 'not_found';
  level?: string;
  score?: number;
  organisation?: {
    name: string;
  };
  asset?: {
    url: string;
  };
  issuedAt?: string;
  expiresAt?: string;
}

export default async function VerifyPage({ params }: { params: { token: string } }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  let data: CertificateVerifyResponse;

  try {
    const res = await fetch(`${apiUrl}/api/v1/certifications/verify/${params.token}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      data = { valid: false, status: 'not_found' };
    } else {
      data = await res.json();
    }
  } catch (error) {
    data = { valid: false, status: 'not_found' };
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm sm:p-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">
            Accessibility Certificate Verification
          </h1>
          <p className="mt-4 text-base text-text-secondary">Issued by AccessShield India</p>
        </div>

        <div className="mt-12">
          {data.valid && data.status === 'active' ? (
            <>
              <div role="status" className="flex flex-col items-center gap-6">
                <BadgeSvgDisplay level={data.level || 'WCAG 2.1 AA'} />
                <div className="text-center">
                  <p className="flex items-center justify-center gap-2 text-lg font-semibold text-success-700">
                    <svg
                      className="h-6 w-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Certificate is valid
                  </p>
                  <p className="mt-2 text-base text-text-secondary">
                    Valid until {data.expiresAt ? formatDate(data.expiresAt) : 'N/A'}
                  </p>
                </div>
              </div>

              <dl className="mt-12 divide-y divide-gray-200 border-y border-gray-200">
                <div className="flex justify-between py-4">
                  <dt className="font-medium text-text-primary">Organisation</dt>
                  <dd className="text-text-secondary">{data.organisation?.name || 'N/A'}</dd>
                </div>
                <div className="flex justify-between py-4">
                  <dt className="font-medium text-text-primary">Website</dt>
                  <dd className="text-text-secondary">
                    {data.asset?.url ? (
                      <a
                        href={data.asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                      >
                        {data.asset.url}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </dd>
                </div>
                <div className="flex justify-between py-4">
                  <dt className="font-medium text-text-primary">Accessibility score</dt>
                  <dd className="text-text-secondary">{data.score || 0}/100</dd>
                </div>
                <div className="flex justify-between py-4">
                  <dt className="font-medium text-text-primary">Standards achieved</dt>
                  <dd className="text-text-secondary">{data.level || 'N/A'}</dd>
                </div>
                <div className="flex justify-between py-4">
                  <dt className="font-medium text-text-primary">Issued on</dt>
                  <dd className="text-text-secondary">
                    {data.issuedAt ? formatDate(data.issuedAt) : 'N/A'}
                  </dd>
                </div>
                <div className="flex justify-between py-4">
                  <dt className="font-medium text-text-primary">Certificate ID</dt>
                  <dd className="font-mono text-sm text-text-secondary">
                    {params.token.slice(0, 8)}...{params.token.slice(-8)}
                  </dd>
                </div>
              </dl>
            </>
          ) : data.status === 'expired' ? (
            <div role="status" className="text-center">
              <svg
                className="mx-auto h-16 w-16 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="mt-6 text-xl font-semibold text-text-primary">
                This certificate has expired
              </h2>
              <p className="mt-4 text-base leading-normal text-text-secondary">
                Expired on {data.expiresAt ? formatDate(data.expiresAt) : 'N/A'}. Contact the
                organisation to confirm current accessibility status.
              </p>
            </div>
          ) : data.status === 'revoked' ? (
            <div role="status" className="text-center">
              <svg
                className="mx-auto h-16 w-16 text-error-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="mt-6 text-xl font-semibold text-text-primary">
                This certificate has been revoked
              </h2>
              <p className="mt-4 text-base leading-normal text-text-secondary">
                This certificate is no longer valid and cannot be used as proof of accessibility
                compliance.
              </p>
            </div>
          ) : (
            <div role="status" className="text-center">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="mt-6 text-xl font-semibold text-text-primary">No certificate found</h2>
              <p className="mt-4 text-base leading-normal text-text-secondary">
                No certificate found for this verification code. If you believe this is an error,
                contact{' '}
                <a
                  href="mailto:support@accessshield.in"
                  className="font-medium text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                >
                  support@accessshield.in
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-12 border-t border-gray-200 pt-8 text-center text-sm text-text-tertiary">
        <p>
          Powered by{' '}
          <a
            href="https://accessshield.in"
            className="font-medium text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          >
            AccessShield India
          </a>
        </p>
        <p className="mt-2">This certificate was independently verified on {today}</p>
      </footer>
    </main>
  );
}
