import type { ArrivalInput } from '../entities/BatteryState';
import { estimateBatteryOnArrival, type ArrivalEstimate } from './BatteryEstimator';
import { round1, sanitiseCapacity } from './math';

/** How much to charge once the trip target (a charger) is reached. */
export interface ChargeEstimate extends ArrivalEstimate {
  /** Energy to add at the charger to reach 100%, 1 decimal. `null` when unreachable. */
  readonly kWhToCharge: number | null;
}

/**
 * Charge estimator: energy to add AT the charger to fill the pack (PRD 10, Phase 2).
 *
 * Business rule:
 * ```
 * leftKWh = arrival estimate (see estimateBatteryOnArrival)
 * kWhToCharge = capacity - leftKWh      (only when the charger is reachable)
 * ```
 * Returns `null` under the same conditions as {@link estimateBatteryOnArrival}.
 */
export function estimateChargeNeeded(input: ArrivalInput): ChargeEstimate | null {
  const arrival = estimateBatteryOnArrival(input);
  if (arrival === null) return null;

  return {
    ...arrival,
    kWhToCharge: arrival.isReachable ? round1(sanitiseCapacity(input.totalCapacity) - arrival.leftKWh) : null,
  };
}
