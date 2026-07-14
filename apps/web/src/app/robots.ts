import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/dashboard/', '/onboarding/', '/verify/'],
    },
    sitemap: 'https://accessshield.in/sitemap.xml',
  };
}
