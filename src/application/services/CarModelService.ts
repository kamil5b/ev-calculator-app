import type { ICarModelRepository } from '../../domain/repositories/ICarModelRepository';
import { displayName, type CarModel, type CarModelDraft } from '../../domain/entities/CarModel';
import { validateCarModel } from '../../domain/use-cases/ValidateCarModel';
import type { FieldError } from '../../domain/entities/validation';

/** Outcome of a car registration or edit attempt. */
export type CarMutationResult =
  | { readonly ok: true; readonly car: CarModel }
  | { readonly ok: false; readonly errors: FieldError[] };

/**
 * Application service for the user's own car garage (PRD 2.4).
 *
 * Delegates persistence to {@link ICarModelRepository} and enforces the domain
 * rules before anything is written, so invalid cars can never reach storage.
 */
export class CarModelService {
  constructor(private readonly repository: ICarModelRepository) {}

  /** All registered cars, newest first. */
  list(): CarModel[] {
    return this.repository.getAll();
  }

  /** Cars paired with their display label, ready for a `<select>`. */
  listWithLabels(): Array<{ car: CarModel; label: string }> {
    return this.repository.getAll().map((car) => ({ car, label: displayName(car) }));
  }

  getById(id: string): CarModel | null {
    return this.repository.getById(id);
  }

  /** Registers a new car after validating it. */
  add(draft: CarModelDraft): CarMutationResult {
    const errors = validateCarModel(draft);
    if (errors.length > 0) return { ok: false, errors };

    return { ok: true, car: this.repository.add(normaliseDraft(draft)) };
  }

  /** Applies an edit to an existing car. */
  update(id: string, draft: CarModelDraft): CarMutationResult {
    if (this.repository.getById(id) === null) {
      return { ok: false, errors: [{ field: 'id', message: 'That car no longer exists' }] };
    }

    const errors = validateCarModel(draft);
    if (errors.length > 0) return { ok: false, errors };

    return { ok: true, car: this.repository.update(id, normaliseDraft(draft))! };
  }

  /** Deletes a car. Returns `false` when there was nothing to delete. */
  remove(id: string): boolean {
    return this.repository.remove(id);
  }

  /** Id of the car selected during the previous session, if still present. */
  getActiveId(): string | null {
    const activeId = this.repository.getActiveId();
    if (activeId === null) return null;
    return this.repository.getById(activeId) === null ? null : activeId;
  }

  /** Remembers the selected car so it can be restored on reload. */
  setActiveId(id: string | null): void {
    this.repository.setActiveId(id);
  }
}

/** Trims free text and rounds capacity so storage stays tidy. */
function normaliseDraft(draft: CarModelDraft): CarModelDraft {
  return {
    model: draft.model.trim(),
    name: (draft.name ?? '').trim(),
    capacity: Math.round(draft.capacity * 10) / 10,
  };
}
