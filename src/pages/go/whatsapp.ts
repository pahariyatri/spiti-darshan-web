import type { APIRoute } from 'astro';
import { env } from '../../lib/config/env';
import { clientKey, RateLimiter } from '../../lib/http/rate-limit';
import { resolveWhatsAppRedirect } from '../../lib/services/leads';
import { searchParamsToObject, whatsappGoSchema } from '../../lib/validation/lead';
import { buildWhatsAppMessage, buildWhatsAppUrl } from '../../lib/whatsapp/message';

export const prerender = false;

// Logging (not the redirect) is rate limited, so bots can't flood lead_intents.
const limiter = new RateLimiter(30, 60_000);

export const GET: APIRoute = async ({ url, request, clientAddress, redirect }) => {
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
  try {
    const params = whatsappGoSchema.parse(searchParamsToObject(url.searchParams));
    const log = limiter.hit(clientKey(request, clientAddress, env().TRUST_PROXY));
    const target = await resolveWhatsAppRedirect(params, { log });
    return new Response(null, { status: 302, headers: { ...headers, Location: target } });
  } catch (err) {
    // Last resort: never strand a visitor who wants to talk to us.
    console.error('[go/whatsapp] fallback redirect', err);
    const fallback = buildWhatsAppUrl(buildWhatsAppMessage(), process.env.BUSINESS_WHATSAPP_NUMBER);
    return redirect(fallback, 302);
  }
};
