import { beforeEach, describe, expect, it } from 'vitest';
import { RoadTripRepository, generateTripId } from '../RoadTripRepository';
import { MemoryStorageAdapter } from '../../storage/LocalStorageAdapter';
import { DEFAULT_ROAD_PLAN, type RoadPlan } from '../../../domain/entities/RoadPlan';

const TRIPS_KEY = 'ev_calculator_road_trips';
const plan: RoadPlan = { ...DEFAULT_ROAD_PLAN, legs: [100] };
const draft = { name: 'Weekend', plan, distanceUnit: 'km' as const };

describe('RoadTripRepository', () => {
  let storage: MemoryStorageAdapter;
  let repository: RoadTripRepository;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    repository = new RoadTripRepository(storage);
  });

  describe('add', () => {
    it('persists the record and returns it', () => {
      const trip = repository.add(draft);
      expect(repository.getById(trip.id)).toEqual(trip);
      expect(repository.getAll()).toHaveLength(1);
    });

    it('generates unique ids', () => {
      const first = repository.add(draft);
      const second = repository.add(draft);
      expect(first.id).not.toBe(second.id);
      expect(first.id.startsWith('trip-')).toBe(true);
    });

    it('trims the stored name', () => {
      const trip = repository.add({ ...draft, name: '  Home office  ' });
      expect(trip.name).toBe('Home office');
    });
  });

  describe('getAll', () => {
    it('starts empty', () => {
      expect(repository.getAll()).toEqual([]);
    });

    it('returns newest first', () => {
      storage.setItem(
        TRIPS_KEY,
        JSON.stringify([
          { id: 'trip-old', name: 'Older', plan, distanceUnit: 'km', createdAt: 1 },
          { id: 'trip-new', name: 'Newer', plan, distanceUnit: 'km', createdAt: 2 },
        ]),
      );

      expect(repository.getAll().map((trip) => trip.id)).toEqual(['trip-new', 'trip-old']);
    });

    it('returns an empty list for a corrupt payload', () => {
      storage.setItem(TRIPS_KEY, '{not json');
      expect(repository.getAll()).toEqual([]);
      storage.setItem(TRIPS_KEY, '"a string"');
      expect(repository.getAll()).toEqual([]);
    });

    it('drops records without an id or a non-empty name', () => {
      storage.setItem(
        TRIPS_KEY,
        JSON.stringify([
          { id: 'trip-1', name: 'Kept', plan, distanceUnit: 'km', createdAt: 1 },
          { id: 'trip-2', name: '   ', plan, distanceUnit: 'km' },
          { name: 'No id', plan, distanceUnit: 'km' },
          { id: 'trip-3', plan },
        ]),
      );

      expect(repository.getAll().map((trip) => trip.name)).toEqual(['Kept']);
    });

    it('coerces a missing plan to the default plan and a bad unit to km', () => {
      storage.setItem(
        TRIPS_KEY,
        JSON.stringify([{ id: 'trip-1', name: 'Old build', plan: { bogus: true }, distanceUnit: 'furlong' }]),
      );

      const [trip] = repository.getAll();
      expect(trip?.plan).toEqual(DEFAULT_ROAD_PLAN);
      expect(trip?.distanceUnit).toBe('km');
    });
  });

  describe('update', () => {
    it('applies the changes', () => {
      const trip = repository.add(draft);
      const updated = repository.update(trip.id, { plan: { ...plan, legs: [42] } });
      expect(updated?.plan.legs).toEqual([42]);
      expect(updated?.createdAt).toBe(trip.createdAt);
    });

    it('returns null for an unknown id', () => {
      expect(repository.update('trip-missing', { plan })).toBeNull();
    });

    it('cannot change the id or creation timestamp', () => {
      const trip = repository.add(draft);
      repository.update(trip.id, { id: 'trip-hacked', createdAt: 0 } as never);
      expect(repository.getById('trip-hacked')).toBeNull();
      expect(repository.getById(trip.id)).not.toBeNull();
    });
  });
});

describe('generateTripId', () => {
  it('is unique and prefixed', () => {
    expect(generateTripId()).not.toBe(generateTripId());
    expect(generateTripId().startsWith('trip-')).toBe(true);
  });
});
