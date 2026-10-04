import type { IRoutingProvider } from '../../domain/repositories/IRoutingProvider';
import type { Leg, Place, RouteResult } from '../../domain/entities/Place';
import { NetworkError, NoRouteError, RateLimitError } from '../../domain/entities/Place';

/**
 * OSRM routing adapter (ACTUAL_PLACE_PLANNING §2).
 *
 * `GET {base}/route/v1/driving/{lon,lat;...}?overview=false` — coordinates
 * are path-encoded, longitude first, `;`-separated. Each
 * `routes[0].legs[]` entry contributes `distance` (metres → km) and
 * `duration` (seconds → minutes). Single attempt — the shared `withRetry`
 * wrapper owns timeouts and retries.
 */
export class OsrmRouting implements IRoutingProvider {
  constructor(private readonly baseUrl: string) {}

  async getLegs(stops: Place[], signal?: AbortSignal): Promise<RouteResult> {
    if (stops.length < 2) throw new NoRouteError('At least two stops are required');

    const path = stops.map((stop) => `${stop.lon},${stop.lat}`).join(';');
    const url = `${this.baseUrl.replace(/\/+$/, '')}/route/v1/driving/${path}?overview=false`;

    // A rejected `fetch` (offline, DNS, timeout-abort) must surface as
    // `NetworkError`, otherwise the shared `withRetry` wrapper skips it.
    const response = await fetch(url, { signal }).catch(() => {
      throw new NetworkError('Fetch failed');
    });

    if (response.status === 429) throw new RateLimitError();
    if (!response.ok) {
      if (response.status >= 500) throw new NetworkError(`HTTP ${response.status}`);
      throw new NoRouteError(`HTTP ${response.status}`);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new NetworkError('Invalid response');
    }

    const route = pickRoute(payload);
    if (route === null) throw new NoRouteError();

    const legs = route.legs
      .map((leg): Leg => ({
        km: metresToKm(leg.distance),
        minutes: secondsToMinutes(leg.duration),
      }))
      .filter((leg) => Number.isFinite(leg.km) && Number.isFinite(leg.minutes));

    if (legs.length === 0) throw new NoRouteError();

    return {
      legs,
      totalKm: sum(legs.map((leg) => leg.km)),
      totalMinutes: sum(legs.map((leg) => leg.minutes)),
    };
  }
}

interface RawLeg {
  distance: number;
  duration: number;
}

/** `routes[0]` when the payload carries a usable `Ok` route, else `null`. */
function pickRoute(payload: unknown): { legs: RawLeg[] } | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const record = payload as Record<string, unknown>;

  if (record.code !== 'Ok') return null;

  const routes = record.routes;
  if (!Array.isArray(routes) || routes.length === 0) return null;

  const route = routes[0];
  if (typeof route !== 'object' || route === null) return null;

  const legs = (route as Record<string, unknown>).legs;
  if (!Array.isArray(legs) || legs.length === 0) return null;

  return { legs: legs.filter(isRawLeg) };
}

function isRawLeg(value: unknown): value is RawLeg {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.distance === 'number' && typeof record.duration === 'number';
}

function metresToKm(metres: number): number {
  return metres / 1000;
}

function secondsToMinutes(seconds: number): number {
  return seconds / 60;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
