import { describe, expect, it } from 'vitest';
import { RoadPlannerService } from '../RoadPlannerService';
import { DEFAULT_BATTERY_STATE, type BatteryState } from '../../../domain/entities/BatteryState';

const service = new RoadPlannerService();

const state = (overrides: Partial<BatteryState> = {}): BatteryState => ({
  ...DEFAULT_BATTERY_STATE,
  ...overrides,
});

/** 75 kWh, 17 kWh/100km, €0.35/kWh, one 100 km leg, no charge. */
const plainState = (overrides: Partial<BatteryState> = {}) =>
  state({
    totalCapacity: 75,
    efficiency: 17,
    electricityRate: 0.35,
    minBattery: 0,
    roadPlan: {
      initialPercent: 80,
      legs: [100],
      stops: [{ charging: false, chargeTo: 100 }],
      names: ['', ''],
    },
    ...overrides,
  });

describe('RoadPlannerService', () => {
  it('labels the start, the arrival and the totals', () => {
    const result = service.estimate(plainState());

    expect(result.available).toBe(true);
    expect(result.labels.points).toHaveLength(2);
    expect(result.labels.points[0]).toEqual({ arrival: null, charge: null });
    expect(result.labels.points[1]).toEqual({ arrival: '57%', charge: null });
    expect(result.labels.totals).toBe('100 km · 17 kWh used');
  });

  it('labels a charging waypoint with energy and price', () => {
    const result = service.estimate(
      plainState({
        roadPlan: {
          initialPercent: 80,
          legs: [100, 50],
          stops: [
            { charging: true, chargeTo: 90 },
            { charging: false, chargeTo: 100 },
          ],
          names: ['', '', ''],
        },
      }),
    );

    expect(result.labels.points[1]).toEqual({ arrival: '57%', charge: '24.5 kWh · CUR8.57' });
    expect(result.labels.points[2]?.arrival).toBe('79%');
    expect(result.labels.totals).toBe('150 km · 25.5 kWh used · 24.5 kWh charged · CUR8.57');
  });

  it('prefixes prices with the user-chosen currency symbol', () => {
    const result = service.estimate(
      plainState({
        currencySymbol: 'INR',
        roadPlan: {
          initialPercent: 80,
          legs: [100, 50],
          stops: [
            { charging: true, chargeTo: 90 },
            { charging: false, chargeTo: 100 },
          ],
          names: ['', '', ''],
        },
      }),
    );

    expect(result.labels.points[1]?.charge).toBe('24.5 kWh · INR8.57');
    expect(result.labels.totals).toBe('150 km · 25.5 kWh used · 24.5 kWh charged · INR8.57');
  });

  it('shows N/A for the price when no rate is set', () => {
    const result = service.estimate(
      plainState({
        electricityRate: null,
        roadPlan: {
          initialPercent: 80,
          legs: [100, 50],
          stops: [
            { charging: true, chargeTo: 90 },
            { charging: false, chargeTo: 100 },
          ],
          names: ['', '', ''],
        },
      }),
    );

    expect(result.labels.points[1]?.charge).toBe('24.5 kWh · N/A');
    expect(result.labels.totals).toBe('150 km · 25.5 kWh used · 24.5 kWh charged · N/A');
  });

  it('never reports a charge on the end point', () => {
    const result = service.estimate(
      plainState({
        roadPlan: {
          initialPercent: 80,
          legs: [100],
          stops: [{ charging: true, chargeTo: 90 }],
          names: ['', ''],
        },
      }),
    );

    // The stop array is index-aligned with legs, so this "charges" the end
    // point — a corrupt payload the label builder must ignore.
    expect(result.points[1]?.isStart).toBe(false);
    expect(result.labels.points[1]?.charge).toBeNull();
  });

  it('flags an unreachable leg and N/A downstream', () => {
    const result = service.estimate(
      plainState({
        roadPlan: {
          initialPercent: 10,
          legs: [1000, 50],
          stops: [
            { charging: false, chargeTo: 100 },
            { charging: false, chargeTo: 100 },
          ],
          names: ['', '', ''],
        },
      }),
    );

    expect(result.labels.points[1]?.arrival).toBe('⚠️ Too far away');
    expect(result.labels.points[2]?.arrival).toBe('N/A');
  });

  it('renders no numbers without an efficiency', () => {
    const result = service.estimate(plainState({ efficiency: null }));

    expect(result.available).toBe(false);
    expect(result.labels.points[1]?.arrival).toBeNull();
  });
});
