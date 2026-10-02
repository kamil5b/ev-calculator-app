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
  /** Consumption in kWh/100km, or `null` when the user has not supplied one. */
  readonly efficiency: number | null;
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
  /** kWh/100km. `null`/absent disables the calculation (PRD 2.2). */
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
};
