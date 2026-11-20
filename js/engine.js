// On-call — core game rules. Pure logic: no DOM, no audio, no timers of its own.
// One Game instance is one player's server. Drive it with tick(dt, softDrop).

export const W = 8;
export const H = 14;
export const COLORS = 3;
export const MAX_LEVEL = 15;
export const BUGS_PER_LEVEL = 4;

export const SPEEDS = [
  { id: 'chill', label: 'CHILL', ms: 800 },
  { id: 'steady', label: 'STEADY', ms: 520 },
  { id: 'crunch', label: 'CRUNCH', ms: 300 },
];

export const THROW_MS = 340; // the engineer's throw before a block enters the well
export const CLEAR_MS = 400; // "compiling" animation before matched cells vanish
export const FALL_MS = 70; // one row of settling after a clear
export const SOFT_MS = 90; // drop interval while soft drop is held: brisk, but you can see every row

const SPAWN_X = 3;
// Segment b's offset from segment a for each orientation, and the link each implies.
const OFFSET = [[1, 0], [0, -1], [-1, 0], [0, 1]];
const LINK = ['R', 'U', 'L', 'D'];
const OPPOSITE = { R: 'L', L: 'R', U: 'D', D: 'U' };
const DIR = { R: [1, 0], L: [-1, 0], U: [0, -1], D: [0, 1] };
const ENDED = new Set(['won', 'lost', 'out']);

/** Small seedable PRNG (mulberry32) so every player can get the same block order. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Length of the same-colour run through (x, y) along (dx, dy), as if (x, y) held `color`. */
function runLength(grid, x, y, color, dx, dy) {
  let n = 1;
  for (const s of [1, -1]) {
    let cx = x + dx * s;
    let cy = y + dy * s;
    while (cx >= 0 && cx < W && cy >= 0 && cy < H && grid[cy * W + cx]?.color === color) {
      n++;
      cx += dx * s;
      cy += dy * s;
    }
  }
  return n;
}

/** Place a bug at (x, y) in a colour that makes no line of three. Returns false if none fits. */
function placeBug(grid, x, y, first) {
  if (grid[y * W + x]) return false;
  for (let k = 0; k < COLORS; k++) {
    const color = (first + k) % COLORS;
    if (runLength(grid, x, y, color, 1, 0) < 3 && runLength(grid, x, y, color, 0, 1) < 3) {
      grid[y * W + x] = { color, kind: 'bug', link: null };
      return true;
    }
  }
  return false;
}

function shuffle(list, rand) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/**
 * Scatter bugs into the lower part of the grid, never three of a colour in a line.
 * Bugs are dealt evenly across the rows so every seed of a level is about as tall and as dense,
 * and colours come from a shuffled deck with equal counts of each, so every colour is always present.
 * (The first bug of a colour can never make a line of three, so it always keeps its colour.)
 */
export function seedBugs(grid, level, rand) {
  const target = clamp(level, 1, MAX_LEVEL) * BUGS_PER_LEVEL;
  const minRow = Math.max(4, 10 - Math.ceil(level / 2));
  const rows = shuffle(Array.from({ length: H - minRow }, (_, i) => minRow + i), rand);
  const cols = Array.from({ length: W }, (_, i) => i);
  const deck = shuffle(Array.from({ length: target }, (_, i) => i % COLORS), rand);
  let placed = 0;
  for (let i = 0; i < target; i++) {
    const y = rows[i % rows.length];
    if (shuffle(cols, rand).some((x) => placeBug(grid, x, y, deck[placed]))) placed++;
  }
  // Any bug that found no room in its row goes anywhere in the band.
  for (let attempt = 0; placed < target && attempt < 20000; attempt++) {
    const x = Math.floor(rand() * W);
    const y = minRow + Math.floor(rand() * (H - minRow));
    if (placeBug(grid, x, y, deck[placed])) placed++;
  }
  return placed;
}

export class Game {
  constructor({ level = 1, speed = 1, bugSeed = 1, blockSeed = 1 } = {}) {
    this.level = clamp(level, 1, MAX_LEVEL);
    this.speed = clamp(speed, 0, SPEEDS.length - 1);
    this.grid = new Array(W * H).fill(null);
    this.rand = makeRng(blockSeed);
    this.events = []; // drained by the host each frame (sound, effects)
    this.time = 0; // ms of play: only advances while the host ticks the game, and stops when it ends
    this.chain = 0;
    this.blocks = 0;
    this.piece = null; // { x, y, o, colors:[a, b] } while falling
    this.incoming = null; // colours of the block in mid-throw
    this.clearing = new Set(); // grid indices currently compiling away
    this.timer = 0;
    this.state = 'throw';
    this.bugs = seedBugs(this.grid, this.level, makeRng(bugSeed));
    this.next = this.rollBlock();
    this.beginThrow();
  }

  get ended() {
    return ENDED.has(this.state);
  }

  /** True when the stack is close to the top of the well. */
  get danger() {
    for (let i = 0; i < W * 3; i++) if (this.grid[i]) return true;
    return false;
  }

  get dropMs() {
    // Speeds up a little every eight blocks, down to 45% of the base interval.
    const base = SPEEDS[this.speed].ms;
    return Math.max(base * 0.45, base * 0.97 ** Math.floor(this.blocks / 8));
  }

  /** Colours that still have at least one bug in the well. */
  liveColors() {
    const live = new Set();
    for (const c of this.grid) if (c && c.kind === 'bug') live.add(c.color);
    return live;
  }

  /** A random block with at least one half in a colour that still has bugs. */
  rollBlock() {
    const live = this.liveColors();
    let colors;
    do colors = [Math.floor(this.rand() * COLORS), Math.floor(this.rand() * COLORS)];
    while (live.size > 0 && !colors.some((c) => live.has(c)));
    return colors;
  }

  cell(x, y) {
    return this.grid[y * W + x];
  }

  /** The two segments of a piece as [x, y, color, link]. */
  segments(p = this.piece) {
    const [dx, dy] = OFFSET[p.o];
    return [
      [p.x, p.y, p.colors[0], LINK[p.o]],
      [p.x + dx, p.y + dy, p.colors[1], OPPOSITE[LINK[p.o]]],
    ];
  }

  fits(x, y, o) {
    const [dx, dy] = OFFSET[o];
    for (const [cx, cy] of [[x, y], [x + dx, y + dy]]) {
      if (cx < 0 || cx >= W || cy >= H) return false;
      if (cy >= 0 && this.grid[cy * W + cx]) return false;
    }
    return true;
  }

  // --- player input ---------------------------------------------------------

  move(dx) {
    const p = this.piece;
    if (this.state !== 'fall' || !this.fits(p.x + dx, p.y, p.o)) return false;
    p.x += dx;
    this.events.push({ type: 'move' });
    return true;
  }

  /** dir: -1 clockwise, +1 counter-clockwise (on screen). Kicks off walls and floors. */
  rotate(dir) {
    const p = this.piece;
    if (this.state !== 'fall') return false;
    const o = (p.o + dir + 4) % 4;
    const [dx, dy] = OFFSET[o];
    for (const [kx, ky] of [[0, 0], [-dx, -dy]]) {
      if (this.fits(p.x + kx, p.y + ky, o)) {
        p.x += kx;
        p.y += ky;
        p.o = o;
        this.events.push({ type: 'rotate' });
        return true;
      }
    }
    return false;
  }

  // --- simulation -----------------------------------------------------------

  tick(dt, softDrop = false) {
    if (!this.ended) this.time += dt;
    switch (this.state) {
      case 'throw':
        this.timer -= dt;
        if (this.timer <= 0) this.spawn();
        break;
      case 'fall': {
        const interval = softDrop ? Math.min(SOFT_MS, this.dropMs) : this.dropMs;
        this.timer += dt;
        // Time banked at the slower normal speed must not be spent as a burst of fast rows
        // the moment soft drop is pressed.
        if (softDrop) this.timer = Math.min(this.timer, interval);
        while (this.state === 'fall' && this.timer >= interval) {
          this.timer -= interval;
          this.stepDown();
        }
        break;
      }
      case 'clear':
        this.timer -= dt;
        if (this.timer <= 0) this.finishClear();
        break;
      case 'settle':
        this.timer -= dt;
        if (this.timer <= 0) {
          if (this.applyGravity()) this.timer = FALL_MS;
          else this.resolve();
        }
        break;
    }
  }

  beginThrow() {
    if (this.cell(SPAWN_X, 0) || this.cell(SPAWN_X + 1, 0)) return this.lose();
    this.incoming = this.next;
    this.next = this.rollBlock();
    this.state = 'throw';
    this.timer = THROW_MS;
    this.events.push({ type: 'throw' });
  }

  spawn() {
    this.piece = { x: SPAWN_X, y: 0, o: 0, colors: this.incoming };
    this.incoming = null;
    this.blocks++;
    this.state = 'fall';
    this.timer = 0;
  }

  stepDown() {
    const p = this.piece;
    if (this.fits(p.x, p.y + 1, p.o)) p.y++;
    else this.lock();
  }

  lock() {
    const segs = this.segments();
    const overflow = segs.some(([, y]) => y < 0);
    for (const [x, y, color, link] of segs) {
      if (y >= 0) this.grid[y * W + x] = { color, kind: 'code', link: overflow ? null : link };
    }
    this.piece = null;
    this.events.push({ type: 'lock' });
    if (overflow) return this.lose();
    this.chain = 0;
    this.resolve();
  }

  /** Indices of every cell that sits in a row or column run of four or more. */
  findMatches() {
    const hit = new Set();
    const scan = (len, at) => {
      let start = 0;
      for (let i = 1; i <= len; i++) {
        const a = this.grid[at(start)];
        const b = i < len ? this.grid[at(i)] : null;
        if (a && b && a.color === b.color) continue;
        if (a && i - start >= 4) for (let k = start; k < i; k++) hit.add(at(k));
        start = i;
      }
    };
    for (let y = 0; y < H; y++) scan(W, (i) => y * W + i);
    for (let x = 0; x < W; x++) scan(H, (i) => i * W + x);
    return hit;
  }

  resolve() {
    const matches = this.findMatches();
    if (matches.size === 0) return this.beginThrow();
    this.chain++;
    this.clearing = matches;
    this.state = 'clear';
    this.timer = CLEAR_MS;
    this.events.push({ type: 'clear', count: matches.size, chain: this.chain });
  }

  finishClear() {
    let bugsCleared = 0;
    for (const i of this.clearing) {
      const c = this.grid[i];
      if (c.kind === 'bug') bugsCleared++;
      if (c.link) {
        // The surviving half of a block becomes a loose segment.
        const [dx, dy] = DIR[c.link];
        const j = i + dx + dy * W;
        if (!this.clearing.has(j) && this.grid[j]) this.grid[j].link = null;
      }
    }
    for (const i of this.clearing) this.grid[i] = null;
    this.bugs -= bugsCleared;
    this.clearing = new Set();
    if (this.bugs === 0) {
      // Stop the clock the moment the last bug went, not at the end of the frame it went in.
      this.time += Math.min(0, this.timer);
      this.state = 'won';
      this.events.push({ type: 'win' });
    } else {
      this.state = 'settle';
      this.timer = FALL_MS;
    }
  }

  /** Drop every unsupported code segment one row. Bugs never fall. Returns true if anything moved. */
  applyGravity() {
    const g = this.grid;
    let moved = false;
    for (let y = H - 2; y >= 0; y--) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const c = g[i];
        if (!c || c.kind === 'bug' || c.link === 'L') continue; // 'L' halves move with their partner
        if (c.link === 'R') {
          if (g[i + W] || g[i + W + 1]) continue;
          g[i + W] = c;
          g[i + W + 1] = g[i + 1];
          g[i] = g[i + 1] = null;
        } else {
          if (g[i + W]) continue;
          g[i + W] = c;
          g[i] = null;
        }
        moved = true;
      }
    }
    return moved;
  }

  lose() {
    this.state = 'lost';
    this.events.push({ type: 'lose' });
  }

  /** Used by the host in multiplayer: 'won' for last server standing, 'out' when beaten. */
  forceEnd(state) {
    if (!this.ended) this.state = state;
  }
}
