import type { APIRoute } from 'astro';
import { env } from '../../lib/config/env';
import { clientKey, RateLimiter } from '../../lib/http/rate-limit';
import { recordBeaconEvent } from '../../lib/services/leads';
import { beaconEventSchema } from '../../lib/validation/lead';

export const prerender = false;

const MAX_BODY = 2_048;
let limiter: RateLimiter | undefined;

const noContent = () =>
  new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

export const POST: APIRoute = async ({ request, clientAddress, url }) => {
  const e = env();
  limiter ??= new RateLimiter(e.RATE_LIMIT_EVENTS_MAX, e.RATE_LIMIT_EVENTS_WINDOW_SECONDS * 1000);

  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return new Response(null, { status: 403 });
  if (!limiter.hit(clientKey(request, clientAddress, e.TRUST_PROXY)))
    return new Response(null, { status: 429 });

  const text = await request.text();
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = beaconEventSchema.safeParse(json);
  if (!parsed.success) return new Response(null, { status: 400 });

  await recordBeaconEvent(parsed.data);
  return noContent(); // Always 204 on valid input: analytics outcome is not the client's concern.
};
