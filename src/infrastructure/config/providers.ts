/**
 * Route-planner provider configuration (ACTUAL_PLACE_PLANNING §2).
 *
 * Read from the environment at build time, same pattern as `config/site.ts`.
 * With no env vars set the app calls the **public** Nominatim and OSRM APIs —
 * zero configuration. The selectors are extension hooks: only the built-in
 * values are shipped, unknown values fall back to them
 * (`docs/ADDING_A_PROVIDER.md`).
 */

function envOr(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? fallback : trimmed;
}

/** Everything `createProviders` needs to build the two adapters. */
export interface ProvidersConfig {
  /** Selector for the geocoder adapter; built-in: `nominatim`. */
  readonly geocoderProvider: string;
  /** Selector for the routing adapter; built-in: `osrm`. */
  readonly routingProvider: string;
  readonly nominatimBaseUrl: string;
  readonly osrmBaseUrl: string;
}

/** Public defaults — the app works with zero configuration. */
export const DEFAULT_PROVIDER_ORIGINS = [
  'https://nominatim.openstreetmap.org',
  'https://router.project-osrm.org',
] as const;

/**
 * Static `process.env.X` reads on purpose: the client bundle cannot do
 * computed access, so `astro.config.mjs` injects exactly these four keys via
 * `vite.define` at build time (defaults when unset).
 */
export function loadProvidersConfig(): ProvidersConfig {
  return {
    geocoderProvider: envOr(process.env.GEOCODER_PROVIDER, 'nominatim').toLowerCase(),
    routingProvider: envOr(process.env.ROUTING_PROVIDER, 'osrm').toLowerCase(),
    nominatimBaseUrl: envOr(process.env.NOMINATIM_BASE_URL, 'https://nominatim.openstreetmap.org'),
    osrmBaseUrl: envOr(process.env.OSRM_BASE_URL, 'https://router.project-osrm.org'),
  };
}

/** Unique origins of the configured providers, for `connect-src` (CSP). */
export function providerOrigins(config: ProvidersConfig = loadProvidersConfig()): string[] {
  return [...new Set([originOf(config.nominatimBaseUrl), originOf(config.osrmBaseUrl)])].filter(
    (value) => value !== '',
  );
}

function originOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return '';
  }
}
