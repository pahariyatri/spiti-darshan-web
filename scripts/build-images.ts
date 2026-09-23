/**
 * Generates responsive variants for the committed source images into public/media/.
 * Variants are cached by source-content hash in node_modules/.cache (kept between Vercel
 * builds), so only new or changed photos are re-encoded. Runs automatically before `build`.
 */
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { generateVariants, type VariantResult } from '../src/lib/media/variants';

interface ManifestEntry {
  file: string;
  stem: string;
  alt: string;
  credit: string;
  license: string;
  sourceUrl: string | null;
  note: string;
}

const CACHE = 'node_modules/.cache/spiti-media';
const OUT = 'public/media';
const manifest: ManifestEntry[] = JSON.parse(await readFile('media-source/manifest.json', 'utf8'));
const generated: Record<string, unknown> = {};
await mkdir(OUT, { recursive: true });

for (const entry of manifest) {
  const source = path.join('media-source', entry.file);
  const hash = createHash('sha256').update(await readFile(source)).digest('hex').slice(0, 16);
  const dir = path.join(CACHE, `${entry.stem}-${hash}`);
  const metaFile = path.join(dir, 'meta.json');
  let result: VariantResult;
  if (existsSync(metaFile)) {
    result = JSON.parse(await readFile(metaFile, 'utf8')) as VariantResult;
  } else {
    result = await generateVariants(source, dir, entry.stem);
    await writeFile(metaFile, JSON.stringify(result));
  }
  for (const f of await readdir(dir)) if (f !== 'meta.json') await cp(path.join(dir, f), path.join(OUT, f));
  generated[entry.stem] = { ...entry, basePath: `/media/${entry.stem}`, ...result };
  console.info(`media: ${entry.stem} ${result.width}×${result.height} → ${result.widths.join(', ')}`);
}
await writeFile('media-source/generated.json', JSON.stringify(generated, null, 2) + '\n');
