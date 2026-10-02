/**
 * Entity representing a car the user registered locally (PRD 2.4).
 *
 * There is no hard-coded catalogue: cars only exist once the user creates them,
 * so every record carries both a mandatory `model` and an optional friendly
 * `name` used for display via `displayName`.
 */
export interface CarModel {
  readonly id: string;
  /** Manufacturer + variant, e.g. `"Tesla Model 3"`. Required. */
  readonly model: string;
  /** Optional nickname, e.g. `"Daily driver"`. May be an empty string. */
  readonly name: string;
  /** Usable battery capacity in kWh. Required, 10–200 (PRD 8.1). */
  readonly capacity: number;
  /** Epoch milliseconds, used for stable ordering. */
  readonly createdAt: number;
}

/** Fields a user supplies when creating a car (PRD 2.4.1). */
export interface CarModelDraft {
  readonly model: string;
  readonly name?: string;
  readonly capacity: number;
}

/** Label shown in the selector: the nickname when present, else the model. */
export function displayName(car: CarModel): string {
  return car.name.trim().length > 0 ? car.name.trim() : car.model;
}
