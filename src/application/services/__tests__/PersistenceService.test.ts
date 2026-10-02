import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PersistenceService,
  coerceCapacity,
  coerceEfficiency,
  coercePercent,
  normaliseBatteryState,
  safeParse,
} from '../PersistenceService';
import { DEFAULT_BATTERY_STATE } from '../../../domain/entities/BatteryState';
import { MemoryStorageAdapter, type StoragePort } from '../../../infrastructure/storage/LocalStorageAdapter';

const KEY = 'ev_calculator_state';

describe('PersistenceService', () => {
  let storage: MemoryStorageAdapter;
  let service: PersistenceService;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    service = new PersistenceService(storage, KEY);
  });

  describe('load', () => {
    it('returns the defaults when nothing has been saved', () => {
      expect(service.load()).toEqual(DEFAULT_BATTERY_STATE);
    });

    it('round-trips a saved state', () => {
      const state = {
        carId: 'car-1',
        totalCapacity: 82.5,
        currentBattery: 45,
        targetBattery: 90,
        minBattery: 10,
        efficiency: 27.4,
        distanceUnit: 'mi' as const,
        tripDistance: 31.1,
        tripEfficiency: 30,
        electricityRate: 0.35,
      };
      expect(service.save(state)).toBe(true);
      expect(service.load()).toEqual(state);
    });

    it('returns the defaults for malformed JSON instead of throwing', () => {
      storage.setItem(KEY, '{not json');
      expect(service.load()).toEqual(DEFAULT_BATTERY_STATE);
    });

    it('returns the defaults when the payload is not an object', () => {
      storage.setItem(KEY, '"a string"');
      expect(service.load()).toEqual(DEFAULT_BATTERY_STATE);
    });

    it('replaces individual invalid fields with their defaults', () => {
      storage.setItem(
        KEY,
        JSON.stringify({
          currentBattery: 500,
          totalCapacity: 82,
          targetBattery: 90,
          minBattery: 10,
          efficiency: 17,
        }),
      );
      const loaded = service.load();
      expect(loaded.currentBattery).toBe(DEFAULT_BATTERY_STATE.currentBattery);
      expect(loaded.totalCapacity).toBe(82);
    });

    it('accepts numeric strings, which older builds wrote', () => {
      storage.setItem(
        KEY,
        JSON.stringify({
          totalCapacity: '77',
          currentBattery: '33',
          targetBattery: '80',
          minBattery: '5',
          efficiency: '15',
        }),
      );
      const loaded = service.load();
      expect(loaded.totalCapacity).toBe(77);
      expect(loaded.currentBattery).toBe(33);
    });
  });

  describe('save', () => {
    it('reports failure when the store rejects the write (PRD 8.2)', () => {
      const failing: StoragePort = {
        getItem: () => null,
        setItem: () => false,
        removeItem: () => {},
      };
      expect(new PersistenceService(failing, KEY).save(DEFAULT_BATTERY_STATE)).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes the persisted state', () => {
      service.save(DEFAULT_BATTERY_STATE);
      service.clear();
      expect(service.load()).toEqual(DEFAULT_BATTERY_STATE);
      expect(storage.getItem(KEY)).toBeNull();
    });
  });

  it('defaults to the documented storage key', () => {
    const spy = vi.spyOn(storage, 'getItem');
    new PersistenceService(storage).load();
    expect(spy).toHaveBeenCalledWith('ev_calculator_state');
  });
});

describe('normaliseBatteryState', () => {
  it('clamps rather than rejects out-of-range percentages', () => {
    expect(normaliseBatteryState({ currentBattery: 150 }).currentBattery).toBe(
      DEFAULT_BATTERY_STATE.currentBattery,
    );
  });

  it('rounds fractional percentages to whole numbers', () => {
    expect(normaliseBatteryState({ currentBattery: 45.6 }).currentBattery).toBe(46);
  });

  it('normalises an empty carId to null', () => {
    expect(normaliseBatteryState({ carId: '' }).carId).toBeNull();
  });

  it('keeps a null carId', () => {
    expect(normaliseBatteryState({ carId: null }).carId).toBeNull();
  });

  it('falls back to the default capacity for an out-of-range value', () => {
    expect(normaliseBatteryState({ totalCapacity: 5 }).totalCapacity).toBe(
      DEFAULT_BATTERY_STATE.totalCapacity,
    );
  });
});

describe('coercion helpers', () => {
  describe('coercePercent', () => {
    it.each([0, 1, 50, 100])('accepts %i', (value) => expect(coercePercent(value)).toBe(value));

    it('rounds decimals', () => {
      expect(coercePercent(33.4)).toBe(33);
    });

    it.each([-1, 101, Number.NaN, null, undefined, {}, 'abc', ''])('rejects %p', (value) => {
      expect(coercePercent(value)).toBeNull();
    });
  });

  describe('coerceCapacity', () => {
    it('accepts the documented range', () => {
      expect(coerceCapacity(10)).toBe(10);
      expect(coerceCapacity(200)).toBe(200);
    });

    it('preserves a fractional capacity', () => {
      expect(coerceCapacity(82.5)).toBe(82.5);
    });

    it('rejects out-of-range and non-numeric values', () => {
      expect(coerceCapacity(9.9)).toBeNull();
      expect(coerceCapacity(201)).toBeNull();
      expect(coerceCapacity('abc')).toBeNull();
    });
  });

  describe('coerceEfficiency', () => {
    it('accepts the documented range', () => {
      expect(coerceEfficiency(5)).toBe(5);
      expect(coerceEfficiency(30)).toBe(30);
    });

    it('treats an empty field as "not provided"', () => {
      expect(coerceEfficiency(null)).toBeNull();
      expect(coerceEfficiency(undefined)).toBeNull();
      expect(coerceEfficiency('')).toBeNull();
      expect(coerceEfficiency('  ')).toBeNull();
    });

    it('rejects out-of-range values', () => {
      expect(coerceEfficiency(4.9)).toBeNull();
      expect(coerceEfficiency(30.1)).toBeNull();
    });
  });
});

describe('safeParse', () => {
  it('returns the parsed value for valid JSON', () => {
    expect(safeParse('{"a":1}')).toEqual({ a: 1 });
  });

  it('returns null for invalid JSON', () => {
    expect(safeParse('nope')).toBeNull();
  });
});

describe('PersistenceService Phase 2 fields', () => {
  let storage: MemoryStorageAdapter;
  let service: PersistenceService;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    service = new PersistenceService(storage, KEY);
  });

  it('defaults every Phase 2 field when an older build wrote the payload', () => {
    storage.setItem(
      KEY,
      JSON.stringify({
        totalCapacity: 82,
        currentBattery: 45,
        targetBattery: 90,
        minBattery: 10,
        efficiency: 17,
      }),
    );
    const loaded = service.load();
    expect(loaded.distanceUnit).toBe('km');
    expect(loaded.tripDistance).toBeNull();
    expect(loaded.tripEfficiency).toBeNull();
    expect(loaded.electricityRate).toBeNull();
  });

  it('falls back to km for an unknown unit', () => {
    storage.setItem(KEY, JSON.stringify({ distanceUnit: 'furlong' }));
    expect(service.load().distanceUnit).toBe('km');
  });

  it('checks efficiency against the bounds of the stored unit', () => {
    // 8.0 kWh/100mi is valid, but would be below the 5–30 kWh/100km window as km.
    storage.setItem(KEY, JSON.stringify({ distanceUnit: 'mi', efficiency: 8, tripEfficiency: 48.3 }));
    expect(service.load().efficiency).toBe(8);
    expect(service.load().tripEfficiency).toBe(48.3);

    storage.setItem(KEY, JSON.stringify({ distanceUnit: 'km', efficiency: 40 }));
    expect(service.load().efficiency).toBeNull();
  });

  it('drops a negative distance or price', () => {
    storage.setItem(KEY, JSON.stringify({ tripDistance: -5, electricityRate: -1 }));
    const loaded = service.load();
    expect(loaded.tripDistance).toBeNull();
    expect(loaded.electricityRate).toBeNull();
  });
});
