import { TRIP_STORAGE_KEY } from '../config/site';
import type { StoragePort } from '../storage/LocalStorageAdapter';
import type { IRoadTripRepository } from '../../domain/repositories/IRoadTripRepository';
import type { RoadTrip, RoadTripDraft } from '../../domain/entities/RoadTrip';
import { coerceRoadPlan, safeParse } from '../../application/services/PersistenceService';
import { isDistanceUnit } from '../../domain/entities/DistanceUnit';

/**
 * `localStorage` implementation of saved road trips (PRD 11 extension).
 *
 * Same contract as {@link CarModelRepository}: reads are total (a corrupt or
 * foreign payload yields an empty list), writes are a single JSON document,
 * and each stored plan is re-coerced on read so older payloads degrade to a
 * valid plan instead of throwing.
 */
export class RoadTripRepository implements IRoadTripRepository {
  constructor(
    private readonly storage: StoragePort,
    private readonly tripsKey: string = TRIP_STORAGE_KEY,
  ) {}

  getAll(): RoadTrip[] {
    return sortByRecency(this.readAll());
  }

  getById(id: string): RoadTrip | null {
    return this.readAll().find((trip) => trip.id === id) ?? null;
  }

  add(draft: RoadTripDraft): RoadTrip {
    const trips = this.readAll();
    const trip: RoadTrip = {
      id: generateTripId(),
      name: draft.name.trim(),
      plan: draft.plan,
      distanceUnit: draft.distanceUnit,
      createdAt: Date.now(),
    };

    this.writeAll([trip, ...trips]);
    return trip;
  }

  update(id: string, changes: Partial<Omit<RoadTrip, 'id' | 'createdAt'>>): RoadTrip | null {
    const trips = this.readAll();
    const index = trips.findIndex((trip) => trip.id === id);
    if (index === -1) return null;

    const current = trips[index] as RoadTrip;
    const updated: RoadTrip = {
      ...current,
      ...changes,
      name: (changes.name ?? current.name).trim(),
      id: current.id,
      createdAt: current.createdAt,
    };

    trips[index] = updated;
    this.writeAll(trips);
    return updated;
  }

  remove(id: string): boolean {
    const trips = this.readAll();
    const remaining = trips.filter((trip) => trip.id !== id);
    if (remaining.length === trips.length) return false;

    this.writeAll(remaining);
    return true;
  }

  private readAll(): RoadTrip[] {
    const raw = this.storage.getItem(this.tripsKey);
    if (raw === null) return [];

    const parsed = safeParse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map(toRoadTrip).filter((trip): trip is RoadTrip => trip !== null);
  }

  private writeAll(trips: RoadTrip[]): void {
    this.storage.setItem(this.tripsKey, JSON.stringify(trips));
  }
}

/** Validates one untrusted record from storage. Returns `null` when unusable. */
function toRoadTrip(value: unknown): RoadTrip | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;

  const id = record.id;
  const name = record.name;
  if (typeof id !== 'string' || id.length === 0) return null;
  if (typeof name !== 'string' || name.trim().length === 0) return null;

  return {
    id,
    name: name.trim(),
    // A missing/corrupt plan degrades to the default plan, never to `null`.
    plan: coerceRoadPlan(record.plan),
    distanceUnit: isDistanceUnit(record.distanceUnit) ? record.distanceUnit : 'km',
    createdAt:
      typeof record.createdAt === 'number' && Number.isFinite(record.createdAt) ? record.createdAt : 0,
  };
}

/** Newest first; ties broken by id for deterministic output. */
function sortByRecency(trips: RoadTrip[]): RoadTrip[] {
  return [...trips].sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}

/**
 * Collision-resistant id in the `trip-<random>` shape.
 * Falls back to a timestamp when `crypto.randomUUID` is unavailable.
 */
export function generateTripId(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (typeof cryptoApi?.randomUUID === 'function') return `trip-${cryptoApi.randomUUID()}`;
  return `trip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
