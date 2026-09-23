/**
 * Serves admin-uploaded image variants from UPLOAD_DIR. Strict filename allow-list (no paths).
 * In production the reverse proxy can serve this directory directly instead (see deploy/).
 */
import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../lib/config/env';

export const prerender = false;

const TYPES: Record<string, string> = { avif: 'image/avif', webp: 'image/webp', jpg: 'image/jpeg' };

export const GET: APIRoute = async ({ params }) => {
  const file = params.file ?? '';
  const match = /^[a-z0-9-]{1,80}-(?:\d{2,5}|og)\.(avif|webp|jpg)$/.exec(file);
  if (!match) return new Response('Not found', { status: 404 });
  try {
    const body = await readFile(path.join(path.resolve(env().UPLOAD_DIR), file));
    return new Response(body, {
      headers: {
        'Content-Type': TYPES[match[1]!]!,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
