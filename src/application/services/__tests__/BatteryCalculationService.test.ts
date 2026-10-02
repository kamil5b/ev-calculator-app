import { describe, expect, it } from 'vitest';
import { BatteryCalculationService } from '../BatteryCalculationService';
import { DEFAULT_BATTERY_STATE, type BatteryState } from '../../../domain/entities/BatteryState';

const service = new BatteryCalculationService();

const state = (overrides: Partial<BatteryState> = {}): BatteryState => ({
  ...DEFAULT_BATTERY_STATE,
  ...overrides,
});

describe('BatteryCalculationService', () => {
  it('reproduces the worked example from PRD Appendix A', () => {
    const result = service.calculate(
      state({
        totalCapacity: 82,
        currentBattery: 45,
        targetBattery: 90,
        minBattery: 10,
        efficiency: 17,
      }),
    );

    // ((45 / 100) × 82) = 36.9 kWh
    expect(result.currentKWh).toBe(36.9);
    // ((90 - 45) / 100) × 82 = 36.9 kWh
    expect(result.neededKWh).toBe(36.9);
    // ((45 - 10) / 100) × 82 / 17 = 168.6 → 169 km
    expect(result.range).toBe(169);
    expect(result.usableKWh).toBe(28.7);
    // (45 / 100) × 82 / 17 = 217.1 → 217 km
    expect(result.fullRange).toBe(217);
    expect(result.rangeFromPercent).toBe(10);
  });

  it('reports a negative charge when the target is below the current level', () => {
    const result = service.calculate(state({ currentBattery: 90, targetBattery: 45, totalCapacity: 82 }));
    expect(result.neededKWh).toBe(-36.9);
    expect(result.labels.neededKWh).toBe('To reach target: −36.9 kWh');
  });

  it('shows N/A for the range when efficiency is missing (PRD 2.2)', () => {
    const result = service.calculate(state({ efficiency: null }));
    expect(result.range).toBeNull();
    expect(result.labels.range).toBe('Range to minimum: N/A');
    expect(result.labels.fullRange).toBe('Range to empty: N/A');
  });

  it('shows N/A rather than dividing by zero when efficiency is 0 (PRD 8.2)', () => {
    const result = service.calculate(state({ efficiency: 0 }));
    expect(result.range).toBeNull();
    expect(result.labels.range).toBe('Range to minimum: N/A');
  });

  it('returns a zero range when already at the reserve level', () => {
    const result = service.calculate(state({ currentBattery: 10, minBattery: 10 }));
    expect(result.range).toBe(0);
    expect(result.labels.range).toBe('Range to 10%: 0 km');
  });

  it('formats a charging target with an explicit plus sign', () => {
    const result = service.calculate(state({ currentBattery: 45, targetBattery: 90, totalCapacity: 82 }));
    expect(result.labels.neededKWh).toBe('To reach target: +36.9 kWh');
  });

  it('formats a zero gap without a sign', () => {
    const result = service.calculate(state({ currentBattery: 60, targetBattery: 60 }));
    expect(result.labels.neededKWh).toBe('To reach target: 0 kWh');
  });

  it('drops trailing .0 from whole numbers', () => {
    const result = service.calculate(state({ currentBattery: 50, totalCapacity: 82, targetBattery: 50 }));
    expect(result.labels.currentKWh).toBe('Current battery: 41 kWh');
  });

  it('never propagates NaN from malformed state', () => {
    const result = service.calculate(
      state({ totalCapacity: Number.NaN, currentBattery: Number.NaN, efficiency: Number.NaN }),
    );
    expect(result.currentKWh).toBe(0);
    expect(result.neededKWh).toBe(0);
    expect(result.range).toBeNull();
  });

  it('derives no full range from an empty pack', () => {
    const result = service.calculate(state({ currentBattery: 0, efficiency: 17 }));
    expect(result.fullRange).toBeNull();
  });

  it('calculates the default state without error', () => {
    const result = service.calculate(DEFAULT_BATTERY_STATE);
    expect(result.currentKWh).toBe(37.5);
    expect(result.neededKWh).toBe(37.5);
  });

  describe('trip estimate (Phase 2)', () => {
    it('estimates arrival and the charge needed at the target', () => {
      const result = service.calculate(
        state({ totalCapacity: 82, currentBattery: 20, efficiency: 17, tripDistance: 10 }),
      );
      expect(result.trip).toMatchObject({
        isReachable: true,
        leftKWh: 14.7,
        leftPercent: 18,
        kWhToCharge: 67.3,
      });
      expect(result.labels.arrival).toBe('14.7 kWh left (18%)');
      expect(result.labels.chargeAtTarget).toBe('You must charge 67.3 kWh (from 18% to 100%)');
    });

    it('prefers the trip efficiency over the calculator one', () => {
      const result = service.calculate(
        state({
          totalCapacity: 82,
          currentBattery: 80,
          efficiency: 30,
          tripEfficiency: 17,
          tripDistance: 50,
        }),
      );
      expect(result.labels.arrival).toBe('57.1 kWh left (70%)');
    });

    it('falls back to the calculator efficiency when the override is empty', () => {
      const result = service.calculate(
        state({
          totalCapacity: 82,
          currentBattery: 80,
          efficiency: 17,
          tripEfficiency: null,
          tripDistance: 50,
        }),
      );
      expect(result.labels.arrival).toBe('57.1 kWh left (70%)');
    });

    it('reports an unreachable target', () => {
      const result = service.calculate(
        state({ totalCapacity: 82, currentBattery: 10, efficiency: 17, tripDistance: 500 }),
      );
      expect(result.labels.arrival).toBe('⚠️ Too far away');
      expect(result.labels.chargeAtTarget).toBe('⚠️ Too far away');
    });

    it('has no trip without a distance or any efficiency', () => {
      expect(service.calculate(state({ tripDistance: null })).trip).toBeNull();
      const noEfficiency = service.calculate(state({ efficiency: null, tripDistance: 50 }));
      expect(noEfficiency.trip).toBeNull();
      expect(noEfficiency.labels.arrival).toBeNull();
    });
  });

  describe('charge cost (Phase 2)', () => {
    it('prices the charge to target', () => {
      const result = service.calculate(
        state({ totalCapacity: 82, currentBattery: 45, targetBattery: 90, electricityRate: 0.35 }),
      );
      expect(result.chargeCost).toBe(12.92);
      expect(result.labels.chargeCost).toBe('Charging to target: €12.92');
    });

    it('renders N/A without a rate', () => {
      expect(service.calculate(state()).labels.chargeCost).toBe('Charging to target: N/A');
    });
  });

  describe('miles (Phase 2)', () => {
    it('renders ranges in the selected unit', () => {
      // 17 kWh/100km ≈ 27.4 kWh/100mi; 169 km ≈ 105 mi.
      const result = service.calculate(
        state({
          totalCapacity: 82,
          currentBattery: 45,
          minBattery: 10,
          efficiency: 27.4,
          distanceUnit: 'mi',
        }),
      );
      expect(result.range).toBe(105);
      expect(result.labels.range).toBe('Range to 10%: 105 mi');
    });
  });
});
