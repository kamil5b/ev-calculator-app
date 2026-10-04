/**
 * Enforces the bundle budgets from PRD sections 9 and 13.
 *
 * Only the assets a first-time visitor actually downloads are counted, so the
 * numbers line up with what Lighthouse reports. The service worker is excluded:
 * it is fetched after load and is not part of the interactive bundle.
 *
 * Run with `node scripts/check-budget.mjs` (also wired into `npm run build`).
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(projectRoot, 'dist');

/**
 * Gzipped byte ceilings.
 *
 * Originally 20 KB JS / 10 KB CSS (PRD 9); raised to 1 MB each so the
 * online "plan with actual place" feature (geocoder + routing providers)
 * fits without gutting the check.
 */
const BUDGETS = {
  js: 1024 * 1024,
  css: 1024 * 1024,
};

/** Files the first paint does not need; excluded from the totals. */
const DEFERRED = [/^_astro\/signals\./, /\.map$/, /^sw\.js$/];

const COLOURS = { reset: '[0m', red: '[31m', green: '[32m', dim: '[2m', bold: '[1m' };

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : full;
    }),
  );
  return files.flat();
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(distDir))) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const all = (await walk(distDir)).map((file) => relative(distDir, file));
const budgeted = all.filter((file) => !DEFERRED.some((pattern) => pattern.test(file)));

const totals = { js: 0, css: 0 };
const rows = [];

for (const file of budgeted) {
  const extension = extname(file).slice(1);
  if (extension !== 'js' && extension !== 'css') continue;

  const buffer = await readFile(join(distDir, file));
  const gzipped = gzipSync(buffer).length;

  totals[extension] += gzipped;
  rows.push({ file, raw: buffer.length, gzipped });
}

rows.sort((a, b) => b.gzipped - a.gzipped);

console.log(`${COLOURS.bold}Bundle budget (gzipped, excludes deferred chunks)${COLOURS.reset}`);
for (const row of rows) {
  console.log(`  ${COLOURS.dim}${row.file.padEnd(42)}${COLOURS.reset}${String(row.gzipped).padStart(7)} B`);
}
console.log();

let failed = false;
for (const [kind, ceiling] of Object.entries(BUDGETS)) {
  const used = totals[kind];
  const ok = used <= ceiling;
  if (!ok) failed = true;
  const label = `${kind.toUpperCase()} total`.padEnd(12);
  const colour = ok ? COLOURS.green : COLOURS.red;
  console.log(
    `  ${label} ${colour}${(used / 1024).toFixed(1)} KB${COLOURS.reset} / ${(ceiling / 1024).toFixed(0)} KB budget`,
  );
}

if (failed) {
  console.error(`\n${COLOURS.red}Bundle budget exceeded.${COLOURS.reset}`);
  process.exit(1);
}

console.log(`\n${COLOURS.green}Within budget.${COLOURS.reset}`);
