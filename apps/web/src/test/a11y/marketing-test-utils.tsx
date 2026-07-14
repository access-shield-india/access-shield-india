import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { expect } from 'vitest';
import { AnnouncerProvider, SkipLink } from '@accessshield/ui';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { LocaleProvider } from '@/lib/i18n/locale-context';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export function MarketingTestShell({ children }: { children: ReactNode }): ReactElement {
  const dictionary = getDictionary('en');

  return (
    <LocaleProvider locale="en" dictionary={dictionary}>
      <AnnouncerProvider>
        <SkipLink href="#main-content" />
        <MarketingNav />
        <main id="main-content">{children}</main>
        <MarketingFooter />
      </AnnouncerProvider>
    </LocaleProvider>
  );
}

export async function renderMarketingPage(
  Page: (props?: Record<string, unknown>) => ReactNode | Promise<ReactNode>,
  props?: Record<string, unknown>,
): Promise<RenderResult> {
  const pageContent = await Page(props);
  return render(<MarketingTestShell>{pageContent}</MarketingTestShell>);
}

export async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe(container, {
    rules: {
      // jsdom lacks canvas — full contrast checks run via audit:a11y:marketing (Playwright)
      'color-contrast': { enabled: false },
    },
  });
  expect(results).toHaveNoViolations();
}
