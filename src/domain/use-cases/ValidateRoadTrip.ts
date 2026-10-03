import type { RoadTripDraft } from '../entities/RoadTrip';
import { MAX_TRIP_NAME_LENGTH } from '../entities/RoadTrip';
import { VALIDATION_MESSAGES, type FieldError } from '../entities/validation';

/**
 * Domain rules for a saved road trip: the name is required and bounded (PRD 11).
 * The plan itself is always structurally valid by construction.
 */
export function validateRoadTrip(draft: RoadTripDraft): FieldError[] {
  const errors: FieldError[] = [];
  const name = draft.name.trim();

  if (name.length === 0) {
    errors.push({ field: 'tripName', message: VALIDATION_MESSAGES.tripNameRequired });
  } else if (name.length > MAX_TRIP_NAME_LENGTH) {
    errors.push({ field: 'tripName', message: VALIDATION_MESSAGES.tripNameTooLong });
  }

  return errors;
}
