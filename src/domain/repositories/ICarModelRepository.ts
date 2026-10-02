import type { CarModel, CarModelDraft } from '../entities/CarModel';

/**
 * Persistence boundary for user-registered cars (PRD 2.4).
 *
 * Declared in the domain layer and implemented in `infrastructure/` so the
 * domain stays framework-agnostic and unit-testable with an in-memory double.
 * There is no hard-coded catalogue: every record originates from the user.
 */
export interface ICarModelRepository {
  /** All registered cars, newest first. Never throws; returns `[]` on failure. */
  getAll(): CarModel[];

  /** Looks a car up by id, or `null` when it does not exist. */
  getById(id: string): CarModel | null;

  /** Persists a new car and returns the stored record (with its generated id). */
  add(draft: CarModelDraft): CarModel;

  /** Applies a partial edit. Returns the updated car, or `null` if unknown. */
  update(id: string, changes: Partial<Omit<CarModel, 'id' | 'createdAt'>>): CarModel | null;

  /** Removes a car. Returns `true` when a record was actually deleted. */
  remove(id: string): boolean;

  /** Removes every registered car. */
  clear(): void;

  /**
   * Id of the car the user last selected, used to restore the UI on reload.
   * `null` when nothing was selected or the record has since been deleted.
   */
  getActiveId(): string | null;

  /** Remembers the active car so it can be restored on the next visit. */
  setActiveId(id: string | null): void;
}
