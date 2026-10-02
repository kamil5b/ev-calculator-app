import { describe, expect, it } from 'vitest';
import {
  convertDistance,
  convertEfficiency,
  efficiencyBounds,
  efficiencyUnitLabel,
  isDistanceUnit,
} from '../DistanceUnit';

describe('DistanceUnit', () => {
  it('converts distances (PRD Phase 2 example: 169 km → 105 mi)', () => {
    expect(Math.round(convertDistance(169, 'km', 'mi'))).toBe(105);
    expect(convertDistance(1, 'mi', 'km')).toBe(1.609344);
    expect(convertDistance(42, 'km', 'km')).toBe(42);
  });

  it('converts efficiency inversely to distance', () => {
    expect(convertEfficiency(17, 'km', 'mi')).toBeCloseTo(27.36, 2);
    expect(convertEfficiency(27.358848, 'mi', 'km')).toBeCloseTo(17, 6);
  });

  it('converts the validation bounds (5–30 kWh/100km → 8.0–48.3 kWh/100mi)', () => {
    expect(efficiencyBounds('km')).toEqual({ min: 5, max: 30 });
    expect(efficiencyBounds('mi')).toEqual({ min: 8, max: 48.3 });
  });

  it('labels the efficiency unit', () => {
    expect(efficiencyUnitLabel('km')).toBe('kWh/100km');
    expect(efficiencyUnitLabel('mi')).toBe('kWh/100mi');
  });

  it('recognises only the supported units', () => {
    expect(isDistanceUnit('km')).toBe(true);
    expect(isDistanceUnit('mi')).toBe(true);
    expect(isDistanceUnit('furlong')).toBe(false);
    expect(isDistanceUnit(undefined)).toBe(false);
  });
});
