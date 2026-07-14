import { LoadingState } from '@/components/dashboard/common/LoadingState';

export default function IssuesLoading() {
  return <LoadingState message="Please wait, loading issues…" variant="page" />;
}
