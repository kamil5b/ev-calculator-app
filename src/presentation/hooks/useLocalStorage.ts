import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { StoragePort } from '../../infrastructure/storage/LocalStorageAdapter';

/** What {@link useLocalStorage} hands back to its caller. */
export interface UseLocalStorage<T> {
  readonly value: T;
  readonly hydrated: boolean;
  /** `false` once a write has failed, so the UI can warn (PRD 8.2). */
  readonly available: boolean;
  setValue: (next: T) => void;
  remove: () => void;
}

/**
 * `useState` mirrored into a {@link StoragePort}.
 *
 * General-purpose building block: the calculator itself goes through
 * `PersistenceService`, but any additional persisted slice (e.g. the Phase 2
 * dark-mode preference) can use this without duplicating the hydration dance.
 *
 * Like every persisted value in this app, the initial state comes from props so
 * server-rendered and client-rendered markup match; the stored value is applied
 * in an effect.
 */
export function useLocalStorage<T>(key: string, initialValue: T, storage: StoragePort): UseLocalStorage<T> {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);
  const [available, setAvailable] = useState(true);
  const storageRef = useRef(storage);
  storageRef.current = storage;

  useEffect(() => {
    const raw = storageRef.current.getItem(key);
    if (raw !== null) {
      try {
        setValue(JSON.parse(raw) as T);
      } catch {
        // A malformed payload is discarded in favour of the default.
      }
    }
    setHydrated(true);
  }, [key]);

  const setStoredValue = useCallback(
    (next: T) => {
      setValue(next);
      if (!storageRef.current.setItem(key, JSON.stringify(next))) setAvailable(false);
    },
    [key],
  );

  const remove = useCallback(() => {
    storageRef.current.removeItem(key);
    setValue(initialValue);
  }, [initialValue, key]);

  return { value, hydrated, available, setValue: setStoredValue, remove };
}
