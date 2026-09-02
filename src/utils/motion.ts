/**
 * Safe check for prefers-reduced-motion.
 * Returns true if user prefers reduced motion, false otherwise (including in test environments).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
