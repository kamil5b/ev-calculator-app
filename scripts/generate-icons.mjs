/**
 * Rasterises the app icon set from a single vector source.
 *
 * Run with `node scripts/generate-icons.mjs`. The icons are committed to the
 * repository, so this only needs re-running when the artwork changes — keeping
 * icon generation out of the build avoids a native image dependency in CI.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, '..', 'public');

/** Full-bleed icon; safe to crop. */
const ANY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="shell" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#shell)"/>
  <rect x="96" y="188" width="288" height="136" rx="24" fill="none" stroke="#f8fafc" stroke-width="20"/>
  <path d="M384 236h18a26 26 0 0 1 26 26v34a26 26 0 0 1-26 26h-18z" fill="#f8fafc"/>
  <path d="M258 208 200 274h34l-10 62 66-76h-38z" fill="#5eead4"/>
</svg>`;

/**
 * Maskable variant: platforms crop to a circle inscribed in the safe zone, so
 * the artwork shrinks to 80% and the rounded plate is removed entirely.
 */
const MASKABLE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0f172a"/>
  <g transform="translate(51.2 51.2) scale(0.8)">
    <rect x="96" y="188" width="288" height="136" rx="24" fill="none" stroke="#f8fafc" stroke-width="20"/>
    <path d="M384 236h18a26 26 0 0 1 26 26v34a26 26 0 0 1-26 26h-18z" fill="#f8fafc"/>
    <path d="M258 208 200 274h34l-10 62 66-76h-38z" fill="#5eead4"/>
  </g>
</svg>`;

const TARGETS = [
  { file: 'icons/icon-192.png', svg: ANY_ICON, size: 192, opaque: false },
  { file: 'icons/icon-512.png', svg: ANY_ICON, size: 512, opaque: false },
  { file: 'icons/apple-touch-icon.png', svg: MASKABLE_ICON, size: 180, opaque: true },
  { file: 'icons/icon-maskable-512.png', svg: MASKABLE_ICON, size: 512, opaque: true },
];

for (const target of TARGETS) {
  let pipeline = sharp(Buffer.from(target.svg)).resize(target.size, target.size);

  // iOS rejects icons with an alpha channel, so the Apple touch icon is
  // flattened onto an opaque background.
  if (target.opaque) pipeline = pipeline.flatten({ background: '#0f172a' });

  const png = await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
  await writeFile(resolve(publicDir, target.file), png);
  console.log(`wrote public/${target.file} (${target.size}px, ${(png.length / 1024).toFixed(1)} kB)`);
}

await writeFile(resolve(publicDir, 'favicon.svg'), `${ANY_ICON}\n`);
console.log('wrote public/favicon.svg');
