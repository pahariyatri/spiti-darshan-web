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
    const heading =
      Math.abs(dx) + Math.abs(dy) < 0.02 ? 0 : (Math.atan2(dy, dx) * 180) / Math.PI + 90;
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
