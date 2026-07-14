import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ScannerTestLab } from '@/components/scanner-test-lab/ScannerTestLab';
import { getAppSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Scanner test lab',
  description:
    'Development playground for end-to-end accessibility scan testing — configure inputs, run scans, and inspect violations.',
};

export default async function ScannerTestPage() {
  const session = await getAppSession();

  if (!session.userId) {
    redirect('/login?redirectTo=/dashboard/scans/test');
  }

  return (
    <>
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-primary-600">
          Dev playground
        </p>
        <h1 className="text-3xl font-bold text-text-primary">Scanner test lab</h1>
        <p className="max-w-3xl text-text-secondary">
          Create an asset, configure scan options, and inspect live progress plus violation output.
          Prefer this over ad-hoc curl when validating scanner changes.
        </p>
      </div>
      <div className="mt-8">
        <ScannerTestLab />
      </div>
    </>
  );
}
