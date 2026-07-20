/**
 * Join class names, dropping falsy values.
 * Keeps conditional Tailwind classes readable without a dependency.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
