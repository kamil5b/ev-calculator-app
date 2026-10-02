import { describe, expect, it } from 'vitest';
import { calculateChargeCost } from '../CalculateChargeCost';

describe('CalculateChargeCost', () => {
  it('multiplies the energy by the rate', () => {
    expect(calculateChargeCost({ kWh: 36.9, ratePerKWh: 0.35 })).toBe(12.92);
  });

  it('rounds to cents', () => {
    expect(calculateChargeCost({ kWh: 10, ratePerKWh: 0.333 })).toBe(3.33);
  });

  it('charges nothing when already above target', () => {
    expect(calculateChargeCost({ kWh: -12, ratePerKWh: 0.35 })).toBe(0);
  });

  it('allows a free charger', () => {
    expect(calculateChargeCost({ kWh: 36.9, ratePerKWh: 0 })).toBe(0);
  });

  it('returns null without a usable rate', () => {
    for (const ratePerKWh of [null, undefined, -0.1, Number.NaN]) {
      expect(calculateChargeCost({ kWh: 36.9, ratePerKWh })).toBeNull();
    }
  });
});
