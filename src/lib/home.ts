/** Owner-supplied winter car prices (for the group, homestays extra). One source for page and schema. */
export const WINTER_TRIPS = [
  { nights: 6, days: 7, price: 35000 },
  { nights: 7, days: 8, price: 40000 },
] as const;

export const formatInr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** Homepage invitation; full package details are shared on WhatsApp. */
export const HOME = {
  title: 'Winter Spiti & Innova Crysta Trips | Spiti Darshan',
  description:
    'White Spiti by Innova Crysta with a driver. 6 nights / 7 days ₹35,000 or 7 nights / 8 days ₹40,000, car price for your group. Get the package on WhatsApp.',
  ogTitle: 'Winter Spiti is calling | Spiti Darshan',
  ogDescription:
    'White Spiti, snow leopard expeditions, Ice Cafe Lingti and snow chain drives. Message us on WhatsApp to plan your winter trip.',
  primaryCta: 'Book your road trip now',
  /** Glass card beside the approved hero copy; links down to the winter offer. */
  heroOffer: {
    href: '#winter',
    tag: 'This winter',
    title: 'White Spiti',
    trips: WINTER_TRIPS.map((t) => ({
      label: `${t.nights}N / ${t.days}D`,
      price: formatInr(t.price),
    })),
    note: 'Car price for your group',
  },
  heroPlace: 'Key Monastery, Spiti Valley',
  hero: {
    kicker: 'Spiti · Private transport',
    title: 'Explore the roof',
    titleAccent: 'of the world',
    subtitle: 'Innova Crysta journeys through Shimla, Kinnaur, Kaza, Chandratal and Manali.',
  },
} as const;
