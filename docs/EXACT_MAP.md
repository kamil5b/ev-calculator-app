# Route Planner with places

**1. Interfaces (the app only depends on these)**

```ts
interface Place {
  name: string;
  lat: number;
  lon: number;
}

interface Leg {
  km: number;
  minutes: number;
}
interface RouteResult {
  legs: Leg[];
  totalKm: number;
  totalMinutes: number;
}

interface GeocoderProvider {
  search(query: string, signal?: AbortSignal): Promise<Place[]>;
}

interface RoutingProvider {
  getLegs(stops: Place[], signal?: AbortSignal): Promise<RouteResult>;
}
```

**2. Default implementations**

- `NominatimGeocoder implements GeocoderProvider`
  - `GET https://nominatim.openstreetmap.org/search?q={query}&format=jsonv2&countrycodes=id&limit=5`
  - Maps `display_name`, `lat`, `lon` to `Place`
- `OsrmRouting implements RoutingProvider`
  - `GET https://router.project-osrm.org/route/v1/driving/{lon,lat;...}?overview=false`
  - Maps `routes[0].legs[]` (m to km, s to min) to `RouteResult`
- Future swaps (Photon, Geoapify, OpenRouteService, Valhalla, self-hosted OSRM) just implement the same interface.

**3. Wiring**

- Inject providers once at startup (config or factory), for example `createProviders(config)`.
- UI code never imports Nominatim or OSRM directly.
- Base URLs and API keys come from config, not hardcoded.

**4. User flow**

- Search triggered only by the Search button or Enter, with no autocomplete.
- Search button disabled for 1 second after each request (Nominatim limit is 1 req/sec).
- The user picks a result, which is added to `stops[]`.
- Stops can be removed or reordered; minimum 2 stops.
- "Done planning" is disabled until there are at least 2 stops, then calls `routing.getLegs(stops)` once.
- Leg `i` = `stops[i]` to `stops[i+1]`; show the total.

**5. Retry and error handling (in a shared wrapper, not in each provider)**

```ts
async function withRetry<T>(fn: (s: AbortSignal) => Promise<T>, tries = 2, timeoutMs = 8000): Promise<T> {
  let err;
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fn(ctrl.signal);
    } catch (e) {
      err = e;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    } finally {
      clearTimeout(t);
    }
  }
  throw err;
}
```

- 8 s timeout, 2 attempts total, short backoff between attempts.
- Retry on network errors, timeouts, and 5xx or 429.
- Do not retry on `NoRoute` or 4xx; show the message instead.
- Providers throw typed errors (`NoRouteError`, `RateLimitError`, `NetworkError`) so the UI shows a clear message.
- Empty search results show "No results".

**6. Optional**

- Cache `getLegs` results by rounded coordinates.
- Fallback to a Haversine estimate, labeled "approximate", if routing fails.

**7. Credits**

- Visible footer or About text: `© OpenStreetMap contributors` (link to openstreetmap.org/copyright) and `Routing by OSRM`. Update this if you swap providers.

**8. Before release**

- The public Nominatim and OSRM servers are for light use only. Swap in keyed or self-hosted implementations behind the same interfaces.
