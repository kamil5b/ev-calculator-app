/**
 * Geocoding vocabulary for "plan with actual place" (ACTUAL_PLACE_PLANNING §1).
 *
 * Pure types and typed errors: the app layer and UI depend on these, never on
 * a concrete HTTP client. Adapters in `infrastructure/routing/` normalise
 * whatever their engine returns into these shapes.
 */

/** A geocoded point the user picked for one road-plan stop. */
export interface Place {
  /** Display label shown in the picker (engine's display name). */
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
}

/** One stop-to-stop segment, already normalised to km and minutes. */
export interface Leg {
  readonly km: number;
  readonly minutes: number;
}

/** Every leg of a trip plus its totals, in km and minutes. */
export interface RouteResult {
  readonly legs: readonly Leg[];
  readonly totalKm: number;
  readonly totalMinutes: number;
}

/** Base class for every provider failure the UI knows how to render. */
export class RoutePlannerError extends Error {}

/** The engine reports no path (or a request it refuses to answer). Never retried. */
export class NoRouteError extends RoutePlannerError {
  constructor(message = 'No route found') {
    super(message);
    this.name = 'NoRouteError';
  }
}

/** HTTP 429 — retried by the shared wrapper with backoff. */
export class RateLimitError extends RoutePlannerError {
  constructor(message = 'Rate limited') {
    super(message);
    this.name = 'RateLimitError';
  }
}

/** Timeouts, aborts, DNS failures, HTTP 5xx — retried by the shared wrapper. */
export class NetworkError extends RoutePlannerError {
  constructor(message = 'Network error') {
    super(message);
    this.name = 'NetworkError';
  }
}
