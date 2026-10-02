import type { NeededKWhInput } from '../entities/BatteryState';
import { clampPercent, round1, sanitiseCapacity } from './math';

/**
 * Energy that must be added — or, when negative, removed — to sit at the target
 * state of charge.
 *
 * Business rule (PRD 2.2): `neededKWh = ((targetBattery - currentBattery) / 100) × totalCapacity`.
 * A negative result is intentional and means the user is discharging to reach
 * their target (PRD 8.2).
 */
export function calculateNeededKWh({
  currentBattery,
  targetBattery,
  totalCapacity,
}: NeededKWhInput): number {
  const delta = clampPercent(targetBattery) - clampPercent(currentBattery);
  return round1((delta / 100) * sanitiseCapacity(totalCapacity));
}
