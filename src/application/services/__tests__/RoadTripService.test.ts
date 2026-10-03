import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoadTripService } from '../RoadTripService';
import { RoadTripRepository } from '../../../infrastructure/repositories/RoadTripRepository';
import { MemoryStorageAdapter } from '../../../infrastructure/storage/LocalStorageAdapter';
import { DEFAULT_ROAD_PLAN, type RoadPlan } from '../../../domain/entities/RoadPlan';
import { VALIDATION_MESSAGES } from '../../../domain/entities/validation';

const plan: RoadPlan = { ...DEFAULT_ROAD_PLAN, legs: [100], names: ['Home', 'Office'] };

describe('RoadTripService', () => {
  let repository: RoadTripRepository;
  let service: RoadTripService;

  beforeEach(() => {
    repository = new RoadTripRepository(new MemoryStorageAdapter());
    service = new RoadTripService(repository);
  });

  describe('add', () => {
    it('saves a named trip and lists it', () => {
      const outcome = service.add({ name: ' Weekend ', plan, distanceUnit: 'km' });

      expect(outcome.ok).toBe(true);
      expect(service.list()).toHaveLength(1);
      expect(service.list()[0]?.name).toBe('Weekend');
      expect(service.list()[0]?.plan).toEqual(plan);
    });

    it('rejects an empty name without writing anything', () => {
      const outcome = service.add({ name: '  ', plan, distanceUnit: 'km' });

      expect(outcome).toEqual({
        ok: false,
        errors: [{ field: 'tripName', message: VALIDATION_MESSAGES.tripNameRequired }],
      });
      expect(service.list()).toEqual([]);
    });
  });

  describe('list', () => {
    it('returns newest first', () => {
      // Pin the clock so the order does not depend on same-millisecond adds.
      vi.spyOn(Date, 'now').mockReturnValueOnce(1).mockReturnValueOnce(2);
      service.add({ name: 'First', plan, distanceUnit: 'km' });
      service.add({ name: 'Second', plan, distanceUnit: 'km' });

      expect(service.list().map((trip) => trip.name)).toEqual(['Second', 'First']);
      vi.restoreAllMocks();
    });

    it('starts empty', () => {
      expect(service.list()).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns null for an unknown id', () => {
      expect(service.getById('trip-missing')).toBeNull();
    });
  });

  describe('update', () => {
    it('overwrites the plan but keeps id and name', () => {
      const saved = service.add({ name: 'Weekend', plan, distanceUnit: 'km' });
      if (!saved.ok) throw new Error('expected save to succeed');

      const replacement: RoadPlan = { ...plan, legs: [250] };
      const outcome = service.update(saved.trip.id, { plan: replacement, distanceUnit: 'mi' });

      expect(outcome.ok).toBe(true);
      const stored = service.getById(saved.trip.id);
      expect(stored?.plan).toEqual(replacement);
      expect(stored?.name).toBe('Weekend');
      expect(stored?.id).toBe(saved.trip.id);
      expect(stored?.distanceUnit).toBe('mi');
    });

    it('rejects an unknown id', () => {
      const outcome = service.update('trip-missing', { plan });

      expect(outcome).toEqual({
        ok: false,
        errors: [{ field: 'tripId', message: VALIDATION_MESSAGES.tripIdInvalid }],
      });
    });
  });

  describe('remove', () => {
    it('deletes a saved trip', () => {
      const saved = service.add({ name: 'Weekend', plan, distanceUnit: 'km' });
      if (!saved.ok) throw new Error('expected save to succeed');

      expect(service.remove(saved.trip.id)).toBe(true);
      expect(service.list()).toEqual([]);
    });

    it('returns false for an unknown id', () => {
      expect(service.remove('trip-missing')).toBe(false);
    });
  });
});
