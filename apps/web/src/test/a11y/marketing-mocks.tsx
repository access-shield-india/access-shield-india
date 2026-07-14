import type { ReactNode } from 'react';
import { vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
    ...rest
  }: {
    children: ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test mock
    <img src={src} alt={alt} className={className} />
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  notFound: vi.fn(),
}));

vi.mock('@/components/marketing/home/BlogPreviewSection', () => ({
  BlogPreviewSection: () => null,
}));

vi.mock('@/components/marketing/MarketingWidgetEmbed', () => ({
  MarketingWidgetEmbed: () => null,
}));

vi.mock('@/lib/sanity', () => ({
  isSanityConfigured: false,
  getAllPosts: vi.fn().mockResolvedValue([]),
  getPostBySlug: vi.fn().mockResolvedValue(null),
  getRecentPosts: vi.fn().mockResolvedValue([]),
  getPostsByCategory: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/components/marketing/scan/ScanToolWidget', () => ({
  ScanToolWidget: () => (
    <div>
      <h2>Scan tool</h2>
      <form aria-label="Free accessibility scan">
        <label htmlFor="test-url">Website URL</label>
        <input id="test-url" type="url" name="url" />
      </form>
    </div>
  ),
}));
