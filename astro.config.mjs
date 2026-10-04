// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

import { SITE_URL, BASE_PATH } from './src/infrastructure/config/site.js';
import { providerOrigins } from './src/infrastructure/config/providers.js';

/**
 * GitHub Pages serves a project site from a sub-path (the repository name), so
 * `base` has to be overridden for asset URLs, the manifest and the service worker scope
 * to resolve. Override `BASE_PATH` when deploying to a custom domain or a
 * differently named repository.
 */
export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  output: 'static',
  trailingSlash: 'ignore',
  compressHTML: true,
  integrations: [preact()],
  // The app renders no Markdown, so the Shiki highlighter is switched off: it
  // emits inline styles that would have to be carved out of the CSP.
  markdown: {
    syntaxHighlight: false,
  },
  vite: {
    plugins: [tailwindcss()],
    // Provider env vars must survive into the browser bundle: the client
    // cannot read `process.env` at runtime, so the four static reads in
    // `config/providers.ts` are inlined here at build time (empty → default
    // public endpoints).
    define: {
      'process.env.GEOCODER_PROVIDER': JSON.stringify(process.env.GEOCODER_PROVIDER ?? ''),
      'process.env.ROUTING_PROVIDER': JSON.stringify(process.env.ROUTING_PROVIDER ?? ''),
      'process.env.NOMINATIM_BASE_URL': JSON.stringify(process.env.NOMINATIM_BASE_URL ?? ''),
      'process.env.OSRM_BASE_URL': JSON.stringify(process.env.OSRM_BASE_URL ?? ''),
    },
    build: {
      // Preact is the only UI runtime; this keeps the client bundle well below
      // the 20KB gzip budget from PRD section 9.
      target: 'es2020',
    },
  },
  /**
   * Content Security Policy (PRD 11.2).
   *
   * The app ships no third-party code, no analytics and no remote fonts, so
   * everything is locked to same-origin. `connect-src` additionally allows the
   * configured geocoder/routing origins (public Nominatim and OSRM by default;
   * env-configurable for self-hosted instances — ACTUAL_PLACE_PLANNING §11).
   * Astro hashes the inline island bootstrap scripts, which is stricter than
   * the `script-src 'self'` baseline proposed in the PRD. `'unsafe-inline'` is
   * granted to `style-src-attr` only, because the range inputs paint their
   * filled track via a CSS custom property.
   */
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self' data:",
        `connect-src 'self' ${providerOrigins().join(' ')}`,
        "manifest-src 'self'",
        "worker-src 'self'",
        "form-action 'none'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
      ],
      scriptDirective: {
        resources: ["'self'", "'wasm-unsafe-eval'"],
      },
      // `style-src-attr` fully overrides `style-src` for its scope, so both
      // sources are declared explicitly per kind rather than relying on a
      // fallback that browsers do not perform.
      styleDirective: {
        resources: [
          { resource: "'self'", kind: 'element' },
          { resource: "'unsafe-inline'", kind: 'attribute' },
        ],
      },
    },
  },
  devToolbar: {
    enabled: false,
  },
  server: {
    port: 3000,
    host: true,
  },
});
