import { LoadingState } from '@/components/dashboard/common/LoadingState';

export default function AssetDetailLoading() {
  return <LoadingState message="Please wait, loading asset details…" variant="page" />;
}
