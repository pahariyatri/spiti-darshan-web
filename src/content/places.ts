/** Reusable places and vehicles referenced by route stops (by slug). Coordinates left empty unless verified. */
import type { AttractionContent, DestinationContent, VehicleContent } from './types';

export const destinations: DestinationContent[] = [
  { slug: 'shimla', name: 'Shimla', region: 'Shimla district', isMajorStop: true },
  { slug: 'kufri', name: 'Kufri', region: 'Shimla district' },
  { slug: 'narkanda', name: 'Narkanda', region: 'Shimla district' },
  { slug: 'rampur', name: 'Rampur', region: 'Shimla district' },
  { slug: 'karcham', name: 'Karcham', region: 'Kinnaur' },
  { slug: 'sangla', name: 'Sangla', region: 'Kinnaur', isMajorStop: true },
  { slug: 'rakcham', name: 'Rakcham', region: 'Kinnaur' },
  { slug: 'chitkul', name: 'Chitkul', region: 'Kinnaur' },
  { slug: 'reckong-peo', name: 'Reckong Peo', region: 'Kinnaur' },
  { slug: 'kalpa', name: 'Kalpa', region: 'Kinnaur', isMajorStop: true },
  { slug: 'pooh', name: 'Pooh', region: 'Kinnaur' },
  { slug: 'nako', name: 'Nako', region: 'Kinnaur' },
  { slug: 'gue', name: 'Gue', region: 'Spiti' },
  { slug: 'tabo', name: 'Tabo', region: 'Spiti', isMajorStop: true },
  { slug: 'dhankar', name: 'Dhankar', region: 'Spiti' },
  { slug: 'pin-valley', name: 'Pin Valley', region: 'Spiti' },
  { slug: 'kaza', name: 'Kaza', region: 'Spiti', isMajorStop: true },
  { slug: 'kibber', name: 'Kibber', region: 'Spiti' },
  { slug: 'langza', name: 'Langza', region: 'Spiti' },
  { slug: 'hikkim', name: 'Hikkim', region: 'Spiti' },
  { slug: 'komic', name: 'Komic', region: 'Spiti' },
  { slug: 'losar', name: 'Losar', region: 'Spiti' },
  { slug: 'chandratal', name: 'Chandratal', region: 'Lahaul', isMajorStop: true },
  { slug: 'batal', name: 'Batal', region: 'Lahaul' },
  { slug: 'gramphu', name: 'Gramphu', region: 'Lahaul' },
  { slug: 'manali', name: 'Manali', region: 'Kullu', isMajorStop: true },
];

export const attractions: AttractionContent[] = [
  { slug: 'tabo-monastery', name: 'Tabo Monastery', destination: 'tabo', type: 'monastery' },
  { slug: 'key-monastery', name: 'Key Monastery', destination: null, type: 'monastery' },
  { slug: 'chicham-bridge', name: 'Chicham Bridge', destination: null, type: 'bridge' },
  { slug: 'kunzum-pass', name: 'Kunzum Pass', destination: null, type: 'pass' },
  { slug: 'atal-tunnel', name: 'Atal Tunnel', destination: null, type: 'tunnel' },
];

export const vehicles: VehicleContent[] = [
  { slug: 'innova-crysta', name: 'Innova Crysta', vehicleType: 'MPV', media: 'fleet-parked' },
];
