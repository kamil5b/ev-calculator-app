import { describe, expect, it, vi } from 'vitest';
import { RoutePlannerService, type PlaceSearchCache } from '../RoutePlannerService';
import type { IGeocoderProvider } from '../../../domain/repositories/IGeocoderProvider';
import type { IRoutingProvider } from '../../../domain/repositories/IRoutingProvider';
import {
  NetworkError,
  NoRouteError,
  RateLimitError,
  RoutePlannerError,
} from '../../../domain/entities/Place';
import { VALIDATION_MESSAGES } from '../../../domain/entities/validation';

const BANDUNG = { name: 'Bandung', lat: -6.9, lon: 107.6 };
const JAKARTA = { name: 'Jakarta', lat: -6.2, lon: 106.8 };

function makeService(options?: {
  search?: IGeocoderProvider['search'];
  legs?: IRoutingProvider['getLegs'];
  cache?: PlaceSearchCache;
}) {
  const geocoder: IGeocoderProvider = {
    search: options?.search ?? vi.fn(async () => []),
  };
  const routing: IRoutingProvider = {
    getLegs: options?.legs ?? vi.fn(async () => ({ legs: [], totalKm: 0, totalMinutes: 0 })),
  };
  return new RoutePlannerService(geocoder, routing, options?.cache);
}

describe('RoutePlannerService.searchPlaces', () => {
  it('hits the geocoder on a cache miss and stores the result', async () => {
    const search = vi.fn(async () => [BANDUNG]);
    const set = vi.fn();
    const service = makeService({ search, cache: { get: () => null, set } });

    const results = await service.searchPlaces('bandung');

    expect(results).toEqual([BANDUNG]);
    expect(search).toHaveBeenCalledWith('bandung', undefined);
    expect(set).toHaveBeenCalledWith('bandung', [BANDUNG]);
  });

  it('serves a cache hit without touching the network', async () => {
    const search = vi.fn(async () => [JAKARTA]);
    const service = makeService({ search, cache: { get: () => [BANDUNG], set: vi.fn() } });

    await expect(service.searchPlaces('bandung')).resolves.toEqual([BANDUNG]);
    expect(search).not.toHaveBeenCalled();
  });

  it('treats an empty cache entry as a hit (do not re-query for no-result searches)', async () => {
    const search = vi.fn(async () => [BANDUNG]);
    const service = makeService({ search, cache: { get: () => [], set: vi.fn() } });

    await expect(service.searchPlaces('bandung')).resolves.toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it('propagates geocoder errors untouched', async () => {
    const search = vi.fn(async () => {
      throw new NetworkError();
    });
    const service = makeService({ search });

    await expect(service.searchPlaces('bandung')).rejects.toBeInstanceOf(NetworkError);
  });
});

describe('RoutePlannerService.planRoute', () => {
  it('passes legs through unchanged when the unit is km', async () => {
    const legs = vi.fn(async () => ({
      legs: [
        { km: 12.34, minutes: 45.67 },
        { km: 10.05, minutes: 9.99 },
      ],
      totalKm: 22.39,
      totalMinutes: 55.66,
    }));
    const service = makeService({ legs });

    const result = await service.planRoute([BANDUNG, JAKARTA, BANDUNG], 'km');

    expect(legs).toHaveBeenCalledWith([BANDUNG, JAKARTA, BANDUNG]);
    expect(result).toEqual({
      legs: [
        { km: 12.3, minutes: 45.7 },
        { km: 10.1, minutes: 10 },
      ],
      totalKm: 22.4,
      totalMinutes: 55.7,
    });
  });

  it('converts km to miles and rounds to one decimal', async () => {
    const legs = vi.fn(async () => ({
      legs: [{ km: 100, minutes: 60 }],
      totalKm: 100,
      totalMinutes: 60,
    }));
    const service = makeService({ legs });

    const result = await service.planRoute([BANDUNG, JAKARTA], 'mi');

    // 100 / 1.609344 = 62.137… → 62.1
    expect(result.legs).toEqual([{ km: 62.1, minutes: 60 }]);
    expect(result.totalKm).toBe(62.1);
  });

  it('propagates routing errors untouched', async () => {
    const legs = vi.fn(async () => {
      throw new NoRouteError();
    });
    const service = makeService({ legs });

    await expect(service.planRoute([BANDUNG, JAKARTA], 'km')).rejects.toBeInstanceOf(NoRouteError);
  });
});

describe('RoutePlannerService.errorMessage', () => {
  it('maps every known error to its message', () => {
    expect(RoutePlannerService.errorMessage(new NoRouteError())).toBe(VALIDATION_MESSAGES.routeNoRoute);
    expect(RoutePlannerService.errorMessage(new RateLimitError())).toBe(VALIDATION_MESSAGES.routeRateLimit);
    expect(RoutePlannerService.errorMessage(new NetworkError())).toBe(VALIDATION_MESSAGES.routeNetwork);
    expect(RoutePlannerService.errorMessage(new RoutePlannerError('custom'))).toBe('custom');
    expect(RoutePlannerService.errorMessage(new Error('plain'))).toBe('plain');
    expect(RoutePlannerService.errorMessage('not an error')).toBe(VALIDATION_MESSAGES.searchFailed);
  });
});
