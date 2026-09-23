/** Metadata for the committed source images, produced by `pnpm images` (scripts/build-images.ts). */
import generated from '../../../media-source/generated.json';
import type { MediaView } from '../domain/types';

export interface StaticMediaRecord extends Omit<MediaView, 'credit'> {
  credit: string;
  license: string;
  sourceUrl: string | null;
  creditUrl: string | null;
  licenseUrl: string | null;
  note: string;
}

const records = generated as unknown as Record<string, StaticMediaRecord>;

export function staticMedia(stem: string): StaticMediaRecord {
  const rec = records[stem];
  if (!rec) throw new Error(`Unknown static media "${stem}". Run pnpm images.`);
  return rec;
}

export const allStaticMedia = () =>
  Object.entries(records).map(([stem, rec]) => ({ stem, ...rec }));

export function toMediaView(rec: StaticMediaRecord): MediaView {
  const { basePath, alt, width, height, widths, formats, fallbackFormat } = rec;
  const credit = rec.creditUrl
    ? { author: rec.credit, license: rec.license, url: rec.creditUrl, licenseUrl: rec.licenseUrl }
    : null;
  return { basePath, alt, width, height, widths, formats, fallbackFormat, credit };
}
