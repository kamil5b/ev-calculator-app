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

  describe('serialize', () => {
    it('emits the versioned envelope with draft fields only', () => {
      const saved = service.add({ name: 'Weekend', plan, distanceUnit: 'mi' });
      if (!saved.ok) throw new Error('expected save to succeed');

      const parsed = JSON.parse(RoadTripService.serialize(saved.trip));

      expect(parsed).toEqual({
        format: 'ev-calculator-trip',
        version: 1,
        trip: { name: 'Weekend', plan, distanceUnit: 'mi' },
      });
      expect(parsed).not.toHaveProperty('trip.id');
      expect(parsed).not.toHaveProperty('trip.createdAt');
    });
  });

  describe('importTrip', () => {
    const envelope = (overrides: Record<string, unknown> = {}) =>
      JSON.stringify({
        format: 'ev-calculator-trip',
        version: 1,
        trip: { name: 'Imported', plan, distanceUnit: 'km' },
        ...overrides,
      });

    it('round-trips a serialised trip as a new record', () => {
      const saved = service.add({ name: 'Weekend', plan, distanceUnit: 'mi' });
      if (!saved.ok) throw new Error('expected save to succeed');

      const outcome = service.importTrip(RoadTripService.serialize(saved.trip));

      expect(outcome.ok).toBe(true);
      const imported = service.list()[0];
      expect(imported?.name).toBe('Weekend');
      expect(imported?.plan).toEqual(plan);
      expect(imported?.distanceUnit).toBe('mi');
      expect(imported?.id).not.toBe(saved.trip.id);
      expect(service.list()).toHaveLength(2);
    });

    it('rejects a malformed file without writing', () => {
      const cases: [string, string][] = [
        ['garbage', VALIDATION_MESSAGES.tripImportInvalid],
        ['"a string"', VALIDATION_MESSAGES.tripImportInvalid],
        [
          JSON.stringify({ format: 'other-app', version: 1, trip: {} }),
          VALIDATION_MESSAGES.tripImportInvalid,
        ],
        [JSON.stringify({ format: 'ev-calculator-trip', version: 1 }), VALIDATION_MESSAGES.tripImportInvalid],
        [
          JSON.stringify({ format: 'ev-calculator-trip', version: 'x', trip: {} }),
          VALIDATION_MESSAGES.tripImportInvalid,
        ],
        [
          JSON.stringify({ format: 'ev-calculator-trip', version: 1, trip: { name: 42 } }),
          VALIDATION_MESSAGES.tripImportInvalid,
        ],
        [
          JSON.stringify({ format: 'ev-calculator-trip', version: 2, trip: { name: 'x' } }),
          VALIDATION_MESSAGES.tripImportVersion,
        ],
      ];

      for (const [json, message] of cases) {
        expect(service.importTrip(json)).toEqual({
          ok: false,
          errors: [{ field: 'tripImport', message }],
        });
      }
      expect(service.list()).toEqual([]);
    });

    it('surfaces the existing name validation messages', () => {
      const empty = service.importTrip(envelope({ trip: { name: '  ', plan, distanceUnit: 'km' } }));
      expect(empty).toEqual({
        ok: false,
        errors: [{ field: 'tripName', message: VALIDATION_MESSAGES.tripNameRequired }],
      });

      const long = service.importTrip(envelope({ trip: { name: 'x'.repeat(61), plan, distanceUnit: 'km' } }));
      expect(long).toEqual({
        ok: false,
        errors: [{ field: 'tripName', message: VALIDATION_MESSAGES.tripNameTooLong }],
      });
      expect(service.list()).toEqual([]);
    });

    it('degrades corrupt fields the way storage reads do', () => {
      const outcome = service.importTrip(
        JSON.stringify({
          format: 'ev-calculator-trip',
          version: 1,
          trip: { name: 'Degraded', plan: 'not a plan', distanceUnit: 'furlongs' },
        }),
      );

      expect(outcome.ok).toBe(true);
      const imported = service.list()[0];
      expect(imported?.plan).toEqual(DEFAULT_ROAD_PLAN);
      expect(imported?.distanceUnit).toBe('km');
    });
  });
});
