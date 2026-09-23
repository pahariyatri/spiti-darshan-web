import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

export const VARIANT_WIDTHS = [480, 800, 1200, 1600, 2000] as const;
export const VARIANT_FORMATS = ['avif', 'webp'] as const;
const OG_WIDTH = 1200;

export interface VariantResult {
  width: number;
  height: number;
  widths: number[];
  formats: string[];
  fallbackFormat: 'webp';
}

/** Widths to emit for a source: never upscale, always include the source width if small. */
export function widthsFor(sourceWidth: number): number[] {
  const widths: number[] = VARIANT_WIDTHS.filter((w) => w <= sourceWidth);
  if (
    widths.length === 0 ||
    (widths[widths.length - 1]! < sourceWidth &&
      sourceWidth < VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1]!)
  ) {
    widths.push(sourceWidth);
  }
  return widths;
}

/** Safe file stem: lowercase letters, digits, dashes. */
export function sanitizeStem(name: string): string {
  const stem = name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return stem || 'image';
}

async function isFresh(out: string, sourceMtime: number) {
  try {
    return (await stat(out)).mtimeMs >= sourceMtime;
  } catch {
    return false;
  }
}

/**
 * Writes `<stem>-<w>.avif|webp` for each width plus `<stem>-og.jpg` (social previews) into outDir.
 * Skips files newer than the source when `sourcePath` is given.
 */
export async function generateVariants(
  input: Buffer | string,
  outDir: string,
  stem: string,
): Promise<VariantResult> {
  await mkdir(outDir, { recursive: true });
  const image = sharp(input, { failOn: 'error' }).rotate();
  const meta = await image.metadata();
  if (!meta.width || !meta.height) throw new Error('Unreadable image');
  if (!['jpeg', 'png', 'webp', 'avif'].includes(meta.format ?? '')) {
    throw new Error(`Unsupported image format: ${meta.format}`);
  }
  const sourceMtime = typeof input === 'string' ? (await stat(input)).mtimeMs : Infinity;
  const widths = widthsFor(meta.width);

  for (const w of widths) {
    for (const fmt of VARIANT_FORMATS) {
      const out = path.join(outDir, `${stem}-${w}.${fmt}`);
      if (await isFresh(out, sourceMtime)) continue;
      const pipeline = sharp(input).rotate().resize({ width: w, withoutEnlargement: true });
      await (
        fmt === 'avif' ? pipeline.avif({ quality: 55, effort: 4 }) : pipeline.webp({ quality: 78 })
      ).toFile(out);
    }
  }
  const og = path.join(outDir, `${stem}-og.jpg`);
  if (!(await isFresh(og, sourceMtime))) {
    await sharp(input)
      .rotate()
      .resize({ width: OG_WIDTH, height: 630, fit: 'cover', withoutEnlargement: false })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(og);
  }

  return {
    width: meta.width,
    height: meta.height,
    widths,
    formats: [...VARIANT_FORMATS],
    fallbackFormat: 'webp',
  };
}
