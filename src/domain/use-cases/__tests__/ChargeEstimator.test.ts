import { describe, expect, it } from 'vitest';
import { estimateChargeNeeded } from '../ChargeEstimator';

describe('ChargeEstimator', () => {
  it('calculates the charge needed at the charger (PRD Phase 2 example)', () => {
    // 20% of 82 kWh = 16.4 kWh; 10 km at 17 kWh/100km uses 1.7 kWh → 14.7 kWh (18%).
    const result = estimateChargeNeeded({
      currentBattery: 20,
      totalCapacity: 82,
      distance: 10,
      efficiency: 17,
    });
    expect(result?.isReachable).toBe(true);
    expect(result?.leftKWh).toBe(14.7);
    expect(result?.leftPercent).toBe(18);
    expect(result?.kWhToCharge).toBe(67.3);
  });

  it('detects an unreachable charger', () => {
    const result = estimateChargeNeeded({
      currentBattery: 10,
      totalCapacity: 82,
      distance: 500,
      efficiency: 17,
    });
    expect(result?.isReachable).toBe(false);
    expect(result?.kWhToCharge).toBeNull();
  });

  it('needs a full pack when arriving empty', () => {
    const result = estimateChargeNeeded({
      currentBattery: 10,
      totalCapacity: 85,
      distance: 50,
      efficiency: 17,
    });
    expect(result?.kWhToCharge).toBe(85);
  });

  it('returns null when the arrival cannot be estimated', () => {
    expect(
      estimateChargeNeeded({ currentBattery: 20, totalCapacity: 82, distance: 10, efficiency: null }),
    ).toBeNull();
  });
});
