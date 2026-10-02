import type { APIRoute } from 'astro';
import { PWA_MANIFEST } from '../infrastructure/config/site';

/**
 * Web app manifest, generated at build time (PRD 4.2).
 *
 * Emitted from the same config object the `<meta>` tags and the service worker
 * use, so `theme_color`, `start_url` and the icon set can never drift apart.
 * Absolute paths are required here, which is why this is an endpoint rather than
 * a static file in `public/`.
 */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(PWA_MANIFEST, null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
