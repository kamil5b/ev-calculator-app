import { beforeEach, describe, expect, it } from 'vitest';
import { CarModelRepository, generateId } from '../CarModelRepository';
import { MemoryStorageAdapter } from '../../storage/LocalStorageAdapter';

const CARS_KEY = 'ev_calculator_cars';
const ACTIVE_KEY = 'ev_calculator_active_car';

describe('CarModelRepository', () => {
  let storage: MemoryStorageAdapter;
  let repository: CarModelRepository;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    repository = new CarModelRepository(storage);
  });

  describe('add', () => {
    it('persists the record and returns it', () => {
      const car = repository.add({ model: 'Tesla Model 3', name: 'Daily', capacity: 82 });
      expect(repository.getById(car.id)).toEqual(car);
      expect(repository.getAll()).toHaveLength(1);
    });

    it('generates unique ids', () => {
      const first = repository.add({ model: 'A', capacity: 60 });
      const second = repository.add({ model: 'B', capacity: 60 });
      expect(first.id).not.toBe(second.id);
    });

    it('defaults a missing name to an empty string', () => {
      const car = repository.add({ model: 'A', capacity: 60 });
      expect(car.name).toBe('');
    });
  });

  describe('getById', () => {
    it('returns null for an unknown id', () => {
      expect(repository.getById('car-missing')).toBeNull();
    });
  });

  describe('update', () => {
    it('applies the changes', () => {
      const car = repository.add({ model: 'ID.3', name: '', capacity: 77 });
      const updated = repository.update(car.id, { capacity: 82 });
      expect(updated?.capacity).toBe(82);
      expect(repository.getById(car.id)?.capacity).toBe(82);
    });

    it('returns null for an unknown id', () => {
      expect(repository.update('car-missing', { capacity: 82 })).toBeNull();
    });

    it('cannot change the id or creation timestamp', () => {
      const car = repository.add({ model: 'ID.3', capacity: 77 });
      repository.update(car.id, { id: 'car-hacked', createdAt: 0 } as never);
      expect(repository.getById('car-hacked')).toBeNull();
      expect(repository.getById(car.id)).not.toBeNull();
    });
  });

  describe('remove', () => {
    it('deletes the record', () => {
      const car = repository.add({ model: 'ID.3', capacity: 77 });
      expect(repository.remove(car.id)).toBe(true);
      expect(repository.getAll()).toEqual([]);
    });

    it('reports false when there is nothing to delete', () => {
      expect(repository.remove('car-missing')).toBe(false);
    });

    it('clears the active pointer when the active car is deleted', () => {
      const car = repository.add({ model: 'ID.3', capacity: 77 });
      repository.setActiveId(car.id);
      repository.remove(car.id);
      expect(repository.getActiveId()).toBeNull();
    });

    it('leaves the active pointer alone for other cars', () => {
      const active = repository.add({ model: 'Active', capacity: 77 });
      const other = repository.add({ model: 'Other', capacity: 60 });
      repository.setActiveId(active.id);
      repository.remove(other.id);
      expect(repository.getActiveId()).toBe(active.id);
    });
  });

  describe('clear', () => {
    it('removes every car and the active pointer', () => {
      const car = repository.add({ model: 'ID.3', capacity: 77 });
      repository.setActiveId(car.id);
      repository.clear();

      expect(repository.getAll()).toEqual([]);
      expect(repository.getActiveId()).toBeNull();
      expect(storage.getItem(CARS_KEY)).toBeNull();
    });
  });

  describe('active id', () => {
    it('round-trips through storage', () => {
      repository.setActiveId('car-7');
      expect(repository.getActiveId()).toBe('car-7');
    });

    it('removes the key when set to null', () => {
      repository.setActiveId('car-7');
      repository.setActiveId(null);
      expect(storage.getItem(ACTIVE_KEY)).toBeNull();
    });
  });

  describe('resilience (PRD 8.2)', () => {
    it('returns an empty garage for malformed JSON', () => {
      storage.setItem(CARS_KEY, '{not json');
      expect(repository.getAll()).toEqual([]);
    });

    it('returns an empty garage when the payload is not an array', () => {
      storage.setItem(CARS_KEY, '{"id":"car-1"}');
      expect(repository.getAll()).toEqual([]);
    });

    it('drops records that are missing required fields', () => {
      storage.setItem(
        CARS_KEY,
        JSON.stringify([
          { id: 'car-1', model: 'Valid', capacity: 60 },
          { id: '', model: 'No id', capacity: 60 },
          { id: 'car-3', model: '', capacity: 60 },
          { id: 'car-4', model: 'Bad capacity', capacity: 'sixty' },
          { id: 'car-5', model: 'Zero capacity', capacity: 0 },
          null,
          'nonsense',
        ]),
      );
      expect(repository.getAll().map((car) => car.model)).toEqual(['Valid']);
    });

    it('defaults a missing name and createdAt', () => {
      storage.setItem(CARS_KEY, JSON.stringify([{ id: 'car-1', model: 'ID.3', capacity: 77 }]));
      const [car] = repository.getAll();
      expect(car?.name).toBe('');
      expect(car?.createdAt).toBe(0);
    });
  });

  describe('ordering', () => {
    it('sorts newest first', () => {
      storage.setItem(
        CARS_KEY,
        JSON.stringify([
          { id: 'car-old', model: 'Old', capacity: 60, createdAt: 1_000 },
          { id: 'car-new', model: 'New', capacity: 60, createdAt: 2_000 },
        ]),
      );
      expect(repository.getAll().map((car) => car.model)).toEqual(['New', 'Old']);
    });

    it('breaks ties deterministically by id', () => {
      storage.setItem(
        CARS_KEY,
        JSON.stringify([
          { id: 'car-b', model: 'B', capacity: 60, createdAt: 1_000 },
          { id: 'car-a', model: 'A', capacity: 60, createdAt: 1_000 },
        ]),
      );
      expect(repository.getAll().map((car) => car.id)).toEqual(['car-a', 'car-b']);
    });
  });
});

describe('generateId', () => {
  it('produces distinct car- prefixed ids', () => {
    const ids = new Set(Array.from({ length: 200 }, () => generateId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^car-/);
  });
});
