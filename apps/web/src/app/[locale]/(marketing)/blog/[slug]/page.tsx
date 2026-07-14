import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { PortableText } from 'next-sanity';
import { Badge } from '@accessshield/ui';
import { getPostBySlug, getAllPosts } from '@/lib/sanity';
import { portableTextComponents } from '@/components/marketing/blog/PortableTextComponents';
import { RelatedPosts } from '@/components/marketing/blog/RelatedPosts';

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    slug: post.slug.current,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: post.title,
    description: post.seoDescription || post.excerpt,
    openGraph: {
      title: post.title,
      description: post.seoDescription || post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author?.name || 'AccessShield India'],
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const formattedDate = new Date(post.publishedAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header>
        <Badge variant="secondary" size="md">
          {post.category}
        </Badge>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
          {post.title}
        </h1>
        <div className="mt-6 flex items-center gap-4 text-sm text-text-secondary">
          {post.author?.name && (
            <div>
              <span className="font-semibold text-text-primary">{post.author.name}</span>
              {post.author.role && <span className="ml-2">{post.author.role}</span>}
            </div>
          )}
          <span aria-hidden="true">•</span>
          <time dateTime={post.publishedAt}>{formattedDate}</time>
          <span aria-hidden="true">•</span>
          <span>{post.readTime} min read</span>
        </div>
        {post.heroImage?.asset?.url && (
          <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-xl">
            <Image
              src={post.heroImage.asset.url}
              alt={post.heroImage.alt || ''}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 896px"
            />
          </div>
        )}
      </header>

      <div className="prose prose-lg mt-12 max-w-none">
        {post.body && <PortableText value={post.body} components={portableTextComponents} />}
      </div>

      <RelatedPosts category={post.category} excludeSlug={post.slug.current} />
    </article>
  );
}
