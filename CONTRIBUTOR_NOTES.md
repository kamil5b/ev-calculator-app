# Contributor notes

Technical documentation for the EV Battery Calculator: stack, architecture, commands,
configuration, testing and deployment. For the product description see
[README.md](./README.md).

## Tech stack

| Concern       | Choice                                      |
| ------------- | ------------------------------------------- |
| Framework     | Astro 7 (static output, islands)            |
| UI            | Preact 10 — a single island                 |
| Styling       | Tailwind CSS 4 via `@tailwindcss/vite`      |
| Language      | TypeScript 5, checked by `astro check`      |
| Tests         | Vitest 5 + Testing Library + jsdom          |
| Lint / format | ESLint 9 (flat config), Prettier 3          |
| PWA           | hand-written service worker + manifest      |
| State         | `localStorage` only — no network at runtime |

## Requirements

|                 |                                                                |
| --------------- | -------------------------------------------------------------- |
| Node.js         | **>= 22.12.0** (enforced via `engines`)                        |
| Package manager | npm (lockfile committed)                                       |
| Browser         | Chrome/Edge 90+, Firefox 88+, Safari 15+, Samsung Internet 14+ |

## Installation

```bash
git clone https://github.com/kamil5b/ev-calculator-app.git
cd ev-calculator-app
npm ci        # clean install from the lockfile
```

## Local development

```bash
npm run dev            # dev server on http://localhost:3000
npm test               # run the Vitest suite once (325 tests)
npm run test:watch     # watch mode
npm run test:coverage  # coverage report against the 80% gate
npm run lint           # ESLint (flat config)
npm run format         # Prettier, write
npm run check          # astro check — TypeScript across src/ and configs
npm run build          # production build, then enforces the bundle budget
npm run preview        # serve dist/ exactly as production serves it
```

`npm run build` runs `scripts/check-budget.mjs` automatically and fails the build if
gzipped critical-path JS or CSS exceeds 1 MB each (raised from 20 KB / 10 KB so the
online "plan with actual place" feature fits — see `docs/ACTUAL_PLACE_PLANNING.md`).

> **Base path.** The dev server and `preview` both mount the app at `/ev-calculator-app/`
> (GitHub Pages project-site path). See [Configuration](#configuration).

### The production service worker

The service worker is only registered in a production build, so `npm run dev` never
caches a stale bundle. To exercise offline behaviour locally:

```bash
npm run build && npm run preview
# open http://localhost:3000/ev-calculator-app/ → DevTools → Network → "Offline"
```

## Scripts

| Script                                  | Purpose                                |
| --------------------------------------- | -------------------------------------- |
| `dev` / `start`                         | Astro dev server                       |
| `build`                                 | `astro build` + gzip size-budget check |
| `preview`                               | Static preview of `dist/`              |
| `check`                                 | TypeScript typecheck (`astro check`)   |
| `test` / `test:watch` / `test:coverage` | Vitest                                 |
| `lint` / `lint:fix`                     | ESLint                                 |
| `format` / `format:check`               | Prettier                               |
| `deploy`                                | Alias for `build`                      |

## Architecture

Clean Architecture with a strict dependency rule: **arrows only point inward**. The
domain layer imports nothing from the rest of the app; outer layers depend on it.

```
src/
├── domain/            ← pure functions, zero framework imports
│   ├── entities/        BatteryState, CarModel, DistanceUnit, RoadPlan, RoadTrip,
│   │                    validation messages
│   ├── use-cases/       CalculateCurrentKWh, CalculateNeededKWh, CalculateRange,
│   │                    CalculateChargeCost, BatteryEstimator, ChargeEstimator,
│   │                    EstimateRoadPlan, SwitchDistanceUnit,
│   │                    ValidateBatteryInputs, ValidateCarModel, ValidateRoadTrip
│   └── repositories/    ICarModelRepository, IRoadTripRepository (interfaces only)
│
├── application/       ← orchestration, still UI-framework free
│   ├── services/        BatteryCalculationService, PersistenceService, CarModelService,
│   │                    RoadPlannerService, RoadTripService
│   └── dto/             CalculationResult, RoadPlanResult
│
├── infrastructure/    ← technology choices
│   ├── storage/         LocalStorageAdapter + MemoryStorageAdapter (tests)
│   ├── repositories/    CarModelRepository, RoadTripRepository (implement the domain ports)
│   ├── config/          site.ts (URL, base path, storage keys), models.ts (presets)
│   └── compositionRoot.ts   wires adapters into services for the UI
│
├── presentation/      ← Preact only
│   ├── components/      BatteryCalculator, InputSection, OutputSection, ModelSelector,
│   │                    RoadPlannerSection, SavedTripsSection, UnitToggle + common/
│   └── hooks/           useCalculator (state), useLocalStorage, useInstallPrompt
│
├── pages/  layouts/  styles/   Astro entry points and Tailwind
└── lib/utils.ts       cn() class merger
```

**Why this split matters here:** the range, charge, road-plan and validation maths is
plain TypeScript with no Preact or Astro imports, so the entire domain is unit-testable
in isolation — every edge case is pinned by a test in
`src/domain/use-cases/__tests__/`.

### Key decisions

- **`astro-pwa` / `@vite-pwa/astro` were not used** — their peer ranges didn't match
  Astro 7. The service worker is hand-written (`public/sw.js`), with the manifest
  served from `src/pages/manifest.webmanifest.ts` so `BASE_PATH` resolves at build time.
- **No `tailwind-merge`.** `cn()` is a thin `clsx` wrapper; dropping `tailwind-merge`
  keeps ~14 KB gzip out of the bundle, well inside the 1 MB critical-path
  budget.
- **Content-Security-Policy** is emitted by Astro's stable `security.csp` option using
  SHA-256 hashes for the inline island bootstrap scripts. Shiki is disabled
  (`markdown.syntaxHighlight: false`) because it injects inline styles that CSP would
  otherwise have to permit.
- **Live inputs keep raw user text**, so an empty or out-of-range field can surface an
  inline error; only `load()` normalises through `normaliseBatteryState`. The
  registration form uses `novalidate` so `validateCarModel` — not the browser — owns
  the user-facing messages, declared once in `src/domain/entities/validation.ts`.
- **No built-in vehicle catalogue** — capacity can't be inferred reliably from a model
  name, so users register their own cars. The decision is recorded in
  `src/infrastructure/config/models.ts`.

## Configuration

Read from the environment at build time (see `src/infrastructure/config/site.ts`;
provider base URLs live in `src/infrastructure/config/providers.ts` once the
route-planner feature lands — see `docs/ACTUAL_PLACE_PLANNING.md`). All
provider vars are optional: unset means the public endpoints
(`nominatim.openstreetmap.org`, `router.project-osrm.org`):

| Variable             | Default                               | Meaning                                                                                  |
| -------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| `SITE_URL`           | `https://kamil5b.github.io`           | Public origin, used for canonical URLs                                                   |
| `BASE_PATH`          | `/ev-calculator-app`                  | Sub-path the app is served from                                                          |
| `GEOCODER_PROVIDER`  | `nominatim`                           | Geocoder adapter; only built-in value ships — see `docs/ADDING_A_PROVIDER.md`            |
| `NOMINATIM_BASE_URL` | `https://nominatim.openstreetmap.org` | Geocoder base URL; point at your own Nominatim (see `docs/ACTUAL_PLACE_PLANNING.md` §11) |
| `ROUTING_PROVIDER`   | `osrm`                                | Routing adapter; only built-in value ships — see `docs/ADDING_A_PROVIDER.md`             |
| `OSRM_BASE_URL`      | `https://router.project-osrm.org`     | OSRM base URL; point at your own OSRM (see `docs/ACTUAL_PLACE_PLANNING.md` §11)          |

```bash
# Custom domain (app served from the root)
SITE_URL=https://ev.example.com BASE_PATH= npm run build

# Renamed repository
BASE_PATH=/my-fork npm run build

# Self-hosted geocoder + router (docker compose in selfhost/)
NOMINATIM_BASE_URL=http://localhost:8080 OSRM_BASE_URL=http://localhost:5000 npm run build
```

Both must be set together for a correct publish — the manifest's `start_url`/`scope`,
the service worker scope and every icon `src` derive from `BASE_PATH`.

## Testing

- **325 tests, 27 files**, Vitest + Testing Library + jsdom.
- **98.3% statement / 94.8% branch / 100% function coverage** against the 80% gate in
  `vitest.config.ts`.
- The suite runs under jsdom; domain and application tests still import nothing from
  Preact or Astro, so the maths is exercised without touching a component.
- `MemoryStorageAdapter` stands in for `localStorage` so persistence tests never touch
  a real browser profile.

```bash
npm test                # full suite
npx vitest run CalculateRange   # one file
npm run test:coverage   # include coverage/
```

## Deployment to GitHub Pages

Pushing to `main` runs `.github/workflows/deploy.yml`:

```
checkout → npm ci → test → lint → format:check → check → build
  → budget verification → upload artifact → deploy-pages → verify URL returns 200
```

`.github/workflows/ci.yml` runs the same quality gate on pull requests without
publishing.

One-time setup:

1. **Settings → Pages → Source:** _GitHub Actions_.
2. **Settings → Secrets and variables → Actions → Variables:** set `BASE_PATH` to
   `/<repo-name>` (the default already matches `ev-calculator-app`). Set `SITE_URL`
   only for a custom domain or user/organization site.

Local equivalent:

```bash
npm ci && npm test && npm run lint && npm run format:check && npm run check && npm run build
```

## Contributing

1. Branch from `main`; keep changes scoped to one layer where you can.
2. Match the existing style — `npm run format` then `npm run lint` before committing.
3. **Domain changes need domain tests.** Put them beside the use case in
   `__tests__/`. Business logic does not belong in components.
4. Keep the dependency rule: `domain/` may not import from anywhere else, and
   `application/` may not import from `presentation/`.
5. All four gates must pass locally:

   ```bash
   npm test && npm run lint && npm run format:check && npm run check
   ```

6. Confirm the bundle is still inside budget: `npm run build`.

### Comment conventions

| Layer           | Comments answer                 |
| --------------- | ------------------------------- |
| domain/         | _why_ — the business rule       |
| application/    | _what_ — the orchestration      |
| infrastructure/ | _how_ — the technical mechanism |
| presentation/   | minimal — component intent only |

## Known discrepancies in the specification

Documented where it surfaces in the code:

- **The spec's Appendix A prints `Range to min: 205 km`, but its own inputs give 169 km.**
  `((45 − 10) / 100) × 82 / 17 = 168.8`. 205 km would need an efficiency of 14 kWh/100km
  rather than the stated 17. The formula is treated as authoritative — see
  `src/domain/use-cases/__tests__/CalculateRange.test.ts`.
- **`ChargeEstimator` landed in the "trip estimates" feature** rather than the later
  phase the spec reserved it for; it is covered by
  `src/domain/use-cases/__tests__/ChargeEstimator.test.ts`.
