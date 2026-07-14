import { defineQuery } from 'next-sanity';
import { sanityClient } from '@/sanity/client';
import { isSanityConfigured } from '@/sanity/env';
import {
  ALL_POSTS_QUERY,
  POST_BY_SLUG_QUERY,
  POSTS_BY_CATEGORY_QUERY,
  RECENT_POSTS_QUERY,
} from '@/sanity/queries';

export { isSanityConfigured };

const fetchOptions = { next: { revalidate: 60 } };

export interface BlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  category: 'RPwD Act' | 'IS 17802' | 'SEBI' | 'GIGW 3.0' | 'Tutorial' | 'Case Study';
  publishedAt: string;
  readTime: number;
  author: {
    name: string;
    role?: string;
  };
  heroImage?: {
    asset: {
      _id?: string;
      url?: string;
    };
    alt: string;
  };
  body?: unknown[];
  seoDescription?: string;
}

async function fetchPosts<T>(query: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!sanityClient) {
    return [] as T;
  }

  try {
    return await sanityClient.fetch<T>(query, params, fetchOptions);
  } catch (error) {
    console.error('Sanity fetch failed:', error);
    return [] as T;
  }
}

export async function getAllPosts(): Promise<BlogPost[]> {
  return fetchPosts<BlogPost[]>(ALL_POSTS_QUERY);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!sanityClient) {
    return null;
  }

  try {
    return await sanityClient.fetch<BlogPost | null>(POST_BY_SLUG_QUERY, { slug }, fetchOptions);
  } catch (error) {
    console.error('Sanity getPostBySlug failed:', error);
    return null;
  }
}

export async function getRecentPosts(limit = 3): Promise<BlogPost[]> {
  return fetchPosts<BlogPost[]>(RECENT_POSTS_QUERY, { limit });
}

export async function getPostsByCategory(
  category: string,
  excludeSlug?: string,
): Promise<BlogPost[]> {
  return fetchPosts<BlogPost[]>(POSTS_BY_CATEGORY_QUERY, {
    category,
    excludeSlug: excludeSlug ?? null,
    limit: excludeSlug ? 3 : 100,
  });
}

/** Slugs for static generation and sitemap. */
export const POST_SLUGS_QUERY = defineQuery(
  `*[_type == "post" && defined(slug.current)]{ "slug": slug.current }`,
);
