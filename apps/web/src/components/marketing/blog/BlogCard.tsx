import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@accessshield/ui';
import type { BlogPost } from '@/lib/sanity';

interface BlogCardProps {
  post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
  const formattedDate = new Date(post.publishedAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <Link
      href={`/blog/${post.slug.current}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
        {post.heroImage?.asset?.url ? (
          <Image
            src={post.heroImage.asset.url}
            alt={post.heroImage.alt || ''}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" size="sm">
            {post.category}
          </Badge>
        </div>
        <h3 className="mt-4 text-lg font-semibold leading-normal text-text-primary group-hover:text-primary-600">
          {post.title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-normal text-text-secondary">{post.excerpt}</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-text-tertiary">
          <time dateTime={post.publishedAt}>{formattedDate}</time>
          <span aria-hidden="true">•</span>
          <span>{post.readTime} min read</span>
          {post.author?.name && (
            <>
              <span aria-hidden="true">•</span>
              <span>{post.author.name}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
