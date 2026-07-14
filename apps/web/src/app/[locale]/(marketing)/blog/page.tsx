import type { Metadata } from 'next';
import { CategoryFilter } from '@/components/marketing/blog/CategoryFilter';
import { BlogGrid } from '@/components/marketing/blog/BlogGrid';
import { getAllPosts } from '@/lib/sanity';

export const metadata: Metadata = {
  title: 'Accessibility Compliance Blog',
  description:
    'Plain-English guides to Indian accessibility law, IS 17802, SEBI compliance, and WCAG 2.2.',
};

export default async function BlogPage({ searchParams }: { searchParams: { category?: string } }) {
  const allPosts = await getAllPosts();

  const filteredPosts = searchParams.category
    ? allPosts.filter((post) => post.category === searchParams.category)
    : allPosts;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
          Accessibility compliance resources
        </h1>
        <p className="mt-6 text-lg leading-normal text-text-secondary">
          Plain-English guides to Indian accessibility law, IS 17802, SEBI, and WCAG 2.2
        </p>
      </div>

      <div className="mt-12 flex justify-center">
        <CategoryFilter />
      </div>

      <div className="mt-12">
        <BlogGrid posts={filteredPosts} />
      </div>
    </div>
  );
}
