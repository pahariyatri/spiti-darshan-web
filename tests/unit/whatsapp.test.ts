import { describe, expect, it } from 'vitest';
import { buildWhatsAppMessage, buildWhatsAppUrl } from '../../src/lib/whatsapp/message';

describe('WhatsApp message', () => {
  it('builds the route enquiry in the agreed format', () => {
    expect(buildWhatsAppMessage({ routeLabel: 'Shimla → Spiti → Manali' })).toBe(
      [
        'Hello Spiti Darshan,',
        'I am interested in a private Spiti taxi.',
        '',
        'Route: Shimla → Spiti → Manali',
        'Travel dates:',
        'Travellers:',
        'Pickup city:',
        '',
        'Please confirm route availability and price.',
      ].join('\n'),
    );
  });

  it('adds day context for day-specific CTAs', () => {
    const msg = buildWhatsAppMessage({
      routeLabel: 'Shimla → Spiti → Manali',
      day: { number: 5, leg: 'Key → Kibber → Chicham' },
    });
    expect(msg).toContain('I am interested in Day 5:\nKey → Kibber → Chicham');
    expect(msg.indexOf('Day 5')).toBeLessThan(msg.indexOf('Route:'));
  });

  it('omits the route line when no route is known and fills a pickup city', () => {
    const msg = buildWhatsAppMessage({ pickup: 'Chandigarh' });
    expect(msg).not.toContain('Route:');
    expect(msg).toContain('Pickup city: Chandigarh');
  });
});

describe('WhatsApp URL', () => {
  it('uses the configured number, digits only', () => {
    expect(buildWhatsAppUrl('hi there', '+91 98-765 43210')).toBe(
      'https://wa.me/919876543210?text=hi%20there',
    );
  });

  it('never invents a number: falls back to the contact picker', () => {
    expect(buildWhatsAppUrl('hi', '')).toBe('https://wa.me/?text=hi');
    expect(buildWhatsAppUrl('hi', undefined)).toBe('https://wa.me/?text=hi');
  });

  it('encodes newlines and arrows', () => {
    const url = buildWhatsAppUrl('a\nb → c', '911234567890');
    expect(decodeURIComponent(url.split('text=')[1]!)).toBe('a\nb → c');
  });
});
