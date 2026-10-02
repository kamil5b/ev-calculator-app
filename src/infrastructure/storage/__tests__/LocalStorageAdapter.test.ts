import { describe, expect, it, vi } from 'vitest';
import { LocalStorageAdapter, MemoryStorageAdapter, createDefaultStorage } from '../LocalStorageAdapter';

describe('LocalStorageAdapter', () => {
  it('reads and writes through the provided store', () => {
    const adapter = new LocalStorageAdapter(window.localStorage);
    expect(adapter.isAvailable).toBe(true);

    expect(adapter.setItem('k', 'v')).toBe(true);
    expect(adapter.getItem('k')).toBe('v');

    adapter.removeItem('k');
    expect(adapter.getItem('k')).toBeNull();
  });

  it('reports failure instead of throwing when the write is rejected', () => {
    // Safari private mode: the property exists but writes throw.
    const throwing = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('QuotaExceededError');
      },
      removeItem: () => {
        throw new DOMException('QuotaExceededError');
      },
    } as unknown as globalThis.Storage;

    const adapter = new LocalStorageAdapter(throwing);
    expect(adapter.setItem('k', 'v')).toBe(false);
    expect(adapter.getItem('k')).toBeNull();
    expect(() => adapter.removeItem('k')).not.toThrow();
  });

  it('reports failure when the read throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => true,
      removeItem: () => {},
    } as unknown as globalThis.Storage;

    expect(new LocalStorageAdapter(throwing).getItem('k')).toBeNull();
  });

  it('falls back to memory when null is passed explicitly', () => {
    const adapter = new LocalStorageAdapter(null);
    expect(adapter.isAvailable).toBe(false);
    expect(adapter.setItem('k', 'v')).toBe(false);
  });

  it('does not report an unavailable store as writable', () => {
    expect(new LocalStorageAdapter(null).setItem('k', 'v')).toBe(false);
  });

  it('probes availability on construction so private mode is detected up front', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    new LocalStorageAdapter();
    expect(spy).toHaveBeenCalledWith('__ev_probe__', '1');
    spy.mockRestore();
  });
});

describe('MemoryStorageAdapter', () => {
  it('behaves like a storage port', () => {
    const adapter = new MemoryStorageAdapter();
    expect(adapter.isAvailable).toBe(false);
    expect(adapter.setItem('k', 'v')).toBe(true);
    expect(adapter.getItem('k')).toBe('v');
    adapter.removeItem('k');
    expect(adapter.getItem('k')).toBeNull();
  });
});

describe('createDefaultStorage', () => {
  it('uses localStorage when it is writable', () => {
    const storage = createDefaultStorage();
    expect(storage.isAvailable).toBe(true);
    expect(storage).toBeInstanceOf(LocalStorageAdapter);
  });

  it('falls back to memory when localStorage is unavailable (PRD 8.2)', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('blocked by policy');
      },
    });

    try {
      const storage = createDefaultStorage();
      expect(storage).toBeInstanceOf(MemoryStorageAdapter);
      expect(storage.isAvailable).toBe(false);
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
    }
  });
});
