import createImageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url';
import { sanityClient } from './client';

const builder = sanityClient ? createImageUrlBuilder(sanityClient) : null;

/** Build a Sanity CDN image URL for hero images and Portable Text assets. */
export function urlFor(source: SanityImageSource) {
  if (!builder) {
    throw new Error('Sanity is not configured');
  }
  return builder.image(source);
}
