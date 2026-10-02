import { describe, expect, it } from 'vitest';
import { calculateRangeToMinimum } from '../CalculateRange';

describe('CalculateRange', () => {
  it('calculates the range down to the reserve level (Appendix A)', () => {
    // ((45 - 10) / 100) × 82 / 17 = 168.6 → 169 km. Appendix A prints 205 km,
    // which corresponds to 62.7 kWh/17... the PRD figure is inconsistent with its
    // own formula, so the formula in section 2.2 is treated as authoritative.
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
    expect(
      calculateRangeToMinimum({ currentBattery: 45, minBattery: 10, totalCapacity: 82 }),
    ).toBeNull();
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
