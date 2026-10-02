/**
 * Narrow slice of the `Storage` API the application actually needs.
 *
 * Depending on this instead of `window.localStorage` keeps the services
 * testable and makes the "storage may be unavailable" case (PRD 8.2) explicit.
 */
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): boolean;
  removeItem(key: string): void;
}

/** Wraps `window.localStorage` and never throws (PRD 8.2, 8.3). */
export class LocalStorageAdapter implements StoragePort {
  private readonly backing: globalThis.Storage | null;

  /** @param storage Defaults to `window.localStorage` when available. */
  constructor(storage?: globalThis.Storage | null) {
    this.backing = storage === undefined ? resolveLocalStorage() : storage;
  }

  /** `true` when a real backing store was found and is writable. */
  get isAvailable(): boolean {
    return this.backing !== null;
  }

  getItem(key: string): string | null {
    try {
      return this.backing?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  /** @returns `true` when the value was written. */
  setItem(key: string, value: string): boolean {
    try {
      this.backing?.setItem(key, value);
      return this.backing !== null;
    } catch {
      // Quota exceeded, Safari private mode, disabled cookies — all degrade to
      // in-memory state without interrupting the user.
      return false;
    }
  }

  removeItem(key: string): void {
    try {
      this.backing?.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/**
 * In-memory {@link StoragePort} used when `localStorage` is missing.
 *
 * Keeps the session usable (PRD 8.2: "Falls back to session state") and gives
 * tests a dependency-free double.
 */
export class MemoryStorageAdapter implements StoragePort {
  private readonly map = new Map<string, string>();

  get isAvailable(): boolean {
    return false;
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): boolean {
    this.map.set(key, value);
    return true;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

/**
 * Picks the best available store.
 *
 * Safari in private mode exposes `localStorage` but throws on write, so
 * availability is probed with a real write rather than a feature check.
 */
function resolveLocalStorage(): globalThis.Storage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') return null;
    const probeKey = '__ev_probe__';
    globalThis.localStorage.setItem(probeKey, '1');
    globalThis.localStorage.removeItem(probeKey);
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

/**
 * Builds the adapter appropriate for the current environment.
 *
 * @returns a writable adapter when persistence is possible, otherwise the
 *   in-memory fallback flagged as unavailable so the UI can warn the user.
 */
export function createDefaultStorage(): StoragePort & { isAvailable: boolean } {
  const local = new LocalStorageAdapter();
  return local.isAvailable ? local : new MemoryStorageAdapter();
}
