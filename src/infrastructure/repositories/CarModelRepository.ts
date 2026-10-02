import { ACTIVE_CAR_KEY, CAR_STORAGE_KEY } from '../config/site';
import type { StoragePort } from '../storage/LocalStorageAdapter';
import type { ICarModelRepository } from '../../domain/repositories/ICarModelRepository';
import type { CarModel, CarModelDraft } from '../../domain/entities/CarModel';
import { safeParse } from '../../application/services/PersistenceService';

/**
 * `localStorage` implementation of the car garage (PRD 2.4).
 *
 * Reads are total: a corrupt or foreign payload yields an empty garage instead of
 * throwing, so a bad write can never brick the app. Writes are atomic from the
 * caller's perspective — the list is rewritten as a single JSON document.
 */
export class CarModelRepository implements ICarModelRepository {
  constructor(
    private readonly storage: StoragePort,
    private readonly carsKey: string = CAR_STORAGE_KEY,
    private readonly activeKey: string = ACTIVE_CAR_KEY,
  ) {}

  getAll(): CarModel[] {
    return sortByRecency(this.readAll());
  }

  getById(id: string): CarModel | null {
    return this.readAll().find((car) => car.id === id) ?? null;
  }

  add(draft: CarModelDraft): CarModel {
    const cars = this.readAll();
    const car: CarModel = {
      id: generateId(),
      model: draft.model,
      name: draft.name ?? '',
      capacity: draft.capacity,
      createdAt: Date.now(),
    };

    this.writeAll([car, ...cars]);
    return car;
  }

  update(id: string, changes: Partial<Omit<CarModel, 'id' | 'createdAt'>>): CarModel | null {
    const cars = this.readAll();
    const index = cars.findIndex((car) => car.id === id);
    if (index === -1) return null;

    const current = cars[index] as CarModel;
    const updated: CarModel = {
      ...current,
      ...changes,
      id: current.id,
      createdAt: current.createdAt,
    };

    cars[index] = updated;
    this.writeAll(cars);
    return updated;
  }

  remove(id: string): boolean {
    const cars = this.readAll();
    const remaining = cars.filter((car) => car.id !== id);
    if (remaining.length === cars.length) return false;

    this.writeAll(remaining);
    if (this.getActiveId() === id) this.setActiveId(null);
    return true;
  }

  clear(): void {
    this.storage.removeItem(this.carsKey);
    this.storage.removeItem(this.activeKey);
  }

  getActiveId(): string | null {
    return this.storage.getItem(this.activeKey);
  }

  setActiveId(id: string | null): void {
    if (id === null) this.storage.removeItem(this.activeKey);
    else this.storage.setItem(this.activeKey, id);
  }

  private readAll(): CarModel[] {
    const raw = this.storage.getItem(this.carsKey);
    if (raw === null) return [];

    const parsed = safeParse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map(toCarModel).filter((car): car is CarModel => car !== null);
  }

  private writeAll(cars: CarModel[]): void {
    this.storage.setItem(this.carsKey, JSON.stringify(cars));
  }
}

/** Validates one untrusted record from storage. Returns `null` when unusable. */
function toCarModel(value: unknown): CarModel | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;

  const id = record.id;
  const model = record.model;
  const capacity = record.capacity;
  if (typeof id !== 'string' || id.length === 0) return null;
  if (typeof model !== 'string' || model.trim().length === 0) return null;
  if (typeof capacity !== 'number' || !Number.isFinite(capacity) || capacity <= 0) return null;

  return {
    id,
    model,
    name: typeof record.name === 'string' ? record.name : '',
    capacity,
    createdAt: typeof record.createdAt === 'number' && Number.isFinite(record.createdAt) ? record.createdAt : 0,
  };
}

/** Newest registrations first; ties broken by id for deterministic output. */
function sortByRecency(cars: CarModel[]): CarModel[] {
  return [...cars].sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}

/**
 * Collision-resistant id in the `car-<random>` shape used by the PRD examples.
 *
 * Falls back to a timestamp when `crypto.randomUUID` is unavailable (older
 * Safari), which still guarantees uniqueness within a session.
 */
export function generateId(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (typeof cryptoApi?.randomUUID === 'function') return `car-${cryptoApi.randomUUID()}`;
  return `car-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
