import type { RangeInput } from '../entities/BatteryState';
import { clampPercent, round0, sanitiseCapacity, sanitiseEfficiency } from './math';

/**
 * Distance the user can still cover before hitting their reserve level.
 *
 * Business rule (PRD 2.2):
 * `rangeKm = ((currentBattery - minBattery) / 100) × totalCapacity / efficiency`
 *
 * The `× 100` is a unit conversion, not an approximation: `efficiency` is kWh
 * per **100** km, so dividing kWh by kWh/100km yields a count of hundred-kilometre
 * units. Without the factor the result would be 1690× too small. (The literal
 * expression in the PRD omits it, and the Appendix A figure of 205 km matches
 * neither that expression nor this one — the arithmetic there is inconsistent
 * with its own formula, so the physics is treated as authoritative.)
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

  const usableKWh =
    ((clampPercent(currentBattery) - clampPercent(minBattery)) / 100) * sanitiseCapacity(totalCapacity);
  if (usableKWh <= 0) return 0;

  // usableKWh / (kWh per 100 km) → number of 100 km units, then × 100 → km.
  return round0((usableKWh / consumption) * 100);
}
