import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ReportsList } from '@/components/dashboard/reports/ReportsList';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const GenerateReportPanel = dynamic(
  () =>
    import('@/components/dashboard/reports/GenerateReportPanel').then((mod) => ({
      default: mod.GenerateReportPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <LoadingState
        message="Loading report generator…"
        variant="inline"
        size="sm"
        className="py-4"
      />
    ),
  },
);

export const metadata = {
  title: 'Reports | AccessShield India',
  description: 'Generate and download accessibility compliance reports',
};

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary-50 to-white border border-gray-200 rounded-2xl p-8 shadow-lg">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Reports</h1>
        <p className="text-lg text-gray-600 font-medium">
          Generate comprehensive accessibility compliance reports for your assets
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
        <GenerateReportPanel />
      </div>

      <Suspense
        fallback={
          <LoadingState message="Loading reports…" variant="card" className="rounded-2xl" />
        }
      >
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <ReportsList />
        </div>
      </Suspense>
    </div>
  );
}
