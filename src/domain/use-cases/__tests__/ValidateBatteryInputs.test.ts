import { describe, expect, it } from 'vitest';
import { validateBatteryInputs, isBatteryInputValid } from '../ValidateBatteryInputs';
import { DEFAULT_BATTERY_STATE, type BatteryState } from '../../entities/BatteryState';
import { VALIDATION_MESSAGES } from '../../entities/validation';

const state = (overrides: Partial<BatteryState> = {}): BatteryState => ({
  ...DEFAULT_BATTERY_STATE,
  ...overrides,
});

describe('ValidateBatteryInputs', () => {
  it('accepts the default state', () => {
    expect(validateBatteryInputs(state())).toEqual([]);
    expect(isBatteryInputValid(state())).toBe(true);
  });

  it('accepts an empty optional efficiency', () => {
    expect(isBatteryInputValid(state({ efficiency: null }))).toBe(true);
  });

  it.each([0, 50, 100])('accepts %i%% battery levels', (percent) => {
    expect(
      isBatteryInputValid(state({ currentBattery: percent, targetBattery: percent, minBattery: percent })),
    ).toBe(true);
  });

  it('rejects percentages outside 0-100', () => {
    const errors = validateBatteryInputs(state({ currentBattery: 101 }));
    expect(errors).toEqual([{ field: 'currentBattery', message: VALIDATION_MESSAGES.percentRange }]);
  });

  it('rejects negative percentages', () => {
    const errors = validateBatteryInputs(state({ minBattery: -1 }));
    expect(errors[0]?.message).toBe(VALIDATION_MESSAGES.percentRange);
  });

  it('rejects a capacity outside 10-200 kWh', () => {
    expect(validateBatteryInputs(state({ totalCapacity: 9 }))).toEqual([
      { field: 'totalCapacity', message: VALIDATION_MESSAGES.capacityRange },
    ]);
    expect(validateBatteryInputs(state({ totalCapacity: 201 }))).toHaveLength(1);
  });

  it('reports an emptied capacity as required (PRD 8.1)', () => {
    expect(validateBatteryInputs(state({ totalCapacity: Number.NaN }))).toEqual([
      { field: 'totalCapacity', message: VALIDATION_MESSAGES.capacityRequired },
    ]);
  });

  it('rejects an efficiency outside 5-30 kWh/100km', () => {
    expect(validateBatteryInputs(state({ efficiency: 4 }))).toEqual([
      { field: 'efficiency', message: VALIDATION_MESSAGES.efficiencyRange },
    ]);
    expect(validateBatteryInputs(state({ efficiency: 31 }))).toHaveLength(1);
  });

  it('reports every failing field at once', () => {
    const errors = validateBatteryInputs(
      state({ totalCapacity: 5, currentBattery: 200, targetBattery: -1, minBattery: 101, efficiency: 99 }),
    );
    expect(errors.map((error) => error.field).sort()).toEqual([
      'currentBattery',
      'efficiency',
      'minBattery',
      'targetBattery',
      'totalCapacity',
    ]);
  });
});
