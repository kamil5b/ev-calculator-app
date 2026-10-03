import type { BatteryState } from '../entities/BatteryState';
import { convertDistance, convertEfficiency, type DistanceUnit } from '../entities/DistanceUnit';

/**
 * Re-expresses every distance-shaped field in a new unit (PRD 10, Phase 2).
 *
 * Efficiency and trip distance flip together so input and output never
 * disagree. Conversion is lossless — rounding here would make a value drift each
 * time the user toggles back and forth (50 km → 31.1 mi → 50.1 km) — so the
 * fields round for display instead. Non-finite values (a half-typed field) are
 * passed through untouched so validation still sees them.
 */
export function switchDistanceUnit(state: BatteryState, unit: DistanceUnit): BatteryState {
  const from = state.distanceUnit;
  if (from === unit) return state;

  const efficiency = (value: number | null) =>
    value === null || !Number.isFinite(value) ? value : convertEfficiency(value, from, unit);

  const distance = (value: number | null) =>
    value === null || !Number.isFinite(value) ? value : convertDistance(value, from, unit);

  return {
    ...state,
    distanceUnit: unit,
    efficiency: efficiency(state.efficiency),
    tripDistance: distance(state.tripDistance),
    // Leg distances are distance-shaped too: convert them in place, keeping
    // empty (`null`) legs empty so a half-typed plan survives the toggle.
    roadPlan: {
      ...state.roadPlan,
      legs: state.roadPlan.legs.map(distance),
    },
  };
}
