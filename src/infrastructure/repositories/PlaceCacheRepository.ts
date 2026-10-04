import { PLACES_CACHE_KEY } from '../config/site';
import type { StoragePort } from '../storage/LocalStorageAdapter';
import type { Place } from '../../domain/entities/Place';

/** Cap so a heavy searcher cannot grow the store without bound. */
const MAX_ENTRIES = 50;

/**
 * Geocode cache (ACTUAL_PLACE_PLANNING §2 "Cache / save the places").
 *
 * Keyed by the normalised query (trimmed, lower-cased) so "Bandung" and
 * "  bandung " share one entry. Reads are total — a corrupt or foreign
 * payload yields a miss — and a failed write is silent, same contract as the
 * other repositories.
 */
export class PlaceCacheRepository {
  constructor(
    private readonly storage: StoragePort,
    private readonly cacheKey: string = PLACES_CACHE_KEY,
  ) {}

  /** Cached results for `query`, or `null` on a miss. */
  get(query: string): Place[] | null {
    const entry = this.readAll()[normalise(query)];
    return entry === undefined ? null : entry;
  }

  /** Stores `places` for `query`; newest entry wins when over the cap. */
  set(query: string, places: Place[]): void {
    const key = normalise(query);
    if (key === '') return;

    const all = this.readAll();
    all[key] = places;

    const keys = Object.keys(all);
    if (keys.length > MAX_ENTRIES) {
      for (const stale of keys.slice(0, keys.length - MAX_ENTRIES)) {
        delete all[stale];
      }
    }

    this.storage.setItem(this.cacheKey, JSON.stringify(all));
  }

  private readAll(): Record<string, Place[]> {
    const raw = this.storage.getItem(this.cacheKey);
    if (raw === null) return {};

    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
      return parsed as Record<string, Place[]>;
    } catch {
      return {};
    }
  }
}

/** Trimmed, lower-cased cache key. */
function normalise(query: string): string {
  return query.trim().toLowerCase();
}
