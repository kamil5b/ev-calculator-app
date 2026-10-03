import type { IRoadTripRepository } from '../../domain/repositories/IRoadTripRepository';
import type { RoadTrip, RoadTripDraft } from '../../domain/entities/RoadTrip';
import { validateRoadTrip } from '../../domain/use-cases/ValidateRoadTrip';
import type { FieldError } from '../../domain/entities/validation';
import { VALIDATION_MESSAGES } from '../../domain/entities/validation';

/** Outcome of a save or update attempt. */
export type RoadTripMutationResult =
  | { readonly ok: true; readonly trip: RoadTrip }
  | { readonly ok: false; readonly errors: FieldError[] };

/**
 * Application service for saved road trips (PRD 11 extension).
 *
 * Validates before anything is written, so an unnamed trip can never reach
 * storage. Mirrors {@link CarModelService}.
 */
export class RoadTripService {
  constructor(private readonly repository: IRoadTripRepository) {}

  /** All saved trips, newest first. */
  list(): RoadTrip[] {
    return this.repository.getAll();
  }

  getById(id: string): RoadTrip | null {
    return this.repository.getById(id);
  }

  /** Saves a new trip after validating its name. */
  add(draft: RoadTripDraft): RoadTripMutationResult {
    const errors = validateRoadTrip(draft);
    if (errors.length > 0) return { ok: false, errors };

    return { ok: true, trip: this.repository.add(draft) };
  }

  /**
   * Overwrites a stored trip with the given changes (plan and/or name).
   * The id and creation time are preserved.
   */
  update(id: string, changes: Partial<RoadTripDraft>): RoadTripMutationResult {
    if (this.repository.getById(id) === null) {
      return { ok: false, errors: [{ field: 'tripId', message: VALIDATION_MESSAGES.tripIdInvalid }] };
    }

    // Validate the merged record: a rename must also satisfy the name rules.
    const current = this.repository.getById(id) as RoadTrip;
    const merged: RoadTripDraft = {
      name: changes.name ?? current.name,
      plan: changes.plan ?? current.plan,
      distanceUnit: changes.distanceUnit ?? current.distanceUnit,
    };
    const errors = validateRoadTrip(merged);
    if (errors.length > 0) return { ok: false, errors };

    return { ok: true, trip: this.repository.update(id, merged) as RoadTrip };
  }
}
