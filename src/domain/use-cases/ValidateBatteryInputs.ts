import type { BatteryState } from '../entities/BatteryState';
import {
  MAX_BATTERY_PERCENT,
  MAX_CAPACITY,
  MAX_EFFICIENCY,
  MIN_BATTERY_PERCENT,
  MIN_CAPACITY,
  MIN_EFFICIENCY,
  VALIDATION_MESSAGES,
  type FieldError,
} from '../entities/validation';

/** Name of a form field, used to place errors beneath the right control. */
export type BatteryField = 'totalCapacity' | 'currentBattery' | 'targetBattery' | 'minBattery' | 'efficiency';

/**
 * Validates the raw form values before they are folded into the state.
 *
 * Rules come straight from PRD 8.1: percentages are whole numbers in 0–100,
 * capacity is a 10–200 kWh decimal and efficiency is an optional 5–30 kWh/100km
 * decimal. Only efficiency may be blank; everything else is required.
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

  if (inputs.efficiency !== null) {
    if (!Number.isFinite(inputs.efficiency)) {
      errors.push({ field: 'efficiency', message: VALIDATION_MESSAGES.notANumber });
    } else if (inputs.efficiency < MIN_EFFICIENCY || inputs.efficiency > MAX_EFFICIENCY) {
      errors.push({ field: 'efficiency', message: VALIDATION_MESSAGES.efficiencyRange });
    }
  }

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
