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

/** Small line icons for stop types (constant markup, never user data). viewBox 0 0 16 16. */
const PIN_ICONS: Record<string, string> = {
  monastery:
    '<path d="M8 1.2 9.1 4H6.9ZM5.4 4.6h5.2v1.5H5.4ZM4 6.7c0 2.6 8 2.6 8 0ZM3.4 9.8h9.2v1.4H3.4ZM2.4 11.8h11.2V14H2.4Z" fill="currentColor"/>',
  lake: '<path d="M1.5 6.5c2-2 3.5-2 5.5 0s3.5 2 5.5 0M3 10.5c2-2 3.5-2 5.5 0s3 2 5 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  pass: '<path d="M1.2 13.5 6 5l2.6 4.3 2-2.8 4.2 7Z" fill="currentColor"/>',
  stay: '<path d="M10.8 2.2a5.8 5.8 0 1 0 3.1 9.4 4.7 4.7 0 0 1-3.1-9.4Z" fill="currentColor"/>',
  start:
    '<path d="M4 14.5V2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4.6 2.4h7.6L10.6 5l1.6 2.6H4.6Z" fill="currentColor"/>',
};
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

interface RenderedPin {
  pin: HTMLElement;
  labelEl: HTMLElement;
  labelW: number;
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
  const live = document.getElementById('journeyLive');
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
  // Photo parallax only on larger screens: it's decorative and costs frames on low-end phones.
  const wide = window.matchMedia('(min-width: 901px)');
  const chipsByDay = days.map((article) =>
    Array.from(article.querySelectorAll<HTMLButtonElement>('.stop')),
  );
  const photos = days.map((article) => article.querySelector<HTMLElement>('.day-photo'));

  let renderedDay = -1;
  let announcedDay = -1;
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
      const icon = PIN_ICONS[kind];
      if (icon) {
        pin.classList.add('has-icon');
        pin.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${icon}</svg>`;
      }
      const labelEl = document.createElement('span');
      labelEl.className = 'pin-label';
      const title = document.createElement('strong');
      title.textContent = label;
      const type = document.createElement('small');
      type.textContent = kindLabel;
      labelEl.append(title, type);
      pin.appendChild(labelEl);
      pinLayer.appendChild(pin);
      if (pins.length > 1 && i === pins.length - 1) pin.classList.add('is-destination');
      dayPins.push({ pin, labelEl, x: (pt.x / W) * worldW, labelW: 0, label, i });
    });
    // One layout read per day change: label widths for collision-free placement.
    dayPins.forEach((p) => (p.labelW = p.labelEl.offsetWidth || 90));
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
    const carHalf = car.offsetWidth / 2;

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
    // Screen readers hear the day change once, not every scroll frame.
    if (live && announcedDay !== d && announcedDay !== -1)
      live.textContent = `Day ${d + 1} of ${dayCount}: ${day.leg}`;
    announcedDay = d;
    counterEl.textContent = `DAY ${pad2(d + 1)} / ${pad2(dayCount)}`;
    placeEl.textContent = dayPins[currentIndex]?.label ?? '';
    stopCounter.textContent =
      count <= 1 ? day.restLabel : `STOP ${pad2(currentIndex + 1)} / ${pad2(count)}`;

    // Follow the vehicle, keeping the current label inside the viewport.
    const maxPan = Math.max(0, worldW - viewW);
    const pan = Math.min(maxPan, Math.max(0, x - viewW * 0.44));
    world.style.transform = `translate3d(${-pan}px,0,0)`;

    // Labels: the current stop, plus the day's destination. A label sits beside its stop on the
    // side away from the car, pushed clear of it, and flips when it would leave the view, so it
    // never covers the moving vehicle. The destination label hides if it would collide.
    const gap = 8;
    const viewL = pan + 4;
    const viewR = pan + viewW - 4;
    const place = (px: number, w: number) => {
      const carL = x - carHalf - gap;
      const carR = x + carHalf + gap;
      const right = Math.max(px + 10, carR);
      const left = Math.min(px - 10, carL) - w;
      const preferRight = x <= px;
      const fitsRight = right + w <= viewR;
      const fitsLeft = left >= viewL;
      const start = preferRight
        ? fitsRight || !fitsLeft
          ? right
          : left
        : fitsLeft || !fitsRight
          ? left
          : right;
      return { start, end: start + w };
    };
    let currentBox: { start: number; end: number } | null = null;
    dayPins.forEach((p) => {
      p.pin.classList.toggle('is-current', p.i === currentIndex);
      p.pin.classList.toggle('is-passed', p.i < currentIndex);
    });
    const cur = dayPins[currentIndex];
    if (cur) {
      currentBox = place(cur.x, cur.labelW);
      cur.pin.style.setProperty('--lx', `${currentBox.start - cur.x}px`);
    }
    dayPins.forEach((p) => {
      let show = p.i === currentIndex;
      if (!show && p.pin.classList.contains('is-destination')) {
        // The destination label stays attached to its own stop (right side, else left).
        const right = { start: p.x + 12, end: p.x + 12 + p.labelW };
        const left = { start: p.x - 12 - p.labelW, end: p.x - 12 };
        const clear = (b: { start: number; end: number }) =>
          b.start >= viewL &&
          b.end <= viewR &&
          !(b.start < x + carHalf + gap && b.end > x - carHalf - gap) &&
          !(currentBox && b.start < currentBox.end + gap && b.end > currentBox.start - gap);
        const box = clear(right) ? right : clear(left) ? left : null;
        show = box !== null;
        if (box) p.pin.style.setProperty('--lx', `${box.start - p.x}px`);
      }
      p.pin.classList.toggle('show-label', show);
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
