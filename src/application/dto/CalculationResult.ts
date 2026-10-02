import { NOT_AVAILABLE } from '../../domain/entities/validation';

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
   * Usable distance before the reserve level, whole kilometres.
   * `null` when efficiency is missing, which the UI renders as "N/A" (PRD 2.2).
   */
  readonly rangeKm: number | null;
  /** Energy available between the current level and the reserve, 1 decimal. */
  readonly usableKWh: number;
  /** Whole remaining range ignoring the reserve level; `null` without efficiency. */
  readonly fullRangeKm: number | null;
  /** State of charge at the reserve level that produced {@link rangeKm}. */
  readonly rangeFromPercent: number;
  /** Rendered strings, pre-formatted so components stay logic-free. */
  readonly labels: CalculationLabels;
}

/** Pre-rendered, human-readable output strings. */
export interface CalculationLabels {
  readonly currentKWh: string;
  readonly neededKWh: string;
  readonly rangeKm: string;
  readonly usableKWh: string;
  readonly fullRangeKm: string;
}

/** Builds the label bundle for a formatted result. */
export function buildCalculationLabels(input: {
  currentKWh: number;
  neededKWh: number;
  rangeKm: number | null;
  usableKWh: number;
  fullRangeKm: number | null;
  rangeFromPercent: number;
}): CalculationLabels {
  return {
    currentKWh: `Current battery: ${formatKWh(input.currentKWh)}`,
    neededKWh: `To reach target: ${formatSignedKWh(input.neededKWh)}`,
    rangeKm:
      input.rangeKm === null
        ? `Range to minimum: ${NOT_AVAILABLE}`
        : `Range to ${input.rangeFromPercent}%: ${formatKm(input.rangeKm)}`,
    usableKWh: `Usable energy: ${formatKWh(input.usableKWh)}`,
    fullRangeKm:
      input.fullRangeKm === null
        ? `Range to empty: ${NOT_AVAILABLE}`
        : `Range to empty: ${formatKm(input.fullRangeKm)}`,
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

/** `205 km` — ranges are always whole kilometres. */
export function formatKm(value: number): string {
  if (!Number.isFinite(value)) return NOT_AVAILABLE;
  return `${Math.round(value)} km`;
}
