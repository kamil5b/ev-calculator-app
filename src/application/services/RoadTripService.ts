import type { IRoadTripRepository } from '../../domain/repositories/IRoadTripRepository';
import type { RoadTrip, RoadTripDraft } from '../../domain/entities/RoadTrip';
import { TRIP_EXPORT_FORMAT, TRIP_EXPORT_VERSION } from '../../domain/entities/RoadTrip';
import { validateRoadTrip } from '../../domain/use-cases/ValidateRoadTrip';
import type { FieldError } from '../../domain/entities/validation';
import { VALIDATION_MESSAGES } from '../../domain/entities/validation';
import { coerceRoadPlan } from './PersistenceService';
import { isDistanceUnit } from '../../domain/entities/DistanceUnit';

/** Outcome of a save or update attempt. */
export type RoadTripMutationResult =
  { readonly ok: true; readonly trip: RoadTrip } | { readonly ok: false; readonly errors: FieldError[] };

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

  /** Deletes a stored trip. Returns `false` when there was nothing to delete. */
  remove(id: string): boolean {
    return this.repository.remove(id);
  }

  /**
   * Serialises a stored trip into the portable envelope (TRIP_EXPORT_IMPORT §2).
   * Only the draft fields travel — `id` and `createdAt` are local identity.
   */
  static serialize(trip: RoadTrip): string {
    return JSON.stringify(
      {
        format: TRIP_EXPORT_FORMAT,
        version: TRIP_EXPORT_VERSION,
        trip: {
          name: trip.name,
          plan: trip.plan,
          distanceUnit: trip.distanceUnit,
        },
      },
      null,
      2,
    );
  }

  /**
   * Imports an exported trip file as a **new** trip (TRIP_EXPORT_IMPORT §3).
   * Malformed files are rejected; malformed fields degrade exactly like a
   * storage read. Never throws.
   */
  importTrip(json: string): RoadTripMutationResult {
    const draft = parseTripExport(json);
    if ('error' in draft) return { ok: false, errors: [draft.error] };

    const errors = validateRoadTrip(draft.draft);
    if (errors.length > 0) return { ok: false, errors };

    return { ok: true, trip: this.repository.add(draft.draft) };
  }
}

/** Total parser for an exported file: a draft, or the reason it was rejected. */
function parseTripExport(json: string): { draft: RoadTripDraft } | { error: FieldError } {
  const invalid = { error: { field: 'tripImport', message: VALIDATION_MESSAGES.tripImportInvalid } };

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return invalid;
  }

  if (typeof parsed !== 'object' || parsed === null) return invalid;
  const envelope = parsed as Record<string, unknown>;

  if (envelope.format !== TRIP_EXPORT_FORMAT) return invalid;
  if (typeof envelope.version !== 'number') return invalid;
  if (envelope.version !== TRIP_EXPORT_VERSION) {
    return { error: { field: 'tripImport', message: VALIDATION_MESSAGES.tripImportVersion } };
  }

  const raw = envelope.trip;
  if (typeof raw !== 'object' || raw === null) return invalid;
  const trip = raw as Record<string, unknown>;

  if (typeof trip.name !== 'string') return invalid;

  return {
    draft: {
      name: trip.name,
      plan: coerceRoadPlan(trip.plan),
      distanceUnit: isDistanceUnit(trip.distanceUnit) ? trip.distanceUnit : 'km',
    },
  };
}
