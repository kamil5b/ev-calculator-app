# Adding a provider adapter

The route planner depends on two ports only (`docs/ACTUAL_PLACE_PLANNING.md` §1):

```ts
interface GeocoderProvider {
  search(query: string, signal?: AbortSignal): Promise<Place[]>;
}

interface RoutingProvider {
  getLegs(stops: Place[], signal?: AbortSignal): Promise<RouteResult>;
}
```

The repo ships exactly two adapters — `NominatimGeocoder` and `OsrmRouting`.
Anything else (Google, Stadia Maps, Valhalla, Photon, Geoapify,
OpenRouteService, a private backend, …) is added by a contributor as a new
adapter. This document is the recipe.

## The contract

1. **Normalise, don't leak.** The port output is fixed: `Place[]` for search
   (≤ 5 entries, `name` = display label) and `RouteResult` for legs (**km and
   minutes**, already summed). Whatever your engine returns — metres, miles,
   seconds, nested `trip` vs `routes` — the conversion happens inside the
   adapter. No engine-specific type may escape `infrastructure/`.
2. **Throw typed errors only** (from `src/domain/entities/Place.ts`):
   - `NoRouteError` — the engine says no path / bad request. **Never retried.**
   - `RateLimitError` — HTTP 429. Retried by the wrapper.
   - `NetworkError` — timeouts, aborts, DNS, HTTP 5xx. Retried by the wrapper.
     Any other 4xx: map it to `NoRouteError` (or a plain `Error`) so the UI just
     shows the message instead of hammering a key that will never work.
3. **No retry, no timeout inside the adapter.** `withRetry`
   (`src/infrastructure/network/withRetry.ts`) wraps every call at the
   factory — 8 s, 2 attempts, backoff. Adapters are single-attempt and honour
   the `AbortSignal` they receive (`fetch(url, { signal })`).
4. **Config, never literals.** Base URL and API key come from
   `src/infrastructure/config/providers.ts` (`process.env` fallbacks, same
   pattern as `config/site.ts`). Keys are build-time env vars, never
   committed and never typed into source. The app is a static site, so a key
   shipped this way is public — restrict it (referrer/usage rules) on the
   provider's side.
5. **No `fetch` outside infrastructure.** UI and services call the port via
   the container; `presentation/` must not import your class.
6. **No dependencies.** Adapters are plain `fetch` + JSON mapping — adding a
   SDK would inflate the bundle for one call.

## Steps — a routing adapter

1. **Create** `src/infrastructure/routing/MyRouting.ts` implementing
   `IRoutingProvider`. Sketch:

   ```ts
   export class MyRouting implements IRoutingProvider {
     constructor(private readonly baseUrl: string, private readonly apiKey = '') {}

     async getLegs(stops: Place[], signal?: AbortSignal): Promise<RouteResult> {
       if (stops.length < 2) throw new NoRouteError('At least two stops');
       const url = `${this.baseUrl}/…`; // engine-specific request
       const response = await fetch(url, { signal });
       if (response.status === 429) throw new RateLimitError();
       if (!response.ok) throw new NetworkError(`HTTP ${response.status}`);
       const data = await response.json();
       if (/* engine says no route */) throw new NoRouteError();
       const legs = /* map each leg: metres → km, seconds → min */;
       const totalKm = legs.reduce((sum, leg) => sum + leg.km, 0);
       const totalMinutes = legs.reduce((sum, leg) => sum + leg.minutes, 0);
       return { legs, totalKm, totalMinutes };
     }
   }
   ```

2. **Config** — add the env vars to `config/providers.ts`
   (e.g. `MY_BASE_URL`, optional `MY_API_KEY`) and a selector value
   (`ROUTING_PROVIDER=my`).
3. **Register** — one `case` in `createProviders` in
   `src/infrastructure/compositionRoot.ts`, still wrapped in `withRetry`.
   Unknown selector values keep falling back to `osrm`.
4. **CSP** — add your API origin to `connect-src` in `astro.config.mjs`
   (the directive is built from config; a blocked origin fails silently in
   the console otherwise).
5. **Credits** — update the footer line in `BatteryCalculator.tsx`
   (`Routing by …`); keep `© OpenStreetMap contributors` only if your data
   source is OSM.
6. **Tests** — `src/infrastructure/routing/__tests__/MyRouting.test.ts` with
   mocked `fetch`: happy path (exact km/minutes), `NoRouteError`, 429 →
   `RateLimitError`, 5xx → `NetworkError`, aborted signal. Plus one row in
   `compositionRoot.test.ts` for the selector.
7. **Docs** — add your env vars to the table in `CONTRIBUTOR_NOTES.md`.

## Steps — a geocoder adapter

Same seven steps, but the port is `IGeocoderProvider` and:

- Return **at most 5** `Place`s; `name` is what the picker shows (use the
  engine's display label), `lat`/`lon` as numbers.
- Empty result = empty array, **not** an error — the UI shows "No results".
- The 1 s Search-button cooldown in the UI exists for the public Nominatim
  policy; keep it even if your engine allows more (harmless, and your adapter
  stays swappable).

## Notes by example

- **OSRM-compatible backends** (Stadia Maps routing, a self-hosted OSRM,
  Mapbox OSRM-compatible endpoints): near-copy of `OsrmRouting` — change base
  URL via `OSRM_BASE_URL` when no code differs; add an adapter only when the
  path or auth differs (e.g. `?api_key=`).
- **Valhalla**: request is JSON (`GET /route?json=…` or `POST /route` with
  `locations:[{lat,lon}]` + `costing:"auto"`), response is
  `trip.legs[].summary.length` in **kilometres** (not metres like OSRM) and
  `time` in seconds; errors arrive as HTTP 4xx with `error_code`/`error`.
- **Google / Stadia / Geoapify keyed APIs**: key via env, map
  `routes[0].legs[]`-style responses, remember the CSP origin and the
  referrer-restricted key.

## Checklist

- [ ] Implements the port exactly; no new types leave `infrastructure/`
- [ ] Output in km / minutes; ≤ 5 places for geocoders
- [ ] Typed errors only; no retry/timeout logic inside
- [ ] Base URL + key from `config/providers.ts`
- [ ] Registered in `createProviders` (fallback to built-in preserved)
- [ ] CSP origin added; footer credit updated
- [ ] Provider tests (mock `fetch`) + factory test row
- [ ] `CONTRIBUTOR_NOTES.md` env table updated
- [ ] `npm test && npm run lint && npm run format:check && npm run check && npm run build`
