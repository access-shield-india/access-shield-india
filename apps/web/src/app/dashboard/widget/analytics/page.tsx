import { WidgetAnalyticsView } from '@/components/dashboard/widget/WidgetAnalyticsView';

export const metadata = {
  title: 'Widget analytics | AccessibleNow',
  description: 'Anonymous aggregate usage of your accessibility widget',
};

export default function WidgetAnalyticsPage() {
  return <WidgetAnalyticsView />;
}
