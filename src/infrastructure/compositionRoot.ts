import { BatteryCalculationService } from '../application/services/BatteryCalculationService';
import { CarModelService } from '../application/services/CarModelService';
import { PersistenceService } from '../application/services/PersistenceService';
import { RoadTripService } from '../application/services/RoadTripService';
import { RoutePlannerService } from '../application/services/RoutePlannerService';
import type { IGeocoderProvider } from '../domain/repositories/IGeocoderProvider';
import type { IRoutingProvider } from '../domain/repositories/IRoutingProvider';
import { CarModelRepository } from './repositories/CarModelRepository';
import { RoadTripRepository } from './repositories/RoadTripRepository';
import { PlaceCacheRepository } from './repositories/PlaceCacheRepository';
import { NominatimGeocoder } from './routing/NominatimGeocoder';
import { OsrmRouting } from './routing/OsrmRouting';
import { withRetry } from './network/withRetry';
import { loadProvidersConfig, type ProvidersConfig } from './config/providers';
import { createDefaultStorage, type StoragePort } from './storage/LocalStorageAdapter';

/** The two network ports, already wrapped for retry and timeout. */
export interface Providers {
  readonly geocoder: IGeocoderProvider;
  readonly routing: IRoutingProvider;
}

/** The object graph handed to the UI. */
export interface Container {
  readonly calculations: BatteryCalculationService;
  readonly persistence: PersistenceService;
  readonly cars: CarModelService;
  readonly trips: RoadTripService;
  readonly routePlanner: RoutePlannerService;
  /** `false` when `localStorage` is unavailable and state is memory-only. */
  readonly storageAvailable: boolean;
}

/**
 * Builds the two provider ports from config (ACTUAL_PLACE_PLANNING §3) —
 * the only place that names a concrete adapter. Each call goes through the
 * shared `withRetry` wrapper (8 s, 2 attempts); the adapters stay
 * single-attempt. Unknown selector values fall back to the built-in default,
 * so a typo degrades to a working app instead of a crash.
 *
 * Adding an adapter = one file in `routing/` + one `case` below
 * (`docs/ADDING_A_PROVIDER.md`).
 */
export function createProviders(config: ProvidersConfig = loadProvidersConfig()): Providers {
  const geocoder = createGeocoder(config);
  const routing = createRouting(config);

  return {
    geocoder: {
      search: (query) => withRetry((signal) => geocoder.search(query, signal)),
    },
    routing: {
      getLegs: (stops) => withRetry((signal) => routing.getLegs(stops, signal)),
    },
  };
}

function createGeocoder(config: ProvidersConfig): IGeocoderProvider {
  switch (config.geocoderProvider) {
    case 'nominatim':
    default:
      return new NominatimGeocoder(config.nominatimBaseUrl);
  }
}

function createRouting(config: ProvidersConfig): IRoutingProvider {
  switch (config.routingProvider) {
    case 'osrm':
    default:
      return new OsrmRouting(config.osrmBaseUrl);
  }
}

/**
 * Composition root: the only place that knows which implementation backs which
 * interface. Every other layer depends on abstractions, so swapping
 * `localStorage` for IndexedDB or a network repository touches only this file.
 */
export function createContainer(storage: StoragePort = createDefaultStorage()): Container {
  const providers = createProviders();

  return {
    calculations: new BatteryCalculationService(),
    persistence: new PersistenceService(storage),
    cars: new CarModelService(new CarModelRepository(storage)),
    trips: new RoadTripService(new RoadTripRepository(storage)),
    routePlanner: new RoutePlannerService(
      providers.geocoder,
      providers.routing,
      new PlaceCacheRepository(storage),
    ),
    storageAvailable: (storage as { isAvailable?: boolean }).isAvailable ?? true,
  };
}
