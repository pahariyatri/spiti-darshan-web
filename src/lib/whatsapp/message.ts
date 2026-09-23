/** The one place WhatsApp messages and URLs are built (used by WhatsAppLink at build time). */

export interface WhatsAppMessageInput {
  /** Human route label, e.g. "Shimla → Spiti → Manali". */
  routeLabel?: string | null;
  day?: { number: number; leg: string } | null;
}

/** Short booking message: route, optional day context, then blanks for dates and travellers. */
export function buildWhatsAppMessage({ routeLabel, day }: WhatsAppMessageInput = {}): string {
  const lines = ["Hello Spiti Darshan! I'd like a quote for a private Spiti taxi."];
  if (routeLabel) lines.push(`Route: ${routeLabel}`);
  if (day) lines.push(`Interested in: Day ${day.number} — ${day.leg}`);
  lines.push('Dates:', 'Travellers:');
  return lines.join('\n');
}

export function buildWhatsAppUrl(message: string, businessNumber: string): string {
  const digits = businessNumber.replace(/\D/g, '');
  if (!digits) throw new Error('buildWhatsAppUrl: business number is required');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** "916230070301" → "+91 62300 70301" (Indian mobile grouping; other numbers as +digits). */
export function formatPhone(digits: string): string {
  const m = /^91(\d{5})(\d{5})$/.exec(digits);
  return m ? `+91 ${m[1]} ${m[2]}` : `+${digits}`;
}
