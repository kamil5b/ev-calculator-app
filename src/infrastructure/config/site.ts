/**
 * Deployment + persistence configuration.
 *
 * Values are read from the environment at build time so the same source tree can
 * be published to a local preview, a custom domain or a GitHub Pages project
 * site without code changes.
 */

/**
 * Reads a build-time variable, treating "unset" and "empty" as the same thing.
 *
 * GitHub Actions substitutes `${{ vars.SITE_URL }}` with an empty string when
 * the repository variable has never been created, and `'' ?? fallback` would
 * happily keep that empty string — Astro then rejects `site: ''` with a bare
 * "Invalid URL". Trimming also catches a stray space in the Actions UI.
 */
function envOr(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value === undefined || value === '' ? fallback : value;
}

/** Public origin, e.g. `https://kamil5b.github.io`. */
export const SITE_URL: string = envOr('SITE_URL', 'https://kamil5b.github.io');

/**
 * Path the app is served from, normalised for Astro's `base`: always exactly one
 * leading slash and never a trailing one (except the root itself, `'/'`).
 *
 * Keeps `BASE_PATH` free of `//` in the generated URLs whether it arrives from
 * the environment as `ev-calculator-app`, `/ev-calculator-app/` or `/`.
 */
export const BASE_PATH: string = (() => {
  const raw = envOr('BASE_PATH', '/ev-calculator-app');
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
  const withoutTrailing = withLeading.replace(/\/+$/, '');
  return withoutTrailing === '' ? '/' : withoutTrailing;
})();

/**
 * {@link BASE_PATH} minus its trailing slash, for joining into URLs.
 *
 * `''` at the root, `'/ev-calculator-app'` elsewhere — so `${BASE_PREFIX}/x`
 * yields `/x` or `/ev-calculator-app/x`, never `//x`.
 */
const BASE_PREFIX = BASE_PATH.replace(/\/+$/, '');

/** localStorage key holding the serialised calculator state (PRD 2.3). */
export const STORAGE_KEY = 'ev_calculator_state';

/** localStorage key holding the user-registered car models (PRD 2.4). */
export const CAR_STORAGE_KEY = 'ev_calculator_cars';

/** localStorage key remembering the last active car id. */
export const ACTIVE_CAR_KEY = 'ev_calculator_active_car';

/** localStorage key holding the user's saved road trips (PRD 11). */
export const TRIP_STORAGE_KEY = 'ev_calculator_road_trips';

/** localStorage key holding the cached geocoder results (ACTUAL_PLACE_PLANNING §2). */
export const PLACES_CACHE_KEY = 'ev_calculator_places';

/** Cache name used by the service worker (PRD 4.1). */
export const CACHE_NAME = 'ev-calculator-v1';

/** Palette shared by the manifest and the theme colour meta tag. */
export const THEME_COLOR = '#0f172a';

/** PWA manifest configuration (PRD 4.2). */
export const PWA_MANIFEST = {
  name: 'EV Battery Calculator',
  short_name: 'EV Calc',
  description: 'Calculate EV battery metrics offline',
  start_url: `${BASE_PREFIX}/`,
  scope: `${BASE_PREFIX}/`,
  display: 'standalone',
  orientation: 'portrait-primary',
  theme_color: THEME_COLOR,
  background_color: '#ffffff',
  categories: ['utilities', 'productivity'],
  icons: [
    {
      src: `${BASE_PREFIX}/icons/icon-192.png`,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: `${BASE_PREFIX}/icons/icon-512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: `${BASE_PREFIX}/icons/icon-maskable-512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
} as const;

/** Apple touch icon + favicon, referenced from the document head. */
export const APPLE_TOUCH_ICON = `${BASE_PREFIX}/icons/apple-touch-icon.png`;

export const FAVICON = `${BASE_PREFIX}/favicon.svg`;
