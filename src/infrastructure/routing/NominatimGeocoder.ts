import type { IGeocoderProvider } from '../../domain/repositories/IGeocoderProvider';
import type { Place } from '../../domain/entities/Place';
import { NetworkError, NoRouteError, RateLimitError } from '../../domain/entities/Place';

/** At most this many candidates are returned (EXACT_MAP §2). */
const LIMIT = 5;

/**
 * Nominatim geocoder (ACTUAL_PLACE_PLANNING §2).
 *
 * `GET {base}/search?q=&format=jsonv2&countrycodes=id&limit=5`, mapping
 * `display_name`/`lat`/`lon` into {@link Place}. Single attempt — the shared
 * `withRetry` wrapper owns timeouts and retries.
 */
export class NominatimGeocoder implements IGeocoderProvider {
  constructor(private readonly baseUrl: string) {}

  async search(query: string, signal?: AbortSignal): Promise<Place[]> {
    const trimmed = query.trim();
    if (trimmed === '') return [];

    const url =
      `${this.baseUrl.replace(/\/+$/, '')}/search` +
      `?q=${encodeURIComponent(trimmed)}&format=jsonv2&countrycodes=id&limit=${LIMIT}`;

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

    if (!Array.isArray(payload)) return [];

    return payload
      .map(toPlace)
      .filter((place): place is Place => place !== null)
      .slice(0, LIMIT);
  }
}

/** Maps one Nominatim result; malformed entries are dropped, never thrown. */
function toPlace(item: unknown): Place | null {
  if (typeof item !== 'object' || item === null) return null;
  const record = item as Record<string, unknown>;

  const name = record.display_name;
  const lat = Number(record.lat);
  const lon = Number(record.lon);

  if (typeof name !== 'string' || name.trim() === '') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { name: name.trim(), lat, lon };
}
