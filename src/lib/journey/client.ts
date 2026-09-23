/**
 * Browser-only journey map. A faithful, typed port of the approved page's inline script, now
 * driven by the server-rendered #journeyData payload instead of hardcoded arrays.
 *
 * Per animation frame: all layout reads happen first (one layout pass), then all writes —
 * no read/write interleaving. Only transform/opacity/class changes are written.
 */
import { legRanges } from './geometry';
import type { JourneyPayload } from './payload';

const pad2 = (n: number) => String(n).padStart(2, '0');
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

interface RenderedPin {
  pin: HTMLElement;
  /** x in world pixels (== offsetLeft), cached per render/resize. */
  x: number;
  label: string;
  i: number;
}

export function initJourney(): void {
  const dataEl = document.getElementById('journeyData');
  const days = Array.from(document.querySelectorAll<HTMLElement>('.day'));
  const sticky = document.getElementById('routeSticky');
  const viewport = document.getElementById('navMap');
  const world = document.getElementById('mapWorld');
  const path = document.getElementById('routePath') as SVGPathElement | null;
  const car = document.getElementById('mapCar');
  const pinLayer = document.getElementById('pinLayer');
  const legEl = document.getElementById('currentLeg');
  const placeEl = document.getElementById('currentPlace');
  const counterEl = document.getElementById('dayCounter');
  const stopCounter = document.getElementById('stopCounter');
  if (!dataEl || !days.length || !sticky || !viewport || !world || !path || !car || !pinLayer)
    return;
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
  const chipsByDay = days.map((article) =>
    Array.from(article.querySelectorAll<HTMLButtonElement>('.stop')),
  );
  const photos = days.map((article) => article.querySelector<HTMLElement>('.day-photo'));

  let renderedDay = -1;
  let renderedWorldW = -1;
  let dayPins: RenderedPin[] = [];
  let ticking = false;

  const pointAt = (f: number) => path.getPointAtLength(clamp(f) * totalLength);
  const dayFraction = (dayIndex: number, progress: number) => {
    const range = ranges[dayIndex] ?? ranges[ranges.length - 1] ?? [0, 0];
    return range[0] + clamp(progress) * (range[1] - range[0]);
  };

  const renderPins = (dayIndex: number, worldW: number) => {
    renderedDay = dayIndex;
    renderedWorldW = worldW;
    pinLayer.replaceChildren();
    dayPins = [];
    const pins = data.days[dayIndex]?.pins ?? [];
    pins.forEach(({ label, kind, kindLabel }, i) => {
      const progress = pins.length === 1 ? 0 : i / (pins.length - 1);
      const pt = pointAt(dayFraction(dayIndex, progress));
      const pin = document.createElement('div');
      pin.className = 'map-pin' + (pt.y < 54 ? ' below' : '');
      pin.style.left = `${(pt.x / W) * 100}%`;
      pin.style.top = `${(pt.y / H) * 100}%`;
      pin.dataset.name = label;
      pin.dataset.kind = kind;
      const labelEl = document.createElement('span');
      labelEl.className = 'pin-label';
      const title = document.createElement('strong');
      title.textContent = label;
      const type = document.createElement('small');
      type.textContent = kindLabel;
      labelEl.append(title, type);
      pin.appendChild(labelEl);
      pinLayer.appendChild(pin);
      dayPins.push({ pin, x: (pt.x / W) * worldW, label, i });
    });
  };

  // Tapping a stop chip scrolls so the vehicle arrives at that stop (no new screen).
  days.slice(0, dayCount).forEach((article, d) => {
    chipsByDay[d]!.forEach((chip) => {
      chip.addEventListener('click', () => {
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
    if (renderedDay !== d || renderedWorldW !== worldW) renderPins(d, worldW);

    const count = dayPins.length;
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
    counterEl.textContent = `DAY ${pad2(d + 1)} / ${pad2(dayCount)}`;
    placeEl.textContent = dayPins[currentIndex]?.label ?? '';
    stopCounter.textContent =
      count <= 1 ? day.restLabel : `STOP ${pad2(currentIndex + 1)} / ${pad2(count)}`;

    // Follow the vehicle, keeping the current label inside the viewport.
    const maxPan = Math.max(0, worldW - viewW);
    const pan = Math.min(maxPan, Math.max(0, x - viewW * 0.44));
    world.style.transform = `translate3d(${-pan}px,0,0)`;

    const current = dayPins[currentIndex];
    dayPins.forEach(({ pin, x: px, i }) => {
      pin.classList.toggle('is-current', i === currentIndex);
      pin.classList.toggle('is-passed', i < currentIndex);
      const sx = px - pan;
      pin.classList.toggle('label-left', sx < 95);
      pin.classList.toggle('label-right', sx >= 95 && sx > viewW - 95);
      const nearby = i === currentIndex + 1;
      const labelVisible = sx > 85 && sx < viewW - 85;
      const separated = current ? Math.abs(px - current.x) > 125 : false;
      pin.classList.toggle(
        'show-label',
        i === currentIndex || (nearby && labelVisible && separated),
      );
    });

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

    if (!reduced) {
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
  update();
}
