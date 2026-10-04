/**
 * Application Constants Template
 *
 * Define your application-specific constants here
 * Examples include API configuration, UI settings, and business logic constants
 */

/**
 * Same-origin proxy path the browser uses for every data-service call.
 * next.config.ts rewrites it to the real service (CURVE_DATA_SERVICE_URL,
 * server-side), so the browser never calls the service address directly.
 */
export const CURVE_DATA_PROXY_PATH = '/curve-data';

/**
 * API base URL - browser-facing, from NEXT_PUBLIC_API_BASE_URL.
 * Defaults to the same-origin proxy path.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || CURVE_DATA_PROXY_PATH;

/**
 * Default pagination settings
 * Customize based on your application's needs
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
} as const;

/**
 * Toast notification settings (UI-18): a completed-action message leaves after
 * about 2.6 s; a message that needs the user to act is shown with
 * `persistent: true` and stays until dismissed.
 */
export const TOAST_SETTINGS = {
  DEFAULT_DURATION: 2600,
  MAX_TOASTS: 3,
} as const;

/**
 * Loading thresholds (UI-17): nothing for the first 300 ms, then a skeleton,
 * and after 3 s the skeleton plus a "taking longer than usual" line.
 */
export const LOADING_THRESHOLDS = {
  SKELETON_AFTER_MS: 300,
  SLOW_AFTER_MS: 3000,
} as const;

/**
 * Modal settings
 */
export const MODAL_SETTINGS = {
  ANIMATION_DURATION: 150, // 150ms for enter/exit animations
} as const;

// Add your application-specific constants below
// Example:
// export const DATE_FORMATS = {
//   DISPLAY: 'dd MMM yyyy',
//   API: 'yyyy-MM-dd',
// } as const;
