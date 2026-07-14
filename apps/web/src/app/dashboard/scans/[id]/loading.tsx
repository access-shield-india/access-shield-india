import { LoadingState } from '@/components/dashboard/common/LoadingState';

export default function ScanDetailLoading() {
  return <LoadingState message="Please wait, loading scan details…" variant="page" />;
}
