import { clsx, type ClassValue } from 'clsx';

/**
 * Shared utilities for the presentation layer.
 *
 * Only presentation concerns live here — class-name composition and lightweight
 * browser capability checks. Validation and number formatting belong to the
 * domain and application layers respectively (PRD 12, "Code").
 */

/**
 * Composes class names, dropping falsy entries.
 *
 * A conflict-aware merge (`tailwind-merge`) is deliberately not used: the app
 * renders a fixed set of primitives whose variants never produce overlapping
 * utilities, and the library's theme map alone cost ~14KB of the 20KB gzip
 * JavaScript budget (PRD 9, 13).
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Joins class names, dropping falsy entries. */
export function joinClasses(...values: Array<string | false | null | undefined>): string {
  return values.filter((value): value is string => typeof value === 'string' && value.length > 0).join(' ');
}

/** Formats a percentage for display, e.g. `75%`. */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** `true` in a real browser. `false` during SSR and in non-DOM test runners. */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/** Joins two class names, ignoring falsy values. */
export function cx(...values: Array<string | false | null | undefined>): string {
  return joinClasses(...values);
}
