const { existsSync } = require('node:fs');
const { dirname, resolve } = require('node:path');
const { config } = require('dotenv');

/** Monorepo root — .env.local lives here, not under apps/web */
function findMonorepoRoot(startDir) {
  let dir = startDir;
  while (dir !== dirname(dir)) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return startDir;
}

const monorepoRoot = findMonorepoRoot(__dirname);
config({ path: resolve(monorepoRoot, '.env.local') });
config({ path: resolve(monorepoRoot, '.env') });

const apiProxyTarget =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@accessshield/ui', '@accessshield/types'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@accessshield/ui'],
  },
  // Monorepo: let Next/Turbopack resolve packages from the workspace root
  outputFileTracingRoot: monorepoRoot,
  reactStrictMode: true,
  poweredByHeader: false,
  // .env.local lives at monorepo root — expose to Next.js client, server, and edge middleware
  env: {
    NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL ?? '',
    NEXT_PUBLIC_AUTH_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH_CLIENT_ID ?? '',
    AUTH_ISSUER_URL: process.env.AUTH_ISSUER_URL ?? '',
    AUTH_SECRET: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
    NEXTAUTH_SECRET: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '',
    // Empty = browser uses same-origin /api/v1/* (rewritten to Express API below)
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? '',
    NEXT_PUBLIC_WIDGET_ENABLED: process.env.NEXT_PUBLIC_WIDGET_ENABLED ?? '',
    NEXT_PUBLIC_WIDGET_TOKEN: process.env.NEXT_PUBLIC_WIDGET_TOKEN ?? '',
    NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL ?? '',
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '',
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
  },
  async rewrites() {
    return {
      // English URLs stay unprefixed in the browser; internally route to /en/...
      beforeFiles: [
        { source: '/', destination: '/en' },
        // Legacy /hi/dashboard links → real dashboard routes (locale via cookie)
        { source: '/hi/dashboard', destination: '/dashboard' },
        { source: '/hi/dashboard/:path*', destination: '/dashboard/:path*' },
        { source: '/hi/login', destination: '/login' },
        { source: '/hi/signup', destination: '/signup' },
        {
          source:
            '/:path((?!hi$|hi/|en$|en/|dashboard|api|auth|login|onboarding|verify|widget\\.js|favicon\\.ico|_next/|marketing/).*)',
          destination: '/en/:path',
        },
      ],
      afterFiles: [
        {
          source: '/api/v1/:path*',
          destination: `${apiProxyTarget.replace(/\/$/, '')}/api/v1/:path*`,
        },
      ],
    };
  },
  async redirects() {
    return [
      {
        source: '/pricing',
        destination: '/services',
        permanent: true,
      },
      {
        source: '/hi/pricing',
        destination: '/hi/services',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
