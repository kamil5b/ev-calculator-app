import { describe, expect, it } from 'vitest';
import { calculateNeededKWh } from '../CalculateNeededKWh';

describe('CalculateNeededKWh', () => {
  it('calculates the charge needed to reach a higher target', () => {
    expect(calculateNeededKWh({ currentBattery: 45, targetBattery: 90, totalCapacity: 82 })).toBe(36.9);
  });

  it('returns zero when already at the target', () => {
    expect(calculateNeededKWh({ currentBattery: 60, targetBattery: 60, totalCapacity: 82 })).toBe(0);
  });

  it('is negative when the target is below the current level', () => {
    // PRD 8.2: "Target < Current → shows negative needed kWh (discharging)".
    expect(calculateNeededKWh({ currentBattery: 90, targetBattery: 45, totalCapacity: 82 })).toBe(-36.9);
  });

  it('charges from empty to full', () => {
    expect(calculateNeededKWh({ currentBattery: 0, targetBattery: 100, totalCapacity: 100 })).toBe(100);
  });

  it('discharges from full to empty', () => {
    expect(calculateNeededKWh({ currentBattery: 100, targetBattery: 0, totalCapacity: 100 })).toBe(-100);
  });

  it('clamps out-of-range targets into the 0-100 window', () => {
    expect(calculateNeededKWh({ currentBattery: 50, targetBattery: 150, totalCapacity: 100 })).toBe(50);
    expect(calculateNeededKWh({ currentBattery: 50, targetBattery: -10, totalCapacity: 100 })).toBe(-50);
  });

  it('is zero for non-numeric input instead of NaN', () => {
    expect(calculateNeededKWh({ currentBattery: Number.NaN, targetBattery: 100, totalCapacity: 82 })).toBe(0);
  });
});
