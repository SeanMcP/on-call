// Draws one player's server onto a small canvas that CSS scales up with crisp pixels.

import { W, H, CLEAR_MS, THROW_MS } from './engine.js';
import { BUGS, ENGINEER, FONT } from './sprites.js';

export const PW = 104; // logical canvas size
export const PH = 160;
const CELL = 8;
const WX = 20; // well origin
const WY = 40;
const CX = 10; // the oncall engineer stands on top of the rack
const CY = 20;

// Code/bug colours: teal, orange, violet. m = main, d = dark, l = light.
const PALETTE = [
  { m: '#2ee6c8', d: '#0f8f86', l: '#c9fff5' },
  { m: '#ff9a3c', d: '#b3541e', l: '#ffe3b0' },
  { m: '#b07bff', d: '#5f37b8', l: '#ecdcff' },
];

// Hoodie colour per player: [main, shade].
export const PLAYER_COLORS = [
  ['#ff5d73', '#b3304a'],
  ['#ffd23f', '#b38a14'],
  ['#5dd39e', '#2b8f63'],
  ['#5aa9ff', '#2b62b3'],
];

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function makeSprite(rows, palette) {
  const c = makeCanvas(rows[0].length, rows.length);
  const ctx = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '.') continue;
      ctx.fillStyle = palette[row[x]];
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return c;
}

/** A code segment: a chunky tile with two "lines of code", open on the side it links to. */
function makeTile(pal, link) {
  const rows = [];
  for (let y = 0; y < 8; y++) {
    let row = '';
    for (let x = 0; x < 8; x++) {
      const top = y === 0, bottom = y === 7, left = x === 0, right = x === 7;
      const rounded =
        (top && left && link !== 'U' && link !== 'L') ||
        (top && right && link !== 'U' && link !== 'R') ||
        (bottom && left && link !== 'D' && link !== 'L') ||
        (bottom && right && link !== 'D' && link !== 'R');
      if (rounded) row += '.';
      else if ((bottom && link !== 'D') || (right && link !== 'R')) row += 'd';
      else if ((top && link !== 'U') || (left && link !== 'L')) row += 'l';
      else if ((y === 2 && (x === 2 || x === 3)) || (y === 4 && x >= 3 && x <= 5)) row += 'd';
      else if (y === 2 && x === 5) row += 'l';
      else row += 'm';
    }
    rows.push(row);
  }
  return makeSprite(rows, pal);
}

let art = null;
function getArt() {
  if (art) return art;
  const eye = { w: '#ffffff', k: '#12091f' };
  art = {
    tiles: PALETTE.map((pal) => Object.fromEntries(['', 'L', 'R', 'U', 'D'].map((l) => [l, makeTile(pal, l)]))),
    bugs: BUGS.map((frames, i) => frames.map((rows) => makeSprite(rows, { ...PALETTE[i], ...eye }))),
    engineer: PLAYER_COLORS.map(([c, C]) => {
      const pal = { h: '#5b3a29', s: '#f2c6a0', k: '#1a1423', e: '#9aa3c7', c, C, p: '#3a4680', m: '#a3344a' };
      return Object.fromEntries(Object.entries(ENGINEER).map(([name, rows]) => [name, makeSprite(rows, pal)]));
    }),
  };
  return art;
}

function drawText(ctx, str, x, y, color, scale = 1) {
  ctx.fillStyle = color;
  for (const ch of String(str).toUpperCase()) {
    const glyph = FONT[ch];
    if (glyph) {
      for (let i = 0; i < 15; i++) {
        if (glyph[i] === '1') ctx.fillRect(x + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale);
      }
    }
    x += 4 * scale;
  }
}
const textWidth = (str, scale = 1) => (String(str).length * 4 - 1) * scale;

const hash = (a, b, c) => (((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) >>> 0) % 1000 / 1000;

function drawBlock(ctx, tiles, colors, x, y) {
  ctx.drawImage(tiles[colors[0]].R, x, y);
  ctx.drawImage(tiles[colors[1]].L, x + CELL, y);
}

function drawRack(ctx, game, t) {
  ctx.fillStyle = '#0a0d1a';
  ctx.fillRect(0, 0, PW, PH);
  // back wall: faint window of a late-night office
  ctx.fillStyle = '#10152b';
  ctx.fillRect(0, 0, PW, 36);
  ctx.fillStyle = '#161d3a';
  for (let x = 4; x < PW; x += 12) ctx.fillRect(x, 0, 1, 36);

  // rack body
  ctx.fillStyle = '#2a3050';
  ctx.fillRect(6, 36, 92, 120);
  ctx.fillStyle = '#4a5380';
  ctx.fillRect(6, 36, 92, 1);
  ctx.fillRect(6, 36, 1, 120);
  ctx.fillStyle = '#171b33';
  ctx.fillRect(6, 155, 92, 1);
  ctx.fillRect(97, 36, 1, 120);

  // memory well, with an intake slot where blocks enter
  ctx.fillStyle = '#05070f';
  ctx.fillRect(WX - 1, WY - 1, W * CELL + 2, H * CELL + 2);
  ctx.fillRect(WX + 3 * CELL - 1, 36, 2 * CELL + 2, 4);
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(WX, WY, W * CELL, H * CELL);
  ctx.fillRect(WX + 3 * CELL, 36, 2 * CELL, 4);
  ctx.fillStyle = '#18203f';
  for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) ctx.fillRect(WX + x * CELL, WY + y * CELL, 1, 1);

  // status LEDs down the left, vents down the right
  for (let i = 0; i < 13; i++) {
    const on = hash(i, Math.floor(t / 240), 7) > 0.45;
    let color = on ? (i % 4 === 0 ? '#ffc857' : '#49e07c') : '#1c2a33';
    if (game.state === 'lost') color = Math.floor(t / 200) % 2 ? '#ff3b4e' : '#4a1420';
    if (game.state === 'won') color = '#49e07c';
    ctx.fillStyle = color;
    ctx.fillRect(10, WY + 5 + i * 8, 2, 2);
    ctx.fillStyle = '#171b33';
    ctx.fillRect(14, WY + 5 + i * 8, 3, 1);
  }
  ctx.fillStyle = '#171b33';
  for (let y = WY + 3; y < WY + H * CELL - 2; y += 4) ctx.fillRect(88, y, 7, 2);

  if (game.danger && !game.ended && Math.floor(t / 250) % 2) {
    ctx.fillStyle = '#ff3b4e';
    ctx.fillRect(WX, WY - 1, 3 * CELL, 1);
    ctx.fillRect(WX + 5 * CELL, WY - 1, 3 * CELL, 1);
  }
}

function drawCells(ctx, game, t) {
  const { tiles, bugs } = getArt();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const c = game.grid[i];
      if (!c) continue;
      const px = WX + x * CELL;
      const py = WY + y * CELL;
      if (game.clearing.has(i)) drawCompile(ctx, c, i, px, py, 1 - game.timer / CLEAR_MS);
      else if (c.kind === 'bug') ctx.drawImage(bugs[c.color][(Math.floor(t / 260) + x + y) % 2], px, py);
      else ctx.drawImage(tiles[c.color][c.link ?? ''], px, py);
    }
  }
  if (game.piece) {
    for (const [x, y, color, link] of game.segments()) {
      if (y >= -1) ctx.drawImage(tiles[color][link], WX + x * CELL, WY + y * CELL);
    }
  }
}

/** A matched cell "compiling away": a white flash, then it breaks into rising bits. */
function drawCompile(ctx, cell, i, px, py, p) {
  const pal = PALETTE[cell.color];
  if (p < 0.3) {
    ctx.fillStyle = Math.floor(p * 20) % 2 ? pal.l : '#ffffff';
    ctx.fillRect(px + 1, py + 1, 6, 6);
    return;
  }
  const q = (p - 0.3) / 0.7;
  const lift = Math.floor(q * 4);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (hash(x, y, i) < q) continue;
      ctx.fillStyle = (x + y) % 2 ? pal.l : pal.m;
      ctx.fillRect(px + x, py + y - lift, 1, 1);
    }
  }
}

function drawEngineer(ctx, game, pi, t) {
  const { tiles, engineer } = getArt();
  const sprites = engineer[pi];
  const throwing = game.state === 'throw' ? 1 - game.timer / THROW_MS : -1;

  if (game.state === 'lost' || game.state === 'out') {
    ctx.drawImage(game.state === 'lost' ? sprites.slump : sprites.idle, CX, CY);
  } else if (game.state === 'won') {
    ctx.drawImage(sprites.hold, CX, CY - (Math.floor(t / 160) % 2) * 2);
  } else if (throwing >= 0 && throwing < 0.6) {
    ctx.drawImage(sprites.toss, CX, CY);
  } else {
    const bob = Math.floor(t / 400) % 2;
    ctx.drawImage(sprites.hold, CX, CY + bob);
    drawBlock(ctx, tiles, game.next, CX, CY - 6 + bob);
  }

  if (throwing >= 0) {
    // the thrown block arcs from his hands into the intake slot
    const x = CX + (WX + 3 * CELL - CX) * throwing;
    const y = CY - 6 + (WY - CELL - (CY - 6)) * throwing - Math.sin(Math.PI * throwing) * 9;
    drawBlock(ctx, tiles, game.incoming, Math.round(x), Math.round(y));
  }
}

function drawHud(ctx, game, pi, hud) {
  const color = PLAYER_COLORS[pi][0];
  const x = 56;
  drawText(ctx, `P${pi + 1}`, x, 3, color, 2);
  if (hud.wins > 0) drawText(ctx, `WON ${hud.wins}`, x + 20, 5, '#ffc857');
  drawText(ctx, `BUGS ${String(game.bugs).padStart(2, '0')}`, x, 16, '#e8ecff');
  drawText(ctx, `PTS ${game.score}`, x, 23, '#8f9ac9');
  drawText(ctx, `LV ${game.level}`, x, 30, '#8f9ac9');
}

function drawBanner(ctx, game, pi) {
  const text = { won: 'RESOLVED', lost: 'CRASHED!', out: 'TOO SLOW' }[game.state];
  if (!text) return;
  const cx = WX + (W * CELL) / 2;
  const y = WY + 44;
  ctx.fillStyle = '#05070f';
  ctx.fillRect(WX + 4, y, W * CELL - 8, 17);
  ctx.fillStyle = game.state === 'won' ? '#49e07c' : game.state === 'lost' ? '#ff3b4e' : '#8f9ac9';
  ctx.fillRect(WX + 4, y, W * CELL - 8, 1);
  ctx.fillRect(WX + 4, y + 16, W * CELL - 8, 1);
  drawText(ctx, text, cx - Math.floor(textWidth(text) / 2), y + 6, game.state === 'won' ? '#ffffff' : PLAYER_COLORS[pi][0]);
}

/** Returns draw(game, timeMs, hud) for one player's canvas. */
export function createRenderer(canvas, pi) {
  canvas.width = PW;
  canvas.height = PH;
  const ctx = canvas.getContext('2d');
  return (game, t, hud = {}) => {
    drawRack(ctx, game, t);
    drawCells(ctx, game, t);
    drawEngineer(ctx, game, pi, t);
    drawHud(ctx, game, pi, hud);
    drawBanner(ctx, game, pi);
  };
}

/** Small portrait for the settings screen (canvas should be 24×28). */
export function drawAvatar(canvas, pi, t, playing) {
  const { tiles, engineer } = getArt();
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = playing ? 1 : 0.3;
  if (playing) {
    const bob = Math.floor(t / 400 + pi / 2) % 2;
    ctx.drawImage(engineer[pi].hold, 4, 11 + bob);
    drawBlock(ctx, tiles, [pi % 3, (pi + 1) % 3], 4, 5 + bob);
  } else {
    ctx.drawImage(engineer[pi].idle, 4, 12);
  }
  ctx.globalAlpha = 1;
}
