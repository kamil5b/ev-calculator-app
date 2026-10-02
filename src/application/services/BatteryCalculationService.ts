import type { BatteryState } from '../../domain/entities/BatteryState';
import {
  clampPercent,
  round0,
  round1,
  sanitiseCapacity,
  sanitiseEfficiency,
} from '../../domain/use-cases/math';
import { calculateCurrentKWh } from '../../domain/use-cases/CalculateCurrentKWh';
import { calculateNeededKWh } from '../../domain/use-cases/CalculateNeededKWh';
import { calculateRangeToMinimum } from '../../domain/use-cases/CalculateRange';
import { estimateChargeNeeded } from '../../domain/use-cases/ChargeEstimator';
import { calculateChargeCost } from '../../domain/use-cases/CalculateChargeCost';
import { buildCalculationLabels, type CalculationResult } from '../dto/CalculationResult';

/**
 * Orchestrates the domain use cases into the single result the UI renders.
 *
 * This layer owns no arithmetic of its own beyond the derived aggregates that
 * no individual use case expresses (`usableKWh`, `fullRange`); every primary
 * figure comes straight from a pure domain function.
 */
export class BatteryCalculationService {
  /**
   * Runs every calculation for the given state.
   *
   * Deliberately total: invalid numbers are coerced rather than thrown so a
   * half-typed input can never break the render loop (PRD 8.3).
   */
  calculate(state: BatteryState): CalculationResult {
    const capacity = sanitiseCapacity(state.totalCapacity);
    const efficiency = sanitiseEfficiency(state.efficiency);

    const currentKWh = calculateCurrentKWh({
      currentBattery: state.currentBattery,
      totalCapacity: capacity,
    });

    const neededKWh = calculateNeededKWh({
      currentBattery: state.currentBattery,
      targetBattery: state.targetBattery,
      totalCapacity: capacity,
    });

    const range = calculateRangeToMinimum({
      currentBattery: state.currentBattery,
      minBattery: state.minBattery,
      totalCapacity: capacity,
      efficiency,
    });

    const usableKWh = round1(
      ((clampPercent(state.currentBattery) - clampPercent(state.minBattery)) / 100) * capacity,
    );

    const fullRangeKWh = (clampPercent(state.currentBattery) / 100) * capacity;
    // Same unit conversion as the domain use case: efficiency is kWh per 100
    // distance units, so the quotient is a count of hundred-unit blocks.
    const fullRange =
      efficiency === null || fullRangeKWh <= 0 ? null : round0((fullRangeKWh / efficiency) * 100);

    // The trip efficiency is an override; an empty field means "same as the
    // calculator", which is what makes the field read as pre-filled.
    const trip =
      state.tripDistance === null
        ? null
        : estimateChargeNeeded({
            currentBattery: state.currentBattery,
            totalCapacity: capacity,
            distance: state.tripDistance,
            efficiency: sanitiseEfficiency(state.tripEfficiency) ?? efficiency,
          });

    const chargeCost = calculateChargeCost({ kWh: neededKWh, ratePerKWh: state.electricityRate });

    const derived = {
      currentKWh,
      neededKWh,
      range,
      usableKWh,
      fullRange,
      rangeFromPercent: clampPercent(state.minBattery),
      distanceUnit: state.distanceUnit,
      trip,
      chargeCost,
    };

    return { ...derived, labels: buildCalculationLabels(derived) };
  }
}

/** Shared instance — the service is stateless. */
export const batteryCalculationService = new BatteryCalculationService();
