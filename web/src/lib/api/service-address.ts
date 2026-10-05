/**
 * The real data service address (server-side only).
 *
 * The browser never calls it directly (calls go through the same-origin proxy,
 * see client.ts); this is for showing the address, e.g. on the API reference.
 * Same source and default as the proxy rewrite in next.config.ts.
 */
export const DEFAULT_CURVE_DATA_SERVICE_URL =
  'http://localhost:10020/curve-data';

/** CURVE_DATA_SERVICE_URL (or the default), without a trailing slash. */
export function curveDataServiceUrl(): string {
  return (
    process.env.CURVE_DATA_SERVICE_URL || DEFAULT_CURVE_DATA_SERVICE_URL
  ).replace(/\/+$/, '');
}
