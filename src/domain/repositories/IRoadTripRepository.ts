import type { RoadTrip, RoadTripDraft } from '../entities/RoadTrip';

/**
 * Persistence boundary for saved road trips (PRD 11 extension).
 *
 * Declared in the domain layer and implemented in `infrastructure/` so the
 * domain stays framework-agnostic and unit-testable with an in-memory double.
 */
export interface IRoadTripRepository {
  /** All saved trips, newest first. Never throws; returns `[]` on failure. */
  getAll(): RoadTrip[];

  /** Looks a trip up by id, or `null` when it does not exist. */
  getById(id: string): RoadTrip | null;

  /** Persists a new trip and returns the stored record (with its generated id). */
  add(draft: RoadTripDraft): RoadTrip;

  /** Applies a partial edit. Returns the updated trip, or `null` if unknown. */
  update(id: string, changes: Partial<Omit<RoadTrip, 'id' | 'createdAt'>>): RoadTrip | null;

  /** Removes a trip. Returns `true` when a record was actually deleted. */
  remove(id: string): boolean;
}
