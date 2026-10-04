# Plan with actual place — integration plan

Adapts `EXACT_MAP.md` to the existing Road Planner (PRD 11) in this repo.
`EXACT_MAP.md` stays the generic provider spec; this file is the build plan.

## 0. Scope

Online-only add-on to the road planner card. Toggle below the trip list;
point cards switch to geocoded places; results land back in the existing
editable plan. Everything else (offline calculator, saved trips) untouched.
Ships pointed at the free public endpoints — no keys, no setup.

## 1. Interfaces — `src/domain/` (the app depends only on these)

- `src/domain/entities/Place.ts`
  `Place { name, lat, lon }`, `Leg { km, minutes }`, `RouteResult`,
  errors `NoRouteError`, `RateLimitError`, `NetworkError` (all extend a base
  `RoutePlannerError`), user-facing messages added to `validation.ts`.
- `src/domain/repositories/IGeocoderProvider.ts`
  `search(query, signal?): Promise<Place[]>`
- `src/domain/repositories/IRoutingProvider.ts`
  `getLegs(stops: Place[], signal?): Promise<RouteResult>`

Two independent ports — geocoder and router are chosen separately. The repo
ships exactly two adapters: **Nominatim** (geocoder) and **OSRM** (router).
Anything else — self-hosted engines, Google, Stadia Maps, Valhalla, Photon,
Geoapify, OpenRouteService — is a contributor-added adapter following
`docs/ADDING_A_PROVIDER.md`. Nothing above `infrastructure/` ever sees a
concrete class.

## 2. Infrastructure — `src/infrastructure/`

### Shipped adapters (the only two built in)

- `routing/NominatimGeocoder.ts` — `GET {base}/search?q=&format=jsonv2&countrycodes=id&limit=5`,
  maps `display_name`/`lat`/`lon`.
- `routing/OsrmRouting.ts` — `GET {base}/route/v1/driving/{lon,lat;...}?overview=false`,
  maps `routes[0].legs[]` (`distance` m → km, `duration` s → min), throws
  `NoRouteError` when `code !== 'Ok'`.

Adapters only normalise: whatever the engine's request/response shape is, the
port always hands out `Place[]` or `RouteResult` (km, minutes). New engines
(Google, Stadia Maps, Valhalla, …) are added by contributors, not by us —
`docs/ADDING_A_PROVIDER.md`.

### Shared

- `network/withRetry.ts` — shared wrapper from EXACT_MAP §5 (8 s, 2 tries,
  backoff 500·(i+1)); retries `NetworkError`/`RateLimitError`/5xx, never
  `NoRouteError` or other 4xx. Providers stay retry-free.
- `config/providers.ts` — reads via `process.env` fallbacks, same pattern as
  `config/site.ts`. **With no env vars set the app calls the public Nominatim
  and OSRM APIs** — the feature works with zero configuration. The vars below
  only point the same adapters elsewhere (self-hosted or private instances)
  or, for the two selector hooks, register a contributor adapter:

  | Env                  | Values / default                            |
  | -------------------- | ------------------------------------------- |
  | `GEOCODER_PROVIDER`  | `nominatim` (only built-in; extension hook) |
  | `ROUTING_PROVIDER`   | `osrm` (only built-in; extension hook)      |
  | `NOMINATIM_BASE_URL` | `https://nominatim.openstreetmap.org`       |
  | `OSRM_BASE_URL`      | `https://router.project-osrm.org`           |

- `repositories/PlaceCacheRepository.ts` — geocode results keyed by normalised
  query in localStorage; new `PLACES_CACHE_KEY` in `site.ts`, uses existing `StoragePort`.

## 3. Wiring — `src/infrastructure/compositionRoot.ts`

`createProviders(config)` factory returns `{ geocoder, routing }`, each wrapped
in `withRetry`, selecting the concrete class from `GEOCODER_PROVIDER` /
`ROUTING_PROVIDER` (unknown value → fall back to the built-in default and keep
running). `createContainer()` exposes them; UI imports only the container, no
provider import in `presentation/`. Adding a provider = one new file in
`infrastructure/routing/` + one `case` in the factory — the full recipe is in
`docs/ADDING_A_PROVIDER.md`.

## 4. Application — `src/application/services/RoutePlannerService.ts` (new)

- `searchPlaces(query)` → cache hit or `geocoder.search` via `withRetry`.
- `planRoute(places)` → `routing.getLegs` via `withRetry`; converts each leg's
  km to `state.distanceUnit` with existing `convertDistance`, rounds to 0.1.

## 5. State — `src/presentation/hooks/useCalculator.ts`

Mode slice in **non-persisted** `useState` (never enters `BatteryState`,
so `PersistenceService` is untouched):
`placeMode: boolean`, `places: (Place | null)[]` index-aligned with points.
`addRoadStop`/`removeRoadStop` keep it aligned using the same rebuild pattern
as `names` (`useCalculator.ts:233-276`).
New actions: `togglePlaceMode`, `setRoadPlace(pointIndex, place | null)`,
`clearRoadPlace(pointIndex)`, `finishActualPlanning(): Promise<void>`,
`cancelPlacePlanning(): void` (drops the draft `places`, exits mode, leaves
`BatteryState`/`roadPlan` exactly as it was).
A `useOnlineStatus` effect here calls `cancelPlacePlanning()` when the
`offline` event fires while mode is active.

## 6. UI — `src/presentation/components/RoadPlannerSection.tsx`

- Toggle **"Plan with actual place"** directly below `SavedTripsSection` —
  **rendered only while online** (`navigator.onLine`); offline it is hidden
  entirely (no disabled control, no hint). Driven by a small
  `useOnlineStatus` hook in `presentation/hooks/` that re-renders on the
  `online`/`offline` window events, so the toggle reappears when the
  connection returns. No `sw.js` conflict (it only caches same-origin assets).
- Going offline **while mode is active** → auto-run `cancelPlacePlanning()`
  (discard draft places, exit mode): the feature is online-only, so a dead
  connection must not leave the user stuck in a mode whose controls are gone.
- In mode, per point card: search `Input` + **Search** button (no
  autocomplete; disabled 1 s after each request), results list (≤5) with pick
  buttons, picked place shows name + Clear. **Distance input and "Charge here"
  checkbox render `disabled`** — values preserved, not cleared.
- Bottom: two buttons —
  - **"Done Planning with Actual Place"** — disabled until every point
    has a place; one `getLegs` call; writes `plan.legs`, fills point names,
    exits mode → rows show filled distances, editable again.
  - **"Cancel planning with actual place"** (ghost variant) — always
    available in mode (disabled only while the `getLegs` request is in
    flight); discards every draft place and exits mode without touching the
    plan, so typed distances/charges survive as they were before the toggle.
- Both buttons disabled while `finishActualPlanning` is in flight (no double
  submit); toggle itself switches to "leave mode" via the same cancel path.
- Errors: typed errors → inline messages; empty results → "No results".

## 7. Offline / cache / fallback

- Feature is online-only by design: hidden when offline, auto-cancelled if
  the connection drops mid-mode, and a fetch failure still surfaces
  `NetworkError` as "No connection — check your network and try again"
  (covers `navigator.onLine` lying, e.g. a captive portal).
- Optional stretch: `getLegs` coordinate cache, Haversine fallback labelled
  "approximate".

## 8. Credits

Footer in `BatteryCalculator.tsx`: `© OpenStreetMap contributors`
(link) · `Routing by OSRM`. Static with the shipped adapters; whoever adds an
adapter updates the footer line (and drops the OSM attribution only if their
source isn't OSM).

## 9. Tests

- `src/infrastructure/network/__tests__/withRetry.test.ts`
- `src/infrastructure/routing/__tests__/{NominatimGeocoder,OsrmRouting}.test.ts`
  (mock `fetch`; empty-results / `code !== 'Ok'` paths included)
- `src/infrastructure/__tests__/compositionRoot.test.ts` — `createProviders`
  maps both selector envs to the built-in class (and unknown values fall back
  to it).
- `src/application/services/__tests__/RoutePlannerService.test.ts`
- `src/presentation/components/__tests__/RoadPlannerSection.test.tsx` — toggle,
  hidden when offline (mock `navigator.onLine` + `offline` event), auto-cancel
  on disconnect, disabled fields, 1 s cooldown, done-button gating, cancel
  restores the pre-toggle plan and clears draft places, error/empty states.
- `src/presentation/hooks/__tests__/useOnlineStatus.test.ts` — initial value
  from `navigator.onLine`, updates on `online`/`offline` events.

## 10. Budgets

`scripts/check-budget.mjs` → `js: 1024 * 1024`, `css: 1024 * 1024`
(currently 19.5/20 KB, so the feature cannot fit the old ceiling).
Update the stale "20 KB critical-path budget" line in `CONTRIBUTOR_NOTES.md`.

## 11. Self-hosting (optional)

The deployed app on GitHub Pages uses the **free public endpoints**
(`nominatim.openstreetmap.org`, `router.project-osrm.org`) — no keys, light
use only. Anyone can clone the repo and run the same two adapters against
their own servers instead; there is no code difference, only env vars.
Different engines are not built in — add them as adapters per
`docs/ADDING_A_PROVIDER.md`.

### Switch via env

| Variable             | Default (public)                      | Values / example        |
| -------------------- | ------------------------------------- | ----------------------- |
| `GEOCODER_PROVIDER`  | `nominatim`                           | built-in value only     |
| `ROUTING_PROVIDER`   | `osrm`                                | built-in value only     |
| `NOMINATIM_BASE_URL` | `https://nominatim.openstreetmap.org` | `http://localhost:8080` |
| `OSRM_BASE_URL`      | `https://router.project-osrm.org`     | `http://localhost:5000` |

```bash
# Self-hosted Nominatim + OSRM (the shipped adapters, pointed at localhost)
NOMINATIM_BASE_URL=http://localhost:8080 OSRM_BASE_URL=http://localhost:5000 npm run dev
```

### docker compose (future implementation, `selfhost/`)

- `selfhost/docker-compose.yml`
  - `nominatim` — `mediagis/nominatim:4.4` (PostGIS), port `8080:8080`,
    persistent volume, imports the OSM extract on first start.
  - `osrm` — `osrm/osrm-backend`: one-shot prepare
    (`osrm-extract -p profiles/car.lua` → `osrm-partition` → `osrm-customize`),
    then `osrm-routed --algorithm mld`, port `5000:5000`, volume for `.osrm`.
  - `proxy` — only if the images lack CORS headers (verify first): tiny
    nginx/Caddy adding `Access-Control-Allow-Origin` + OPTIONS handling.
- `selfhost/download-data.sh` — Geofabrik extract (e.g.
  `indonesia-latest.osm.pbf`, matching `countrycodes=id`) into gitignored
  `selfhost/data/`.

### CSP (`astro.config.mjs`)

`connect-src 'self'` blocks cross-origin APIs — including the public ones.
Build it as `'self'` + origin(`NOMINATIM_BASE_URL`) + origin(`OSRM_BASE_URL`);
defaults resolve to the public origins. Adding an adapter may add one more
origin (covered by its guide).

### Browser notes

- Served `https://` pages hitting `http://localhost` trigger Chrome's
  local-network-access prompt; for a real deployment, put both services behind
  the site's own https reverse proxy instead.
- Credits stay `© OpenStreetMap contributors` · `Routing by OSRM` —
  self-hosted servers still serve OSM data.

## 12. Before release

Public Nominatim and OSRM endpoints are light-use; that is exactly why §11
exists — swap in self-hosted instances behind the same adapters, or add
keyed adapters per `docs/ADDING_A_PROVIDER.md`.
