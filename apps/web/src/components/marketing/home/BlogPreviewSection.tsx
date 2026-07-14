import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { localizedHref } from '@/lib/i18n/paths';
import Link from 'next/link';
import { Badge } from '@accessshield/ui';
import { getRecentPosts, type BlogPost } from '@/lib/sanity';

export async function BlogPreviewSection({ locale }: { locale: Locale }) {
  const { home } = getDictionary(locale);
  const { blogPreview } = home;

  let posts: BlogPost[] = [];
  try {
    posts = await getRecentPosts(3);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    posts = [];
  }

  if (posts.length === 0) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <section className="bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              {blogPreview.title}
            </h2>
            <p className="mt-4 text-lg leading-normal text-text-secondary">
              {blogPreview.subtitle}
            </p>
          </div>
          <Link
            href={localizedHref('/blog', locale)}
            className="hidden text-base font-medium text-primary-600 hover:text-primary-700 sm:block"
          >
            {blogPreview.viewAll}
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post._id}
              href={localizedHref(`/blog/${post.slug.current}`, locale)}
              className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            >
              <div className="flex items-center gap-3">
                <Badge variant="secondary" size="sm">
                  {post.category}
                </Badge>
                <span className="text-sm text-text-tertiary">{post.readTime} min read</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold leading-normal text-text-primary group-hover:text-primary-600">
                {post.title}
              </h3>
              <p className="mt-2 text-sm leading-normal text-text-tertiary">
                {formatDate(post.publishedAt)}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link
            href={localizedHref('/blog', locale)}
            className="text-base font-medium text-primary-600 hover:text-primary-700"
          >
            {blogPreview.viewAll}
          </Link>
        </div>
      </div>
    </section>
  );
}
