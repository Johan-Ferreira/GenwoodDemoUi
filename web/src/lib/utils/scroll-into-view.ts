/** True when the user asked the OS / browser for reduced motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Scrolls `element` into view — smoothly, or instantly under reduced motion.
 * Moves no focus. A no-op for a missing element or where the API is absent
 * (e.g. jsdom).
 */
export function revealElement(
  element: Element | null | undefined,
  block: ScrollLogicalPosition = 'nearest',
): void {
  if (!element || typeof element.scrollIntoView !== 'function') return;
  element.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block,
  });
}
