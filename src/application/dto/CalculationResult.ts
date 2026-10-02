import { NOT_AVAILABLE } from '../../domain/entities/validation';
import type { DistanceUnit } from '../../domain/entities/DistanceUnit';
import type { ChargeEstimate } from '../../domain/use-cases/ChargeEstimator';

/** Currency the price calculator quotes in (PRD 10, Phase 2). */
export const CURRENCY_SYMBOL = '€';

/**
 * Everything the presentation layer needs to render the output section.
 *
 * Fields are already rounded and display-ready: the calculator never formats
 * numbers itself, which keeps the UI free of business logic (PRD 12, "Code").
 */
export interface CalculationResult {
  /** `(current / 100) × capacity`, 1 decimal. */
  readonly currentKWh: number;
  /** `((target - current) / 100) × capacity`, 1 decimal, may be negative. */
  readonly neededKWh: number;
  /**
   * Usable distance before the reserve level, whole {@link distanceUnit}s.
   * `null` when efficiency is missing, which the UI renders as "N/A" (PRD 2.2).
   */
  readonly range: number | null;
  /** Energy available between the current level and the reserve, 1 decimal. */
  readonly usableKWh: number;
  /** Whole remaining range ignoring the reserve level; `null` without efficiency. */
  readonly fullRange: number | null;
  /** State of charge at the reserve level that produced {@link range}. */
  readonly rangeFromPercent: number;
  /** Unit {@link range}, {@link fullRange} and the trip distance are expressed in. */
  readonly distanceUnit: DistanceUnit;
  /**
   * Battery and charge estimate at the trip target. `null` when no distance or
   * no efficiency (trip override or calculator value) is available.
   */
  readonly trip: ChargeEstimate | null;
  /** Price of charging to target, 2 decimals; `null` without a rate. */
  readonly chargeCost: number | null;
  /** Rendered strings, pre-formatted so components stay logic-free. */
  readonly labels: CalculationLabels;
}

/** Pre-rendered, human-readable output strings. */
export interface CalculationLabels {
  readonly currentKWh: string;
  readonly neededKWh: string;
  readonly range: string;
  readonly usableKWh: string;
  readonly fullRange: string;
  /** `"57.1 kWh left (70%)"`, `"⚠️ Too far away"`, or `null` without a trip. */
  readonly arrival: string | null;
  /** `"You must charge 67.3 kWh (from 18% to 100%)"`, `"⚠️ Too far away"`, or `null`. */
  readonly chargeAtTarget: string | null;
  readonly chargeCost: string;
}

/** Shown in place of the trip outputs when the target cannot be reached. */
export const TOO_FAR_AWAY = '⚠️ Too far away';

/** Builds the label bundle for a formatted result. */
export function buildCalculationLabels(input: {
  currentKWh: number;
  neededKWh: number;
  range: number | null;
  usableKWh: number;
  fullRange: number | null;
  rangeFromPercent: number;
  distanceUnit?: DistanceUnit;
  trip?: ChargeEstimate | null;
  chargeCost?: number | null;
}): CalculationLabels {
  const unit = input.distanceUnit ?? 'km';
  const trip = input.trip ?? null;
  const chargeCost = input.chargeCost ?? null;

  return {
    currentKWh: `Current battery: ${formatKWh(input.currentKWh)}`,
    neededKWh: `To reach target: ${formatSignedKWh(input.neededKWh)}`,
    range:
      input.range === null
        ? `Range to minimum: ${NOT_AVAILABLE}`
        : `Range to ${input.rangeFromPercent}%: ${formatDistance(input.range, unit)}`,
    usableKWh: `Usable energy: ${formatKWh(input.usableKWh)}`,
    fullRange:
      input.fullRange === null
        ? `Range to empty: ${NOT_AVAILABLE}`
        : `Range to empty: ${formatDistance(input.fullRange, unit)}`,
    arrival:
      trip === null
        ? null
        : trip.isReachable
          ? `${formatKWh(trip.leftKWh)} left (${trip.leftPercent}%)`
          : TOO_FAR_AWAY,
    chargeAtTarget:
      trip === null
        ? null
        : trip.kWhToCharge === null
          ? TOO_FAR_AWAY
          : `You must charge ${formatKWh(trip.kWhToCharge)} (from ${trip.leftPercent}% to 100%)`,
    chargeCost: `Charging to target: ${chargeCost === null ? NOT_AVAILABLE : formatCost(chargeCost)}`,
  };
}

/** `41 kWh` — trailing `.0` is dropped so whole values read naturally. */
export function formatKWh(value: number): string {
  if (!Number.isFinite(value)) return NOT_AVAILABLE;
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} kWh`;
}

/** `+36.9 kWh` / `-4.1 kWh` / `0 kWh` — sign makes charging vs discharging explicit. */
export function formatSignedKWh(value: number): string {
  if (!Number.isFinite(value)) return NOT_AVAILABLE;
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return `0 kWh`;
  const magnitude = Number.isInteger(Math.abs(rounded)) ? Math.abs(rounded) : Math.abs(rounded).toFixed(1);
  return `${rounded > 0 ? '+' : '−'}${magnitude} kWh`;
}

/** `205 km` / `127 mi` — ranges are always whole units. */
export function formatDistance(value: number, unit: DistanceUnit = 'km'): string {
  if (!Number.isFinite(value)) return NOT_AVAILABLE;
  return `${Math.round(value)} ${unit}`;
}

/** `€12.30` — always two decimals, as prices are read. */
export function formatCost(value: number): string {
  if (!Number.isFinite(value)) return NOT_AVAILABLE;
  return `${CURRENCY_SYMBOL}${value.toFixed(2)}`;
}
