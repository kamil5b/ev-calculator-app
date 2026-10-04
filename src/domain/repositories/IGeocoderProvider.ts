import type { Place } from '../entities/Place';

/**
 * Geocoding port for "plan with actual place" (ACTUAL_PLACE_PLANNING §1).
 *
 * Declared in the domain, implemented in `infrastructure/routing/` (Nominatim
 * ships; anything else follows `docs/ADDING_A_PROVIDER.md`).
 */
export interface IGeocoderProvider {
  /**
   * Up to 5 candidates for `query`; an empty result is `[]`, never an error.
   * Throws typed `RoutePlannerError` subclasses on failure.
   */
  search(query: string, signal?: AbortSignal): Promise<Place[]>;
}
