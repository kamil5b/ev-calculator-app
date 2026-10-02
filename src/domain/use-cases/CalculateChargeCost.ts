import { sanitiseRate } from './math';

/** Inputs for pricing a charging session. */
export interface ChargeCostInput {
  /** Energy to add. Zero or negative (discharging) costs nothing. */
  readonly kWh: number;
  /** Price per kWh. `null`/absent disables the calculation. */
  readonly ratePerKWh?: number | null;
}

/**
 * Price calculator: cost of a charging session (PRD 10, Phase 2).
 *
 * Business rule: `cost = kWh × ratePerKWh`, rounded to cents. A negative
 * `kWh` means the user is above their target, so there is nothing to buy.
 *
 * Returns `null` when no usable rate has been supplied.
 */
export function calculateChargeCost({ kWh, ratePerKWh }: ChargeCostInput): number | null {
  const rate = sanitiseRate(ratePerKWh);
  if (rate === null) return null;

  const energy = Number.isFinite(kWh) ? Math.max(0, kWh) : 0;
  return round2(energy * rate);
}

/** Rounds to two decimals and normalises `-0` to `0`. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100 || 0;
}
