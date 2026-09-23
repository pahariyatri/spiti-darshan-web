/**
 * Generates responsive variants for the committed source images into public/media/.
 * Idempotent: skips variants newer than their source. Run automatically before `build`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateVariants } from '../src/lib/media/variants';

interface ManifestEntry {
  file: string;
  stem: string;
  alt: string;
  credit: string;
  license: string;
  sourceUrl: string | null;
  note: string;
}

const manifest: ManifestEntry[] = JSON.parse(await readFile('media-source/manifest.json', 'utf8'));
const generated: Record<string, unknown> = {};
for (const entry of manifest) {
  const result = await generateVariants(
    path.join('media-source', entry.file),
    'public/media',
    entry.stem,
  );
  generated[entry.stem] = { ...entry, basePath: `/media/${entry.stem}`, ...result };
  console.info(
    `media: ${entry.stem} ${result.width}×${result.height} → ${result.widths.join(', ')}`,
  );
}
await writeFile('media-source/generated.json', JSON.stringify(generated, null, 2) + '\n');
