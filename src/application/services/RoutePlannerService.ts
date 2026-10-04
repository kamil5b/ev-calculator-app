import type { IGeocoderProvider } from '../../domain/repositories/IGeocoderProvider';
import type { IRoutingProvider } from '../../domain/repositories/IRoutingProvider';
import type { Place, RouteResult } from '../../domain/entities/Place';
import { NetworkError, NoRouteError, RateLimitError, RoutePlannerError } from '../../domain/entities/Place';
import type { DistanceUnit } from '../../domain/entities/DistanceUnit';
import { convertDistance } from '../../domain/entities/DistanceUnit';
import { VALIDATION_MESSAGES } from '../../domain/entities/validation';
import { round1 } from '../../domain/use-cases/math';

/** Optional geocode cache; without it every search hits the network. */
export interface PlaceSearchCache {
  get(query: string): Place[] | null;
  set(query: string, places: Place[]): void;
}

/**
 * Application service for "plan with actual place" (ACTUAL_PLACE_PLANNING §4).
 *
 * Holds no state of its own: every call goes straight to the injected ports,
 * so the card can never show a stale result. Retries and timeouts live in the
 * factory's `withRetry` wrapper — not here, not in the adapters.
 */
export class RoutePlannerService {
  constructor(
    private readonly geocoder: IGeocoderProvider,
    private readonly routing: IRoutingProvider,
    private readonly cache?: PlaceSearchCache,
  ) {}

  /** Up to 5 candidates; an empty result is `[]`, never an error. */
  async searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
    const cached = this.cache?.get(query);
    if (cached !== null && cached !== undefined) return cached;

    const results = await this.geocoder.search(query, signal);
    this.cache?.set(query, results);
    return results;
  }

  /**
   * Legs for `stops`, each distance converted from km to `unit` and rounded
   * to one decimal so the plan inputs stay clean.
   */
  async planRoute(stops: Place[], unit: DistanceUnit): Promise<RouteResult> {
    const result = await this.routing.getLegs(stops);

    const legs = result.legs.map((leg) => ({
      km: round1(convertDistance(leg.km, 'km', unit)),
      minutes: round1(leg.minutes),
    }));

    return {
      legs,
      totalKm: round1(legs.reduce((total, leg) => total + leg.km, 0)),
      totalMinutes: round1(legs.reduce((total, leg) => total + leg.minutes, 0)),
    };
  }

  /** Maps any thrown value to a message the card can render inline. */
  static errorMessage(error: unknown): string {
    if (error instanceof NoRouteError) return VALIDATION_MESSAGES.routeNoRoute;
    if (error instanceof RateLimitError) return VALIDATION_MESSAGES.routeRateLimit;
    if (error instanceof NetworkError) return VALIDATION_MESSAGES.routeNetwork;
    if (error instanceof RoutePlannerError) return error.message;
    if (error instanceof Error && error.message.trim() !== '') return error.message;
    return VALIDATION_MESSAGES.searchFailed;
  }
}
