import { defineQuery } from 'next-sanity';

const postFields = `{
  _id,
  title,
  slug,
  excerpt,
  category,
  publishedAt,
  readTime,
  author->{name, role},
  heroImage {
    asset->{_id, url},
    alt
  }
}`;

export const ALL_POSTS_QUERY = defineQuery(
  `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) ${postFields}`,
);

export const POST_BY_SLUG_QUERY = defineQuery(
  `*[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    excerpt,
    body[]{
      ...,
      _type == "image" => {
        ...,
        asset->{_id, url}
      }
    },
    category,
    publishedAt,
    readTime,
    author->{name, role},
    heroImage {
      asset->{_id, url},
      alt
    },
    seoDescription
  }`,
);

export const RECENT_POSTS_QUERY = defineQuery(
  `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) [0...$limit] ${postFields}`,
);

export const POSTS_BY_CATEGORY_QUERY = defineQuery(
  `*[_type == "post" && category == $category && ($excludeSlug == null || slug.current != $excludeSlug)] | order(publishedAt desc) [0...$limit] ${postFields}`,
);
