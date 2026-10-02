import type { CarModelDraft } from '../entities/CarModel';
import { MAX_CAPACITY, MIN_CAPACITY, VALIDATION_MESSAGES, type FieldError } from '../entities/validation';

/**
 * Domain rules for a car registration or edit (PRD 2.4.1, 8.1).
 *
 * The model string is mandatory; the nickname is optional and may be empty.
 * Capacity must be a finite decimal inside 10–200 kWh.
 */
export function validateCarModel(draft: CarModelDraft): FieldError[] {
  const errors: FieldError[] = [];

  if (draft.model.trim().length === 0) {
    errors.push({ field: 'model', message: VALIDATION_MESSAGES.modelRequired });
  }

  if (!Number.isFinite(draft.capacity)) {
    errors.push({ field: 'capacity', message: VALIDATION_MESSAGES.notANumber });
  } else if (draft.capacity < MIN_CAPACITY || draft.capacity > MAX_CAPACITY) {
    errors.push({ field: 'capacity', message: VALIDATION_MESSAGES.capacityRange });
  }

  return errors;
}

/** `true` when the draft satisfies every domain rule. */
export function isCarModelValid(draft: CarModelDraft): boolean {
  return validateCarModel(draft).length === 0;
}
