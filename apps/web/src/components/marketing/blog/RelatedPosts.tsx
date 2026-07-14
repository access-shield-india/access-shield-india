import Link from 'next/link';
import { Badge } from '@accessshield/ui';
import { getPostsByCategory } from '@/lib/sanity';

interface RelatedPostsProps {
  category: string;
  excludeSlug: string;
}

export async function RelatedPosts({ category, excludeSlug }: RelatedPostsProps) {
  const posts = await getPostsByCategory(category, excludeSlug);

  if (posts.length === 0) {
    return null;
  }

  return (
    <aside aria-labelledby="related-heading" className="mt-16 border-t border-gray-200 pt-16">
      <h2 id="related-heading" className="text-2xl font-bold text-text-primary">
        Related articles
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const formattedDate = new Date(post.publishedAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });

          return (
            <Link
              key={post._id}
              href={`/blog/${post.slug.current}`}
              className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            >
              <Badge variant="secondary" size="sm">
                {post.category}
              </Badge>
              <h3 className="mt-3 text-base font-semibold leading-normal text-text-primary group-hover:text-primary-600">
                {post.title}
              </h3>
              <div className="mt-3 flex items-center gap-2 text-xs text-text-tertiary">
                <time dateTime={post.publishedAt}>{formattedDate}</time>
                <span aria-hidden="true">•</span>
                <span>{post.readTime} min read</span>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
