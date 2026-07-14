import { SkipLink } from '@accessshield/ui';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingWidgetEmbed } from '@/components/marketing/MarketingWidgetEmbed';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink href="#main-content" />
      <MarketingNav />
      <main id="main-content">{children}</main>
      <MarketingFooter />
      <MarketingWidgetEmbed />
    </>
  );
}
