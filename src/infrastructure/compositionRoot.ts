import { BatteryCalculationService } from '../application/services/BatteryCalculationService';
import { CarModelService } from '../application/services/CarModelService';
import { PersistenceService } from '../application/services/PersistenceService';
import { CarModelRepository } from './repositories/CarModelRepository';
import { createDefaultStorage, type StoragePort } from './storage/LocalStorageAdapter';

/** The object graph handed to the UI. */
export interface Container {
  readonly calculations: BatteryCalculationService;
  readonly persistence: PersistenceService;
  readonly cars: CarModelService;
  /** `false` when `localStorage` is unavailable and state is memory-only. */
  readonly storageAvailable: boolean;
}

/**
 * Composition root: the only place that knows which implementation backs which
 * interface. Every other layer depends on abstractions, so swapping
 * `localStorage` for IndexedDB or a network repository touches only this file.
 */
export function createContainer(storage: StoragePort = createDefaultStorage()): Container {
  return {
    calculations: new BatteryCalculationService(),
    persistence: new PersistenceService(storage),
    cars: new CarModelService(new CarModelRepository(storage)),
    storageAvailable: (storage as { isAvailable?: boolean }).isAvailable ?? true,
  };
}
