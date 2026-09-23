/**
 * Pixel-diff two screenshot folders (same file names). Writes diff PNGs and a summary.
 *   pnpm visual:compare tests/screenshots/original tests/screenshots/migrated
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [aDir, bDir, outDir = 'tests/screenshots/diff'] = process.argv.slice(2);
if (!aDir || !bDir) throw new Error('usage: compare.ts <baselineDir> <candidateDir> [outDir]');
mkdirSync(outDir, { recursive: true });

const rows: string[] = [];
for (const file of readdirSync(aDir)
  .filter((f) => f.endsWith('.png'))
  .sort()) {
  const bPath = path.join(bDir, file);
  if (!existsSync(bPath)) {
    rows.push(`${file}\tMISSING`);
    continue;
  }
  const a = PNG.sync.read(readFileSync(path.join(aDir, file)));
  const b = PNG.sync.read(readFileSync(bPath));
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const crop = (img: PNG) => {
    const out = new PNG({ width, height });
    PNG.bitblt(img, out, 0, 0, width, height, 0, 0);
    return out;
  };
  const diff = new PNG({ width, height });
  const changed = pixelmatch(crop(a).data, crop(b).data, diff.data, width, height, {
    threshold: 0.12,
  });
  writeFileSync(path.join(outDir, file), PNG.sync.write(diff));
  const pct = ((changed / (width * height)) * 100).toFixed(2);
  const sizeNote = a.height !== b.height ? ` height ${a.height}→${b.height}` : '';
  rows.push(`${file}\t${pct}% differing${sizeNote}`);
}
console.info(rows.join('\n'));
