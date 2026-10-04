import type { Place, RouteResult } from '../entities/Place';

/**
 * Routing port for "plan with actual place" (ACTUAL_PLACE_PLANNING §1).
 *
 * Declared in the domain, implemented in `infrastructure/routing/` (OSRM
 * ships; anything else follows `docs/ADDING_A_PROVIDER.md`).
 */
export interface IRoutingProvider {
  /**
   * Legs between consecutive stops (leg *i* = `stops[i]` → `stops[i+1]`),
   * normalised to km and minutes. `stops` must hold at least 2 entries.
   * Throws typed `RoutePlannerError` subclasses on failure.
   */
  getLegs(stops: Place[], signal?: AbortSignal): Promise<RouteResult>;
}
