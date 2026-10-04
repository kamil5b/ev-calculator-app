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

/** Absolute canonical URL of the single page — canonical, og:url and JSON-LD share it. */
export const SITE_CANONICAL: string = new URL(BASE_PATH === '/' ? '/' : `${BASE_PATH}/`, SITE_URL).href;

/* ── SEO (title, social cards, structured data) ──────────────────────────── */

/** Document title; hits all three headline tools (calculator, road trip, road planner). */
export const SITE_TITLE = 'EV Calculator — Battery, Road Trip & Road Planner';

/** Meta description, kept under 160 characters for search snippets. */
export const SITE_DESCRIPTION =
  'EV calculator for range, charge, cost and efficiency. Plan an EV road trip with the road planner: real places, distances and charging stops. Works offline.';

/** `og:site_name` / `twitter:site`-style site label. */
export const SITE_NAME = 'EV Calculator';

/** `meta keywords` — the terms this app targets. */
export const SITE_KEYWORDS =
  'EV calculator, EV road trip, EV road planner, EV battery calculator, EV range, EV charging stops, offline EV tools';

/**
 * Social share image. No dedicated 1200×630 card ships yet, so the 512×512
 * app icon is reused — a valid square `og:image` beats having none.
 */
export const OG_IMAGE = `${BASE_PREFIX}/icons/icon-512.png`;

/**
 * JSON-LD `WebApplication` structured data, serialised to a string so
 * `Layout.astro` and `astro.config.mjs` render and hash the exact same bytes
 * (the CSP `script-src` hash is computed from this value at build time).
 */
export const SEO_JSON_LD: string = JSON.stringify(
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_TITLE,
    alternateName: 'EV Battery Calculator',
    url: SITE_CANONICAL,
    description: SITE_DESCRIPTION,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    inLanguage: 'en',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: 'EV battery calculator, EV road trip planner, EV road planner',
  },
  null,
  2,
);

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
  name: 'EV Battery Calculator & Road Trip Planner',
  short_name: 'EV Calc',
  description: 'EV battery calculator, road trip and road planner — works offline',
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
