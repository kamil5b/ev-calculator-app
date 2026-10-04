import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContainer, createProviders } from '../compositionRoot';
import { RoutePlannerService } from '../../application/services/RoutePlannerService';
import { MemoryStorageAdapter } from '../storage/LocalStorageAdapter';
import type { ProvidersConfig } from '../config/providers';

const CONFIG: ProvidersConfig = {
  geocoderProvider: 'nominatim',
  routingProvider: 'osrm',
  nominatimBaseUrl: 'https://nominatim.test',
  osrmBaseUrl: 'https://osrm.test/v1',
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('createProviders', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds adapters from the configured base URLs', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    const providers = createProviders(CONFIG);
    await providers.geocoder.search('Bandung');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('https://nominatim.test/search');

    fetchMock.mockResolvedValue(jsonResponse({ code: 'NoRoute' }));
    await expect(
      providers.routing.getLegs([
        { name: 'A', lat: -6.9, lon: 107.6 },
        { name: 'B', lat: -7, lon: 107.7 },
      ]),
    ).rejects.toThrow();
    expect(fetchMock.mock.calls[1]?.[0]).toContain('https://osrm.test/v1/route/v1/driving/');
  });

  it('falls back to the built-in adapters for unknown selectors', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    const providers = createProviders({
      ...CONFIG,
      geocoderProvider: 'typo',
      routingProvider: 'typo',
    });

    await providers.geocoder.search('Bandung');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('https://nominatim.test/search');
  });

  it('retries a transient NetworkError once through the shared wrapper', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(jsonResponse([]));

      const providers = createProviders(CONFIG);
      const promise = providers.geocoder.search('Bandung');

      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(500);

      await expect(promise).resolves.toEqual([]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('createContainer', () => {
  it('exposes the route planner service', () => {
    const container = createContainer(new MemoryStorageAdapter());
    expect(container.routePlanner).toBeInstanceOf(RoutePlannerService);
  });

  it('reports storageAvailable=false for the memory fallback', () => {
    expect(createContainer(new MemoryStorageAdapter()).storageAvailable).toBe(false);
  });
});
