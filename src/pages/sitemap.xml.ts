import type { APIRoute } from 'astro';
import { SITE_CANONICAL } from '../infrastructure/config/site';

/**
 * sitemap.xml — the app is a single page, so this stays a one-URL urlset
 * built from the same canonical URL the `<link rel="canonical">` and JSON-LD
 * use, keeping every signal consistent (SEO).
 */
const body = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  '  <url>',
  `    <loc>${SITE_CANONICAL}</loc>`,
  '  </url>',
  '</urlset>',
  '',
].join('\n');

export const GET: APIRoute = () =>
  new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
