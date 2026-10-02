import { describe, expect, it } from 'vitest';
import { calculateRangeToMinimum } from '../CalculateRange';

describe('CalculateRange', () => {
  it('calculates the range down to the reserve level (Appendix A)', () => {
    // Appendix A prints 205 km, but its own inputs give
    // (35 / 100) × 82 / 17 = 168.8 → 169 km. 205 km would require an
    // efficiency of 14 kWh/100km, not the stated 17. Section 2.2's formula
    // is authoritative, so the example's figure is the outlier.
    expect(
      calculateRangeToMinimum({
        currentBattery: 45,
        minBattery: 10,
        totalCapacity: 82,
        efficiency: 17,
      }),
    ).toBe(169);
  });

  it('returns null when no efficiency is supplied (PRD 2.2)', () => {
    expect(
      calculateRangeToMinimum({ currentBattery: 45, minBattery: 10, totalCapacity: 82, efficiency: null }),
    ).toBeNull();
    expect(calculateRangeToMinimum({ currentBattery: 45, minBattery: 10, totalCapacity: 82 })).toBeNull();
  });

  it('guards against division by zero (PRD 8.2)', () => {
    expect(
      calculateRangeToMinimum({ currentBattery: 50, minBattery: 0, totalCapacity: 82, efficiency: 0 }),
    ).toBeNull();
  });

  it('rejects negative and non-finite efficiency values', () => {
    expect(
      calculateRangeToMinimum({ currentBattery: 50, minBattery: 0, totalCapacity: 82, efficiency: -5 }),
    ).toBeNull();
    expect(
      calculateRangeToMinimum({
        currentBattery: 50,
        minBattery: 0,
        totalCapacity: 82,
        efficiency: Number.NaN,
      }),
    ).toBeNull();
  });

  it('returns zero when already at the reserve level', () => {
    expect(
      calculateRangeToMinimum({ currentBattery: 10, minBattery: 10, totalCapacity: 82, efficiency: 17 }),
    ).toBe(0);
  });

  it('returns zero when below the reserve level', () => {
    expect(
      calculateRangeToMinimum({ currentBattery: 5, minBattery: 20, totalCapacity: 82, efficiency: 17 }),
    ).toBe(0);
  });

  it('rounds to the nearest kilometre', () => {
    expect(
      calculateRangeToMinimum({ currentBattery: 100, minBattery: 0, totalCapacity: 82, efficiency: 17 }),
    ).toBe(482);
  });

  it('ignores the reserve level when it is 0%', () => {
    expect(
      calculateRangeToMinimum({ currentBattery: 50, minBattery: 0, totalCapacity: 60, efficiency: 15 }),
    ).toBe(200);
  });
});
