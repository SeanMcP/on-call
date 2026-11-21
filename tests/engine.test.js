// Run with: node tests/engine.test.js   (no dependencies)
import assert from 'node:assert/strict';
import { Game, W, H, MAX_LEVEL, BUGS_PER_LEVEL, CLEAR_MS, FALL_MS, makeRng, seedBugs, COLORS } from '../js/engine.js';

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`ok - ${name}`);
}

const code = (color, link = null) => ({ color, kind: 'code', link });
const bug = (color) => ({ color, kind: 'bug', link: null });

/** A game with an empty well and a known falling piece. */
function blank(colors = [0, 0]) {
  const g = new Game({ level: 1 });
  g.grid.fill(null);
  g.bugs = 0;
  g.tick(10_000); // finish the throw
  g.piece.colors = colors;
  return g;
}
const put = (g, x, y, cell) => { g.grid[y * W + x] = cell; if (cell.kind === 'bug') g.bugs++; };
const drop = (g) => { while (g.state === 'fall') g.stepDown(); };
const run = (g, ms = 5000) => { for (let t = 0; t < ms && !g.ended && g.state !== 'fall'; t += 10) g.tick(10); };

function checkLinks(g) {
  const D = { R: [1, 0, 'L'], L: [-1, 0, 'R'], U: [0, -1, 'D'], D: [0, 1, 'U'] };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = g.grid[y * W + x];
    if (!c?.link) continue;
    const [dx, dy, back] = D[c.link];
    const p = g.grid[(y + dy) * W + x + dx];
    assert.ok(p && p.link === back, `broken link at ${x},${y}`);
  }
}

test('seeding places 4 bugs per level with nothing pre-matched', () => {
  for (let level = 1; level <= MAX_LEVEL; level++) {
    for (let seed = 1; seed <= 40; seed++) {
      const g = new Game({ level, bugSeed: seed });
      assert.equal(g.bugs, level * BUGS_PER_LEVEL);
      assert.equal(g.grid.filter((c) => c?.kind === 'bug').length, g.bugs);
      assert.equal(g.findMatches().size, 0);
      for (let i = 0; i < W * 4; i++) assert.equal(g.grid[i], null, 'top rows stay empty');
    }
  }
});

test('every seed of a level spreads its bugs evenly across the rows', () => {
  for (let level = 1; level <= MAX_LEVEL; level++) {
    for (let seed = 1; seed <= 50; seed++) {
      const grid = new Array(W * H).fill(null);
      assert.equal(seedBugs(grid, level, makeRng(seed)), level * BUGS_PER_LEVEL);
      const perRow = [];
      for (let y = 0; y < H; y++) {
        const n = grid.slice(y * W, (y + 1) * W).filter(Boolean).length;
        if (n) perRow.push(n);
      }
      const rows = H - Math.max(4, 10 - Math.ceil(level / 2));
      const even = Math.floor((level * BUGS_PER_LEVEL) / rows);
      assert.ok(perRow.every((n) => n >= even && n <= even + 1), `level ${level} seed ${seed}: ${perRow}`);
    }
  }
});

test('every seed of every level has bugs of every colour', () => {
  for (let level = 1; level <= MAX_LEVEL; level++) {
    for (let seed = 1; seed <= 500; seed++) {
      const grid = new Array(W * H).fill(null);
      seedBugs(grid, level, makeRng(seed));
      const colors = new Set(grid.filter(Boolean).map((c) => c.color));
      assert.equal(colors.size, COLORS, `level ${level} seed ${seed}`);
    }
  }
});

test('same seed gives every player the same blocks', () => {
  const a = new Game({ blockSeed: 7 });
  const b = new Game({ blockSeed: 7 });
  for (let i = 0; i < 20; i++) assert.deepEqual(a.rollBlock(), b.rollBlock());
  assert.notDeepEqual(
    Array.from({ length: 20 }, makeRng(1)),
    Array.from({ length: 20 }, makeRng(2)),
  );
});

test('blocks only use colours still in the server, bug or code', () => {
  const g = blank();
  put(g, 0, H - 1, bug(0));
  put(g, 0, H - 2, code(2)); // 2 has no bugs, but its code is burying the last bug
  for (let i = 0; i < 200; i++) {
    const b = g.rollBlock();
    assert.ok(b.every((c) => c === 0 || c === 2), `rolled ${b}`);
  }
  assert.ok(Array.from({ length: 200 }, () => g.rollBlock()).flat().includes(2));
});

test('a colour that has left the server is not brought back', () => {
  const g = blank();
  put(g, 0, H - 1, bug(1)); // nothing else left: every block is all colour 1
  for (let i = 0; i < 50; i++) assert.deepEqual(g.rollBlock(), [1, 1]);
});

test('the block in mid-throw counts as in the server', () => {
  const g = blank();
  put(g, 0, H - 1, bug(0));
  g.incoming = [1, 1];
  assert.deepEqual(g.colorsInPlay(), [0, 1]);
});

test('piece moves, stops at walls, and wall-kicks when rotating', () => {
  const g = blank();
  while (g.move(-1));
  assert.equal(g.piece.x, 0);
  while (g.move(1));
  assert.equal(g.piece.x, W - 2);
  assert.ok(g.rotate(1)); // b now above a
  while (g.move(1));
  assert.equal(g.piece.x, W - 1);
  assert.ok(g.rotate(-1)); // back to horizontal: must kick left off the wall
  assert.equal(g.piece.x, W - 2);
  assert.equal(g.piece.o, 0);
});

test('pressing soft drop late in a slow fall moves one row, not many', () => {
  const g = blank();
  g.speed = 0; // 800 ms per row
  g.tick(700); // most of a row's wait has built up
  assert.equal(g.piece.y, 0);
  g.tick(16, true);
  assert.equal(g.piece.y, 1);
  g.tick(16, true);
  assert.equal(g.piece.y, 1, 'next row only after the soft-drop interval');
  for (let i = 0; i < 6; i++) g.tick(16, true);
  assert.equal(g.piece.y, 2);
});

test('four in a row clears, including bugs, and the round is won', () => {
  const g = blank([1, 1]);
  put(g, 3, H - 1, bug(1));
  put(g, 4, H - 1, bug(1));
  g.rotate(1);
  g.move(-1); // column 2... piece a at x=2, b above
  g.rotate(1); // b to the left: occupies x=1,2
  assert.deepEqual(g.segments().map(([x]) => x).sort(), [1, 2]);
  drop(g);
  assert.equal(g.state, 'clear');
  assert.equal(g.clearing.size, 4);
  g.tick(CLEAR_MS);
  assert.equal(g.state, 'won');
  assert.equal(g.bugs, 0);
  assert.ok(g.grid.every((c) => c === null));
});

test('the clock runs while the game is ticked and stops on the last bug', () => {
  const g = new Game({ level: 1 });
  assert.equal(g.time, 0);
  g.tick(250);
  g.tick(250);
  assert.equal(g.time, 500, 'counts every tick, the throw included');
  // Not ticking (paused, counting down) leaves it alone.
  assert.equal(g.time, 500);

  const w = blank([1, 1]);
  put(w, 3, H - 1, bug(1));
  put(w, 4, H - 1, bug(1));
  w.rotate(1);
  w.move(-1);
  w.rotate(1);
  drop(w);
  assert.equal(w.state, 'clear');
  const before = w.time;
  w.tick(CLEAR_MS + 300); // a long frame: the bug went 300 ms before it ended
  assert.equal(w.state, 'won');
  assert.equal(w.time, before + CLEAR_MS, 'stopped when the last bug went');
  w.tick(1000);
  assert.equal(w.time, before + CLEAR_MS, 'stays stopped once won');
});

test('the clock stops when the server crashes or is forced out', () => {
  const g = new Game({ level: 1 });
  g.tick(100);
  g.lose();
  g.tick(1000);
  assert.equal(g.time, 100);
  const h = new Game({ level: 1 });
  h.tick(100);
  h.forceEnd('out');
  h.tick(1000);
  assert.equal(h.time, 100);
});

test('three in a row does not clear', () => {
  const g = blank([2, 0]);
  put(g, 5, H - 1, bug(2));
  put(g, 6, H - 1, bug(0)); // unrelated bug so the round is not already won
  put(g, 4, H - 1, code(2));
  drop(g); // lands at x=3,4 on row H-2 ... a(2) at 3, b(0) at 4
  assert.notEqual(g.state, 'clear');
  assert.equal(g.bugs, 2);
});

test('column clear, loose halves fall, and bugs stay put', () => {
  const g = blank([0, 0]);
  // Column 0: three teal segments waiting for a fourth.
  for (let y = H - 3; y < H; y++) put(g, 0, y, code(0));
  // A horizontal block resting on that column and on a pillar; its right half is orange.
  put(g, 0, H - 5, code(0, 'R'));
  put(g, 1, H - 5, code(1, 'L'));
  put(g, 0, H - 4, code(0));
  put(g, 1, H - 4, bug(2)); // a floating bug: must never fall
  put(g, 1, H - 1, bug(1));
  put(g, 1, H - 2, code(1));
  put(g, 1, H - 3, code(1));
  put(g, 7, H - 1, bug(2)); // keeps the round alive
  // Column 0 already has five teal in a line; lock the piece somewhere harmless to trigger resolve.
  while (g.move(1));
  drop(g);
  assert.equal(g.state, 'clear');
  assert.equal(g.clearing.size, 5);
  g.tick(CLEAR_MS);
  assert.equal(g.cell(1, H - 5).link, null, 'surviving half is unlinked');
  run(g);
  assert.equal(g.cell(1, H - 4).kind, 'bug', 'floating bug stayed');
  assert.equal(g.cell(1, H - 5).color, 1, 'half resting on the bug stayed');
  checkLinks(g);
});

test('chain reaction: a falling segment completes a second line', () => {
  const g = blank([0, 0]);
  // Row H-1: orange bug + two orange segments, then three teal segments.
  put(g, 0, H - 1, bug(1));
  put(g, 1, H - 1, code(1));
  put(g, 2, H - 1, code(1));
  put(g, 3, H - 1, code(0));
  put(g, 4, H - 1, code(0));
  put(g, 5, H - 1, code(0));
  put(g, 3, H - 2, code(1)); // orange resting on teal: falls when the teal row clears
  put(g, 7, H - 1, bug(2)); // keeps the round alive
  g.rotate(1);
  while (g.piece.x < 6) g.move(1);
  drop(g); // vertical teal pair in column 6 completes the teal row
  assert.equal(g.state, 'clear');
  assert.equal(g.chain, 1);
  assert.equal(g.clearing.size, 4);
  run(g, 20_000);
  assert.equal(g.cell(0, H - 1), null, 'orange bug cleared by the chain');
  assert.equal(g.cell(6, H - 1).color, 0, 'leftover teal half fell to the floor');
  assert.equal(g.bugs, 1);
  assert.equal(g.chain, 2);
});

test('horizontal blocks only fall when both halves are unsupported', () => {
  const g = blank();
  g.piece = null;
  g.state = 'settle';
  put(g, 2, 5, code(0, 'R'));
  put(g, 3, 5, code(1, 'L'));
  put(g, 3, 6, bug(2));
  assert.equal(g.applyGravity(), false);
  g.grid[6 * W + 3] = null;
  assert.equal(g.applyGravity(), true);
  assert.equal(g.cell(2, 6).link, 'R');
  assert.equal(g.cell(3, 6).link, 'L');
});

test('round is lost when the stack blocks the top of the well', () => {
  const g = blank([0, 1]);
  put(g, 6, H - 1, bug(2));
  let guard = 0;
  while (!g.ended && guard++ < 10_000) {
    if (g.state === 'fall') { g.piece.colors = [guard % 2, (guard + 1) % 2 ? 2 : 0]; g.rotate(1); drop(g); }
    else g.tick(50);
  }
  assert.equal(g.state, 'lost');
});

test('random play never corrupts the grid and always terminates', () => {
  const rand = makeRng(99);
  const outcomes = { won: 0, lost: 0 };
  for (let n = 0; n < 150; n++) {
    const g = new Game({ level: 1 + (n % MAX_LEVEL), speed: n % 3, bugSeed: n, blockSeed: n * 31 });
    let steps = 0;
    while (!g.ended) {
      assert.ok(steps++ < 200_000, 'game should end');
      const r = rand();
      if (r < 0.2) g.move(-1);
      else if (r < 0.4) g.move(1);
      else if (r < 0.5) g.rotate(1);
      else if (r < 0.6) g.rotate(-1);
      g.tick(30, r > 0.7);
      g.events.length = 0;
      if (steps % 50 === 0) {
        checkLinks(g);
        assert.equal(g.grid.filter((c) => c?.kind === 'bug').length, g.bugs);
      }
    }
    outcomes[g.state]++;
  }
  console.log('   outcomes:', outcomes);
});

console.log(`\n${passed} tests passed`);
