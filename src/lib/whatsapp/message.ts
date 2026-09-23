/**
 * The one place WhatsApp messages and URLs are built. Components never build wa.me links;
 * they link to /go/whatsapp/ (see `whatsappGoPath`), which logs intent and redirects here.
 */

export interface WhatsAppMessageInput {
  /** Human route label, e.g. "Shimla → Spiti → Manali". */
  routeLabel?: string | null;
  day?: { number: number; leg: string } | null;
  pickup?: string | null;
}

export function buildWhatsAppMessage({
  routeLabel,
  day,
  pickup,
}: WhatsAppMessageInput = {}): string {
  const lines = ['Hello Spiti Darshan,', 'I am interested in a private Spiti taxi.', ''];
  if (day) lines.push(`I am interested in Day ${day.number}:`, day.leg, '');
  if (routeLabel) lines.push(`Route: ${routeLabel}`);
  lines.push('Travel dates:', 'Travellers:', `Pickup city:${pickup ? ` ${pickup}` : ''}`, '');
  lines.push('Please confirm route availability and price.');
  return lines.join('\n');
}

/**
 * wa.me deep link. With no verified number configured, `https://wa.me/?text=` lets the visitor
 * pick a chat — the same behaviour as the approved preview page. Never invent a number.
 */
export function buildWhatsAppUrl(
  message: string,
  businessNumber: string | null | undefined,
): string {
  const digits = (businessNumber ?? '').replace(/\D/g, '');
  const text = encodeURIComponent(message);
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}

export interface GoLinkInput {
  route?: string | null;
  day?: number | null;
  cta: string;
}

/** Internal, crawl-safe link used by every CTA. Attribution params are appended client-side. */
export function whatsappGoPath({ route, day, cta }: GoLinkInput): string {
  const params = new URLSearchParams();
  if (route) params.set('route', route);
  if (day) params.set('day', String(day));
  params.set('cta', cta);
  return `/go/whatsapp/?${params.toString()}`;
}
