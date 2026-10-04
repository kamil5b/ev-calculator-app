/**
 * Domain vocabulary for the calculator.
 *
 * Kept separate from the entity modules so use cases, services and the UI all
 * quote the same limits and messages. Changing a limit is a single edit here.
 */

import { MAX_TRIP_NAME_LENGTH } from './RoadTrip';

/** Smallest usable capacity the calculator accepts, in kWh (PRD 8.1). */
export const MIN_CAPACITY = 10;

/** Largest usable capacity the calculator accepts, in kWh (PRD 8.1). */
export const MAX_CAPACITY = 200;

/** Lowest plausible consumption, in kWh/100km (PRD 8.1). */
export const MIN_EFFICIENCY = 5;

/** Highest plausible consumption, in kWh/100km (PRD 8.1). */
export const MAX_EFFICIENCY = 30;

/** Battery percentages are whole numbers between these bounds (PRD 8.1). */
export const MIN_BATTERY_PERCENT = 0;
export const MAX_BATTERY_PERCENT = 100;

/** Displayed when range cannot be computed because efficiency is missing. */
export const NOT_AVAILABLE = 'N/A';

/** Inline validation copy (PRD 8.1). */
export const VALIDATION_MESSAGES = {
  percentRange: `Must be between ${MIN_BATTERY_PERCENT} and ${MAX_BATTERY_PERCENT}`,
  capacityRange: `Capacity must be between ${MIN_CAPACITY} and ${MAX_CAPACITY} kWh`,
  efficiencyRange: `Efficiency must be between ${MIN_EFFICIENCY} and ${MAX_EFFICIENCY} kWh/100km`,
  notANumber: 'Must be a valid number',
  distanceNegative: 'Distance cannot be negative',
  rateNegative: 'Price cannot be negative',
  capacityRequired: 'Capacity is required',
  modelRequired: 'Model is required',
  carIdInvalid: 'That car no longer exists',
  tripNameRequired: 'Trip name is required',
  tripNameTooLong: `Trip name must be ${MAX_TRIP_NAME_LENGTH} characters or fewer`,
  tripIdInvalid: 'That trip no longer exists',
  /** Trip file portability (TRIP_EXPORT_IMPORT §3). */
  tripImportInvalid: 'That file is not a valid trip export',
  tripImportVersion: 'Unsupported trip file version',
  /** "Plan with actual place" provider failures (ACTUAL_PLACE_PLANNING §7). */
  routeNoRoute: 'No route found between these places',
  routeRateLimit: 'Too many requests — wait a moment and try again',
  routeNetwork: 'No connection — check your network and try again',
  searchNoResults: 'No results',
  searchFailed: 'Search failed — check your connection and try again',
  needsPlaces: 'Pick a place for every point first',
} as const;

/** A single field-level validation failure, safe to render under an input. */
export interface FieldError {
  readonly field: string;
  readonly message: string;
}
