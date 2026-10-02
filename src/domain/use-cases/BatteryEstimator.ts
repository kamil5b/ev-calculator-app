import type { ArrivalInput } from '../entities/BatteryState';
import { calculateCurrentKWh } from './CalculateCurrentKWh';
import { round0, round1, sanitiseCapacity, sanitiseEfficiency } from './math';

/** Pack state on arrival at a trip target. */
export interface ArrivalEstimate {
  /** `false` when the trip needs more energy than the pack holds right now. */
  readonly isReachable: boolean;
  /** Energy the trip consumes, 1 decimal. */
  readonly usedKWh: number;
  /** Energy left on arrival, 1 decimal. Negative when unreachable. */
  readonly leftKWh: number;
  /** State of charge on arrival, whole percent. Negative when unreachable. */
  readonly leftPercent: number;
}

/**
 * Battery estimator: how much is left on arrival at a target (PRD 10, Phase 2).
 *
 * Business rule:
 * ```
 * usedKWh = (distance / 100) × efficiency
 * leftKWh = currentKWh - usedKWh
 * leftPercent = (leftKWh / capacity) × 100
 * ```
 * `leftKWh` is derived from the *rounded* current and used figures so the three
 * numbers the UI shows always add up. Arriving on exactly 0 kWh counts as
 * reachable.
 *
 * Also the shared first step of {@link estimateChargeNeeded}.
 *
 * Returns `null` when there is nothing to estimate: no usable efficiency, or a
 * missing/negative distance.
 */
export function estimateBatteryOnArrival({
  currentBattery,
  totalCapacity,
  distance,
  efficiency,
}: ArrivalInput): ArrivalEstimate | null {
  const consumption = sanitiseEfficiency(efficiency);
  if (consumption === null) return null;
  if (!Number.isFinite(distance) || distance < 0) return null;

  const capacity = sanitiseCapacity(totalCapacity);
  if (capacity === 0) return null;

  const currentKWh = calculateCurrentKWh({ currentBattery, totalCapacity: capacity });
  const usedKWh = round1((distance / 100) * consumption);
  const leftKWh = round1(currentKWh - usedKWh);

  return {
    isReachable: leftKWh >= 0,
    usedKWh,
    leftKWh,
    leftPercent: round0((leftKWh / capacity) * 100),
  };
}
