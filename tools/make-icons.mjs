// Draws the favicon and app icons from the game's own bug sprite.
// The icons are committed, so this only needs running again if the art changes:
//   node tools/make-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
import { BUGS } from '../js/sprites.js';

const OUT = new URL('../icons/', import.meta.url);
const BG = '#0a0d1a';
const PALETTE = { m: '#2ee6c8', d: '#0f8f86', l: '#c9fff5', w: '#ffffff', k: '#12091f' }; // teal Null Gnat
const BUG = BUGS[0][0];

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** A square grid of colours (or null for transparent), with the bug placed at (offset, offset). */
function grid(size, offset, background) {
  const cells = Array.from({ length: size }, () => new Array(size).fill(background));
  BUG.forEach((row, y) => {
    for (let x = 0; x < 8; x++) if (row[x] !== '.') cells[y + offset][x + offset] = PALETTE[row[x]];
  });
  return cells;
}

function png(cells, scale) {
  const n = cells.length * scale;
  const raw = Buffer.alloc(n * (n * 4 + 1));
  for (let y = 0; y < n; y++) {
    raw[y * (n * 4 + 1)] = 0; // no filter
    for (let x = 0; x < n; x++) {
      const c = cells[Math.floor(y / scale)][Math.floor(x / scale)];
      const at = y * (n * 4 + 1) + 1 + x * 4;
      if (c) raw.set([...rgb(c), 255], at);
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(n, 0);
  header.writeUInt32BE(n, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function svg(cells) {
  const n = cells.length;
  const rects = [];
  cells.forEach((row, y) => row.forEach((c, x) => {
    if (c && c !== BG) rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`);
  }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">` +
    `<rect width="${n}" height="${n}" rx="1.5" fill="${BG}"/>${rects.join('')}</svg>\n`;
}

mkdirSync(OUT, { recursive: true });
// Browser tab: the bug with a one-pixel dark border.
writeFileSync(new URL('favicon.svg', OUT), svg(grid(10, 1, BG)));
writeFileSync(new URL('favicon-32.png', OUT), png(grid(8, 0, BG), 4));
// Home screen. The bug sits in the middle half, inside the safe zone that Android masks to a circle.
writeFileSync(new URL('icon-192.png', OUT), png(grid(16, 4, BG), 12));
writeFileSync(new URL('icon-512.png', OUT), png(grid(16, 4, BG), 32));
// iOS rounds the corners itself and does not crop to a circle, so the bug can be bigger.
writeFileSync(new URL('apple-touch-icon.png', OUT), png(grid(12, 2, BG), 15));
console.log('icons written');
