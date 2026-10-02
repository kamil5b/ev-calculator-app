import { beforeEach, describe, expect, it } from 'vitest';
import { CarModelService } from '../CarModelService';
import { CarModelRepository } from '../../../infrastructure/repositories/CarModelRepository';
import { MemoryStorageAdapter } from '../../../infrastructure/storage/LocalStorageAdapter';
import { VALIDATION_MESSAGES } from '../../../domain/entities/validation';

describe('CarModelService', () => {
  let repository: CarModelRepository;
  let service: CarModelService;

  beforeEach(() => {
    repository = new CarModelRepository(new MemoryStorageAdapter());
    service = new CarModelService(repository);
  });

  describe('add', () => {
    it('registers a car with a generated id and timestamp', () => {
      const outcome = service.add({ model: 'Tesla Model 3', capacity: 82 });
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;

      expect(outcome.car.id).toMatch(/^car-/);
      expect(outcome.car.createdAt).toBeGreaterThan(0);
      expect(outcome.car.model).toBe('Tesla Model 3');
      expect(outcome.car.name).toBe('');
    });

    it('defaults an omitted name to an empty string', () => {
      const outcome = service.add({ model: 'ID.3', capacity: 77 });
      expect(outcome.ok && outcome.car.name).toBe('');
    });

    it('trims whitespace and rounds the capacity', () => {
      const outcome = service.add({ model: '  ID.3  ', name: '  Commuter  ', capacity: 77.46 });
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.car.model).toBe('ID.3');
      expect(outcome.car.name).toBe('Commuter');
      expect(outcome.car.capacity).toBe(77.5);
    });

    it('rejects a missing model (PRD 2.4.1)', () => {
      const outcome = service.add({ model: '  ', capacity: 82 });
      expect(outcome).toEqual({
        ok: false,
        errors: [{ field: 'model', message: VALIDATION_MESSAGES.modelRequired }],
      });
    });

    it('rejects an out-of-range capacity', () => {
      const outcome = service.add({ model: 'ID.3', capacity: 5 });
      expect(outcome.ok).toBe(false);
    });

    it('does not persist an invalid draft', () => {
      service.add({ model: '', capacity: 82 });
      expect(service.list()).toEqual([]);
    });
  });

  describe('update', () => {
    it('edits model, name and capacity', () => {
      const created = service.add({ model: 'ID.3', capacity: 77 });
      if (!created.ok) throw new Error('setup failed');

      const outcome = service.update(created.car.id, { model: 'ID.3 Performance', name: 'Fast', capacity: 84 });
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;

      expect(outcome.car.model).toBe('ID.3 Performance');
      expect(outcome.car.name).toBe('Fast');
      expect(outcome.car.capacity).toBe(84);
    });

    it('preserves the id and creation timestamp', () => {
      const created = service.add({ model: 'ID.3', capacity: 77 });
      if (!created.ok) throw new Error('setup failed');

      const outcome = service.update(created.car.id, { model: 'ID.3', capacity: 80 });
      if (!outcome.ok) throw new Error('update failed');
      expect(outcome.car.id).toBe(created.car.id);
      expect(outcome.car.createdAt).toBe(created.car.createdAt);
    });

    it('rejects an edit to an unknown car', () => {
      const outcome = service.update('car-missing', { model: 'ID.3', capacity: 77 });
      expect(outcome.ok).toBe(false);
    });

    it('rejects an invalid edit without changing the record', () => {
      const created = service.add({ model: 'ID.3', capacity: 77 });
      if (!created.ok) throw new Error('setup failed');

      const outcome = service.update(created.car.id, { model: 'ID.3', capacity: 1000 });
      expect(outcome.ok).toBe(false);
      expect(service.getById(created.car.id)?.capacity).toBe(77);
    });
  });

  describe('remove', () => {
    it('deletes an existing car', () => {
      const created = service.add({ model: 'ID.3', capacity: 77 });
      if (!created.ok) throw new Error('setup failed');

      expect(service.remove(created.car.id)).toBe(true);
      expect(service.list()).toEqual([]);
    });

    it('reports false for an unknown id', () => {
      expect(service.remove('car-missing')).toBe(false);
    });
  });

  describe('list', () => {
    it('returns the newest registration first', async () => {
      const first = service.add({ model: 'First', capacity: 60 });
      if (!first.ok) throw new Error('setup failed');
      await new Promise((resolve) => setTimeout(resolve, 2));
      const second = service.add({ model: 'Second', capacity: 70 });
      if (!second.ok) throw new Error('setup failed');

      expect(service.list().map((car) => car.model)).toEqual(['Second', 'First']);
    });
  });

  describe('listWithLabels', () => {
    it('pairs each car with its display label', () => {
      service.add({ model: 'Tesla Model 3', name: 'Daily driver', capacity: 82 });
      service.add({ model: 'ID.3', capacity: 77 });

      expect(service.listWithLabels().map((entry) => entry.label).sort()).toEqual([
        'Daily driver',
        'ID.3',
      ]);
    });
  });

  describe('active car', () => {
    it('remembers and restores the active id', () => {
      const created = service.add({ model: 'ID.3', capacity: 77 });
      if (!created.ok) throw new Error('setup failed');

      service.setActiveId(created.car.id);
      expect(service.getActiveId()).toBe(created.car.id);
    });

    it('returns null when nothing was selected', () => {
      expect(service.getActiveId()).toBeNull();
    });

    it('returns null when the remembered car has been deleted', () => {
      const created = service.add({ model: 'ID.3', capacity: 77 });
      if (!created.ok) throw new Error('setup failed');
      service.setActiveId(created.car.id);
      service.remove(created.car.id);

      expect(service.getActiveId()).toBeNull();
    });
  });
});
