import type { NextConfig } from 'next';

/** Signed-in views: never cached, so Back after sign-out cannot replay one. */
const PROTECTED_PATHS = [
  '/',
  '/overview',
  '/file-log',
  '/curve-data',
  '/yield-curves',
  '/workflow-monitor',
  '/api-reference',
];

/**
 * Real data service address (server-side only). The browser calls the
 * same-origin `/curve-data/v1/...` path; this rewrite forwards it here because
 * the service sends no CORS header. Only `/v1` is proxied so the app's own
 * `/curve-data` view route is never shadowed.
 */
const CURVE_DATA_SERVICE_URL = (
  process.env.CURVE_DATA_SERVICE_URL || 'http://localhost:10020/curve-data'
).replace(/\/+$/, '');

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained server bundle in `.next/standalone`
  // so the Docker runtime image only needs Node + the traced dependencies.
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/curve-data/v1/:path*',
        destination: `${CURVE_DATA_SERVICE_URL}/v1/:path*`,
      },
    ];
  },
  async headers() {
    const noStore = [
      { key: 'Cache-Control', value: 'no-store, must-revalidate' },
    ];
    // Each view and everything beneath it (e.g. `/file-log/123`). `/` is the
    // root only; its sub-routes are the views listed here.
    return PROTECTED_PATHS.flatMap((path) =>
      path === '/'
        ? [{ source: '/', headers: noStore }]
        : [
            { source: path, headers: noStore },
            { source: `${path}/:path*`, headers: noStore },
          ],
    );
  },
};

export default nextConfig;
