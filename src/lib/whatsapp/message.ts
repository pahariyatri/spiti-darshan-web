/** The one place WhatsApp messages and URLs are built (used by WhatsAppLink at build time). */

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

/** wa.me deep link; without a number it falls back to WhatsApp's contact picker. */
export function buildWhatsAppUrl(
  message: string,
  businessNumber: string | null | undefined,
): string {
  const digits = (businessNumber ?? '').replace(/\D/g, '');
  const text = encodeURIComponent(message);
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}
