import { Suspense } from 'react';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import { IssueCertificatePanel } from '@/components/dashboard/certs/IssueCertificatePanel';
import { CertificateList } from '@/components/dashboard/certs/CertificateList';

export const metadata = {
  title: 'Certificates | AccessShield India',
  description: 'Issue and manage accessibility compliance certificates',
};

export default function CertificatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Certificates</h1>
        <p className="mt-2 text-base text-text-secondary">
          Issue and track accessibility compliance certificates for your assets
        </p>
      </div>

      <Suspense fallback={<LoadingState message="Loading certificate form…" variant="card" />}>
        <IssueCertificatePanel />
      </Suspense>

      <Suspense fallback={<LoadingState message="Loading certificates…" variant="card" />}>
        <CertificateList />
      </Suspense>
    </div>
  );
}
