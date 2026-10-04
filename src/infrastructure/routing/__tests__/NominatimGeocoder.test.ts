import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NominatimGeocoder } from '../NominatimGeocoder';
import { NetworkError, NoRouteError, RateLimitError } from '../../../domain/entities/Place';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('NominatimGeocoder', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps display_name/lat/lon into Place', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([{ display_name: 'Bandung, Indonesia', lat: '-6.9175', lon: '107.6191' }]),
    );

    const geocoder = new NominatimGeocoder('https://nominatim.example.org');
    const controller = new AbortController();
    const results = await geocoder.search('  Bandung ', controller.signal);

    expect(results).toEqual([{ name: 'Bandung, Indonesia', lat: -6.9175, lon: 107.6191 }]);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://nominatim.example.org/search');
    expect(url).toContain('q=Bandung');
    expect(url).toContain('format=jsonv2&countrycodes=id&limit=5');
    expect(options.signal).toBe(controller.signal);
  });

  it('caps the list at five results', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        Array.from({ length: 8 }, (_, index) => ({
          display_name: `Place ${index}`,
          lat: String(index),
          lon: String(index),
        })),
      ),
    );

    const results = await new NominatimGeocoder('https://nominatim.example.org').search('x');
    expect(results).toHaveLength(5);
  });

  it('drops malformed entries instead of throwing', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        { display_name: 'Good', lat: '1', lon: '2' },
        { display_name: '', lat: '1', lon: '2' },
        { display_name: 'Bad coords', lat: 'nope', lon: '2' },
        'not an object',
      ]),
    );

    const results = await new NominatimGeocoder('https://nominatim.example.org').search('x');
    expect(results).toEqual([{ name: 'Good', lat: 1, lon: 2 }]);
  });

  it('returns an empty array for an empty query without fetching', async () => {
    const results = await new NominatimGeocoder('https://nominatim.example.org').search('   ');
    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an empty array for a non-array payload', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'boom' }));
    const results = await new NominatimGeocoder('https://nominatim.example.org').search('x');
    expect(results).toEqual([]);
  });

  it('throws RateLimitError on 429', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 429));
    await expect(new NominatimGeocoder('https://n').search('x')).rejects.toBeInstanceOf(RateLimitError);
  });

  it('throws NetworkError on 5xx and on invalid JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 503));
    await expect(new NominatimGeocoder('https://n').search('x')).rejects.toBeInstanceOf(NetworkError);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async (): Promise<unknown> => {
        throw new Error('bad json');
      },
    } as Response);
    await expect(new NominatimGeocoder('https://n').search('x')).rejects.toBeInstanceOf(NetworkError);
  });

  it('maps a rejected fetch (offline/DNS) to NetworkError so it gets retried', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(new NominatimGeocoder('https://n').search('x')).rejects.toBeInstanceOf(NetworkError);
  });

  it('throws NoRouteError on other 4xx', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 400));
    await expect(new NominatimGeocoder('https://n').search('x')).rejects.toBeInstanceOf(NoRouteError);
  });
});
