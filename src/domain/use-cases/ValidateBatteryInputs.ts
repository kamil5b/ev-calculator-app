import type { BatteryState } from '../entities/BatteryState';
import { efficiencyBounds, efficiencyUnitLabel, type DistanceUnit } from '../entities/DistanceUnit';
import { round1 } from './math';
import {
  MAX_BATTERY_PERCENT,
  MAX_CAPACITY,
  MIN_BATTERY_PERCENT,
  MIN_CAPACITY,
  VALIDATION_MESSAGES,
  type FieldError,
} from '../entities/validation';

/** Name of a form field, used to place errors beneath the right control. */
export type BatteryField =
  | 'totalCapacity'
  | 'currentBattery'
  | 'targetBattery'
  | 'minBattery'
  | 'efficiency'
  | 'tripDistance'
  | 'electricityRate'
  | 'roadInitial'
  | `roadLeg${number}`
  | `roadChargeTo${number}`;

/**
 * Validates the raw form values before they are folded into the state.
 *
 * Rules come straight from PRD 8.1: percentages are whole numbers in 0–100,
 * capacity is a 10–200 kWh decimal and efficiency is an optional 5–30 kWh/100km
 * (8.0–48.3 kWh/100mi) decimal. The Phase 2 trip and price fields are optional
 * too: a blank field is `null`, and a filled one must be a non-negative number.
 */
export function validateBatteryInputs(inputs: BatteryState): FieldError[] {
  const errors: FieldError[] = [];

  if (!Number.isFinite(inputs.totalCapacity)) {
    // An empty field parses to NaN, which is what the user means by "required".
    errors.push({ field: 'totalCapacity', message: VALIDATION_MESSAGES.capacityRequired });
  } else if (inputs.totalCapacity < MIN_CAPACITY || inputs.totalCapacity > MAX_CAPACITY) {
    errors.push({ field: 'totalCapacity', message: VALIDATION_MESSAGES.capacityRange });
  }

  errors.push(...validatePercent('currentBattery', inputs.currentBattery));
  errors.push(...validatePercent('targetBattery', inputs.targetBattery));
  errors.push(...validatePercent('minBattery', inputs.minBattery));

  errors.push(...validateEfficiency('efficiency', inputs.efficiency, inputs.distanceUnit));
  errors.push(
    ...validateNonNegative('tripDistance', inputs.tripDistance, VALIDATION_MESSAGES.distanceNegative),
  );
  errors.push(
    ...validateNonNegative('electricityRate', inputs.electricityRate, VALIDATION_MESSAGES.rateNegative),
  );

  errors.push(...validateRoadPlan(inputs));

  return errors;
}

/**
 * Road planner rules (PRD 11): the initial % is a normal percentage, every
 * filled leg is a non-negative distance and a charging stop may only target a
 * valid percentage. Empty legs are `null` and pass — "not filled in yet" is a
 * legitimate intermediate state, not an error.
 */
function validateRoadPlan(inputs: BatteryState): FieldError[] {
  const errors: FieldError[] = [];
  const plan = inputs.roadPlan;

  errors.push(...validatePercent('roadInitial', plan.initialPercent));

  plan.legs.forEach((leg, index) => {
    if (leg === null) return;
    if (!Number.isFinite(leg)) {
      errors.push({ field: `roadLeg${index}`, message: VALIDATION_MESSAGES.notANumber });
    } else if (leg < 0) {
      errors.push({ field: `roadLeg${index}`, message: VALIDATION_MESSAGES.distanceNegative });
    }
  });

  plan.stops.forEach((stop, index) => {
    if (!stop.charging) return;
    errors.push(...validatePercent(`roadChargeTo${index}`, stop.chargeTo));
  });

  return errors;
}

/** `true` when every field satisfies the domain rules. */
export function isBatteryInputValid(inputs: BatteryState): boolean {
  return validateBatteryInputs(inputs).length === 0;
}

function validatePercent(field: BatteryField, value: number): FieldError[] {
  if (!Number.isFinite(value)) {
    return [{ field, message: VALIDATION_MESSAGES.notANumber }];
  }
  if (value < MIN_BATTERY_PERCENT || value > MAX_BATTERY_PERCENT) {
    return [{ field, message: VALIDATION_MESSAGES.percentRange }];
  }
  return [];
}

/** Range message for the efficiency fields, quoting the bounds in the active unit. */
export function efficiencyRangeMessage(unit: DistanceUnit): string {
  const { min, max } = efficiencyBounds(unit);
  return `Efficiency must be between ${min} and ${max} ${efficiencyUnitLabel(unit)}`;
}

/**
 * Bounds check at the inputs' one-decimal precision.
 *
 * A value converted from the other unit is kept at full precision (see
 * `switchDistanceUnit`), so the 8.0 kWh/100mi minimum arrives in km as 4.971;
 * comparing the rounded value keeps it valid on both sides of the toggle.
 */
export function isEfficiencyInBounds(value: number, unit: DistanceUnit): boolean {
  const { min, max } = efficiencyBounds(unit);
  const rounded = round1(value);
  return rounded >= min && rounded <= max;
}

function validateEfficiency(field: BatteryField, value: number | null, unit: DistanceUnit): FieldError[] {
  if (value === null) return [];
  if (!Number.isFinite(value)) return [{ field, message: VALIDATION_MESSAGES.notANumber }];
  if (!isEfficiencyInBounds(value, unit)) return [{ field, message: efficiencyRangeMessage(unit) }];
  return [];
}

function validateNonNegative(field: BatteryField, value: number | null, message: string): FieldError[] {
  if (value === null) return [];
  if (!Number.isFinite(value)) return [{ field, message: VALIDATION_MESSAGES.notANumber }];
  if (value < 0) return [{ field, message }];
  return [];
}
