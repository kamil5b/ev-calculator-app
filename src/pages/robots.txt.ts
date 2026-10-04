import type { APIRoute } from 'astro';
import { SITE_CANONICAL } from '../infrastructure/config/site';

/**
 * robots.txt, generated at build time (SEO).
 *
 * An endpoint rather than a `public/` file because the `Sitemap` line has to
 * carry the deployment's absolute origin (`SITE_URL` + `BASE_PATH`), which is
 * only known when the build runs.
 */
const sitemapUrl = new URL('sitemap.xml', SITE_CANONICAL).href;

export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      '',
      '# The app is a client-side island: crawlers get the static shell only.',
      `Sitemap: ${sitemapUrl}`,
      '',
    ].join('\n'),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    },
  );
