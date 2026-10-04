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

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained server bundle in `.next/standalone`
  // so the Docker runtime image only needs Node + the traced dependencies.
  output: 'standalone',
  async headers() {
    return PROTECTED_PATHS.map((source) => ({
      source,
      headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
    }));
  },
};

export default nextConfig;
