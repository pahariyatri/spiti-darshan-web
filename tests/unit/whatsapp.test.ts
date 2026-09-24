import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  formatPhone,
} from '../../src/lib/whatsapp/message';

describe('WhatsApp message', () => {
  it('builds a short route booking message', () => {
    expect(buildWhatsAppMessage({ routeLabel: 'Shimla → Spiti → Manali' })).toBe(
      [
        "Hello Spiti Darshan! I'd like a Spiti trip plan and quote for an Innova Crysta.",
        'Route: Shimla → Spiti → Manali',
        'Dates:',
        'Travellers:',
        'Pickup city:',
      ].join('\n'),
    );
  });

  it('adds the day and leg for day-specific CTAs', () => {
    const msg = buildWhatsAppMessage({
      routeLabel: 'Shimla → Spiti → Manali',
      day: { number: 5, leg: 'Key → Kibber → Chicham' },
    });
    expect(msg).toContain(
      'Route: Shimla → Spiti → Manali\nInterested in: Day 5: Key → Kibber → Chicham',
    );
    expect(msg.split('\n')).toHaveLength(6);
  });

  it('omits the route line when there is no route context', () => {
    expect(buildWhatsAppMessage()).not.toContain('Route:');
  });
});

describe('WhatsApp URL', () => {
  it('uses the business number, digits only, and encodes the message', () => {
    const url = buildWhatsAppUrl('a\nb → c', '+91 62300-70301');
    expect(url.startsWith('https://wa.me/916230070301?text=')).toBe(true);
    expect(decodeURIComponent(url.split('text=')[1]!)).toBe('a\nb → c');
  });

  it('refuses to build a link without a number', () => {
    expect(() => buildWhatsAppUrl('hi', '')).toThrow();
  });

  it('formats the number for display', () => {
    expect(formatPhone('916230070301')).toBe('+91 62300 70301');
    expect(formatPhone('447700900123')).toBe('+447700900123');
  });
});
