import { describe, expect, it } from 'vitest';
import { calculateCurrentKWh } from '../CalculateCurrentKWh';

describe('CalculateCurrentKWh', () => {
  it('should calculate current kWh correctly', () => {
    const result = calculateCurrentKWh({ currentBattery: 50, totalCapacity: 82 });
    expect(result).toBe(41.0);
  });

  it('should handle edge case: 0%', () => {
    const result = calculateCurrentKWh({ currentBattery: 0, totalCapacity: 82 });
    expect(result).toBe(0);
  });

  it('should handle edge case: 100%', () => {
    const result = calculateCurrentKWh({ currentBattery: 100, totalCapacity: 82 });
    expect(result).toBe(82);
  });

  it('rounds to a single decimal place', () => {
    expect(calculateCurrentKWh({ currentBattery: 45, totalCapacity: 82 })).toBe(36.9);
    expect(calculateCurrentKWh({ currentBattery: 33, totalCapacity: 55 })).toBe(18.2);
  });

  it('handles fractional capacities', () => {
    expect(calculateCurrentKWh({ currentBattery: 50, totalCapacity: 82.5 })).toBe(41.3);
  });

  it('clamps percentages outside 0-100', () => {
    expect(calculateCurrentKWh({ currentBattery: 150, totalCapacity: 100 })).toBe(100);
    expect(calculateCurrentKWh({ currentBattery: -20, totalCapacity: 100 })).toBe(0);
  });

  it('treats non-numeric input as an empty pack rather than NaN', () => {
    expect(calculateCurrentKWh({ currentBattery: Number.NaN, totalCapacity: 82 })).toBe(0);
    expect(calculateCurrentKWh({ currentBattery: 50, totalCapacity: Number.NaN })).toBe(0);
    expect(calculateCurrentKWh({ currentBattery: Number.POSITIVE_INFINITY, totalCapacity: 82 })).toBe(0);
  });

  it('never returns -0', () => {
    expect(Object.is(calculateCurrentKWh({ currentBattery: -5, totalCapacity: -5 }), 0)).toBe(true);
  });
});
