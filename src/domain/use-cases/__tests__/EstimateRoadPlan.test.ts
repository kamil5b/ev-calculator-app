import { describe, expect, it } from 'vitest';
import { estimateRoadPlan, type RoadPlanInput } from '../EstimateRoadPlan';
import type { RoadPlan } from '../../entities/RoadPlan';

/** 75 kWh pack, 17 kWh/100km, €0.35/kWh, no reserve — overrides split into
 * plan fields (`initialPercent`, `legs`, `stops`) and input fields. */
const input = (
  overrides: Partial<RoadPlan> & Partial<Omit<RoadPlanInput, 'plan'>> = {},
): RoadPlanInput => {
  const { initialPercent, legs, stops, ...rest } = overrides;
  return {
    plan: {
      initialPercent: initialPercent ?? 80,
      legs: legs ?? [100],
      stops: stops ?? [{ charging: false, chargeTo: 100 }],
      names: ['', ''],
    },
    totalCapacity: 75,
    efficiency: 17,
    electricityRate: 0.35,
    minBattery: 0,
    ...rest,
  };
};

describe('estimateRoadPlan', () => {
  it('walks a single uncharged leg', () => {
    const result = estimateRoadPlan(input());

    expect(result.available).toBe(true);
    expect(result.points).toHaveLength(2);
    // 100 km × 17 / 100 = 17 kWh → 17 / 75 × 100 = 22.7 % used.
    expect(result.points[1]).toMatchObject({
      legDistance: 100,
      legEnergyKWh: 17,
      arrivalPercent: 57.3,
      departurePercent: 57.3,
      unreachable: false,
      chargeKWh: null,
      chargeCost: null,
    });
    expect(result.totals).toEqual({
      totalDistance: 100,
      totalEnergyKWh: 17,
      totalChargeKWh: null,
      totalChargeCost: null,
    });
  });

  it('prices a charging stop and chains the departure', () => {
    const result = estimateRoadPlan(
      input({
        legs: [100, 50],
        stops: [
          { charging: true, chargeTo: 90 },
          { charging: false, chargeTo: 100 },
        ],
      }),
    );

    // Arrival 57.3 → charge to 90: 32.7 % of 75 kWh = 24.5 kWh → €8.575 (float: 8.5749…) → €8.57.
    expect(result.points[1]).toMatchObject({
      arrivalPercent: 57.3,
      departurePercent: 90,
      chargeKWh: 24.5,
      chargeCost: 8.57,
    });
    // Leg 2 leaves at 90: 8.5 kWh → 11.3 % used → 78.7 %.
    expect(result.points[2]).toMatchObject({
      legEnergyKWh: 8.5,
      arrivalPercent: 78.7,
      departurePercent: 78.7,
    });
    expect(result.totals).toEqual({
      totalDistance: 150,
      totalEnergyKWh: 25.5,
      totalChargeKWh: 24.5,
      totalChargeCost: 8.57,
    });
  });

  it('never charges below the arrival percentage', () => {
    const result = estimateRoadPlan(
      input({ stops: [{ charging: true, chargeTo: 10 }] }),
    );

    expect(result.points[1]).toMatchObject({
      arrivalPercent: 57.3,
      departurePercent: 57.3,
      chargeKWh: 0,
      chargeCost: 0,
    });
  });

  it('reports an unreachable leg and stops the chain there', () => {
    const result = estimateRoadPlan(
      input({
        initialPercent: 10,
        legs: [1000, 50],
        stops: [
          { charging: false, chargeTo: 100 },
          { charging: false, chargeTo: 100 },
        ],
      }),
    );

    expect(result.points[1]).toMatchObject({
      unreachable: true,
      arrivalPercent: -216.7,
      departurePercent: null,
    });
    expect(result.points[2]).toMatchObject({
      arrivalPercent: null,
      departurePercent: null,
    });
  });

  it('flags an arrival below the reserve level', () => {
    const result = estimateRoadPlan(
      input({ initialPercent: 30, minBattery: 20 }),
    );

    expect(result.points[1]).toMatchObject({
      arrivalPercent: 7.3,
      belowReserve: true,
      unreachable: false,
    });
  });

  it('treats an arrival exactly at the reserve as fine', () => {
    const result = estimateRoadPlan(
      input({ initialPercent: 23, minBattery: 0 }),
    );
    expect(result.points[1]?.belowReserve).toBe(false);
  });

  it('is unavailable without an efficiency', () => {
    const result = estimateRoadPlan({ ...input(), efficiency: null });

    expect(result.available).toBe(false);
    expect(result.points[0]?.departurePercent).toBeNull();
    expect(result.points[1]?.arrivalPercent).toBeNull();
    expect(result.totals.totalEnergyKWh).toBeNull();
  });

  it('leaves gaps empty and still sums the distances it knows', () => {
    const result = estimateRoadPlan(
      input({ legs: [null, 50], stops: [
        { charging: false, chargeTo: 100 },
        { charging: false, chargeTo: 100 },
      ] }),
    );

    expect(result.points[1]?.arrivalPercent).toBeNull();
    expect(result.points[2]?.arrivalPercent).toBeNull();
    expect(result.totals.totalDistance).toBe(50);
    expect(result.totals.totalEnergyKWh).toBeNull();
  });

  it('reports N/A-shaped nulls when no rate is set', () => {
    const result = estimateRoadPlan({
      ...input({ stops: [{ charging: true, chargeTo: 90 }] }),
      electricityRate: null,
    });

    expect(result.points[1]?.chargeKWh).toBe(24.5);
    expect(result.points[1]?.chargeCost).toBeNull();
    expect(result.totals.totalChargeCost).toBeNull();
  });
});
