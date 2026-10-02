/**
 * Deployment + persistence configuration.
 *
 * Values are read from the environment at build time so the same source tree can
 * be published to a local preview, a custom domain or a GitHub Pages project
 * site without code changes.
 */

/** Public origin, e.g. `https://redikru.github.io`. */
export const SITE_URL: string = process.env.SITE_URL ?? 'https://redikru.github.io';

/** Path the app is served from. Must start and (optionally) end with a slash. */
export const BASE_PATH: string = process.env.BASE_PATH ?? '/ev-calculator-app';

/** localStorage key holding the serialised calculator state (PRD 2.3). */
export const STORAGE_KEY = 'ev_calculator_state';

/** localStorage key holding the user-registered car models (PRD 2.4). */
export const CAR_STORAGE_KEY = 'ev_calculator_cars';

/** localStorage key remembering the last active car id. */
export const ACTIVE_CAR_KEY = 'ev_calculator_active_car';

/** Cache name used by the service worker (PRD 4.1). */
export const CACHE_NAME = 'ev-calculator-v1';

/** Palette shared by the manifest and the theme colour meta tag. */
export const THEME_COLOR = '#0f172a';

/** PWA manifest configuration (PRD 4.2). */
export const PWA_MANIFEST = {
  name: 'EV Battery Calculator',
  short_name: 'EV Calc',
  description: 'Calculate EV battery metrics offline',
  start_url: `${BASE_PATH}/`,
  scope: `${BASE_PATH}/`,
  display: 'standalone',
  orientation: 'portrait-primary',
  theme_color: THEME_COLOR,
  background_color: '#ffffff',
  categories: ['utilities', 'productivity'],
  icons: [
    {
      src: `${BASE_PATH}/icons/icon-192.png`,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: `${BASE_PATH}/icons/icon-512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: `${BASE_PATH}/icons/icon-maskable-512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
} as const;

/** Apple touch icon + favicon, referenced from the document head. */
export const APPLE_TOUCH_ICON = `${BASE_PATH}/icons/apple-touch-icon.png`;

export const FAVICON = `${BASE_PATH}/favicon.svg`;
