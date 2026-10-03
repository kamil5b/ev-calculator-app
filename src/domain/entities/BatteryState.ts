import type { DistanceUnit } from './DistanceUnit';
import { DEFAULT_ROAD_PLAN, type RoadPlan } from './RoadPlan';

/** Placeholder used until the user types their own currency (e.g. `€`, `USD`). */
export const DEFAULT_CURRENCY_SYMBOL = 'CUR';

/** Longest currency symbol the calculator will store or display. */
export const MAX_CURRENCY_SYMBOL_LENGTH = 5;

/** The symbol to render for `value`: trimmed, capped, or the default when blank. */
export function resolveCurrencySymbol(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === ''
    ? DEFAULT_CURRENCY_SYMBOL
    : trimmed.slice(0, MAX_CURRENCY_SYMBOL_LENGTH);
}

/**
 * Domain entity describing the aggregate persisted for the calculator.
 *
 * This is the canonical shape the domain reasons about. Anything stored in
 * `localStorage` is treated as untrusted input and normalised into this type by
 * the application layer before it reaches the use cases.
 */
export interface BatteryState {
  /** Id of the selected car model, or `null` when the user is on manual entry. */
  readonly carId: string | null;
  /** Usable battery capacity in kWh (PRD 2.1: 10–200). */
  readonly totalCapacity: number;
  /** State of charge right now, percent 0–100. */
  readonly currentBattery: number;
  /** Desired state of charge, percent 0–100. */
  readonly targetBattery: number;
  /** Reserve level the user wants to keep, percent 0–100. */
  readonly minBattery: number;
  /** Consumption in kWh/100{@link distanceUnit}, or `null` when the user has not supplied one. */
  readonly efficiency: number | null;
  /** Unit every distance-shaped field and output is expressed in. */
  readonly distanceUnit: DistanceUnit;
  /** Distance to the trip target (e.g. a charger), or `null` when not planning a trip. */
  readonly tripDistance: number | null;
  /** Electricity price per kWh, or `null` when the user has not supplied one. */
  readonly electricityRate: number | null;
  /**
   * Free-text currency shown before every price (`€`, `USD`, `IDR`, …).
   * May be blank while the user is typing; renderers fall back to
   * {@link DEFAULT_CURRENCY_SYMBOL}.
   */
  readonly currencySymbol: string;
  /** EV Road Planner input (PRD 11); independent of the fields above. */
  readonly roadPlan: RoadPlan;
}

/** Subset of {@link BatteryState} required to derive current kWh. */
export interface CurrentKWhInput {
  readonly currentBattery: number;
  readonly totalCapacity: number;
}

/** Subset of {@link BatteryState} required to derive the charge gap to target. */
export interface NeededKWhInput {
  readonly currentBattery: number;
  readonly targetBattery: number;
  readonly totalCapacity: number;
}

/** Subset of {@link BatteryState} required to derive usable range. */
export interface RangeInput {
  readonly currentBattery: number;
  readonly minBattery: number;
  readonly totalCapacity: number;
  /** kWh per 100 distance units. `null`/absent disables the calculation (PRD 2.2). */
  readonly efficiency?: number | null;
}

/** Inputs for estimating the pack state on arrival at a trip target. */
export interface ArrivalInput {
  readonly currentBattery: number;
  readonly totalCapacity: number;
  /** Distance to the target, in the same unit as {@link efficiency}. */
  readonly distance: number;
  /** kWh per 100 distance units. `null`/absent disables the calculation. */
  readonly efficiency?: number | null;
}

/**
 * Defaults applied on first run and by the "Reset" action (PRD 2.1).
 * The car reference starts empty because users register their own cars.
 */
export const DEFAULT_BATTERY_STATE: BatteryState = {
  carId: null,
  totalCapacity: 75,
  currentBattery: 50,
  targetBattery: 100,
  minBattery: 0,
  efficiency: 17,
  distanceUnit: 'km',
  tripDistance: null,
  electricityRate: null,
  currencySymbol: DEFAULT_CURRENCY_SYMBOL,
  roadPlan: DEFAULT_ROAD_PLAN,
};
