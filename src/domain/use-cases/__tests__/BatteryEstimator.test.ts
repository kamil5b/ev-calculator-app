import { describe, expect, it } from 'vitest';
import { estimateBatteryOnArrival } from '../BatteryEstimator';

describe('BatteryEstimator', () => {
  it('estimates the battery left on arrival (PRD Phase 2 example)', () => {
    // 80% of 82 kWh = 65.6 kWh; 50 km at 17 kWh/100km uses 8.5 kWh → 57.1 kWh (69.6% → 70%).
    expect(
      estimateBatteryOnArrival({ currentBattery: 80, totalCapacity: 82, distance: 50, efficiency: 17 }),
    ).toEqual({ isReachable: true, usedKWh: 8.5, leftKWh: 57.1, leftPercent: 70 });
  });

  it('flags a target that needs more energy than the pack holds', () => {
    const result = estimateBatteryOnArrival({
      currentBattery: 10,
      totalCapacity: 82,
      distance: 500,
      efficiency: 17,
    });
    expect(result?.isReachable).toBe(false);
    expect(result?.leftKWh).toBeLessThan(0);
  });

  it('treats arriving on exactly 0 kWh as reachable', () => {
    // 10% of 85 kWh = 8.5 kWh, exactly what 50 km at 17 kWh/100km uses.
    const result = estimateBatteryOnArrival({
      currentBattery: 10,
      totalCapacity: 85,
      distance: 50,
      efficiency: 17,
    });
    expect(result).toEqual({ isReachable: true, usedKWh: 8.5, leftKWh: 0, leftPercent: 0 });
  });

  it('leaves the pack untouched for a zero distance', () => {
    expect(
      estimateBatteryOnArrival({ currentBattery: 50, totalCapacity: 82, distance: 0, efficiency: 17 }),
    ).toEqual({ isReachable: true, usedKWh: 0, leftKWh: 41, leftPercent: 50 });
  });

  it('is unit-agnostic as long as distance and efficiency agree', () => {
    // 31.07 mi at 27.36 kWh/100mi is the same 50 km / 17 kWh/100km trip.
    const result = estimateBatteryOnArrival({
      currentBattery: 80,
      totalCapacity: 82,
      distance: 31.0686,
      efficiency: 27.3588,
    });
    expect(result?.leftKWh).toBe(57.1);
  });

  it('returns null without a usable efficiency', () => {
    for (const efficiency of [null, undefined, 0, -5, Number.NaN]) {
      expect(
        estimateBatteryOnArrival({ currentBattery: 80, totalCapacity: 82, distance: 50, efficiency }),
      ).toBeNull();
    }
  });

  it('returns null for a negative or non-finite distance', () => {
    for (const distance of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        estimateBatteryOnArrival({ currentBattery: 80, totalCapacity: 82, distance, efficiency: 17 }),
      ).toBeNull();
    }
  });

  it('returns null for an empty capacity', () => {
    expect(
      estimateBatteryOnArrival({ currentBattery: 80, totalCapacity: 0, distance: 50, efficiency: 17 }),
    ).toBeNull();
  });
});
