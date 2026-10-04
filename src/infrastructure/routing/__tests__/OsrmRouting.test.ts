import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OsrmRouting } from '../OsrmRouting';
import { NetworkError, NoRouteError, RateLimitError } from '../../../domain/entities/Place';
import type { Place } from '../../../domain/entities/Place';

const STOPS: Place[] = [
  { name: 'A', lat: -6.9, lon: 107.6 },
  { name: 'B', lat: -7.0, lon: 107.7 },
  { name: 'C', lat: -7.1, lon: 107.8 },
];

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function okPayload() {
  return {
    code: 'Ok',
    routes: [
      {
        legs: [
          { distance: 1234.5, duration: 630 },
          { distance: 5000, duration: 1200 },
        ],
      },
    ],
  };
}

describe('OsrmRouting', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('encodes stops lon,lat in the path and maps metres/seconds to km/minutes', async () => {
    fetchMock.mockResolvedValue(jsonResponse(okPayload()));

    const routing = new OsrmRouting('https://osrm.example.org/route-url/');
    const result = await routing.getLegs(STOPS);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(
      'https://osrm.example.org/route-url/route/v1/driving/107.6,-6.9;107.7,-7;107.8,-7.1?overview=false',
    );
    expect(result.legs).toEqual([
      { km: 1.2345, minutes: 10.5 },
      { km: 5, minutes: 20 },
    ]);
    expect(result.totalKm).toBeCloseTo(6.2345);
    expect(result.totalMinutes).toBeCloseTo(30.5);
  });

  it('throws NoRouteError without fetching when fewer than two stops', async () => {
    await expect(
      new OsrmRouting('https://osrm.example.org').getLegs([STOPS[0] as Place]),
    ).rejects.toBeInstanceOf(NoRouteError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws NoRouteError when code is not Ok', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ code: 'NoRoute', message: 'no' }));
    await expect(new OsrmRouting('https://osrm.example.org').getLegs(STOPS)).rejects.toBeInstanceOf(
      NoRouteError,
    );
  });

  it('throws NoRouteError when routes or legs are empty', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ code: 'Ok', routes: [] }));
    await expect(new OsrmRouting('https://osrm.example.org').getLegs(STOPS)).rejects.toBeInstanceOf(
      NoRouteError,
    );

    fetchMock.mockResolvedValue(jsonResponse({ code: 'Ok', routes: [{ legs: [] }] }));
    await expect(new OsrmRouting('https://osrm.example.org').getLegs(STOPS)).rejects.toBeInstanceOf(
      NoRouteError,
    );
  });

  it('throws RateLimitError on 429 and NetworkError on 5xx', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 429));
    await expect(new OsrmRouting('https://osrm.example.org').getLegs(STOPS)).rejects.toBeInstanceOf(
      RateLimitError,
    );

    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    await expect(new OsrmRouting('https://osrm.example.org').getLegs(STOPS)).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  it('maps a rejected fetch (offline/DNS) to NetworkError so it gets retried', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(new OsrmRouting('https://osrm.example.org').getLegs(STOPS)).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  it('throws NoRouteError on other 4xx and NetworkError on bad JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 400));
    await expect(new OsrmRouting('https://osrm.example.org').getLegs(STOPS)).rejects.toBeInstanceOf(
      NoRouteError,
    );

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async (): Promise<unknown> => {
        throw new Error('broken');
      },
    } as Response);
    await expect(new OsrmRouting('https://osrm.example.org').getLegs(STOPS)).rejects.toBeInstanceOf(
      NetworkError,
    );
  });
});
