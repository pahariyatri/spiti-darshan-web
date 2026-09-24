/**
 * Browser-only journey: a clear road and moving car, with stop context in the header
 * and itinerary chips that focus the selected stop. Driven by server-rendered route data.
 *
 * Per animation frame: all layout reads happen first (one layout pass), then all writes —
 * no read/write interleaving. Stop markers and floating labels are not rendered.
 */
import { legRanges } from './geometry';
import type { JourneyPayload } from './payload';

const pad2 = (n: number) => String(n).padStart(2, '0');

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

/* Each day on the map runs from sunrise to night: [day progress, sky top, sky bottom]. */
const SKY: [number, string, string][] = [
  [0, '#27305a', '#e9875a'],
  [0.12, '#4c79aa', '#f5c48c'],
  [0.3, '#5e9dcc', '#c4e2ef'],
  [0.62, '#5891c0', '#d3e5ec'],
  [0.78, '#3c3f6d', '#ee9160'],
  [0.88, '#111b38', '#27345a'],
  [1, '#070d1f', '#131f3a'],
];

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hex(a), hex(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i]! - v) * t)).join(',')})`;
};

/** Sky colours, sun arc, moon and headlight level for a point in the day (0 = sunrise). */
function paintSky(el: HTMLElement, t: number): void {
  const k = Math.max(0, SKY.findIndex(([at]) => at >= t) - 1);
  const [a, top1, bot1] = SKY[k]!;
  const [b, top2, bot2] = SKY[k + 1] ?? SKY[k]!;
  const f = b === a ? 0 : (t - a) / (b - a);
  const sunT = clamp(t / 0.84);
  const night = clamp((t - 0.76) / 0.12);
  const s = el.style;
  s.setProperty('--sky-top', mix(top1, top2, f));
  s.setProperty('--sky-bot', mix(bot1, bot2, f));
  s.setProperty('--sun-x', `${6 + sunT * 88}%`);
  s.setProperty('--sun-y', `${60 - Math.sin(Math.PI * sunT) * 44}%`);
  s.setProperty('--sun-glow', String(1 - Math.sin(Math.PI * sunT) * 0.6));
  s.setProperty('--sun-on', String(1 - clamp((t - 0.8) / 0.06)));
  s.setProperty('--night', night.toFixed(3));
  s.setProperty('--land', String(1.08 - night * 0.55));
}

export function initJourney(): void {
  const dataEl = document.getElementById('journeyData');
  const days = Array.from(document.querySelectorAll<HTMLElement>('.day'));
  const sticky = document.getElementById('routeSticky');
  const viewport = document.getElementById('navMap');
  const world = document.getElementById('mapWorld');
  const path = document.getElementById('routePath') as SVGPathElement | null;
  const car = document.getElementById('mapCar');
  const legEl = document.getElementById('currentLeg');
  const placeEl = document.getElementById('currentPlace');
  const counterEl = document.getElementById('dayCounter');
  const stopCounter = document.getElementById('stopCounter');
  const live = document.getElementById('journeyLive');
  const trail = document.getElementById('routeTrail');
  const sky = document.getElementById('mapSky');
  if (!dataEl || !days.length || !sticky || !viewport || !world || !path || !car) return;
  if (!legEl || !placeEl || !counterEl || !stopCounter) return;

  let data: JourneyPayload;
  try {
    data = JSON.parse(dataEl.textContent ?? '') as JourneyPayload;
  } catch {
    return; // The server-rendered itinerary stays fully usable without the map.
  }
  const dayCount = Math.min(days.length, data.days.length);
  if (!dayCount) return;

  const W = data.viewBox.width;
  const H = data.viewBox.height;
  const svgNS = 'http://www.w3.org/2000/svg';
  const segmentLengths = data.segments.map((d) => {
    if (!d) return null;
    const el = document.createElementNS(svgNS, 'path');
    el.setAttribute('d', d);
    return el.getTotalLength();
  });
  const ranges = legRanges(segmentLengths);
  const totalLength = path.getTotalLength();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Photo parallax only on larger screens: it's decorative and costs frames on low-end phones.
  const wide = window.matchMedia('(min-width: 901px)');
  const chipsByDay = days.map((article) =>
    Array.from(article.querySelectorAll<HTMLAnchorElement>('.stop')),
  );
  const photos = days.map((article) => article.querySelector<HTMLElement>('.day-photo'));

  let announcedDay = -1;
  let ticking = false;
  // Scrolling back up turns the car around, so it always drives the way the page moves.
  let lastScrollY = window.scrollY;
  let reversing = false;

  const pointAt = (f: number) => path.getPointAtLength(clamp(f) * totalLength);
  const dayFraction = (dayIndex: number, progress: number) => {
    const range = ranges[dayIndex] ?? ranges[ranges.length - 1] ?? [0, 0];
    return range[0] + clamp(progress) * (range[1] - range[0]);
  };

  // Stop chips focus the route without opening another page or interrupting the journey.
  days.slice(0, dayCount).forEach((article, d) => {
    chipsByDay[d]!.forEach((chip) => {
      chip.addEventListener('click', (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const count = data.days[d]?.pins.length ?? 1;
        const index = Math.min(Number(chip.dataset.pin ?? 0), count - 1);
        const local = count === 1 ? 0.5 : clamp((index + 0.08) / (count - 1));
        const target =
          sticky.offsetHeight + Math.max(70, (innerHeight - sticky.offsetHeight) * 0.46);
        const rect = article.getBoundingClientRect();
        const destination = window.scrollY + rect.top + local * rect.height - target;
        window.scrollTo({
          top: Math.max(0, destination),
          behavior: reduced ? 'instant' : 'smooth',
        });
      });
    });
  });

  const update = () => {
    // ---- reads ----
    const stickyH = sticky.offsetHeight;
    const vh = innerHeight;
    const target = stickyH + Math.max(70, (vh - stickyH) * 0.46);
    const rects = days.slice(0, dayCount).map((el) => el.getBoundingClientRect());
    const worldW = world.offsetWidth;
    const worldH = world.offsetHeight;
    const viewW = viewport.clientWidth;

    let d = rects.findIndex((b) => b.top <= target && b.bottom > target);
    if (d < 0) {
      const first = rects[0]!;
      const last = rects[rects.length - 1]!;
      d =
        first.top > target
          ? 0
          : last.bottom < target
            ? dayCount - 1
            : rects.findIndex((b) => b.bottom > target);
      d = Math.max(0, d);
    }
    const rect = rects[d]!;
    const local = clamp((target - rect.top) / Math.max(1, rect.height));
    const day = data.days[d]!;

    // ---- writes ----
    days.forEach((el, i) => el.classList.toggle('is-active', i === d));

    const count = day.pins.length;
    const currentIndex = count <= 1 ? 0 : Math.min(count - 1, Math.round(local * (count - 1)));
    const visualLocal = reduced && count > 1 ? currentIndex / (count - 1) : local;
    const fraction = dayFraction(d, visualLocal);
    const pt = pointAt(fraction);
    const x = (pt.x / W) * worldW;
    const y = (pt.y / H) * worldH;
    const ahead = pointAt(clamp(fraction + 0.00015));
    const dx = ((ahead.x - pt.x) / W) * worldW;
    const dy = ((ahead.y - pt.y) / H) * worldH;
    const scrollY = window.scrollY;
    if (Math.abs(scrollY - lastScrollY) > 2) {
      reversing = scrollY < lastScrollY;
      lastScrollY = scrollY;
    }
    const forward =
      Math.abs(dx) + Math.abs(dy) < 0.02 ? 90 : (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    const heading = reversing ? forward + 180 : forward;
    car.style.left = `${x}px`;
    car.style.top = `${y}px`;
    car.style.transform = `translate(-50%,-50%) rotate(${heading}deg)`;

    legEl.textContent = day.leg;
    // Screen readers hear the day change once, not every scroll frame.
    if (live && announcedDay !== d && announcedDay !== -1)
      live.textContent = `Day ${d + 1} of ${dayCount}: ${day.leg}`;
    announcedDay = d;
    counterEl.textContent = `DAY ${pad2(d + 1)} / ${pad2(dayCount)}`;
    placeEl.textContent = day.pins[currentIndex]?.label ?? '';
    stopCounter.textContent =
      count <= 1 ? day.restLabel : `STOP ${pad2(currentIndex + 1)} / ${pad2(count)}`;

    // Follow the vehicle. Stop names stay in the header, leaving the road clear.
    const maxPan = Math.max(0, worldW - viewW);
    const pan = Math.min(maxPan, Math.max(0, x - viewW * 0.44));
    world.style.transform = `translate3d(${-pan}px,0,0)`;
    // The mountains drift slower than the road, and the road behind the car lights up.
    if (sky) sky.style.backgroundPositionX = `${-pan * 0.35}px`;
    if (trail) trail.style.strokeDashoffset = String(1 - fraction);
    paintSky(viewport, local);

    chipsByDay[d]!.forEach((chip) => {
      const on = chip.hasAttribute('data-on-map') && Number(chip.dataset.pin) === currentIndex;
      chip.classList.toggle('active-stop', on);
      if (on) chip.setAttribute('aria-current', 'step');
      else chip.removeAttribute('aria-current');
    });
    // Clear stale highlights on the day we just left.
    chipsByDay.forEach((chips, i) => {
      if (i !== d)
        chips.forEach(
          (c) => (c.classList.remove('active-stop'), c.removeAttribute('aria-current')),
        );
    });

    if (!reduced && wide.matches) {
      rects.forEach((b, i) => {
        const bg = photos[i];
        if (bg && b.top < vh && b.bottom > 0) {
          const shift = Math.max(-14, Math.min(14, (vh / 2 - b.top - b.height / 2) * 0.025));
          bg.style.transform = `scale(1.06) translateY(${shift}px)`;
        }
      });
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  // Day sections size themselves to "one screen below the sticky bar" via this variable.
  const setStickyHeight = () =>
    document.documentElement.style.setProperty('--route-sticky-h', `${sticky.offsetHeight}px`);
  setStickyHeight();
  new ResizeObserver(setStickyHeight).observe(sticky);
  update();
}
