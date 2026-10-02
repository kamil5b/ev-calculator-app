import type { StoragePort } from '../../infrastructure/storage/LocalStorageAdapter';
import { DEFAULT_BATTERY_STATE, type BatteryState } from '../../domain/entities/BatteryState';
import { STORAGE_KEY } from '../../infrastructure/config/site';
import {
  MAX_BATTERY_PERCENT,
  MAX_CAPACITY,
  MAX_EFFICIENCY,
  MIN_BATTERY_PERCENT,
  MIN_CAPACITY,
  MIN_EFFICIENCY,
} from '../../domain/entities/validation';

/**
 * Reads and writes the calculator state (PRD 2.3).
 *
 * Hydration is defensive by design: `localStorage` may be disabled, full, or
 * hold data written by an older build, so every field is validated and replaced
 * with its default when it cannot be trusted. Nothing here ever throws — a
 * storage failure degrades to in-memory state (PRD 8.2, 8.3).
 */
export class PersistenceService {
  constructor(
    private readonly storage: StoragePort,
    private readonly key: string = STORAGE_KEY,
  ) {}

  /** Loads the persisted state, falling back to defaults per field. */
  load(): BatteryState {
    const raw = this.storage.getItem(this.key);
    if (raw === null) return { ...DEFAULT_BATTERY_STATE };

    const parsed = safeParse(raw);
    if (parsed === null || typeof parsed !== 'object') return { ...DEFAULT_BATTERY_STATE };

    return normaliseBatteryState(parsed as Partial<Record<keyof BatteryState, unknown>>);
  }

  /**
   * Persists the state.
   *
   * @returns `true` when the write succeeded, `false` when the caller should
   *   surface the "storage unavailable" warning.
   */
  save(state: BatteryState): boolean {
    return this.storage.setItem(this.key, JSON.stringify(state));
  }

  /** Drops the persisted state so the next `load()` returns defaults. */
  clear(): void {
    this.storage.removeItem(this.key);
  }
}

/**
 * Coerces an untrusted record into a {@link BatteryState}.
 *
 * Used **only** when hydrating from storage: the payload may have been written
 * by an older build or corrupted, so each field falls back to its default when it
 * cannot be trusted. Range limits are enforced here as a corruption guard; the
 * live UI state is deliberately *not* normalised, because `validateBatteryInputs`
 * needs to see what the user actually typed in order to report an inline error.
 *
 * The only value that survives as `null` is `efficiency`, which is a legitimate
 * "not provided" rather than a missing field.
 */
export function normaliseBatteryState(raw: Partial<Record<keyof BatteryState, unknown>>): BatteryState {
  return {
    carId: typeof raw.carId === 'string' && raw.carId.length > 0 ? raw.carId : DEFAULT_BATTERY_STATE.carId,
    totalCapacity: coerceCapacity(raw.totalCapacity) ?? DEFAULT_BATTERY_STATE.totalCapacity,
    currentBattery: coercePercent(raw.currentBattery) ?? DEFAULT_BATTERY_STATE.currentBattery,
    targetBattery: coercePercent(raw.targetBattery) ?? DEFAULT_BATTERY_STATE.targetBattery,
    minBattery: coercePercent(raw.minBattery) ?? DEFAULT_BATTERY_STATE.minBattery,
    // An absent key means "this build never wrote it" → use the default. A key
    // that is present but null was written deliberately: the user cleared the
    // optional efficiency field, so it must stay null.
    efficiency:
      raw.efficiency === undefined ? DEFAULT_BATTERY_STATE.efficiency : coerceEfficiency(raw.efficiency),
  };
}

/** Parses JSON without throwing on malformed payloads. */
export function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/**
 * Returns a whole percentage, or `null` when the value is unusable.
 *
 * Range limits are enforced because this is the trust boundary for stored data;
 * a percentage outside 0–100 could only have come from a corrupt payload.
 */
export function coercePercent(value: unknown): number | null {
  const numeric = toNumber(value);
  if (numeric === null) return null;
  if (numeric < MIN_BATTERY_PERCENT || numeric > MAX_BATTERY_PERCENT) return null;
  return Math.round(numeric);
}

/**
 * Returns a 10–200 kWh capacity, or `null` when unusable.
 *
 * Same corruption guard as {@link coercePercent}; the live field is validated by
 * `validateBatteryInputs` so the user still gets an inline range error while typing.
 */
export function coerceCapacity(value: unknown): number | null {
  const numeric = toNumber(value);
  if (numeric === null) return null;
  if (numeric < MIN_CAPACITY || numeric > MAX_CAPACITY) return null;
  return numeric;
}

/**
 * Returns a 5–30 kWh/100km consumption, or `null`.
 *
 * `null` carries both "field left empty" (legitimate, PRD 2.1) and "value out of
 * range" (invalid). {@link normaliseBatteryState} separates them by checking for
 * an absent key first, so a deliberately cleared field is never resurrected.
 */
export function coerceEfficiency(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = toNumber(value);
  if (numeric === null) return null;
  if (numeric < MIN_EFFICIENCY || numeric > MAX_EFFICIENCY) return null;
  return numeric;
}

/** Coerces unknown input (string or number) to a finite number, or `null`. */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
