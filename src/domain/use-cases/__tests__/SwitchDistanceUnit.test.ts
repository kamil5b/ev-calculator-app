import { describe, expect, it } from 'vitest';
import { switchDistanceUnit } from '../SwitchDistanceUnit';
import { validateBatteryInputs } from '../ValidateBatteryInputs';
import { DEFAULT_BATTERY_STATE, type BatteryState } from '../../entities/BatteryState';

const state = (overrides: Partial<BatteryState> = {}): BatteryState => ({
  ...DEFAULT_BATTERY_STATE,
  ...overrides,
});

describe('SwitchDistanceUnit', () => {
  it('converts efficiency and trip distance to miles', () => {
    const result = switchDistanceUnit(state({ efficiency: 17, tripDistance: 50 }), 'mi');
    expect(result.distanceUnit).toBe('mi');
    // A mile is longer, so consumption per 100 mi is higher: 17 × 1.609344 = 27.36.
    expect(result.efficiency).toBeCloseTo(27.36, 2);
    expect(result.tripDistance).toBeCloseTo(31.07, 2);
  });

  it('round-trips without drift in either direction', () => {
    const fromKm = state({ efficiency: 17, tripDistance: 50 });
    const viaMi = switchDistanceUnit(switchDistanceUnit(fromKm, 'mi'), 'km');
    expect(viaMi.efficiency).toBeCloseTo(17, 9);
    expect(viaMi.tripDistance).toBeCloseTo(50, 9);

    const fromMi = state({ distanceUnit: 'mi', efficiency: 27.4, tripDistance: 10.4 });
    const viaKm = switchDistanceUnit(switchDistanceUnit(fromMi, 'km'), 'mi');
    expect(viaKm.efficiency).toBeCloseTo(27.4, 9);
    expect(viaKm.tripDistance).toBeCloseTo(10.4, 9);
  });

  it('keeps a bound value valid after switching units', () => {
    // 8.0 kWh/100mi is 4.971 kWh/100km — still the minimum at one decimal.
    const result = switchDistanceUnit(state({ distanceUnit: 'mi', efficiency: 8 }), 'km');
    expect(validateBatteryInputs(result)).toEqual([]);
  });

  it('leaves empty and half-typed fields untouched', () => {
    const result = switchDistanceUnit(state({ efficiency: null, tripDistance: Number.NaN }), 'mi');
    expect(result.efficiency).toBeNull();
    expect(result.tripDistance).toBeNaN();
  });

  it('does not touch battery or price fields', () => {
    const original = state({ currentBattery: 45, totalCapacity: 82, electricityRate: 0.35 });
    const result = switchDistanceUnit(original, 'mi');
    expect(result.currentBattery).toBe(45);
    expect(result.totalCapacity).toBe(82);
    expect(result.electricityRate).toBe(0.35);
  });

  it('returns the same state when the unit does not change', () => {
    const original = state();
    expect(switchDistanceUnit(original, 'km')).toBe(original);
  });
});
