import type { RangeInput } from '../entities/BatteryState';
import { clampPercent, round0, sanitiseCapacity, sanitiseEfficiency } from './math';

/**
 * Distance the user can still cover before hitting their reserve level.
 *
 * Business rule (PRD 2.2):
 * `rangeKm = ((currentBattery - minBattery) / 100) × totalCapacity / efficiency`
 *
 * Returns `null` when the calculation is not meaningful:
 * - no efficiency supplied (the field is optional) — the UI renders "N/A";
 * - efficiency of `0`, which would otherwise divide by zero (PRD 8.2);
 * - the user is already at or below the reserve, so the range is zero.
 */
export function calculateRangeToMinimum({
  currentBattery,
  minBattery,
  totalCapacity,
  efficiency,
}: RangeInput): number | null {
  const consumption = sanitiseEfficiency(efficiency);
  if (consumption === null) return null;

  const usableKWh = ((clampPercent(currentBattery) - clampPercent(minBattery)) / 100) * sanitiseCapacity(totalCapacity);
  if (usableKWh <= 0) return 0;

  return round0(usableKWh / consumption);
}
