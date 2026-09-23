/**
 * Short guides to the places on our routes, published at /places/<slug>/ and shown when a
 * visitor taps a stop. Keys are destination or attraction slugs from places.ts.
 * Keep facts general and verifiable; timings, openings and road status are always confirmed for
 * the traveller's dates, never promised here.
 */
export interface PlaceGuide {
  /** One or two sentences: shown in the stop card and as the meta description base. */
  summary: string;
  /** A few short paragraphs for the place page. */
  body: string[];
  /** Practical notes (optional). */
  tips?: string[];
  /** Photo stem from media-source/manifest.json (optional). */
  media?: string;
}

export const placeGuides: Record<string, PlaceGuide> = {
  kufri: {
    summary: 'A stop on the first day’s drive from Shimla towards Sangla.',
    body: [
      'Kufri comes early in the journey, before Narkanda and the longer drive through Rampur. Treat it as a short break along the route rather than a separate overnight stay.',
      'Agree on the length of the stop with your driver so there is time for the onward journey to Sangla.',
    ],
  },
  rampur: {
    summary: 'A waypoint between Narkanda and Karcham on the Shimla to Sangla travel day.',
    body: [
      'Rampur breaks up the first day’s journey from Shimla. From here, the itinerary continues towards Karcham before turning towards Sangla for the night.',
      'This is a transit stop in the circuit. Ask about a meal or rest break when planning the day; a longer visit needs extra time.',
    ],
  },
  karcham: {
    summary: 'The route junction on the first day before the drive into Sangla.',
    body: [
      'Karcham marks the transition from the main approach through Rampur to the Sangla section of the itinerary. Sangla is the overnight destination on this day.',
      'Use the itinerary to understand the order of stops. The illustrated road is not a navigation map, and your driver will follow the accessible route.',
    ],
  },
  rakcham: {
    summary: 'A Baspa valley village visited between Sangla and the optional Chitkul excursion.',
    body: [
      'Rakcham is part of day 2, after leaving Sangla and before the optional visit to Chitkul. The day then continues towards Reckong Peo and Kalpa.',
      'Allow time for a village stop without rushing the onward drive. Chitkul remains an optional extension, depending on the day’s conditions.',
    ],
  },
  'reckong-peo': {
    summary:
      'Kinnaur’s district headquarters, on the itinerary before the overnight stop in Kalpa.',
    body: [
      'Reckong Peo appears on day 2 after the Baspa valley section. It is the town stop before the journey continues to Kalpa for the night.',
      'If you need time in town, mention it while planning this day. The circuit combines this stop with the drive from Sangla, rather than a separate overnight stay here.',
    ],
  },
  pooh: {
    summary: 'A transit stop on the drive from Kalpa towards Nako and Tabo.',
    body: [
      'Pooh is part of day 3’s journey into Spiti. The itinerary places it after Kalpa and before Nako, with Tabo as the overnight destination.',
      'Keep this stop flexible: the same day includes Nako and an optional detour to Gue. Discuss breaks and detours before setting off.',
    ],
  },
  losar: {
    summary: 'A stop between Kaza and Kunzum Pass on the seasonal road to Chandratal.',
    body: [
      'Losar appears on day 8 after leaving Kaza, before crossing Kunzum Pass towards Chandratal. It belongs to the seasonal part of the circuit.',
      'The onward road and the Chandratal overnight arrangement need confirmation for your dates. An open road from Shimla to Kaza does not establish that this crossing is accessible.',
    ],
  },
  batal: {
    summary: 'A waypoint on the final travel day from Chandratal towards Manali.',
    body: [
      'Batal is the first named stop after Chandratal on day 9. The route continues through Gramphu and the Atal Tunnel before reaching Manali.',
      'This day follows a rough mountain road section. Leave room in your onward plans for changes to the driving schedule.',
    ],
  },
  gramphu: {
    summary: 'A waypoint between Batal and the Atal Tunnel on the journey to Manali.',
    body: [
      'Gramphu appears on day 9, after the Batal section of the drive from Chandratal. The itinerary then passes through the Atal Tunnel to finish in Manali.',
      'Treat this as part of the final travel day rather than a separate sightseeing excursion. Confirm road access and where to drop you in Manali when arranging the trip.',
    ],
  },
  'tabo-monastery': {
    summary: 'Tabo’s historic Buddhist monastery, visited before leaving for Dhankar and Kaza.',
    body: [
      'The monastery’s earthen halls preserve murals and sculptures, with meditation caves in the hillside above Tabo. It is the main cultural visit at the start of day 4.',
      'Stay overnight in Tabo on day 3, then allow time for the monastery before continuing to Dhankar. Follow the monastery’s rules for entry and photography.',
    ],
  },
  shimla: {
    summary:
      'Himachal Pradesh’s capital and the usual starting point for the drive to Spiti through Kinnaur.',
    body: [
      'Shimla is the state capital of Himachal Pradesh and a former summer capital of British India. Its hilltop centre, the Mall and colonial era buildings make it a pleasant place to begin before heading into the mountains.',
      'Starting from Shimla means the road climbs gradually through Kinnaur towards Spiti, which gives your body time to adjust to altitude before the high villages around Kaza.',
    ],
    tips: ['Pickups can usually be arranged from your hotel, the railway station or the airport.'],
  },
  narkanda: {
    summary:
      'A small hill town above the Sutlej valley, known for orchards and wide views of the Himalayan ranges.',
    body: [
      'Narkanda sits on the highway between Shimla and Rampur, among apple orchards and deodar forest. It is a natural first break on day 1, with views across the ranges to the north.',
      'Hatu Peak, with its small temple, is a short drive up from the town if you have time and the road is open.',
    ],
  },
  sangla: {
    summary:
      'The main village of Kinnaur’s Baspa valley, with wooden houses, orchards and the river below.',
    body: [
      'Sangla lies in the Baspa valley, reached by a side road that leaves the main highway at Karcham. The valley is greener than Spiti, with apple orchards, pine forest and traditional wood and stone houses.',
      'The old Kamru fort sits above Sangla. It is the overnight stop on day 1 and the base for the drive up the valley to Rakcham and Chitkul.',
    ],
  },
  chitkul: {
    summary:
      'A village of wooden houses at the head of the Baspa valley, often described as the last village on the road towards the Tibet border.',
    body: [
      'Chitkul sits at the upper end of the Baspa valley beyond Rakcham, with snow peaks on three sides and the river running through meadows below the village. Its wooden houses and the local temple give it a very different feel from the towns below.',
      'On our itinerary Chitkul is an optional side trip on day 2, depending on the time available and road access.',
    ],
    tips: ['Evenings are cold even in summer; carry a warm layer.'],
  },
  kalpa: {
    summary:
      'A village above Reckong Peo facing the Kinner Kailash range, the overnight stop on day 2.',
    body: [
      'Kalpa sits on a slope above Reckong Peo, Kinnaur’s district headquarters, and looks straight across the valley at the Kinner Kailash range. The views are best early in the morning, when the peaks catch the first light.',
      'The old village has traditional houses and temples among apple orchards, and makes a calm overnight stop before the drier country beyond Pooh.',
    ],
    media: 'day-kalpa-kinner-kailash',
  },
  nako: {
    summary:
      'A stone village beside a small lake near the Kinnaur and Spiti border, with an old monastery complex.',
    body: [
      'Nako lies high above the Sutlej, close to where Kinnaur meets Spiti. The landscape here is noticeably drier, a first taste of the cold desert. The village has stone houses, prayer flags, a small lake and an old monastery complex.',
      'It is a stop on day 3 between Kalpa and Tabo, a good place to stretch your legs and walk through the village lanes.',
    ],
    media: 'day-nako',
  },
  gue: {
    summary:
      'A small village off the Sumdo to Tabo road, known for a naturally mummified monk kept in a shrine.',
    body: [
      'Gue is reached by a short side road off the main route into Spiti. The village is known for a naturally preserved mummy of a monk, kept in a small shrine and said to be several centuries old.',
      'On our itinerary Gue is an optional detour on day 3, subject to timing and road conditions.',
    ],
  },
  tabo: {
    summary:
      'A village in the Spiti valley around Tabo Monastery, founded in 996 CE and famous for its ancient murals.',
    body: [
      'Tabo is home to one of the oldest Buddhist monasteries in the Himalaya, founded in 996 CE. Its earthen halls hold murals and sculptures preserved for centuries; caves once used for meditation are cut into the hillside above the village.',
      'Tabo is the overnight stop on day 3, and the monastery is the first visit on day 4. Please follow the monastery’s rules on photography inside the halls.',
    ],
  },
  dhankar: {
    summary:
      'Spiti’s former capital, with a monastery perched on a crumbling spur above the valley.',
    body: [
      'Dhankar was once the capital of Spiti. Its monastery clings to an eroded spur high above the meeting of the Spiti and Pin rivers, one of the most striking sights in the valley.',
      'We stop here on day 4 between Tabo and Kaza. A walk up to Dhankar lake above the village is possible if you have time and feel well at the altitude.',
    ],
    media: 'day-dhankar',
  },
  'pin-valley': {
    summary: 'A side valley south of the Spiti river, protected as Pin Valley National Park.',
    body: [
      'The Pin valley branches off the main Spiti valley and is protected as a national park. Its villages, rock formations and wide river bed feel remote even by Spiti standards.',
      'On our itinerary Pin Valley is an optional diversion on day 4, depending on the time available and road conditions.',
    ],
  },
  kaza: {
    summary: 'The main town of the Spiti valley and our base for local sightseeing days.',
    body: [
      'Kaza is Spiti’s largest town, set beside the wide Spiti river among bare, golden hills. It has the valley’s main market, fuel, homestays and hotels, which makes it the natural base for the high villages around it.',
      'We stay in Kaza from day 4 to day 7: two local sightseeing days and a slow day that doubles as rest for altitude and a buffer for weather.',
    ],
    tips: ['Mobile network and ATMs are limited; carry some cash.'],
    media: 'day-kaza',
  },
  'key-monastery': {
    summary:
      'Spiti’s largest monastery, stacked on a hill above the Spiti river a short drive from Kaza.',
    body: [
      'Key Monastery rises in tiers of white buildings above Key village and the Spiti river. It is the largest monastery in the valley and home to a community of monks.',
      'It is the first visit on day 5, followed by Kibber and Chicham. Please be respectful during prayers and follow the monastery’s photography rules.',
    ],
    media: 'day-key-monastery',
  },
  kibber: {
    summary: 'One of Spiti’s high villages above Key, gateway to the Kibber wildlife sanctuary.',
    body: [
      'Kibber is a village of whitewashed houses set on a high plateau beyond Key Monastery. The surrounding area is part of a wildlife sanctuary known for Himalayan wildlife.',
      'We drive through Kibber on day 5, on the way to the Chicham bridge.',
    ],
  },
  'chicham-bridge': {
    summary:
      'A bridge high above a deep gorge linking Kibber and Chicham, often called one of the highest in Asia.',
    body: [
      'The Chicham bridge spans a narrow, deep gorge between Kibber and Chicham villages. Before it was built, crossing the gorge meant a long detour.',
      'It is the last stop on day 5 before returning to Kaza. Stay behind the railings for photographs; the drop is very steep.',
    ],
  },
  langza: {
    summary:
      'A high village known for fossils in the area and a large Buddha statue overlooking the valley.',
    body: [
      'Langza is a small village on a high meadow above Kaza. A large Buddha statue looks out over the valley, and marine fossils found around the village are a reminder that this land was once under the sea.',
      'It is the first stop on day 6’s high village circuit, with Hikkim and Komic nearby.',
    ],
    tips: ['Fossils belong where they lie: please do not collect them.'],
    media: 'day-langza',
  },
  hikkim: {
    summary:
      'A tiny high village whose post office is often described as one of the highest in the world.',
    body: [
      'Hikkim is a small village between Langza and Komic. Its post office is often described as one of the highest in the world, and many travellers send a postcard home from here.',
      'We stop here on day 6. Post office opening depends on local timings and the season.',
    ],
  },
  komic: {
    summary: 'A high village with an old monastery, on day 6’s circuit above Kaza.',
    body: [
      'Komic is one of the high villages above Kaza, with an old monastery and wide views across the surrounding ridges.',
      'It is the last village on day 6’s circuit before we return to Kaza. The order of the stops can change with local conditions.',
    ],
  },
  'kunzum-pass': {
    summary:
      'The high pass between Spiti and Lahaul, at around 4,550 m, open only in the warmer months.',
    body: [
      'Kunzum Pass links Spiti with Lahaul on the road from Kaza towards Manali. At the top, travellers traditionally circle the small Kunzum Mata temple and stupa before continuing.',
      'The pass is usually open only from early summer to autumn and closes with snow. It is crossed on day 8, and we confirm its status for your dates before booking.',
    ],
  },
  chandratal: {
    summary: 'The “moon lake” in Lahaul, reached by a side road beyond Kunzum Pass. Seasonal.',
    body: [
      'Chandratal is a clear lake shaped like a crescent surrounded by high mountains, reached by a side road beyond Kunzum Pass and a short walk. Its colour changes through the day with the light.',
      'The road and the camps near the lake are seasonal. On our itinerary it is the overnight stop on day 8, confirmed for your dates.',
    ],
    tips: [
      'Nights at the lake are very cold, even in summer.',
      'Keep the lake clean: carry back everything you bring.',
    ],
    media: 'day-chandratal',
  },
  'atal-tunnel': {
    summary: 'The long road tunnel under the Rohtang ridge, linking Lahaul with the Manali side.',
    body: [
      'The Atal Tunnel runs under the Rohtang ridge, connecting Lahaul with the Manali side of the mountains without crossing the Rohtang pass. It opened in 2020.',
      'We drive through it on day 9, after the rough stretch from Batal to Gramphu, on the way down to Manali.',
    ],
    media: 'day-atal-tunnel',
  },
  manali: {
    summary:
      'The Kullu valley town where the circuit ends, after crossing into the Manali side on day 9.',
    body: [
      'Manali sits in the Kullu valley beside the Beas river, among pine and deodar forest. It is where our Shimla → Spiti circuit ends.',
      'From Manali you can continue onward by road, or we can discuss your onward travel when you enquire.',
    ],
  },
};
