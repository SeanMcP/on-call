// Personal records: the fastest solo clear of each level at each speed, kept on this device.

import { SPEEDS, MAX_LEVEL } from './engine.js';

const STORE_KEY = 'on-call-records-v1';

/** "1:23.4" with places=1, "1:23.45" with places=2. Rounds down, so a time never shows better than it was. */
export function formatTime(ms, places = 2) {
  const unit = 10 ** places;
  const ticks = Math.floor((Math.min(Math.max(0, ms), 6_000_000 - 1) / 1000) * unit); // tops out at 99:59.99
  const minutes = Math.floor(ticks / (60 * unit));
  const seconds = Math.floor(ticks / unit) % 60;
  const frac = String(ticks % unit).padStart(places, '0');
  return `${minutes}:${String(seconds).padStart(2, '0')}${places ? `.${frac}` : ''}`;
}

const keyOf = (level, speed) => `${level}-${SPEEDS[speed].id}`;

/** `storage` is anything with getItem/setItem/removeItem (localStorage, or a stand-in for tests). */
export function createRecords(storage) {
  let best = {};
  try {
    const saved = JSON.parse(storage.getItem(STORE_KEY));
    for (let level = 1; level <= MAX_LEVEL; level++) {
      for (let speed = 0; speed < SPEEDS.length; speed++) {
        const ms = saved?.[keyOf(level, speed)];
        if (Number.isFinite(ms) && ms > 0) best[keyOf(level, speed)] = ms;
      }
    }
  } catch {
    // nothing saved yet, or storage is unavailable
  }

  const save = () => {
    try {
      storage.setItem(STORE_KEY, JSON.stringify(best));
    } catch {
      // private window etc.: records last until the page closes
    }
  };

  return {
    /** Best time in ms, or null if this level and speed has never been cleared. */
    get: (level, speed) => best[keyOf(level, speed)] ?? null,

    /** Record a clear. Returns { record, previous }: whether it beat the old best, and what that was. */
    submit(level, speed, ms) {
      const previous = best[keyOf(level, speed)] ?? null;
      const record = previous === null || ms < previous;
      if (record) {
        best[keyOf(level, speed)] = ms;
        save();
      }
      return { record, previous };
    },

    get empty() {
      return Object.keys(best).length === 0;
    },

    clear() {
      best = {};
      try {
        storage.removeItem(STORE_KEY);
      } catch {
        // nothing to remove
      }
    },
  };
}
